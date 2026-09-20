
package com.wordweft.book.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.exception.ContentRestrictedException;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@Service
public class BookService {
    @Autowired
    BookRepository bookRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    ReviewRepository reviewRepository;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    ReadingProgressRepository readingProgressRepository;
    @Autowired
    CharacterRepository characterRepository;
    @Autowired
    SceneRepository sceneRepository;
    @Autowired
    NoteRepository noteRepository;
    @Autowired
    LibraryRepository libraryRepository;
    @Autowired
    ChapterRevisionRepository chapterRevisionRepository;
    @Autowired
    ChapterReadEventRepository chapterReadEventRepository;
    @Autowired
    ContentAccessService contentAccessService;
    @Autowired
    MongoTemplate mongoTemplate;
    @Value("${wordweft.reader-sign-in-gate-enabled:true}")
    private boolean readerSignInGateEnabled = true;

    public void deleteBook(String bookId) {
        // Delete the book document
        bookRepository.deleteById(bookId);
        // Cascade: remove all related data
        reviewRepository.deleteByBookId(bookId);
        commentRepository.deleteByBookId(bookId);
        readingProgressRepository.deleteByBookId(bookId);
        characterRepository.deleteByBookId(bookId);
        sceneRepository.deleteByBookId(bookId);
        noteRepository.deleteByBookId(bookId);
        libraryRepository.deleteByBookId(bookId);
        chapterRevisionRepository.deleteByBookId(bookId);
        chapterReadEventRepository.deleteByBookId(bookId);
    }

    public void deleteChapterData(
            String bookId,
            String chapterId,
            int deletedChapterIndex,
            int remainingChapterCount) {
        commentRepository.deleteByChapterId(chapterId);
        chapterRevisionRepository.deleteByChapterId(chapterId);
        chapterReadEventRepository.deleteByChapterId(chapterId);

        List<ReadingProgress> progressRecords = readingProgressRepository.findByBookId(bookId);
        for (ReadingProgress progress : progressRecords) {
            if (progress.getChapters() != null) {
                progress.getChapters().remove(chapterId);
            }
            if (progress.getCompletedChapterIds() != null) {
                progress.getCompletedChapterIds().remove(chapterId);
            }

            if (remainingChapterCount <= 0) {
                progress.setOverallProgress(0);
                progress.setLastReadChapterIndex(0);
                progress.setLastReadScrollPosition(0);
                continue;
            }

            int currentIndex = progress.getLastReadChapterIndex();
            if (currentIndex > deletedChapterIndex) {
                progress.setLastReadChapterIndex(currentIndex - 1);
            } else if (currentIndex == deletedChapterIndex) {
                progress.setLastReadChapterIndex(Math.min(currentIndex, remainingChapterCount - 1));
                progress.setLastReadScrollPosition(0);
            } else {
                progress.setLastReadChapterIndex(Math.min(currentIndex, remainingChapterCount - 1));
            }

            int accumulatedChapterProgress = progress.getChapters() == null
                    ? 0
                    : progress.getChapters().values().stream()
                            .mapToInt(item -> Math.max(0, Math.min(100, item.getProgress())))
                            .sum();
            progress.setOverallProgress(Math.min(100, accumulatedChapterProgress / remainingChapterCount));
        }
        if (!progressRecords.isEmpty()) {
            readingProgressRepository.saveAll(progressRecords);
        }
    }

