
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
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.bson.Document;

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
        Set<AgeRating> allowed = contentAccessService.allowedRatings();
        Query query = discoverableBooksQuery(genre, allowed).with(discoverySort(sort));
        long totalElements = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Book.class);
        query.skip((long) safePage * safeSize).limit(safeSize);
        List<Book> pageBooks = mongoTemplate.find(BookMetadataProjection.apply(query), Book.class).stream()
                .filter(book -> allowed.contains(contentAccessService.effectiveRating(book)))
                .toList();
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);

        String currentUserId = getCurrentUserId();
        Map<String, User> authors = loadAuthors(pageBooks);
        List<Map<String, Object>> content = pageBooks.stream()
                .map(b -> enrichBook(b, currentUserId, allowed, authors))
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

    private Query discoverableBooksQuery(String genre, Set<AgeRating> allowedRatings) {
        return new Query(discoverableBooksCriteria(genre, allowedRatings));
    }

    private Criteria discoverableBooksCriteria(String genre, Set<AgeRating> allowedRatings) {
        List<Criteria> filters = new ArrayList<>(List.of(ContentAccessService.discoverableCriteria(allowedRatings)));
        if (genre != null && !genre.isBlank()) {
            filters.add(Criteria.where("genres").regex("^" + Pattern.quote(genre.trim()) + "$", "i"));
        }
        return new Criteria().andOperator(filters);
    }

    public Map<String, List<Map<String, Object>>> getDiscoveryHero() {
        return discoveryHero(contentAccessService.allowedRatings(), getCurrentUserId());
    }

    /** Public HTML always uses anonymous visibility, regardless of caller identity. */
    public Map<String, List<Map<String, Object>>> getPublicDiscoveryHero() {
        return discoveryHero(EnumSet.of(AgeRating.ALL_AGES, AgeRating.TEEN_13), null);
    }

    private static final Pattern HERO_NOVEL_FORMAT = Pattern.compile(
            "^\\s*(?:novel|web[\\s_-]+novel|light[\\s_-]+novel|graphic[\\s_-]+novel)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern HERO_POEM_FORMAT = Pattern.compile(
            "^\\s*(?:poetry|poems?|poetry[\\s_-]+collection|collection[\\s_-]+of[\\s_-]+poems|poetry[\\s_-]+anthology)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern HERO_NON_STORY_FORMAT = Pattern.compile(
            "^\\s*(?:guide|essays?|memoir|biography|self[\\s_-]+help|non[\\s_-]+fiction)\\s*$", Pattern.CASE_INSENSITIVE);

    private boolean heroNovel(Book book) {
        return book.getCategory() != null && HERO_NOVEL_FORMAT.matcher(book.getCategory()).matches();
    }

    private boolean heroPoem(Book book) {
        String category = book.getCategory();
        return (category != null && HERO_POEM_FORMAT.matcher(category).matches())
                || ((category == null || category.isBlank()) && book.getGenres() != null
                    && book.getGenres().stream().anyMatch(genre -> genre != null && "poetry".equalsIgnoreCase(genre.trim())));
    }

    private boolean heroStory(Book book) {
        return !heroPoem(book) && (book.getCategory() == null || !HERO_NON_STORY_FORMAT.matcher(book.getCategory()).matches());
    }

    private Criteria heroPoemCriteria() {
        return new Criteria().orOperator(
                Criteria.where("category").regex(HERO_POEM_FORMAT),
                new Criteria().andOperator(
                        new Criteria().orOperator(Criteria.where("category").is(null), Criteria.where("category").regex("^\\s*$")),
                        Criteria.where("genres").regex("^\\s*poetry\\s*$", "i")));
    }

    private Map<String, List<Map<String, Object>>> discoveryHero(Set<AgeRating> allowed, String viewerId) {
        List<Book> novels = heroCandidates(allowed, Criteria.where("category").regex(HERO_NOVEL_FORMAT), this::heroNovel);
        List<Book> poems = heroCandidates(allowed, heroPoemCriteria(), this::heroPoem);
        List<Book> stories = new ArrayList<>(heroCandidates(allowed, new Criteria().norOperator(
                heroPoemCriteria(), Criteria.where("category").regex(HERO_NON_STORY_FORMAT),
                Criteria.where("category").regex(HERO_NOVEL_FORMAT)), book -> heroStory(book) && !heroNovel(book)));
        // A sparse catalog can still show three real stories: novels are stories too.
        Set<String> storyIds = stories.stream().map(Book::getId).collect(Collectors.toSet());
        for (Book novel : novels) if (stories.size() < 3 && storyIds.add(novel.getId())) stories.add(novel);
        List<Book> selectedBooks = new ArrayList<>(stories);
        selectedBooks.addAll(novels);
        selectedBooks.addAll(poems);
        Map<String, User> authors = loadAuthors(selectedBooks);
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        groups.put("stories", stories.stream().map(book -> enrichBook(book, viewerId, allowed, authors)).toList());
        groups.put("novels", novels.stream().map(book -> enrichBook(book, viewerId, allowed, authors)).toList());
        groups.put("poems", poems.stream().map(book -> enrichBook(book, viewerId, allowed, authors)).toList());
        return groups;
    }

    private List<Book> heroCandidates(Set<AgeRating> allowed, Criteria format, java.util.function.Predicate<Book> matchesFormat) {
        Query query = Query.query(new Criteria().andOperator(discoverableBooksCriteria(null, allowed), format,
                Criteria.where("chapters").elemMatch(Criteria.where("status").is("published")),
                Criteria.where("title").regex("\\S"), Criteria.where("coverUrl").regex("\\S")))
                .with(discoverySort("most_read")).limit(3);
        // Each format is filtered before its own limit, so rare formats never have a catalog cutoff.
        BookMetadataProjection.apply(query);
        try (java.util.stream.Stream<Book> candidates = mongoTemplate.stream(query, Book.class)) {
            Set<String> seen = new HashSet<>();
            return candidates.filter(book -> "published".equals(book.getPublicationStatus()))
                    .filter(book -> allowed.contains(contentAccessService.effectiveRating(book)))
                    .filter(book -> book.getChapters() != null && book.getChapters().stream().anyMatch(chapter -> "published".equals(chapter.getStatus())))
                    .filter(book -> book.getId() != null && book.getTitle() != null && !book.getTitle().isBlank())
                    .filter(book -> book.getCoverUrl() != null && !book.getCoverUrl().isBlank())
                    .filter(matchesFormat).filter(book -> seen.add(book.getId())).limit(3).toList();
        }
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
        Book book = mongoTemplate.findOne(BookMetadataProjection.apply(
                Query.query(Criteria.where("_id").is(id))), Book.class);

        if (book != null) {
            if (!"published".equals(book.getPublicationStatus()) && !(currentUserId != null && currentUserId.equals(book.getAuthorId()))) {
                return null;
            }
            Set<AgeRating> allowed = contentAccessService.allowedRatings();
            if (!(currentUserId != null && currentUserId.equals(book.getAuthorId()))
                    && !allowed.contains(contentAccessService.effectiveRating(book))) {
                AgeRating rating = contentAccessService.effectiveRating(book);
                throw new ContentRestrictedException("This story is rated " + rating.getMinimumAge() + "+. Sign in and enable mature content in your profile if you are eligible.");
            }
            if (incrementView) {
                // Track the same counters atomically; replacing a metadata book would erase its bodies.
                Document increments = new Document();
                for (String field : List.of("viewCount", "readCount", "readCountLast7Days")) {
                    increments.put(field, new Document("$add", List.of(
                            new Document("$ifNull", List.of("$" + field, 0)), 1)));
                }
                mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(id)),
                        AggregationUpdate.from(List.of(context -> new Document("$set", increments))), Book.class);
                book.setViewCount((book.getViewCount() == null ? 0 : book.getViewCount()) + 1);
                book.setReadCount((book.getReadCount() == null ? 0 : book.getReadCount()) + 1);
                book.setReadCountLast7Days(
                        (book.getReadCountLast7Days() == null ? 0 : book.getReadCountLast7Days()) + 1);
            }
            return enrichBook(book, currentUserId, allowed, loadAuthors(List.of(book)));
        }
        return null;
    }

    public List<Map<String, Object>> getBooksByAuthor(String authorId) {
        String currentUserId = getCurrentUserId();
        Set<AgeRating> allowed = contentAccessService.allowedRatings();
        Query query = discoverableBooksQuery(null, allowed).addCriteria(Criteria.where("authorId").is(authorId));
        List<Book> books = mongoTemplate.find(BookMetadataProjection.apply(query), Book.class).stream()
                .filter(book -> allowed.contains(contentAccessService.effectiveRating(book))).toList();
        Map<String, User> authors = loadAuthors(books);
        return books.stream()
                .map(b -> enrichBook(b, currentUserId, allowed, authors))
                .collect(Collectors.toList());
    }

    public Map<String, Object> enrichBookForProfile(Book book, String currentUserId) {
        if (book == null) return null;
        return enrichBook(book, currentUserId);
    }

    public Map<String, Object> enrichBookForProfileById(String bookId, String currentUserId) {
        if (bookId == null) return null;
        return findMetadataByIds(List.of(bookId)).stream().findFirst()
                .map(book -> enrichBook(book, currentUserId)).orElse(null);
    }

    public List<Book> findMetadataByIds(Collection<String> bookIds) {
        if (bookIds == null || bookIds.isEmpty()) return List.of();
        List<String> ids = bookIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return List.of();
        return mongoTemplate.find(BookMetadataProjection.apply(Query.query(Criteria.where("_id").in(ids))), Book.class);
    }

    public List<Book> findMetadataByAuthorId(String authorId) {
        return mongoTemplate.find(BookMetadataProjection.apply(Query.query(Criteria.where("authorId").is(authorId))), Book.class);
    }

    public List<Map<String, Object>> enrichBooksForProfile(Collection<Book> books, String currentUserId) {
        if (books == null || books.isEmpty()) return List.of();
        Set<AgeRating> allowed = contentAccessService == null ? EnumSet.allOf(AgeRating.class) : contentAccessService.allowedRatings();
        Map<String, User> authors = loadAuthors(books);
        return books.stream().filter(Objects::nonNull).map(book -> enrichBook(book, currentUserId, allowed, authors)).toList();
    }

    public Map<String, Object> enrichBook(Book book, String currentUserId) {
        Set<AgeRating> allowed = contentAccessService == null ? EnumSet.allOf(AgeRating.class) : contentAccessService.allowedRatings();
        return enrichBook(book, currentUserId, allowed, loadAuthors(List.of(book)));
    }

    private Map<String, User> loadAuthors(Collection<Book> books) {
        Set<String> authorIds = books.stream().filter(Objects::nonNull).map(Book::getAuthorId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (authorIds.isEmpty()) return Map.of();
        Query query = Query.query(Criteria.where("_id").in(authorIds));
        query.fields().include("username", "avatarUrl", "bio");
        return mongoTemplate.find(query, User.class).stream().collect(Collectors.toMap(User::getId,
                java.util.function.Function.identity(), (first, ignored) -> first));
    }

    private Map<String, Object> enrichBook(Book book, String currentUserId, Set<AgeRating> allowed, Map<String, User> authors) {
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
        boolean canDiscover = contentAccessService == null || allowed.contains(effective);
        map.put("isMature", book.isMature() || (effective != null && effective.getMinimumAge() >= 18));
        map.put("ageRating", effective);
        map.put("isDiscoverable", canDiscover);
        map.put("isRestricted", !canDiscover && !(currentUserId != null && currentUserId.equals(book.getAuthorId())));
        map.put("contentWarnings", book.getContentWarnings() != null ? book.getContentWarnings() : List.of());
        map.put("customDisclaimer", book.getCustomDisclaimer());
        map.put("isAIGenerated", book.isAIGenerated());

        // Enrich Author
        User author = book.getAuthorId() == null ? new User() : authors.getOrDefault(book.getAuthorId(), new User());
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
        // Distinct returns only visible genre names, irrespective of manuscript/catalog size.
        mongoTemplate.findDistinct(discoverableBooksQuery(null, contentAccessService.allowedRatings()),
                "genres", Book.class, String.class).stream().filter(Objects::nonNull).forEach(genres::add);
        return new ArrayList<>(genres);
    }

    public List<Map<String, Object>> getGenresRanked() {
        return genreRows(contentAccessService.allowedRatings(), true, 0).stream()
                .map(row -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", row.getString("_id"));
                    m.put("bookCount", ((Number) row.get("bookCount")).longValue());
                    m.put("readCount", ((Number) row.get("readCount")).longValue());
                    return m;
                })
                .collect(Collectors.toList());
    }

    public Map<String, List<Map<String, Object>>> getHomeGenres() {
        Set<AgeRating> allowed = contentAccessService.allowedRatings();
        String currentUserId = getCurrentUserId();
        Map<String, List<Book>> shelves = new LinkedHashMap<>();
        for (Document row : genreRows(allowed, false, 5)) {
            String genre = row.getString("_id");
            Query query = discoverableBooksQuery(null, allowed)
                    .addCriteria(Criteria.where("genres").regex("^" + Pattern.quote(genre) + "$", "i"))
                    .with(discoverySort("most_read")).limit(6);
            List<Book> books = mongoTemplate.find(BookMetadataProjection.apply(query), Book.class).stream()
                    .filter(book -> allowed.contains(contentAccessService.effectiveRating(book))).toList();
            shelves.put(genre, books);
        }
        Map<String, User> authors = loadAuthors(shelves.values().stream().flatMap(Collection::stream).toList());
        Map<String, List<Map<String, Object>>> result = new java.util.LinkedHashMap<>();
        shelves.forEach((genre, books) -> result.put(genre, books.stream()
                .map(book -> enrichBook(book, currentUserId, allowed, authors)).toList()));
        return result;
    }

    private List<Document> genreRows(Set<AgeRating> allowed, boolean rankByReads, int limit) {
        List<AggregationOperation> pipeline = new ArrayList<>();
        pipeline.add(Aggregation.match(discoverableBooksCriteria(null, allowed)));
        pipeline.add(Aggregation.project("genres", "readCount"));
        pipeline.add(Aggregation.unwind("genres"));
        pipeline.add(Aggregation.match(Criteria.where("genres").ne(null)));
        pipeline.add(Aggregation.group("genres").count().as("bookCount").sum("readCount").as("readCount"));
        if (rankByReads) {
            pipeline.add(context -> new Document("$addFields", new Document("score", new Document("$add", List.of(
                    new Document("$multiply", List.of("$bookCount", 100)), "$readCount")))));
        }
        pipeline.add(context -> new Document("$sort", new Document(rankByReads ? "score" : "bookCount", -1).append("_id", 1)));
        if (limit > 0) pipeline.add(Aggregation.limit(limit));
        return mongoTemplate.aggregate(Aggregation.newAggregation(pipeline), Book.class, Document.class).getMappedResults();
    }

    public Map<String, Object> getBooksByGenre(String genre, String sort, int page, int size) {
        return getAllBooks(sort, genre, page, size);
    }
}
