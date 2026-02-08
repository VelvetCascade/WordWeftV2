
package com.wordweft.book.controller;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class ReadingController {

    @Autowired ReadingProgressRepository progressRepository;
    @Autowired LibraryRepository libraryRepository;
    @Autowired UserService userService;

    @GetMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> getProgress(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(progressRepository.findByUserIdAndBookId(userDetails.getId(), bookId).orElse(null));
    }
    
    @GetMapping("/reading/progress")
    public ResponseEntity<?> getAllProgress() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<ReadingProgress> list = progressRepository.findByUserId(userDetails.getId());
        Map<String, ReadingProgress> map = new HashMap<>();
        list.forEach(p -> map.put(p.getBookId(), p));
        return ResponseEntity.ok(map);
    }
    
    @PostMapping("/reading/progress")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String bookId = (String) payload.get("bookId");
        
        ReadingProgress progress = progressRepository.findByUserIdAndBookId(userDetails.getId(), bookId)
                .orElse(new ReadingProgress());
        
        progress.setUserId(userDetails.getId());
        progress.setBookId(bookId);
        progress.setLastReadChapterIndex((Integer) payload.get("chapterIndex"));
        progress.setLastReadScrollPosition((Integer) payload.get("scrollPosition"));
        
        // Update chapter progress
        Map<String, Object> chapterData = (Map<String, Object>) payload.get("chapterData");
        String chapterId = (String) chapterData.get("id");
        int pVal = (Integer) chapterData.get("progress");
        int sVal = (Integer) chapterData.get("scroll");
        
        ReadingProgress.ChapterProgressItem item = new ReadingProgress.ChapterProgressItem();
        item.setProgress(pVal);
        item.setScrollPosition(sVal);
        
        progress.getChapters().put(chapterId, item);
        
        // Simplified overall calc
        progress.setOverallProgress(Math.min(100, progress.getOverallProgress() + 1)); 
        
        progressRepository.save(progress);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> clearProgress(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        progressRepository.deleteByUserIdAndBookId(userDetails.getId(), bookId);
        return ResponseEntity.ok().build();
    }
    
    // Library
    
    @PostMapping("/library/toggle")
    public ResponseEntity<?> toggleLibrary(@RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String bookId = payload.get("bookId");
        
        Optional<LibraryEntry> existing = libraryRepository.findByUserIdAndBookId(userDetails.getId(), bookId);
        if (existing.isPresent()) {
            libraryRepository.delete(existing.get());
        } else {
            LibraryEntry entry = new LibraryEntry();
            entry.setUserId(userDetails.getId());
            entry.setBookId(bookId);
            entry.setAddedDate(LocalDate.now());
            libraryRepository.save(entry);
        }
        
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    @DeleteMapping("/library/{bookId}")
    public ResponseEntity<?> removeFromLibrary(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        libraryRepository.deleteByUserIdAndBookId(userDetails.getId(), bookId);
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
}
