package com.wordweft.book.controller;

import com.wordweft.book.service.ReadingProgressService;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class ReadingController {
    @Autowired
    ReadingProgressService progressService;

    @GetMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> getProgress(@PathVariable String bookId) {
        return ResponseEntity.ok(progressService.getProgress(userId(), bookId));
    }

    @GetMapping("/reading/progress")
    public ResponseEntity<?> getAllProgress() {
        return ResponseEntity.ok(progressService.getAllProgress(userId()));
    }

    @PostMapping("/reading/progress")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(progressService.saveProgress(userId(), ReadingProgressService.SaveRequest.from(payload)));
    }

    @DeleteMapping("/reading/progress/{bookId}")
    public ResponseEntity<?> clearProgress(@PathVariable String bookId) {
        progressService.clearProgress(userId(), bookId);
        return ResponseEntity.ok().build();
    }

    private String userId() {
        return ((UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
