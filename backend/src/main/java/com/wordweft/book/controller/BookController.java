
package com.wordweft.book.controller;

import com.wordweft.analytics.service.ChapterReadEventService;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.book.service.ChapterContentService;
import com.wordweft.book.service.ChapterPublishingService;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.manuscript.service.ManuscriptImportService;
import com.wordweft.manuscript.model.ChapterRevision;
import com.wordweft.manuscript.service.ChapterRevisionService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books")
public class BookController {
    private static final Set<String> STORY_STATUSES = Set.of("Ongoing", "Hiatus", "Completed");

    private static <T> ResponseEntity<T> viewerScoped(T body) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
                .body(body);
    }

    @Autowired
    BookService bookService;
    @Autowired
    BookRepository bookRepository;
    @Autowired
    UserService userService;
    @Autowired
    NotificationService notificationService;
    @Autowired
    ChapterPublishingService chapterPublishingService;
    @Autowired
    ChapterReadEventService chapterReadEventService;
    @Autowired
    ManuscriptImportService manuscriptImportService;
    @Autowired
    ChapterRevisionService chapterRevisionService;
    @Autowired
    ChapterContentService chapterContentService;
    @Autowired
    com.wordweft.support.ImageKitService imageKitService;
    @Autowired(required = false)
    UserRepository userRepository;
    @Autowired(required = false)
    ContentAccessService contentAccessService;
    @Autowired(required = false)
    com.wordweft.book.service.ChapterImageStorageService chapterImageStorageService;

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        throw new RuntimeException("User not authenticated");
    }

    private String getOptionalCurrentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return principal instanceof UserDetailsImpl ? ((UserDetailsImpl) principal).getId() : null;
        } catch (RuntimeException unauthenticated) {
            return null;
        }
    }

    @GetMapping
    public ResponseEntity<?> getBooks(
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String genre,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return viewerScoped(bookService.getAllBooks(sort, genre, page, size));
    }

    @GetMapping("/home-genres")
    public ResponseEntity<?> getHomeGenres() {
        return viewerScoped(bookService.getHomeGenres());
    }

    @GetMapping("/genre/{name}")
    public ResponseEntity<?> getBooksByGenre(
            @PathVariable String name,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return viewerScoped(bookService.getBooksByGenre(name, sort, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookById(@PathVariable String id) {
        // Increment view count for normal page loads
        Map<String, Object> book = bookService.getBookById(id, true);
        if (book == null)
            return ResponseEntity.notFound().build();
        return viewerScoped(book);
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/content")
    public ResponseEntity<ChapterContentResponse> getChapterContent(
            @PathVariable String bookId,
            @PathVariable String chapterId) {
        ChapterContentResponse content = chapterContentService.load(bookId, chapterId);
        return viewerScoped(content);
    }

    @GetMapping("/author/{authorId}")
    public ResponseEntity<?> getBooksByAuthor(@PathVariable String authorId) {
        return viewerScoped(bookService.getBooksByAuthor(authorId));
    }

    @GetMapping("/genres")
    public ResponseEntity<?> getGenres() {
        return ResponseEntity.ok(bookService.getAllGenres());
    }

    @GetMapping("/genres/ranked")
    public ResponseEntity<?> getGenresRanked() {
        return ResponseEntity.ok(bookService.getGenresRanked());
    }

    // --- Stats Interaction ---

    @PostMapping("/{bookId}/chapters/{chapterId}/like")
    public ResponseEntity<?> toggleChapterLike(@PathVariable String bookId, @PathVariable String chapterId) {
        String userId = getCurrentUserId();
        Book book = bookRepository.findById(bookId).orElseThrow();
        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst()
                .orElseThrow();

        if (chapter.getLikes() == null) {
            chapter.setLikes(new HashSet<>());
        }

        if (chapter.getLikes().contains(userId)) {
            chapter.getLikes().remove(userId);
        } else {
            chapter.getLikes().add(userId);
        }

        bookRepository.save(book);

        // Do NOT increment view count when toggling a like
        return ResponseEntity.ok(bookService.getBookById(bookId, false));
    }

    public record ChapterViewRequest(String sessionId, String referrer) {}

    @PostMapping("/{bookId}/chapters/{chapterId}/view")
    public ResponseEntity<Void> incrementChapterView(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @RequestBody(required = false) ChapterViewRequest request) {
        ChapterViewRequest body = request != null ? request : new ChapterViewRequest(null, null);
        chapterReadEventService.record(
                bookId,
                chapterId,
                getOptionalCurrentUserId(),
                body.sessionId(),
                body.referrer(),
                Instant.now());
        return ResponseEntity.noContent().build();
    }

    public record ScheduleChapterRequest(Instant scheduledAt) {}

    @PutMapping("/{bookId}/chapters/{chapterId}/schedule")
    public ResponseEntity<?> scheduleChapter(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @RequestBody ScheduleChapterRequest request) {
        String userId = getCurrentUserId();
        chapterPublishingService.schedule(userId, bookId, chapterId, request.scheduledAt());
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @DeleteMapping("/{bookId}/chapters/{chapterId}/schedule")
    public ResponseEntity<?> cancelChapterSchedule(
            @PathVariable String bookId,
            @PathVariable String chapterId) {
        String userId = getCurrentUserId();
        chapterPublishingService.cancelSchedule(userId, bookId, chapterId);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    // --- Writer Endpoints ---

    @PostMapping(value = "/{bookId}/import", consumes = "multipart/form-data")
    public ResponseEntity<?> importManuscript(
            @PathVariable String bookId,
            @RequestPart("file") MultipartFile file) throws java.io.IOException {
        String userId = getCurrentUserId();
        ManuscriptImportService.ImportResult result = manuscriptImportService.importManuscript(
                userId, bookId, file.getOriginalFilename(), file.getBytes());
        return ResponseEntity.ok(Map.of(
                "result", result,
                "user", userService.getUserProfile(userId)));
    }

    @PostMapping(value = "/{bookId}/chapters/images", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadChapterImage(
            @PathVariable String bookId,
            @RequestParam("file") MultipartFile file) {
        String userId = getCurrentUserId();
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Story not found."));
        if (!userId.equals(book.getAuthorId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "You do not have permission to edit this story.");
        }
        if (chapterImageStorageService == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Image storage service not available.");
        }
        var uploadResult = chapterImageStorageService.uploadChapterImage(bookId, file);
        return ResponseEntity.ok(Map.of(
                "url", uploadResult.url(),
                "filename", uploadResult.filename()));
    }

    private final java.util.concurrent.ConcurrentHashMap<String, Long> bookCreationDebounce = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<?> createBook(@Valid @RequestBody Book book) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        String debounceKey = userDetails.getId() + ":" + (book.getTitle() != null ? book.getTitle().trim().toLowerCase(java.util.Locale.ROOT) : "");
        Long lastCreated = bookCreationDebounce.get(debounceKey);
        long now = System.currentTimeMillis();
        if (lastCreated != null && (now - lastCreated) < 5000) {
            return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
        }
        bookCreationDebounce.put(debounceKey, now);

        book.setAuthorId(userDetails.getId());
        book.setPublicationStatus("draft");
        book.setCreatedAt(LocalDate.now());
        if (!STORY_STATUSES.contains(book.getReadingStatus())) book.setReadingStatus("Ongoing");
        if (book.getAgeRating() == null) book.setAgeRating(AgeRating.ALL_AGES);
        book.setMature(book.getAgeRating().getMinimumAge() >= 18);
        if ((book.isMature() || book.getAgeRating().getMinimumAge() >= 18) && contentAccessService != null && userRepository != null) {
            User author = userRepository.findById(userDetails.getId()).orElse(null);
            contentAccessService.validateAuthorCanPostRating(author, book.getAgeRating());
        }
        if (book.getCoverUrl() == null || book.getCoverUrl().isEmpty()) {
            book.setCoverUrl("https://picsum.photos/seed/" + System.currentTimeMillis() + "/400/600");
        }
        bookRepository.save(book);

        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    // Update Book Details (Title, Description, Cover)
    @PatchMapping("/{bookId}")
    public ResponseEntity<?> updateBookDetails(@PathVariable String bookId, @RequestBody Book updates) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        if (updates.getTitle() != null)
            book.setTitle(updates.getTitle());
        if (updates.getDescription() != null)
            book.setDescription(updates.getDescription());
        if (updates.getSummary() != null)
            book.setSummary(updates.getSummary());
        if (updates.getCoverUrl() != null) {
            if (!updates.getCoverUrl().equals(book.getCoverUrl()) && book.getCoverFileId() != null) {
                imageKitService.deleteFile(book.getCoverFileId());
            }
            book.setCoverUrl(updates.getCoverUrl());
            book.setCoverFileId(updates.getCoverFileId());
        }
        if (updates.getGenres() != null)
            book.setGenres(updates.getGenres());
        if (updates.getCategory() != null)
            book.setCategory(updates.getCategory());
        if (updates.getReadingStatus() != null) {
            if (!STORY_STATUSES.contains(updates.getReadingStatus())) {
                return ResponseEntity.badRequest().body("Story status must be Ongoing, Hiatus, or Completed.");
            }
            book.setReadingStatus(updates.getReadingStatus());
        }
        if (updates.getAgeRating() != null) {
            AgeRating minRequired = ContentAccessService.computeMinimumRatingFromChapters(book);
            if (updates.getAgeRating().getMinimumAge() < minRequired.getMinimumAge()) {
                return ResponseEntity.badRequest().body("Cannot lower age rating to " + updates.getAgeRating()
                        + " because existing chapters contain content warnings that require at least " + minRequired + ".");
            }
            if (updates.getAgeRating().getMinimumAge() >= 18 && contentAccessService != null && userRepository != null) {
                User author = userRepository.findById(userDetails.getId()).orElse(null);
                contentAccessService.validateAuthorCanPostRating(author, updates.getAgeRating());
            }
            book.setAgeRating(updates.getAgeRating());
            book.setMature(updates.getAgeRating().getMinimumAge() >= 18);
        }
        if (updates.getContentWarnings() != null)
            book.setContentWarnings(updates.getContentWarnings());
        if (updates.getCustomDisclaimer() != null)
            book.setCustomDisclaimer(updates.getCustomDisclaimer());
        if (updates.isAIGenerated() != book.isAIGenerated())
            book.setAIGenerated(updates.isAIGenerated());

        if ("published".equals(book.getPublicationStatus())) book.setLastUpdatedAt(LocalDate.now());
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PatchMapping("/{bookId}/chapters/{chapterId}")
    public ResponseEntity<?> saveChapter(@PathVariable String bookId, @PathVariable String chapterId,
            @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized to edit this book");
        }

        Chapter chapter;
        boolean isNew = "new".equals(chapterId);

        if (isNew) {
            chapter = new Chapter();
            book.getChapters().add(chapter);
        } else {
            java.util.Optional<Chapter> existing = book.getChapters().stream()
                    .filter(c -> chapterId.equals(c.getId()))
                    .findFirst();
            if (existing.isPresent()) {
                chapter = existing.get();
            } else {
                chapter = new Chapter();
                chapter.setId(chapterId);
                book.getChapters().add(chapter);
                isNew = true;
            }
        }

        Map<String, String> data = (Map<String, String>) payload.get("data");
        String status = (String) payload.get("status");

        if (!isNew) {
            String reason = "published".equals(status) ? "PUBLISH"
                    : "draft".equals(status) ? "MANUAL_SAVE" : "AUTOSAVE";
            chapterRevisionService.capture(
                    userDetails.getId(), book, chapter, reason, !"preserve".equals(status));
        }

        chapter.setTitle(data.get("title"));
        chapter.setContent(data.get("content"));
        Object warningValue = payload.get("contentWarnings");
        if (warningValue instanceof List<?>) {
            List<String> warnings = ((List<?>) warningValue).stream().map(String::valueOf).toList();
            chapter.setContentWarnings(warnings);

            AgeRating requiredRating = ContentAccessService.requiredRatingForWarnings(warnings);
            if (requiredRating.getMinimumAge() > (book.getAgeRating() != null ? book.getAgeRating().getMinimumAge() : 0)) {
                book.setAgeRating(requiredRating);
            }
            if (requiredRating.getMinimumAge() >= 18) {
                book.setMature(true);
            }

            if ((book.isMature() || (book.getAgeRating() != null && book.getAgeRating().getMinimumAge() >= 18)) && contentAccessService != null && userRepository != null) {
                User author = userRepository.findById(userDetails.getId()).orElse(null);
                contentAccessService.validateAuthorCanPostRating(author, book.getAgeRating());
            }

            if (book.getContentWarnings() == null) {
                book.setContentWarnings(new ArrayList<>());
            }
            for (String w : warnings) {
                if (!book.getContentWarnings().contains(w)) {
                    book.getContentWarnings().add(w);
                }
            }
        }
        Object disclaimerValue = payload.get("disclaimerNote");
        if (disclaimerValue != null) chapter.setDisclaimerNote(String.valueOf(disclaimerValue));
        chapter.updateWordCount();

        boolean publishAfterSave = "published".equals(status) && !"published".equals(chapter.getStatus());
        if (publishAfterSave || "draft".equals(status)) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
        }

        bookRepository.save(book);
        if (publishAfterSave) {
            chapterPublishingService.publishNow(userDetails.getId(), bookId, chapter.getId());
        }
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PatchMapping("/{bookId}/status")
    public ResponseEntity<?> updateBookStatus(@PathVariable String bookId, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        String status = payload.get("status");

        if ("published".equals(status)) {
            // VALIDATION: Cannot publish book with 0 published chapters
            boolean hasPublishedChapters = book.getChapters().stream().anyMatch(c -> "published".equals(c.getStatus()));
            if (!hasPublishedChapters) {
                return ResponseEntity.badRequest().body("Cannot publish a book with no published chapters.");
            }
            AgeRating effective = contentAccessService != null ? contentAccessService.effectiveRating(book) : (book.getAgeRating() != null ? book.getAgeRating() : AgeRating.ALL_AGES);
            if ((effective.getMinimumAge() >= 18 || book.isMature()) && contentAccessService != null && userRepository != null) {
                User author = userRepository.findById(userDetails.getId()).orElse(null);
                contentAccessService.validateAuthorCanPostRating(author, effective);
            }
            book.setPublicationStatus("published");
            // Set date only if it wasn't set before or if we want to bump it
            if (book.getPublishedDate() == null) {
                book.setPublishedDate(LocalDate.now());
            }

            // Notify followers about new story
            java.util.Map<String, String> meta = new java.util.HashMap<>();
            meta.put("bookTitle", book.getTitle());
            meta.put("bookId", bookId);
            meta.put("coverUrl", book.getCoverUrl() != null ? book.getCoverUrl() : "");
            notificationService.notifyFollowers(
                    userDetails.getId(), "AUTHOR_NEW_STORY", "BOOK", bookId,
                    "published a new story \"" + book.getTitle() + "\"", meta);
        } else {
            book.setPublicationStatus("draft");
        }

        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PatchMapping("/{bookId}/chapters/{chapterId}/status")
    public ResponseEntity<?> toggleChapterStatus(@PathVariable String bookId, @PathVariable String chapterId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst()
                .orElseThrow();
        chapterRevisionService.capture(userDetails.getId(), book, chapter, "STATUS_CHANGE", true);
        if ("published".equals(chapter.getStatus())) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            bookRepository.save(book);
        } else {
            chapterPublishingService.publishNow(userDetails.getId(), bookId, chapterId);
        }

        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/revisions")
    public ResponseEntity<List<ChapterRevision>> getChapterRevisions(
            @PathVariable String bookId,
            @PathVariable String chapterId) {
        return ResponseEntity.ok(chapterRevisionService.list(getCurrentUserId(), bookId, chapterId));
    }

    @PostMapping("/{bookId}/chapters/{chapterId}/revisions/{revisionId}/restore")
    public ResponseEntity<?> restoreChapterRevision(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @PathVariable String revisionId) {
        String userId = getCurrentUserId();
        chapterRevisionService.restore(userId, bookId, chapterId, revisionId);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    // --- Delete Endpoints ---

    @DeleteMapping("/{bookId}")
    public ResponseEntity<?> deleteBook(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized to delete this book");
        }

        if (book.getCoverFileId() != null) {
            imageKitService.deleteFile(book.getCoverFileId());
        }

        bookService.deleteBook(bookId);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @DeleteMapping("/{bookId}/chapters/{chapterId}")
    public ResponseEntity<?> deleteChapter(@PathVariable String bookId, @PathVariable String chapterId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized to edit this book");
        }

        book.getChapters().removeIf(c -> c.getId().equals(chapterId));
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
}