    private String getCurrentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserDetailsImpl) {
                return ((UserDetailsImpl) principal).getId();
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    public Map<String, Object> getAllBooks(String sort, String genre, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        Query query = discoverableBooksQuery(genre).with(discoverySort(sort));
        long totalElements = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Book.class);
        query.skip((long) safePage * safeSize).limit(safeSize);
        List<Book> pageBooks = mongoTemplate.find(query, Book.class).stream()
                .filter(contentAccessService::canDiscover)
                .toList();
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);

        String currentUserId = getCurrentUserId();
        List<Map<String, Object>> content = pageBooks.stream()
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("hasMore", safePage < totalPages - 1);
        return result;
    }

    private Query discoverableBooksQuery(String genre) {
        Set<AgeRating> allowedRatings = contentAccessService.allowedRatings();
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("publicationStatus").is("published"));
        filters.add(new Criteria().orOperator(
                Criteria.where("ageRating").in(allowedRatings),
                Criteria.where("ageRating").exists(false),
                Criteria.where("ageRating").is(null)));

        if (!allowedRatings.contains(AgeRating.MATURE_18)) {
            filters.add(Criteria.where("isMature").ne(true));
        }

        Set<String> disallowedWarnings = new HashSet<>();
        if (!allowedRatings.contains(AgeRating.TEEN_13)) {
            disallowedWarnings.addAll(ContentAccessService.TEEN_13_WARNINGS);
        }
        if (!allowedRatings.contains(AgeRating.MATURE_18)) {
            disallowedWarnings.addAll(ContentAccessService.MATURE_18_WARNINGS);
        }
        if (!disallowedWarnings.isEmpty()) {
            filters.add(Criteria.where("contentWarnings").nin(disallowedWarnings));
            filters.add(Criteria.where("chapters.contentWarnings").nin(disallowedWarnings));
        }
        if (genre != null && !genre.isBlank()) {
            filters.add(Criteria.where("genres").regex("^" + Pattern.quote(genre.trim()) + "$", "i"));
        }
        return new Query(new Criteria().andOperator(filters));
    }

    private Sort discoverySort(String sort) {
        return switch (sort != null ? sort : "most_read") {
            case "most_viewed" -> Sort.by(Sort.Order.desc("viewCountLast7Days"), Sort.Order.desc("viewCount"), Sort.Order.asc("id"));
            case "recent_update" -> Sort.by(Sort.Order.desc("lastUpdatedAt"), Sort.Order.desc("publishedDate"), Sort.Order.asc("id"));
            case "new" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("publishedDate"), Sort.Order.asc("id"));
            default -> Sort.by(Sort.Order.desc("readCountLast7Days"), Sort.Order.desc("readCount"), Sort.Order.asc("id"));
        };
    }

    public Map<String, Object> getBookById(String id, boolean incrementView) {
        String currentUserId = getCurrentUserId();
        Optional<Book> bookOpt = bookRepository.findById(id);

        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            if (!"published".equals(book.getPublicationStatus()) && !(currentUserId != null && currentUserId.equals(book.getAuthorId()))) {
                return null;
            }
            if (!contentAccessService.canAccess(book)) {
                AgeRating rating = contentAccessService.effectiveRating(book);
                throw new ContentRestrictedException("This story is rated " + rating.getMinimumAge() + "+. Sign in and enable mature content in your profile if you are eligible.");
            }
            if (incrementView) {
                // Track page loads
                book.setViewCount((book.getViewCount() == null ? 0 : book.getViewCount()) + 1);
                book.setReadCount((book.getReadCount() == null ? 0 : book.getReadCount()) + 1);
                book.setReadCountLast7Days(
                        (book.getReadCountLast7Days() == null ? 0 : book.getReadCountLast7Days()) + 1);
                bookRepository.save(book);
            }
            return enrichBook(book, currentUserId);
        }
        return null;
    }

    public List<Map<String, Object>> getBooksByAuthor(String authorId) {
        String currentUserId = getCurrentUserId();
        // Use repository method for efficient filtering
        return bookRepository.findByAuthorIdAndPublicationStatus(authorId, "published").stream()
                .filter(contentAccessService::canDiscover)
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());
    }

    public Map<String, Object> enrichBookForProfile(Book book, String currentUserId) {
        if (book == null) return null;
        return enrichBook(book, currentUserId);
    }

    public Map<String, Object> enrichBookForProfileById(String bookId, String currentUserId) {
        if (bookId == null) return null;
        return bookRepository.findById(bookId)
                .map(b -> enrichBook(b, currentUserId))
                .orElse(null);
    }

    public Map<String, Object> enrichBook(Book book, String currentUserId) {
        boolean isOwner = currentUserId != null && currentUserId.equals(book.getAuthorId());
        List<Chapter> allChapters = book.getChapters() != null ? book.getChapters() : List.of();
        List<Chapter> visibleChapters = isOwner
                ? allChapters
                : allChapters.stream().filter(chapter -> "published".equals(chapter.getStatus())).toList();
        String firstPublishedChapterId = allChapters.stream()
                .filter(chapter -> "published".equals(chapter.getStatus()))
                .map(Chapter::getId)
                .findFirst()
                .orElse(null);
        Map<String, Object> map = new HashMap<>();
        map.put("id", book.getId());
        map.put("title", book.getTitle());
        map.put("coverUrl", book.getCoverUrl());
        map.put("rating", book.getRating());
        map.put("reviewsCount", book.getReviewsCount());

        // AGGREGATE VIEWS: Sum of all chapter views
        int totalChapterViews = visibleChapters.stream()
                .mapToInt(Chapter::getViewCount)
                .sum();
        map.put("viewCount", totalChapterViews);

        // AGGREGATE LIKES: Sum of all chapter likes
        int totalChapterLikes = visibleChapters.stream()
                .mapToInt(c -> c.getLikes() != null ? c.getLikes().size() : 0)
                .sum();
        map.put("likesCount", totalChapterLikes);

        // AGGREGATE COMMENTS: Sum of all chapter comments
        int totalChapterComments = visibleChapters.stream()
                .mapToInt(Chapter::getCommentCount)
                .sum();
        map.put("commentCount", totalChapterComments);

        // isLiked for Book is essentially if the user has liked ANY chapter (optional
        // interpretation)
        // or we just return false because book-level liking is disabled.
        map.put("isLiked", false);

        map.put("genres", book.getGenres());
        map.put("category", book.getCategory());
        map.put("tags", book.getTags());
        map.put("summary", book.getSummary());
        map.put("description", book.getDescription());
        map.put("coverFileId", book.getCoverFileId());
        map.put("authorId", book.getAuthorId());

        // Enrich Chapters
        List<Map<String, Object>> enrichedChapters = visibleChapters.stream().map(ch -> {
            PublishedChapterView.Snapshot publicChapter = isOwner ? null : PublishedChapterView.of(ch);
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", ch.getId());
            cMap.put("title", isOwner ? ch.getTitle() : publicChapter.title());
            cMap.put("wordCount", isOwner ? ch.getWordCount() : publicChapter.wordCount());
            cMap.put("status", ch.getStatus());
            cMap.put("accessLabel", currentUserId != null || !readerSignInGateEnabled
                    ? "FULL"
                    : Objects.equals(ch.getId(), firstPublishedChapterId) ? "PREVIEW" : "SIGN_IN");

            // Chapter Stats
            cMap.put("viewCount", ch.getViewCount());
            cMap.put("commentCount", ch.getCommentCount());
            cMap.put("likesCount", ch.getLikes() != null ? ch.getLikes().size() : 0);
            cMap.put("isLiked",
                    currentUserId != null && ch.getLikes() != null && ch.getLikes().contains(currentUserId));
            cMap.put("contentWarnings", isOwner
                    ? (ch.getContentWarnings() != null ? ch.getContentWarnings() : List.of())
                    : publicChapter.contentWarnings());
            cMap.put("disclaimerNote", isOwner ? ch.getDisclaimerNote() : publicChapter.disclaimerNote());
            if (isOwner) {
                cMap.put("scheduledAt", ch.getScheduledAt());
                cMap.put("publishedAt", ch.getPublishedAt());
                cMap.put("hasUnpublishedChanges", "published".equals(ch.getStatus())
                        && (!Objects.equals(ch.getTitle(), PublishedChapterView.of(ch).title())
                        || !Objects.equals(ch.getContent(), PublishedChapterView.of(ch).content())));
            }

            return cMap;
        }).collect(Collectors.toList());

        map.put("chapters", enrichedChapters);
        allChapters.stream()
                .filter(chapter -> "scheduled".equals(chapter.getStatus()))
                .map(Chapter::getScheduledAt)
                .filter(Objects::nonNull)
                .filter(release -> release.isAfter(Instant.now()))
                .min(Instant::compareTo)
                .ifPresent(release -> map.put("nextScheduledReleaseAt", release));

        map.put("readingStatus", book.getReadingStatus());
        map.put("publicationStatus", book.getPublicationStatus());
        map.put("publishedDate", book.getPublishedDate());
        map.put("lastUpdatedAt", book.getLastUpdatedAt());
        map.put("createdAt", book.getCreatedAt());
        map.put("readCount", book.getReadCount() != null ? book.getReadCount() : 0);
        map.put("readCountLast7Days", book.getReadCountLast7Days() != null ? book.getReadCountLast7Days() : 0);
        AgeRating effective = contentAccessService != null ? contentAccessService.effectiveRating(book) : null;
        if (effective == null) {
            effective = book.getAgeRating() != null ? book.getAgeRating() : AgeRating.ALL_AGES;
        }
        boolean canDiscover = contentAccessService == null || contentAccessService.canDiscover(book);
        map.put("isMature", book.isMature() || (effective != null && effective.getMinimumAge() >= 18));
        map.put("ageRating", effective);
        map.put("isDiscoverable", canDiscover);
        map.put("isRestricted", !canDiscover && !(currentUserId != null && currentUserId.equals(book.getAuthorId())));
        map.put("contentWarnings", book.getContentWarnings() != null ? book.getContentWarnings() : List.of());
        map.put("customDisclaimer", book.getCustomDisclaimer());
        map.put("isAIGenerated", book.isAIGenerated());

        // Enrich Author
        User author = userRepository.findById(book.getAuthorId()).orElse(new User());
        Map<String, Object> authorMap = new HashMap<>();
        authorMap.put("id", author.getId());
        authorMap.put("name", author.getUsername());
        authorMap.put("avatarUrl", author.getAvatarUrl());
        authorMap.put("bio", author.getBio());

        map.put("author", authorMap);
        return map;
    }

    public List<String> getAllGenres() {
        // Comprehensive predefined genre list
        Set<String> genres = new java.util.TreeSet<>(java.util.Arrays.asList(
                "Action", "Adventure", "Comedy", "Contemporary", "Crime",
                "Cyberpunk", "Dark Fantasy", "Drama", "Dystopian", "Epic Fantasy",
                "Erotica", "Fairytale", "Fan Fiction", "Fantasy", "Gothic",
                "High Fantasy", "Historical Fiction", "Horror", "Humor",
                "LGBTQ+", "LitRPG", "Magical Realism", "Memoir",
                "Military", "Mystery", "Mythology", "Non-Fiction",
                "Paranormal", "Philosophy", "Poetry", "Political",
                "Post-Apocalyptic", "Psychological", "Romance", "Satire",
                "Sci-Fi", "Slice of Life", "Space Opera", "Steampunk",
                "Supernatural", "Suspense", "Thriller", "Tragedy",
                "Urban Fantasy", "War", "Western", "Wuxia",
                "Young Adult"));
        // Also include any custom genres from existing books
        bookRepository.findByPublicationStatus("published").stream().filter(contentAccessService::canDiscover)
                .forEach(b -> genres.addAll(b.getGenres()));
        return new ArrayList<>(genres);
    }

    public List<Map<String, Object>> getGenresRanked() {
        List<Book> publishedBooks = bookRepository.findByPublicationStatus("published").stream()
                .filter(contentAccessService::canDiscover)
                .collect(Collectors.toList());
        Map<String, Long> genreBookCount = new HashMap<>();
        Map<String, Long> genreReadCount = new HashMap<>();
        for (Book b : publishedBooks) {
            for (String g : b.getGenres()) {
                genreBookCount.merge(g, 1L, Long::sum);
                genreReadCount.merge(g, (long) (b.getReadCount() != null ? b.getReadCount() : 0), Long::sum);
            }
        }
        return genreBookCount.keySet().stream()
                .sorted((a, b) -> {
                    long scoreA = genreBookCount.getOrDefault(a, 0L) * 100 + genreReadCount.getOrDefault(a, 0L);
                    long scoreB = genreBookCount.getOrDefault(b, 0L) * 100 + genreReadCount.getOrDefault(b, 0L);
                    return Long.compare(scoreB, scoreA);
                })
                .map(g -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", g);
                    m.put("bookCount", genreBookCount.getOrDefault(g, 0L));
                    m.put("readCount", genreReadCount.getOrDefault(g, 0L));
                    return m;
                })
                .collect(Collectors.toList());
    }

    public Map<String, List<Map<String, Object>>> getHomeGenres() {
        List<Book> publishedBooks = bookRepository.findByPublicationStatus("published").stream()
                .filter(contentAccessService::canDiscover).toList();
        String currentUserId = getCurrentUserId();

        // Collect top 5 genres by frequency
        Map<String, Long> genreCount = new HashMap<>();
        for (Book b : publishedBooks) {
            for (String g : b.getGenres()) {
                genreCount.merge(g, 1L, Long::sum);
            }
        }
        List<String> topGenres = genreCount.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<String, List<Map<String, Object>>> result = new java.util.LinkedHashMap<>();
        for (String genre : topGenres) {
            List<Book> genreBooks = publishedBooks.stream()
                    .filter(b -> b.getGenres().stream().anyMatch(g -> g.equalsIgnoreCase(genre)))
                    .sorted((a, b) -> {
                        int cmp = Integer.compare(
                                b.getReadCountLast7Days() != null ? b.getReadCountLast7Days() : 0,
                                a.getReadCountLast7Days() != null ? a.getReadCountLast7Days() : 0);
                        if (cmp != 0)
                            return cmp;
                        return Integer.compare(
                                b.getReadCount() != null ? b.getReadCount() : 0,
                                a.getReadCount() != null ? a.getReadCount() : 0);
                    })
                    .limit(6)
                    .collect(Collectors.toList());
            result.put(genre, genreBooks.stream()
                    .map(b -> enrichBook(b, currentUserId))
                    .collect(Collectors.toList()));
        }
        return result;
    }

    public Map<String, Object> getBooksByGenre(String genre, String sort, int page, int size) {
        return getAllBooks(sort, genre, page, size);
    }
}
