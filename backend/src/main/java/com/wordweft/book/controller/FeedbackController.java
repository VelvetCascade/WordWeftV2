
package com.wordweft.book.controller;

import com.wordweft.book.model.Feedback;
import com.wordweft.book.repository.FeedbackRepository;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackRepository feedbackRepository;

    private String getCurrentUserIdOrNull() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl) {
                return ((UserDetailsImpl) auth.getPrincipal()).getId();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    // Full feedback form submission (from FeedbackPage)
    @PostMapping
    public ResponseEntity<?> submitFeedback(@RequestBody Feedback feedback) {
        String userId = getCurrentUserIdOrNull();

        if (userId != null) {
            Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
            long recentCount = feedbackRepository.countByUserIdAndSubmittedAtAfter(userId, oneHourAgo);
            if (recentCount >= 3) {
                return ResponseEntity.status(429)
                        .body(Map.of("error", "Too many submissions. Please try again later."));
            }
            feedback.setUserId(userId);
        }

        feedback.setFeedbackType("FULL_FORM");
        feedback.setUserTag("alpha");
        feedback.setSubmittedAt(Instant.now());

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of("message", "Feedback submitted successfully", "id", feedback.getId()));
    }

    // Quick contextual feedback (toasts, exit intent, modals)
    @PostMapping("/quick")
    public ResponseEntity<?> submitQuickFeedback(@RequestBody Feedback feedback) {
        String userId = getCurrentUserIdOrNull();

        if (userId != null) {
            Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
            long recentCount = feedbackRepository.countByUserIdAndSubmittedAtAfter(userId, oneHourAgo);
            if (recentCount >= 10) {
                return ResponseEntity.status(429)
                        .body(Map.of("error", "Too many submissions. Please try again later."));
            }
            feedback.setUserId(userId);
        }

        feedback.setUserTag("alpha");
        feedback.setSubmittedAt(Instant.now());

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of("message", "Feedback received", "id", feedback.getId()));
    }
}
