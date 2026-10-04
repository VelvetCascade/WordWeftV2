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

        if (name == null || name.trim().isEmpty() || name.trim().length() > 100) {
            return ResponseEntity.badRequest().body("Shelf name is required");
        }

        Shelf shelf = new Shelf(userId, name.trim());
        String visibility = payload.getOrDefault("visibility", "PRIVATE");
        if (!List.of("PRIVATE", "PUBLIC").contains(visibility == null ? "" : visibility)) return ResponseEntity.badRequest().body("Choose Private or Public.");
        shelf.setVisibility(visibility);
        shelfRepository.save(shelf);

        // Return updated user profile which includes the new shelf structure
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @DeleteMapping("/shelves/{shelfId}")
    public ResponseEntity<?> deleteShelf(@PathVariable String shelfId) {
        String userId = getCurrentUserId();
        Shelf shelf = shelfRepository.findById(shelfId).orElse(null);
        if (shelf == null || !userId.equals(shelf.getUserId())) return ResponseEntity.notFound().build();
        var affected = libraryRepository.findByUserId(userId).stream()
                .filter(entry -> entry.getShelfIds() != null && entry.getShelfIds().contains(shelfId)).toList();
        for (var entry : affected) {
            var remaining = new java.util.HashSet<>(entry.getShelfIds());
            remaining.remove(shelfId); entry.setShelfIds(remaining);
        }
        if (!affected.isEmpty()) libraryRepository.saveAll(affected);
        shelfRepository.delete(shelf);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @PutMapping("/shelves/{shelfId}/visibility")
    public ResponseEntity<?> changeVisibility(@PathVariable String shelfId, @RequestBody Map<String, String> payload) {
        String userId = getCurrentUserId();
        Shelf shelf = shelfRepository.findById(shelfId).orElse(null);
        if (shelf == null || !userId.equals(shelf.getUserId())) return ResponseEntity.notFound().build();
        String visibility = payload.get("visibility");
        if (!List.of("PRIVATE", "PUBLIC").contains(visibility == null ? "" : visibility)) return ResponseEntity.badRequest().body("Choose Private or Public.");
        shelf.setVisibility(visibility);
        shelfRepository.save(shelf);
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

        if (shelfIds != null && !shelfRepository.findByUserId(userId).stream().map(Shelf::getId).toList().containsAll(shelfIds)) {
            return ResponseEntity.badRequest().body("Choose shelves from your own library.");
        }
        if (shelfIds != null) {
            entry.setShelfIds(new java.util.HashSet<>(shelfIds));
        } else {
            entry.setShelfIds(new java.util.HashSet<>());
        }

        libraryRepository.save(entry);

        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    public record OrganizeRequest(List<String> bookIds, String shelfId, String operation) {}

    @PostMapping("/books/shelves")
    public ResponseEntity<?> organizeBooks(@RequestBody OrganizeRequest request) {
        String userId = getCurrentUserId();
        if (request.bookIds() == null || request.bookIds().isEmpty() || request.bookIds().size() > 100
                || !List.of("ADD", "REMOVE").contains(request.operation() == null ? "" : request.operation())) {
            return ResponseEntity.badRequest().body("Choose up to 100 stories and add or remove a shelf.");
        }
        Shelf shelf = request.shelfId() == null ? null : shelfRepository.findById(request.shelfId()).orElse(null);
        if (shelf == null || !userId.equals(shelf.getUserId())) return ResponseEntity.notFound().build();
        var entries = libraryRepository.findByUserId(userId).stream().filter(entry -> request.bookIds().contains(entry.getBookId())).toList();
        if (entries.size() != new java.util.HashSet<>(request.bookIds()).size()) return ResponseEntity.badRequest().body("Choose stories already saved in your library.");
        for (var entry : entries) {
            var ids = new java.util.HashSet<>(java.util.Objects.requireNonNullElse(entry.getShelfIds(), java.util.Set.of()));
            if ("ADD".equals(request.operation())) ids.add(shelf.getId()); else ids.remove(shelf.getId());
            entry.setShelfIds(ids);
        }
        libraryRepository.saveAll(entries);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<?> removeFromLibrary(@PathVariable String bookId) {
        String userId = getCurrentUserId();
        libraryRepository.deleteByUserIdAndBookId(userId, bookId);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }
}
