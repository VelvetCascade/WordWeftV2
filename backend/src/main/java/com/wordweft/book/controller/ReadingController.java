
package com.wordweft.book.controller;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class ReadingController {

    @Autowired
    ReadingProgressRepository progressRepository;
    @Autowired
    BookRepository bookRepository;
    @Autowired
    LibraryRepository libraryRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    UserService userService;

    @GetMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> getProgress(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return ResponseEntity.ok(progressRepository.findByUserIdAndBookId(userDetails.getId(), bookId).orElse(null));
    }

    @GetMapping("/reading/progress")
    public ResponseEntity<?> getAllProgress() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        List<ReadingProgress> list = progressRepository.findByUserId(userDetails.getId());
        Map<String, ReadingProgress> map = new HashMap<>();
        list.forEach(p -> map.put(p.getBookId(), p));
        return ResponseEntity.ok(map);
    }

    @PostMapping("/reading/progress")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        String bookId = (String) payload.get("bookId");

        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        int totalChapters = book.getChapters().size();

        ReadingProgress progress = progressRepository.findByUserIdAndBookId(userDetails.getId(), bookId)
                .orElse(new ReadingProgress());

        progress.setUserId(userDetails.getId());
        progress.setBookId(bookId);
        progress.setLastReadChapterIndex((Integer) payload.get("chapterIndex"));
        progress.setLastReadScrollPosition((Integer) payload.get("scrollPosition"));
        progress.setLastReadTimestamp(LocalDateTime.now());

        // Update specific chapter progress
        Map<String, Object> chapterData = (Map<String, Object>) payload.get("chapterData");
        String chapterId = (String) chapterData.get("id");
        int pVal = (Integer) chapterData.get("progress");
        int sVal = (Integer) chapterData.get("scroll");

        ReadingProgress.ChapterProgressItem item = new ReadingProgress.ChapterProgressItem();
        item.setProgress(Math.min(100, Math.max(0, pVal)));
        item.setScrollPosition(sVal);

        progress.getChapters().put(chapterId, item);

        // --- Stats Logic: Check if chapter is completed for the first time ---
        if (pVal >= 90) {
            if (progress.getCompletedChapterIds() == null) {
                progress.setCompletedChapterIds(new HashSet<>());
            }

            if (!progress.getCompletedChapterIds().contains(chapterId)) {
                // Mark as completed
                progress.getCompletedChapterIds().add(chapterId);

                // Update User Stats
                User user = userRepository.findById(userDetails.getId()).orElseThrow();
                if (user.getStats() == null)
                    user.setStats(new User.UserStats());

                // Find word count of this chapter
                Optional<Chapter> chapterOpt = book.getChapters().stream().filter(c -> c.getId().equals(chapterId))
                        .findFirst();
                if (chapterOpt.isPresent()) {
                    user.getStats().setChaptersRead(user.getStats().getChaptersRead() + 1);
                    user.getStats()
                            .setTotalWordsRead(user.getStats().getTotalWordsRead() + chapterOpt.get().getWordCount());

                    // Increment books read if all chapters are done (simple logic)
                    if (progress.getCompletedChapterIds().size() == totalChapters) {
                        user.getStats().setBooksRead(user.getStats().getBooksRead() + 1);
                    }

                    userRepository.save(user);
                }
            }
        }

        // Calculate Overall Book Progress
        if (totalChapters > 0) {
            double totalPercentage = 0;
            for (Chapter chapter : book.getChapters()) {
                ReadingProgress.ChapterProgressItem cp = progress.getChapters().get(chapter.getId());
                if (cp != null) {
                    totalPercentage += cp.getProgress();
                }
            }
            int overall = (int) (totalPercentage / totalChapters);
            progress.setOverallProgress(Math.min(100, overall));
        } else {
            progress.setOverallProgress(0);
        }

        progressRepository.save(progress);

        // Ensure book is in library
        if (libraryRepository.findByUserIdAndBookId(userDetails.getId(), bookId).isEmpty()) {
            LibraryEntry entry = new LibraryEntry();
            entry.setUserId(userDetails.getId());
            entry.setBookId(bookId);
            entry.setAddedDate(LocalDate.now());
            libraryRepository.save(entry);
        }

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> clearProgress(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        progressRepository.deleteByUserIdAndBookId(userDetails.getId(), bookId);
        return ResponseEntity.ok().build();
    }

}
