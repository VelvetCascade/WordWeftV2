
package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books")
public class BookController {

    @Autowired BookService bookService;
    @Autowired BookRepository bookRepository;
    @Autowired UserService userService;

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        throw new RuntimeException("User not authenticated");
    }

    @GetMapping
    public ResponseEntity<?> getBooks(@RequestParam(required = false) List<String> genres,
                                      @RequestParam(defaultValue = "Recent") String sortBy) {
        return ResponseEntity.ok(bookService.getAllBooks(genres, sortBy));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookById(@PathVariable String id) {
        // Increment view count for normal page loads
        Map<String, Object> book = bookService.getBookById(id, true);
        if (book == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(book);
    }
    
    @GetMapping("/author/{authorId}")
    public ResponseEntity<?> getBooksByAuthor(@PathVariable String authorId) {
        return ResponseEntity.ok(bookService.getBooksByAuthor(authorId));
    }
    
    @GetMapping("/genres")
    public ResponseEntity<?> getGenres() {
        return ResponseEntity.ok(bookService.getAllGenres());
    }
    
    // --- Stats Interaction ---
    
    @PostMapping("/{bookId}/chapters/{chapterId}/like")
    public ResponseEntity<?> toggleChapterLike(@PathVariable String bookId, @PathVariable String chapterId) {
        String userId = getCurrentUserId();
        Book book = bookRepository.findById(bookId).orElseThrow();
        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        
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
    
    @PostMapping("/{bookId}/chapters/{chapterId}/view")
    public ResponseEntity<?> incrementChapterView(@PathVariable String bookId, @PathVariable String chapterId) {
        Book book = bookRepository.findById(bookId).orElseThrow();
        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        
        chapter.setViewCount(chapter.getViewCount() + 1);
        bookRepository.save(book);
        
        return ResponseEntity.ok().build();
    }
    
    // --- Writer Endpoints ---
    
    @PostMapping
    public ResponseEntity<?> createBook(@RequestBody Book book) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        book.setAuthorId(userDetails.getId());
        book.setPublicationStatus("draft");
        if(book.getCoverUrl() == null || book.getCoverUrl().isEmpty()){
            book.setCoverUrl("https://picsum.photos/seed/" + System.currentTimeMillis() + "/400/600");
        }
        bookRepository.save(book);
        
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    // Update Book Details (Title, Description, Cover)
    @PatchMapping("/{bookId}")
    public ResponseEntity<?> updateBookDetails(@PathVariable String bookId, @RequestBody Book updates) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        
        if (updates.getTitle() != null) book.setTitle(updates.getTitle());
        if (updates.getDescription() != null) book.setDescription(updates.getDescription());
        if (updates.getSummary() != null) book.setSummary(updates.getSummary());
        if (updates.getCoverUrl() != null) book.setCoverUrl(updates.getCoverUrl());
        if (updates.getGenres() != null) book.setGenres(updates.getGenres());
        if (updates.isMature() != book.isMature()) book.setMature(updates.isMature());
        
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    @PatchMapping("/{bookId}/chapters/{chapterId}")
    public ResponseEntity<?> saveChapter(@PathVariable String bookId, @PathVariable String chapterId, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();

        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized to edit this book");
        }

        Chapter chapter;
        boolean isNew = "new".equals(chapterId);

        if (isNew) {
            chapter = new Chapter();
            chapter.setSortOrder(book.getChapters().size());
            book.getChapters().add(chapter);
        } else {
            chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        }

        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        String status = (String) payload.get("status");

        chapter.setTitle((String) data.getOrDefault("title", chapter.getTitle()));
        chapter.setContent((String) data.getOrDefault("content", chapter.getContent()));
        chapter.setContentJson((String) data.getOrDefault("contentJson", chapter.getContentJson()));
        chapter.setPovCharacter((String) data.getOrDefault("povCharacter", chapter.getPovCharacter()));
        chapter.setWorkflowStatus((String) data.getOrDefault("workflowStatus", chapter.getWorkflowStatus()));
        chapter.updateWordCount();

        if ("published".equals(status) && !"published".equals(chapter.getStatus())) {
            chapter.setStatus("published");
            if ("published".equals(book.getPublicationStatus())) {
                book.setPublishedDate(LocalDate.now());
            }
        } else if ("draft".equals(status)) {
            chapter.setStatus("draft");
        }

        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PatchMapping("/{bookId}/chapters/reorder")
    public ResponseEntity<?> reorderChapters(@PathVariable String bookId, @RequestBody Map<String, List<String>> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        List<String> orderedIds = payload.get("chapterIds");
        if (orderedIds == null || orderedIds.isEmpty()) {
            return ResponseEntity.badRequest().body("chapterIds required");
        }

        for (int i = 0; i < orderedIds.size(); i++) {
            String id = orderedIds.get(i);
            book.getChapters().stream().filter(c -> c.getId().equals(id)).findFirst().ifPresent(c -> c.setSortOrder(i));
        }

        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PostMapping("/{bookId}/chapters/{chapterId}/scrapyard")
    public ResponseEntity<?> addScrapyardSnippet(@PathVariable String bookId, @PathVariable String chapterId, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        String snippet = payload.get("snippet");
        if (snippet == null || snippet.isBlank()) {
            return ResponseEntity.badRequest().body("snippet required");
        }
        chapter.getScrapyardSnippets().add(0, snippet);
        bookRepository.save(book);
        return ResponseEntity.ok(chapter.getScrapyardSnippets());
    }

    @PatchMapping("/{bookId}/status")
    public ResponseEntity<?> updateBookStatus(@PathVariable String bookId, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
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
            book.setPublicationStatus("published");
            // Set date only if it wasn't set before or if we want to bump it
            if (book.getPublishedDate() == null) {
                book.setPublishedDate(LocalDate.now());
            }
        } else {
            book.setPublicationStatus("draft");
        }
        
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    @PatchMapping("/{bookId}/chapters/{chapterId}/status")
    public ResponseEntity<?> toggleChapterStatus(@PathVariable String bookId, @PathVariable String chapterId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();
        
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        
        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        String newStatus = "published".equals(chapter.getStatus()) ? "draft" : "published";
        chapter.setStatus(newStatus);
        
        // If we just published a chapter and the book is public, bump the date
        if ("published".equals(newStatus) && "published".equals(book.getPublicationStatus())) {
            book.setPublishedDate(LocalDate.now());
        }
        
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
}
