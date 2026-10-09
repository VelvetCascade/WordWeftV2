
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
import com.wordweft.book.service.PublishedChapterView;
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

@CrossOrigin(origins = "*", maxAge = 3600, exposedHeaders = "X-Chapter-Revision")
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
    com.wordweft.book.service.ChapterOrganizationService chapterOrganizationService;
    @Autowired
    ChapterContentService chapterContentService;
    @Autowired
    com.wordweft.book.service.ChapterWriteService chapterWriteService;
    @Autowired
    com.wordweft.support.ImageKitService imageKitService;
    @Autowired(required = false)
    UserRepository userRepository;
    @Autowired(required = false)
    ContentAccessService contentAccessService;
    @Autowired(required = false)
    com.wordweft.book.service.ChapterImageStorageService chapterImageStorageService;

    private ResponseEntity<?> revisionResponse(String userId, Book committed, String chapterId) {
        var response = ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store");
        if (committed != null) committed.getChapters().stream().filter(c -> chapterId.equals(c.getId())).findFirst()
                .ifPresent(c -> response.header("X-Chapter-Revision", String.valueOf(c.getEditRevision())));
        return response.body(userService.getUserProfile(userId));
    }

    private String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Sign in to manage this story.");
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

    @GetMapping("/hero")
    public ResponseEntity<?> getDiscoveryHero() {
        return viewerScoped(bookService.getDiscoveryHero());
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
            @PathVariable String chapterId,
            @RequestParam(required = false) String mode) {
        ChapterContentResponse content = (mode != null && !mode.isBlank() && !"read".equalsIgnoreCase(mode))
                ? chapterContentService.load(bookId, chapterId, mode)
                : chapterContentService.load(bookId, chapterId);
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

        chapterWriteService.toggleChapterLike(bookId, chapterId, userId, !chapter.getLikes().contains(userId));

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

    public record ScheduleChapterRequest(Instant scheduledAt, Long expectedRevision) {}

    @PutMapping("/{bookId}/chapters/{chapterId}/schedule")
    public ResponseEntity<?> scheduleChapter(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @RequestBody ScheduleChapterRequest request) {
        String userId = getCurrentUserId();
        Book committed = request.expectedRevision() == null
                ? chapterPublishingService.schedule(userId, bookId, chapterId, request.scheduledAt())
                : chapterPublishingService.schedule(userId, bookId, chapterId, request.scheduledAt(), request.expectedRevision());
        return revisionResponse(userId, committed, chapterId);
    }

    @DeleteMapping("/{bookId}/chapters/{chapterId}/schedule")
    public ResponseEntity<?> cancelChapterSchedule(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @RequestParam(required = false) Long expectedRevision) {
        String userId = getCurrentUserId();
        Book committed = expectedRevision == null ? chapterPublishingService.cancelSchedule(userId, bookId, chapterId)
                : chapterPublishingService.cancelSchedule(userId, bookId, chapterId, expectedRevision);
        return revisionResponse(userId, committed, chapterId);
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

    @PostMapping(value = "/{bookId}/import/preflight", consumes = "multipart/form-data")
    public ResponseEntity<?> preflightManuscript(@PathVariable String bookId, @RequestPart("file") MultipartFile file) throws java.io.IOException {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(manuscriptImportService.preflight(getCurrentUserId(), bookId, file.getOriginalFilename(), file.getBytes()));
    }

    public record UndoImportRequest(String importId) {}
    @PostMapping("/{bookId}/import/undo")
    public ResponseEntity<?> undoManuscriptImport(@PathVariable String bookId, @RequestBody UndoImportRequest request) {
        String userId = getCurrentUserId();
        int removed = manuscriptImportService.undo(userId, bookId, request.importId());
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(Map.of("removedChapters", removed, "user", userService.getUserProfile(userId)));
    }

    @PostMapping("/{bookId}/chapters/{chapterId}/duplicate")
    public ResponseEntity<?> duplicateChapter(@PathVariable String bookId, @PathVariable String chapterId) {
        String userId = getCurrentUserId();
        Chapter copy = chapterOrganizationService.duplicate(userId, bookId, chapterId);
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(Map.of("chapterId", copy.getId(), "user", userService.getUserProfile(userId)));
    }

    public record ChapterOrderRequest(List<String> chapterIds) {}
    @PutMapping("/{bookId}/chapters/order")
    public ResponseEntity<?> reorderChapters(@PathVariable String bookId, @RequestBody ChapterOrderRequest request) {
        String userId = getCurrentUserId();
        chapterOrganizationService.reorder(userId, bookId, request.chapterIds());
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(userService.getUserProfile(userId));
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
        bookRepository.save(book);

        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    // Update Book Details (Title, Description, Cover)
    @PatchMapping("/{bookId}")
    public ResponseEntity<?> patchBookDetails(@PathVariable String bookId, @RequestBody Map<String, Object> payload) {
        final Book updates;
        try {
            updates = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules()
                    .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                    .convertValue(payload, Book.class);
        } catch (IllegalArgumentException invalid) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Check the story metadata values.");
        }
        // Model defaults belong to creation, not sparse metadata updates.
        if (!payload.containsKey("genres")) updates.setGenres(null);
        if (!payload.containsKey("tags")) updates.setTags(null);
        if (!payload.containsKey("readingStatus")) updates.setReadingStatus(null);
        if (!payload.containsKey("ageRating")) updates.setAgeRating(null);
        if (!payload.containsKey("contentWarnings")) updates.setContentWarnings(null);
        return updateBookDetails(bookId, updates, payload.containsKey("isAIGenerated"));
    }

    public ResponseEntity<?> updateBookDetails(String bookId, Book updates) {
        return updateBookDetails(bookId, updates, true);
    }

    private ResponseEntity<?> updateBookDetails(String bookId, Book updates, boolean updateAiDeclaration) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        var snapshot = com.wordweft.book.service.ChapterWriteService.snapshotQuery(book);
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
        if (updates.getTags() != null)
            book.setTags(updates.getTags());
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
        if (updateAiDeclaration && updates.isAIGenerated() != book.isAIGenerated())
            book.setAIGenerated(updates.isAIGenerated());

        if ("published".equals(book.getPublicationStatus())) book.setLastUpdatedAt(LocalDate.now());
        chapterWriteService.updateMetadata(book, snapshot);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/edit-session")
    public ResponseEntity<?> editSession(@PathVariable String bookId, @PathVariable String chapterId) {
        Book book = bookRepository.findById(bookId).orElseThrow();
        if (!book.getAuthorId().equals(getCurrentUserId())) return ResponseEntity.status(403).build();
        Chapter chapter = book.getChapters().stream().filter(c -> chapterId.equals(c.getId())).findFirst().orElseThrow();
        return viewerScoped(chapter);
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/publication-impact")
    public ResponseEntity<?> publicationImpact(@PathVariable String bookId, @PathVariable String chapterId) {
        return viewerScoped(chapterPublishingService.reviewPublication(getCurrentUserId(), bookId, chapterId));
    }

    public record ReviewedPublicationRequest(String reviewToken) {}
    @PostMapping("/{bookId}/chapters/{chapterId}/publish-reviewed")
    public ResponseEntity<?> publishReviewed(@PathVariable String bookId, @PathVariable String chapterId,
            @RequestBody ReviewedPublicationRequest request) {
        Book committed = chapterPublishingService.publishReviewed(getCurrentUserId(), bookId, chapterId, request.reviewToken());
        return revisionResponse(getCurrentUserId(), committed, chapterId);
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

        Long expectedRevision = payload.get("expectedRevision") instanceof Number n ? n.longValue() : null;
        com.wordweft.book.service.ChapterWriteService.requireRevision(chapter, expectedRevision);
        long previousRevision = chapter.getEditRevision();
        Map<String, String> data = (Map<String, String>) payload.get("data");
        String status = (String) payload.get("status");

        if (!isNew) {
            String reason = "published".equals(status) ? "PUBLISH"
                    : "draft".equals(status) ? "MANUAL_SAVE" : "AUTOSAVE";
            chapterRevisionService.capture(
                    userDetails.getId(), book, chapter, reason, !"preserve".equals(status) || Boolean.TRUE.equals(payload.get("preserveServerRevision")));
            PublishedChapterView.preserveLegacySnapshot(chapter);
        }

        chapter.setTitle(data.get("title"));
        chapter.setContent(data.get("content"));
        Object warningValue = payload.get("contentWarnings");
        if (warningValue instanceof List<?>) {
            List<String> warnings = ((List<?>) warningValue).stream().map(String::valueOf).toList();
            chapter.setContentWarnings(warnings);
        }
        Object disclaimerValue = payload.get("disclaimerNote");
        if (disclaimerValue != null) chapter.setDisclaimerNote(String.valueOf(disclaimerValue));
        chapter.updateWordCount();

        boolean publishAfterSave = "published".equals(status);
        if ((publishAfterSave && !"published".equals(chapter.getStatus()))
                || ("draft".equals(status) && !"published".equals(chapter.getStatus()))) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
        }

        chapter.setEditRevision(previousRevision + 1);
        chapterWriteService.save(book, chapter, isNew, previousRevision);
        if (publishAfterSave) {
            book = chapterPublishingService.publishNow(userDetails.getId(), bookId, chapter.getId());
        }
        return revisionResponse(userDetails.getId(), book, chapter.getId());
    }

    @PatchMapping("/{bookId}/status")
    public ResponseEntity<?> updateBookStatus(@PathVariable String bookId, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        String status = String.valueOf(payload.get("status"));

        if ("published".equals(status)) {
            Object selected = payload.get("chapterIds");
            List<String> selectedChapterIds = selected instanceof List<?>
                    ? ((List<?>) selected).stream().map(String::valueOf).toList()
                    : book.getChapters().stream()
                            .filter(chapter -> "published".equals(chapter.getStatus()))
                            .map(Chapter::getId).toList();
            if (selectedChapterIds.isEmpty() && !book.getChapters().isEmpty()) {
                selectedChapterIds = List.of(book.getChapters().get(0).getId());
            }
            chapterPublishingService.publishStory(userDetails.getId(), bookId, selectedChapterIds);
        } else {
            chapterPublishingService.unpublishStory(userDetails.getId(), bookId);
        }
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
            chapterPublishingService.unpublishChapter(userDetails.getId(), bookId, chapterId);
        } else {
            chapterPublishingService.publishNow(userDetails.getId(), bookId, chapterId);
        }

        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/revisions")
    public ResponseEntity<List<ChapterRevision>> getChapterRevisions(
            @PathVariable String bookId,
            @PathVariable String chapterId) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(chapterRevisionService.list(getCurrentUserId(), bookId, chapterId));
    }

    @GetMapping("/{bookId}/chapters/{chapterId}/revisions/{revisionId}")
    public ResponseEntity<ChapterRevision> getChapterRevision(@PathVariable String bookId, @PathVariable String chapterId, @PathVariable String revisionId) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(chapterRevisionService.get(getCurrentUserId(), bookId, chapterId, revisionId));
    }

    public record CheckpointRequest(String label, Long expectedRevision) {}
    @PostMapping("/{bookId}/chapters/{chapterId}/revisions")
    public ResponseEntity<ChapterRevision> checkpointChapter(@PathVariable String bookId, @PathVariable String chapterId, @RequestBody(required = false) CheckpointRequest request) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(chapterRevisionService.checkpoint(getCurrentUserId(), bookId, chapterId, request == null ? null : request.label(), request == null ? null : request.expectedRevision()));
    }

    public ResponseEntity<?> restoreChapterRevision(String bookId, String chapterId, String revisionId, Long expectedRevision) {
        return restoreChapterRevision(bookId, chapterId, revisionId, expectedRevision, null);
    }

    @PostMapping("/{bookId}/chapters/{chapterId}/revisions/{revisionId}/restore")
    public ResponseEntity<?> restoreChapterRevision(
            @PathVariable String bookId,
            @PathVariable String chapterId,
            @PathVariable String revisionId,
            @RequestParam(required = false) Long expectedRevision,
            @RequestParam(required = false) String mode) {
        String userId = getCurrentUserId();
        if (mode != null && !java.util.Set.of("working-draft", "withdraw").contains(mode)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Choose working-draft or withdraw restore mode.");
        Book committed = "working-draft".equals(mode) ? chapterRevisionService.restore(userId, bookId, chapterId, revisionId, expectedRevision, true)
                : expectedRevision == null ? chapterRevisionService.restore(userId, bookId, chapterId, revisionId)
                : chapterRevisionService.restore(userId, bookId, chapterId, revisionId, expectedRevision);
        return revisionResponse(userId, committed, chapterId);
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

        int deletedChapterIndex = -1;
        for (int index = 0; index < book.getChapters().size(); index++) {
            if (chapterId.equals(book.getChapters().get(index).getId())) {
                deletedChapterIndex = index;
                break;
            }
        }
        if (deletedChapterIndex < 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Chapter not found.");
        }
        var snapshot = com.wordweft.book.service.ChapterWriteService.snapshotQuery(book);
        chapterWriteService.deleteChapter(book, chapterId, snapshot);
        book.getChapters().remove(deletedChapterIndex);
        bookService.deleteChapterData(bookId, chapterId, deletedChapterIndex, book.getChapters().size());
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
}
