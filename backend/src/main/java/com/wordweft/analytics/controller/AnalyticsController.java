package com.wordweft.analytics.controller;

import com.wordweft.analytics.dto.AnalyticsBatchDto;
import com.wordweft.analytics.service.AnalyticsService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Receives analytics event batches from the frontend.
     * User identity is extracted from the JWT token (not from client payload)
     * for security. Events are forwarded to Google Sheets asynchronously.
     */
    @PostMapping("/events")
    public ResponseEntity<?> trackEvents(
            @RequestBody AnalyticsBatchDto batch,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        // Extract user info securely from JWT
        String userId = userDetails.getId();
        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? user.getUsername() : "Unknown";
        String userEmail = user != null ? user.getEmail() : "Unknown";

        int eventCount = batch.getEvents() != null ? batch.getEvents().size() : 0;

        // Fire-and-forget — @Async ensures this doesn't block the response
        analyticsService.sendAnalyticsBatch(userId, userName, userEmail, batch);

        return ResponseEntity.ok(Map.of(
                "status", "accepted",
                "eventsReceived", eventCount
        ));
    }
}
