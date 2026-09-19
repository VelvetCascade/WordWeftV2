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

    public Book schedule(String authorId, String bookId, String chapterId, Instant releaseAt) {
        Book book = requireOwnedBook(authorId, bookId);
        Chapter chapter = requireChapter(book, chapterId);
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

        chapter.setStatus("scheduled");
        chapter.setScheduledAt(releaseAt);
        chapter.setPublishedAt(null);
        return books.save(book);
    }

    public Book cancelSchedule(String authorId, String bookId, String chapterId) {
        Book book = requireOwnedBook(authorId, bookId);
        Chapter chapter = requireChapter(book, chapterId);
        if ("scheduled".equals(chapter.getStatus())) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            return books.save(book);
        }
        return book;
    }

    public Book publishNow(String authorId, String bookId, String chapterId) {
        Book book = requireOwnedBook(authorId, bookId);
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
        Book saved = books.save(book);
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
        int targetIndex = chapterIndex(book, chapterId);
        for (int index = targetIndex; index < book.getChapters().size(); index++) {
            Chapter chapter = book.getChapters().get(index);
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            chapter.setPublishedAt(null);
        }
        return books.save(book);
    }

    public Book unpublishStory(String authorId, String bookId) {
        Book book = requireOwnedBook(authorId, bookId);
        book.setPublicationStatus("draft");
        for (Chapter chapter : book.getChapters()) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            chapter.setPublishedAt(null);
        }
        return books.save(book);
    }

    public boolean publishDue(Book book, Instant now) {
        if (!"published".equals(book.getPublicationStatus())) return false;
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
        books.save(book);
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
        return value == null ? "" : value.replaceAll("<[^>]*>", " ");
    }

    private void publishChapter(Chapter chapter, Instant publishedAt) {
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
