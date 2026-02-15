package com.wordweft.book.controller;

import com.wordweft.book.model.Shelf;
import com.wordweft.book.repository.ShelfRepository;
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
@RequestMapping("/api/library")
public class LibraryController {

    @Autowired
    ShelfRepository shelfRepository;
    @Autowired
    UserService userService;

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        throw new RuntimeException("User not authenticated");
    }

    @PostMapping("/shelves")
    public ResponseEntity<?> createShelf(@RequestBody Map<String, String> payload) {
        String userId = getCurrentUserId();
        String name = payload.get("name");

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Shelf name is required");
        }

        Shelf shelf = new Shelf(userId, name.trim());
        shelfRepository.save(shelf);

        // Return updated user profile which includes the new shelf structure
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @GetMapping("/shelves")
    public ResponseEntity<?> getUserShelves() {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(shelfRepository.findByUserId(userId));
    }

    @Autowired
    com.wordweft.book.repository.LibraryRepository libraryRepository;
    @Autowired
    com.wordweft.book.repository.BookRepository bookRepository;

    @PostMapping("/toggle")
    public ResponseEntity<?> toggleBookInLibrary(@RequestBody Map<String, String> payload) {
        String userId = getCurrentUserId();
        String bookId = payload.get("bookId");

        java.util.Optional<com.wordweft.book.model.LibraryEntry> existing = libraryRepository
                .findByUserIdAndBookId(userId, bookId);

        if (existing.isPresent()) {
            libraryRepository.delete(existing.get());
        } else {
            com.wordweft.book.model.LibraryEntry entry = new com.wordweft.book.model.LibraryEntry();
            entry.setUserId(userId);
            entry.setBookId(bookId);
            entry.setAddedDate(LocalDate.now());
            // No shelfIds means "All Books" / "My List" only
            libraryRepository.save(entry);
        }

        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @PostMapping("/books/{bookId}/shelves")
    public ResponseEntity<?> updateBookShelves(@PathVariable String bookId,
            @RequestBody Map<String, List<String>> payload) {
        String userId = getCurrentUserId();
        List<String> shelfIds = payload.get("shelfIds");

        java.util.Optional<com.wordweft.book.model.LibraryEntry> existing = libraryRepository
                .findByUserIdAndBookId(userId, bookId);
        com.wordweft.book.model.LibraryEntry entry;

        if (existing.isPresent()) {
            entry = existing.get();
        } else {
            entry = new com.wordweft.book.model.LibraryEntry();
            entry.setUserId(userId);
            entry.setBookId(bookId);
            entry.setAddedDate(LocalDate.now());
        }

        if (shelfIds != null) {
            entry.setShelfIds(new java.util.HashSet<>(shelfIds));
        } else {
            entry.getShelfIds().clear();
        }

        libraryRepository.save(entry);

        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<?> removeFromLibrary(@PathVariable String bookId) {
        String userId = getCurrentUserId();
        libraryRepository.deleteByUserIdAndBookId(userId, bookId);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }
}
