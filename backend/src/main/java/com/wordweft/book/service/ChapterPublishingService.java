package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChapterPublishingService {
    private static final long MINIMUM_SCHEDULE_LEAD_SECONDS = 120;
    private static final long MAXIMUM_SCHEDULE_LEAD_DAYS = 365;

    private final BookRepository books;
    private final NotificationService notifications;
    private final Clock clock;
    @Autowired(required = false)
    org.springframework.data.mongodb.core.MongoTemplate mongo;

    @Autowired(required = false)
    com.wordweft.user.repository.UserRepository userRepository;

    @Autowired(required = false)
    ContentAccessService contentAccessService;

    @Autowired
    public ChapterPublishingService(BookRepository books, NotificationService notifications) {
        this(books, notifications, Clock.systemUTC());
    }

    ChapterPublishingService(BookRepository books, NotificationService notifications, Clock clock) {
        this.books = books;
        this.notifications = notifications;
        this.clock = clock;
    }

    public record ReleaseChapter(String id, int number, String title, String status, Instant scheduledAt,
            List<String> contentWarnings, int wordCount, String disclaimerNote, boolean complete) {}
    public record PublicationImpact(String reviewToken, boolean storyBecomesPublic, String resultingAgeRating,
            List<ReleaseChapter> chapters) {}

    public PublicationImpact reviewPublication(String authorId, String bookId, String chapterId) {
        return impact(requireOwnedBook(authorId, bookId), chapterId);
    }

    private PublicationImpact impact(Book book, String chapterId) {
        int target = chapterIndex(book, chapterId);
        List<ReleaseChapter> releases = new java.util.ArrayList<>();
        AgeRating rating = book.getAgeRating() == null ? AgeRating.ALL_AGES : book.getAgeRating();
        for (int i = 0; i <= target; i++) {
            Chapter c = book.getChapters().get(i);
            if (!"published".equals(c.getStatus()) || i == target) {
                List<String> warnings = c.getContentWarnings() == null ? List.of() : c.getContentWarnings();
                AgeRating required = ContentAccessService.requiredRatingForWarnings(warnings);
                if (required.getMinimumAge() > rating.getMinimumAge()) rating = required;
                releases.add(new ReleaseChapter(c.getId(), i + 1, c.getTitle(), c.getStatus(), c.getScheduledAt(),
                        warnings, c.getWordCount(), c.getDisclaimerNote(),
                        !isBlank(c.getTitle()) && !isBlank(stripHtml(c.getContent()))));
            }
        }
        // Hash the reviewed manuscript and release state, never disclose manuscript bodies in the impact response.
        try {
            var values = new java.util.ArrayList<Object>();
            values.add(java.util.Arrays.asList(book.getId(), book.getPublicationStatus(), book.getAgeRating(), book.isMature(), book.getContentWarnings()));
            for (Chapter c : book.getChapters()) values.add(java.util.Arrays.asList(c.getId(), c.getTitle(), c.getContent(),
                    c.getContentWarnings(), c.getDisclaimerNote(), c.getStatus(), c.getScheduledAt(), c.getEditRevision()));
            values.add(chapterId);
            String json = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().writeValueAsString(values);
            String token = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(json.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            return new PublicationImpact(token, !"published".equals(book.getPublicationStatus()), rating.name(), releases);
        } catch (Exception impossible) { throw new IllegalStateException("Could not review publication", impossible); }
    }

    public Book publishReviewed(String authorId, String bookId, String chapterId, String reviewToken) {
        Book book = requireOwnedBook(authorId, bookId);
        if (reviewToken == null || !impact(book, chapterId).reviewToken().equals(reviewToken)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The release changed since your review. Review every affected chapter again.");
        }
        return publishNow(book, chapterId);
    }

    /** Atomic preconditions cover ordering, manuscript revisions, schedules and story visibility. */
    private org.springframework.data.mongodb.core.query.Query publicationQuery(Book book) {
        return ChapterWriteService.snapshotQuery(book);
    }

    private Book persist(Book book, org.springframework.data.mongodb.core.query.Query precondition) {
        if (mongo == null) return books.save(book); // Unit-test constructor; production always uses MongoTemplate.
        var update = new org.springframework.data.mongodb.core.query.Update()
                .set("publicationStatus", book.getPublicationStatus()).set("publishedDate", book.getPublishedDate())
                .set("lastUpdatedAt", book.getLastUpdatedAt()).set("ageRating", book.getAgeRating())
                .set("isMature", book.isMature()).set("contentWarnings", book.getContentWarnings());
        for (int i = 0; i < book.getChapters().size(); i++) {
            var draft = ChapterWriteService.draftUpdate("chapters." + i + ".", book.getChapters().get(i));
            draft.getUpdateObject().get("$set", org.bson.Document.class).forEach(update::set);
            update.set("chapters." + i + ".publishedAt", book.getChapters().get(i).getPublishedAt());
        }
        if (mongo.updateFirst(precondition, update, Book.class).getMatchedCount() != 1) throw ChapterWriteService.conflict();
        return book;
    }

    public Book schedule(String authorId, String bookId, String chapterId, Instant releaseAt) {
        return schedule(authorId, bookId, chapterId, releaseAt, null);
    }

    public Book schedule(String authorId, String bookId, String chapterId, Instant releaseAt, Long expectedRevision) {
        Book book = requireOwnedBook(authorId, bookId);
        var precondition = publicationQuery(book);
        Chapter chapter = requireChapter(book, chapterId);
        ChapterWriteService.requireRevision(chapter, expectedRevision);
        requirePublishedStory(book);
        requireCompleteChapter(chapter);
        int targetIndex = chapterIndex(book, chapterId);
        int nextIndex = firstUnpublishedIndex(book);
        if (targetIndex != nextIndex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Publish or schedule the preceding chapter first.");
        }

        Instant now = clock.instant();
        if (releaseAt == null || releaseAt.isBefore(now.plusSeconds(MINIMUM_SCHEDULE_LEAD_SECONDS))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose a release time at least two minutes from now.");
        }
        if (releaseAt.isAfter(now.plus(MAXIMUM_SCHEDULE_LEAD_DAYS, ChronoUnit.DAYS))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose a release time within the next year.");
        }

        validateScheduledRating(book, chapter);
        chapter.setEditRevision(chapter.getEditRevision() + 1);
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(releaseAt);
        chapter.setPublishedAt(null);
        return persist(book, precondition);
    }

    public Book cancelSchedule(String authorId, String bookId, String chapterId) {
        return cancelSchedule(authorId, bookId, chapterId, null);
    }

    public Book cancelSchedule(String authorId, String bookId, String chapterId, Long expectedRevision) {
        Book book = requireOwnedBook(authorId, bookId);
        var precondition = publicationQuery(book);
        Chapter chapter = requireChapter(book, chapterId);
        ChapterWriteService.requireRevision(chapter, expectedRevision);
        if ("scheduled".equals(chapter.getStatus())) {
            chapter.setEditRevision(chapter.getEditRevision() + 1);
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            return persist(book, precondition);
        }
        return book;
    }

    public Book publishNow(String authorId, String bookId, String chapterId) {
        return publishNow(requireOwnedBook(authorId, bookId), chapterId);
    }

    private Book publishNow(Book book, String chapterId) {
        var precondition = publicationQuery(book);
        int targetIndex = chapterIndex(book, chapterId);
        Chapter chapter = book.getChapters().get(targetIndex);
        boolean storyWasPublished = "published".equals(book.getPublicationStatus());
        boolean chapterWasPublished = "published".equals(chapter.getStatus());

        for (int index = 0; index <= targetIndex; index++) {
            Chapter required = book.getChapters().get(index);
            if (!"published".equals(required.getStatus()) || required == chapter) {
                requireCompleteChapter(required);
                ensureBookAgeRating(book, required);
            }
        }

        Instant publishedAt = clock.instant();
        for (int index = 0; index <= targetIndex; index++) {
            Chapter required = book.getChapters().get(index);
            if (!"published".equals(required.getStatus()) || required == chapter) {
                publishChapter(required, publishedAt);
            }
        }
        if (!storyWasPublished) {
            book.setPublicationStatus("published");
            if (book.getPublishedDate() == null) {
                book.setPublishedDate(LocalDate.ofInstant(publishedAt, ZoneOffset.UTC));
            }
        }
        markStoryUpdated(book, publishedAt);
        Book saved = persist(book, precondition);
        if (storyWasPublished && !chapterWasPublished) {
            notifyFollowers(saved, chapter);
        } else if (!storyWasPublished) {
            notifyStoryFollowers(saved);
        }
        return saved;
    }

    public Book publishStory(String authorId, String bookId, List<String> selectedChapterIds) {
        Book book = requireOwnedBook(authorId, bookId);
        if (selectedChapterIds == null || selectedChapterIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose at least one chapter to publish.");
        }
        int targetIndex = -1;
        for (String chapterId : selectedChapterIds) {
            targetIndex = Math.max(targetIndex, chapterIndex(book, chapterId));
        }
        return publishNow(authorId, bookId, book.getChapters().get(targetIndex).getId());
    }

    public Book unpublishChapter(String authorId, String bookId, String chapterId) {
        Book book = requireOwnedBook(authorId, bookId);
        var precondition = publicationQuery(book);
        int targetIndex = chapterIndex(book, chapterId);
        for (int index = targetIndex; index < book.getChapters().size(); index++) {
            Chapter chapter = book.getChapters().get(index);
            chapter.setEditRevision(chapter.getEditRevision() + 1);
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            chapter.setPublishedAt(null);
        }
        return persist(book, precondition);
    }

    public Book unpublishStory(String authorId, String bookId) {
        Book book = requireOwnedBook(authorId, bookId);
        var precondition = publicationQuery(book);
        book.setPublicationStatus("draft");
        for (Chapter chapter : book.getChapters()) {
            chapter.setEditRevision(chapter.getEditRevision() + 1);
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            chapter.setPublishedAt(null);
        }
        return persist(book, precondition);
    }

    public boolean publishDue(Book book, Instant now) {
        if (!"published".equals(book.getPublicationStatus()) || book.isModerationRemoved()) return false;
        var precondition = publicationQuery(book);
        boolean changed = false;
        while (true) {
            int nextIndex = firstUnpublishedIndex(book);
            if (nextIndex < 0) break;
            Chapter chapter = book.getChapters().get(nextIndex);
            if (!"scheduled".equals(chapter.getStatus())
                    || chapter.getScheduledAt() == null
                    || chapter.getScheduledAt().isAfter(now)) break;
            requireCompleteChapter(chapter);
            ensureBookAgeRating(book, chapter);
            publishChapter(chapter, now);
            changed = true;
        }

        if (!changed) {
            return false;
        }

        markStoryUpdated(book, now);
        persist(book, precondition);
        book.getChapters().stream()
                .filter(chapter -> now.equals(chapter.getPublishedAt()))
                .forEach(chapter -> notifyFollowers(book, chapter));
        return true;
    }

    private Book requireOwnedBook(String authorId, String bookId) {
        Book book = books.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (authorId == null || !authorId.equals(book.getAuthorId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to manage this story.");
        }
        if (book.isModerationRemoved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This story is unavailable following an administrative review.");
        }
        return book;
    }

    private Chapter requireChapter(Book book, String chapterId) {
        return book.getChapters().stream()
                .filter(chapter -> chapterId.equals(chapter.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
    }

    private int firstUnpublishedIndex(Book book) {
        for (int index = 0; index < book.getChapters().size(); index++) {
            if (!"published".equals(book.getChapters().get(index).getStatus())) return index;
        }
        return -1;
    }

    private int chapterIndex(Book book, String chapterId) {
        for (int index = 0; index < book.getChapters().size(); index++) {
            if (chapterId.equals(book.getChapters().get(index).getId())) return index;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found.");
    }

    private void requirePublishedStory(Book book) {
        if (!"published".equals(book.getPublicationStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Publish the story before scheduling a chapter.");
        }
    }

    private void requireCompleteChapter(Chapter chapter) {
        if (isBlank(chapter.getTitle()) || isBlank(stripHtml(chapter.getContent()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Add a chapter title and content before scheduling it.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String stripHtml(String value) {
        return com.wordweft.manuscript.service.ManuscriptText.plainText(value);
    }

    private void publishChapter(Chapter chapter, Instant publishedAt) {
        chapter.setEditRevision(chapter.getEditRevision() + 1);
        PublishedChapterView.capture(chapter);
        chapter.setStatus("published");
        chapter.setScheduledAt(null);
        chapter.setPublishedAt(publishedAt);
    }

    private void markStoryUpdated(Book book, Instant publishedAt) {
        book.setLastUpdatedAt(LocalDate.ofInstant(publishedAt, ZoneOffset.UTC));
    }

    private void notifyFollowers(Book book, Chapter chapter) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("bookId", book.getId());
        metadata.put("bookTitle", book.getTitle());
        metadata.put("chapterTitle", chapter.getTitle());
        if (book.getCoverUrl() != null) {
            metadata.put("coverUrl", book.getCoverUrl());
        }
        notifications.notifyFollowers(
                book.getAuthorId(),
                "AUTHOR_NEW_CHAPTER",
                "CHAPTER",
                chapter.getId(),
                "published a new chapter: " + chapter.getTitle(),
                metadata);
    }

    private void notifyStoryFollowers(Book book) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("bookId", book.getId());
        metadata.put("bookTitle", book.getTitle());
        if (book.getCoverUrl() != null) metadata.put("coverUrl", book.getCoverUrl());
        notifications.notifyFollowers(
                book.getAuthorId(), "AUTHOR_NEW_STORY", "BOOK", book.getId(),
                "published a new story \"" + book.getTitle() + "\"", metadata);
    }

    private void validateScheduledRating(Book book, Chapter chapter) {
        AgeRating required = ContentAccessService.requiredRatingForWarnings(chapter.getContentWarnings());
        AgeRating current = book.getAgeRating() == null ? AgeRating.ALL_AGES : book.getAgeRating();
        AgeRating resulting = required.getMinimumAge() > current.getMinimumAge() ? required : current;
        if (contentAccessService != null && userRepository != null && resulting.getMinimumAge() >= 18) {
            var author = userRepository.findById(book.getAuthorId()).orElse(null);
            contentAccessService.validateAuthorCanPostRating(author, resulting);
        }
    }

    private void ensureBookAgeRating(Book book, Chapter chapter) {
        if (chapter.getContentWarnings() != null && !chapter.getContentWarnings().isEmpty()) {
            AgeRating required = ContentAccessService.requiredRatingForWarnings(chapter.getContentWarnings());
            if (required.getMinimumAge() > (book.getAgeRating() != null ? book.getAgeRating().getMinimumAge() : 0)) {
                book.setAgeRating(required);
            }
            if (required.getMinimumAge() >= 18) {
                book.setMature(true);
            }
            if (book.getContentWarnings() == null) {
                book.setContentWarnings(new java.util.ArrayList<>());
            }
            for (String warning : chapter.getContentWarnings()) {
                if (!book.getContentWarnings().contains(warning)) {
                    book.getContentWarnings().add(warning);
                }
            }
        }
        if (contentAccessService != null && userRepository != null && (book.isMature() || (book.getAgeRating() != null && book.getAgeRating().getMinimumAge() >= 18))) {
            com.wordweft.user.model.User author = userRepository.findById(book.getAuthorId()).orElse(null);
            contentAccessService.validateAuthorCanPostRating(author, book.getAgeRating());
        }
    }
}
