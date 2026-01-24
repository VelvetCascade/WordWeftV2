
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
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books")
public class BookController {

    @Autowired BookService bookService;
    @Autowired BookRepository bookRepository;
    @Autowired UserService userService;

    @GetMapping
    public ResponseEntity<?> getBooks(@RequestParam(required = false) List<String> genres,
                                      @RequestParam(defaultValue = "Recent") String sortBy) {
        return ResponseEntity.ok(bookService.getAllBooks(genres, sortBy));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookById(@PathVariable String id) {
        Map<String, Object> book = bookService.getBookById(id);
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
    
    // Writer Endpoints
    
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
    
    @PatchMapping("/{bookId}/chapters/{chapterId}")
    public ResponseEntity<?> saveChapter(@PathVariable String bookId, @PathVariable String chapterId, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();
        
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized to edit this book");
        }
        
        Chapter chapter;
        if ("new".equals(chapterId)) {
            chapter = new Chapter();
            book.getChapters().add(chapter);
        } else {
            chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst().orElseThrow();
        }
        
        Map<String, String> data = (Map<String, String>) payload.get("data");
        String status = (String) payload.get("status");
        
        chapter.setTitle(data.get("title"));
        chapter.setContent(data.get("content"));
        chapter.setStatus(status);
        chapter.updateWordCount();
        
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    @PatchMapping("/{bookId}/status")
    public ResponseEntity<?> updateBookStatus(@PathVariable String bookId, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow();
        
        if (!book.getAuthorId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        
        String status = payload.get("status");
        book.setPublicationStatus(status);
        if ("published".equals(status)) {
            book.setPublishedDate(LocalDate.now());
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
        chapter.setStatus("published".equals(chapter.getStatus()) ? "draft" : "published");
        
        bookRepository.save(book);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
}
