
package com.wordweft.book.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

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
        List<Book> books = bookRepository.findByPublicationStatus("published");

        // Genre filter
        if (genre != null && !genre.isBlank()) {
            books = books.stream()
                    .filter(b -> b.getGenres().stream().anyMatch(g -> g.equalsIgnoreCase(genre)))
                    .collect(Collectors.toList());
        }

        // Transparent sorting — exactly one field, no scoring
        switch (sort != null ? sort : "most_read") {
            case "most_viewed":
                books.sort((a, b) -> {
                    int cmp = Integer.compare(
                            b.getViewCountLast7Days() != null ? b.getViewCountLast7Days() : 0,
                            a.getViewCountLast7Days() != null ? a.getViewCountLast7Days() : 0);
                    if (cmp != 0)
                        return cmp;
                    return Integer.compare(
                            b.getViewCount() != null ? b.getViewCount() : 0,
                            a.getViewCount() != null ? a.getViewCount() : 0);
                });
                break;
            case "recent_update":
                books.sort((a, b) -> {
                    java.time.LocalDate dateA = a.getLastUpdatedAt() != null ? a.getLastUpdatedAt()
                            : a.getPublishedDate();
                    java.time.LocalDate dateB = b.getLastUpdatedAt() != null ? b.getLastUpdatedAt()
                            : b.getPublishedDate();
                    if (dateA == null)
                        return 1;
                    if (dateB == null)
                        return -1;
                    return dateB.compareTo(dateA);
                });
                break;
            case "new":
                books.sort((a, b) -> {
                    java.time.LocalDate dateA = a.getCreatedAt() != null ? a.getCreatedAt() : a.getPublishedDate();
                    java.time.LocalDate dateB = b.getCreatedAt() != null ? b.getCreatedAt() : b.getPublishedDate();
                    if (dateA == null)
                        return 1;
                    if (dateB == null)
                        return -1;
                    return dateB.compareTo(dateA);
                });
                break;
            default: // most_read
                books.sort((a, b) -> {
                    int cmp = Integer.compare(
                            b.getReadCountLast7Days() != null ? b.getReadCountLast7Days() : 0,
                            a.getReadCountLast7Days() != null ? a.getReadCountLast7Days() : 0);
                    if (cmp != 0)
                        return cmp;
                    return Integer.compare(
                            b.getReadCount() != null ? b.getReadCount() : 0,
                            a.getReadCount() != null ? a.getReadCount() : 0);
                });
                break;
        }

        // Pagination
        int totalElements = books.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        List<Book> pageBooks = books.subList(fromIndex, toIndex);

        String currentUserId = getCurrentUserId();
        List<Map<String, Object>> content = pageBooks.stream()
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("page", page);
        result.put("size", size);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("hasMore", page < totalPages - 1);
        return result;
    }

    public Map<String, Object> getBookById(String id, boolean incrementView) {
        String currentUserId = getCurrentUserId();
        Optional<Book> bookOpt = bookRepository.findById(id);

        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
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
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());
    }

    private Map<String, Object> enrichBook(Book book, String currentUserId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", book.getId());
        map.put("title", book.getTitle());
        map.put("coverUrl", book.getCoverUrl());
        map.put("rating", book.getRating());
        map.put("reviewsCount", book.getReviewsCount());

        // AGGREGATE VIEWS: Sum of all chapter views
        int totalChapterViews = book.getChapters().stream()
                .mapToInt(Chapter::getViewCount)
                .sum();
        map.put("viewCount", totalChapterViews);

        // AGGREGATE LIKES: Sum of all chapter likes
        int totalChapterLikes = book.getChapters().stream()
                .mapToInt(c -> c.getLikes() != null ? c.getLikes().size() : 0)
                .sum();
        map.put("likesCount", totalChapterLikes);

        // AGGREGATE COMMENTS: Sum of all chapter comments
        int totalChapterComments = book.getChapters().stream()
                .mapToInt(Chapter::getCommentCount)
                .sum();
        map.put("commentCount", totalChapterComments);

        // isLiked for Book is essentially if the user has liked ANY chapter (optional
        // interpretation)
        // or we just return false because book-level liking is disabled.
        map.put("isLiked", false);

        map.put("genres", book.getGenres());
        map.put("tags", book.getTags());
        map.put("summary", book.getSummary());
        map.put("description", book.getDescription());

        // Enrich Chapters
        List<Map<String, Object>> enrichedChapters = book.getChapters().stream().map(ch -> {
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", ch.getId());
            cMap.put("title", ch.getTitle());
            cMap.put("wordCount", ch.getWordCount());
            cMap.put("content", ch.getContent());
            cMap.put("status", ch.getStatus());

            // Chapter Stats
            cMap.put("viewCount", ch.getViewCount());
            cMap.put("commentCount", ch.getCommentCount());
            cMap.put("likesCount", ch.getLikes() != null ? ch.getLikes().size() : 0);
            cMap.put("isLiked",
                    currentUserId != null && ch.getLikes() != null && ch.getLikes().contains(currentUserId));

            return cMap;
        }).collect(Collectors.toList());

        map.put("chapters", enrichedChapters);

        map.put("readingStatus", book.getReadingStatus());
        map.put("publicationStatus", book.getPublicationStatus());
        map.put("publishedDate", book.getPublishedDate());
        map.put("lastUpdatedAt", book.getLastUpdatedAt());
        map.put("createdAt", book.getCreatedAt());
        map.put("readCount", book.getReadCount() != null ? book.getReadCount() : 0);
        map.put("readCountLast7Days", book.getReadCountLast7Days() != null ? book.getReadCountLast7Days() : 0);
        map.put("viewCountLast7Days", book.getViewCountLast7Days() != null ? book.getViewCountLast7Days() : 0);
        map.put("isMature", book.isMature());

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
        bookRepository.findAll().forEach(b -> genres.addAll(b.getGenres()));
        return new ArrayList<>(genres);
    }

    public List<Map<String, Object>> getGenresRanked() {
        List<Book> publishedBooks = bookRepository.findByPublicationStatus("published");
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
        List<Book> publishedBooks = bookRepository.findByPublicationStatus("published");
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
        List<Book> books = bookRepository.findByPublicationStatus("published").stream()
                .filter(b -> b.getGenres().stream().anyMatch(g -> g.equalsIgnoreCase(genre)))
                .collect(Collectors.toList());

        // Same transparent sorting as getAllBooks
        switch (sort != null ? sort : "most_read") {
            case "most_viewed":
                books.sort((a, b) -> {
                    int cmp = Integer.compare(
                            b.getViewCountLast7Days() != null ? b.getViewCountLast7Days() : 0,
                            a.getViewCountLast7Days() != null ? a.getViewCountLast7Days() : 0);
                    if (cmp != 0)
                        return cmp;
                    return Integer.compare(
                            b.getViewCount() != null ? b.getViewCount() : 0,
                            a.getViewCount() != null ? a.getViewCount() : 0);
                });
                break;
            case "recent_update":
                books.sort((a, b) -> {
                    java.time.LocalDate dateA = a.getLastUpdatedAt() != null ? a.getLastUpdatedAt()
                            : a.getPublishedDate();
                    java.time.LocalDate dateB = b.getLastUpdatedAt() != null ? b.getLastUpdatedAt()
                            : b.getPublishedDate();
                    if (dateA == null)
                        return 1;
                    if (dateB == null)
                        return -1;
                    return dateB.compareTo(dateA);
                });
                break;
            case "new":
                books.sort((a, b) -> {
                    java.time.LocalDate dateA = a.getCreatedAt() != null ? a.getCreatedAt() : a.getPublishedDate();
                    java.time.LocalDate dateB = b.getCreatedAt() != null ? b.getCreatedAt() : b.getPublishedDate();
                    if (dateA == null)
                        return 1;
                    if (dateB == null)
                        return -1;
                    return dateB.compareTo(dateA);
                });
                break;
            default: // most_read
                books.sort((a, b) -> {
                    int cmp = Integer.compare(
                            b.getReadCountLast7Days() != null ? b.getReadCountLast7Days() : 0,
                            a.getReadCountLast7Days() != null ? a.getReadCountLast7Days() : 0);
                    if (cmp != 0)
                        return cmp;
                    return Integer.compare(
                            b.getReadCount() != null ? b.getReadCount() : 0,
                            a.getReadCount() != null ? a.getReadCount() : 0);
                });
                break;
        }

        int totalElements = books.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        List<Book> pageBooks = books.subList(fromIndex, toIndex);

        String currentUserId = getCurrentUserId();
        List<Map<String, Object>> content = pageBooks.stream()
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("content", content);
        resultMap.put("page", page);
        resultMap.put("size", size);
        resultMap.put("totalElements", totalElements);
        resultMap.put("totalPages", totalPages);
        resultMap.put("hasMore", page < totalPages - 1);
        return resultMap;
    }
}
