package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.StoryElement;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.StoryElementRepository;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books/{bookId}/story-elements")
public class StoryElementController {

    @Autowired
    private StoryElementRepository storyElementRepository;

    @Autowired
    private BookRepository bookRepository;

    private Book getBookOwnedByCurrentUser(String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        if (!book.getAuthorId().equals(userDetails.getId())) {
            throw new RuntimeException("Not authorized");
        }
        return book;
    }

    @GetMapping
    public ResponseEntity<?> list(@PathVariable String bookId, @RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(storyElementRepository.findByBookId(bookId));
        }
        return ResponseEntity.ok(storyElementRepository.findByBookIdAndNameRegexIgnoreCase(bookId, ".*" + q + ".*"));
    }

    @GetMapping("/lookup")
    public ResponseEntity<?> lookup(@PathVariable String bookId, @RequestParam String name) {
        return storyElementRepository.findByBookIdAndNameIgnoreCase(bookId, name)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable String bookId, @RequestBody StoryElement element) {
        getBookOwnedByCurrentUser(bookId);
        element.setId(null);
        element.setBookId(bookId);
        return ResponseEntity.ok(storyElementRepository.save(element));
    }

    @PatchMapping("/{elementId}")
    public ResponseEntity<?> update(@PathVariable String bookId, @PathVariable String elementId, @RequestBody StoryElement updates) {
        getBookOwnedByCurrentUser(bookId);
        StoryElement element = storyElementRepository.findById(elementId).orElseThrow(() -> new RuntimeException("Element not found"));
        if (!bookId.equals(element.getBookId())) {
            return ResponseEntity.badRequest().body("Element does not belong to this book");
        }
        if (updates.getName() != null) element.setName(updates.getName());
        if (updates.getCategory() != null) element.setCategory(updates.getCategory());
        if (updates.getDescription() != null) element.setDescription(updates.getDescription());
        if (updates.getImageUrl() != null) element.setImageUrl(updates.getImageUrl());
        return ResponseEntity.ok(storyElementRepository.save(element));
    }

    @DeleteMapping("/{elementId}")
    public ResponseEntity<?> delete(@PathVariable String bookId, @PathVariable String elementId) {
        getBookOwnedByCurrentUser(bookId);
        StoryElement element = storyElementRepository.findById(elementId).orElseThrow(() -> new RuntimeException("Element not found"));
        if (!bookId.equals(element.getBookId())) {
            return ResponseEntity.badRequest().body("Element does not belong to this book");
        }
        storyElementRepository.deleteById(elementId);
        return ResponseEntity.ok().build();
    }
}
