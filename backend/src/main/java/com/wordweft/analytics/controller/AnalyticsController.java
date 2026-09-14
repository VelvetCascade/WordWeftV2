package com.wordweft.analytics.controller;

import com.wordweft.analytics.dto.AnalyticsBatchDto;
import com.wordweft.analytics.dto.AnalyticsEventDto;
import com.wordweft.analytics.dto.SessionDto;
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

        String validationMessage = validate(batch);
        if (validationMessage != null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "errorCode", "INVALID_ANALYTICS_BATCH",
                    "message", validationMessage
            ));
        }

        // Authenticated identity always comes from the JWT. Guests receive a stable,
        // non-identifying marker so the preview funnel can be measured safely.
        String userId = "anonymous";
        String userName = "Anonymous";
        String userEmail = "";
        if (userDetails != null && userDetails.getId() != null) {
            userId = userDetails.getId();
            User user = userRepository.findById(userId).orElse(null);
            userName = user != null ? user.getUsername() : "Unknown";
            userEmail = user != null ? user.getEmail() : "";
        }

        int eventCount = batch.getEvents() != null ? batch.getEvents().size() : 0;

        // Fire-and-forget — @Async ensures this doesn't block the response
        analyticsService.sendAnalyticsBatch(userId, userName, userEmail, batch);

        return ResponseEntity.ok(Map.of(
                "status", "accepted",
                "eventsReceived", eventCount
        ));
    }

    private String validate(AnalyticsBatchDto batch) {
        if (batch == null || batch.getEvents() == null || batch.getEvents().isEmpty()) {
            return "At least one analytics event is required.";
        }
        if (batch.getEvents().size() > 20) {
            return "Analytics batches may contain at most 20 events.";
        }

        for (AnalyticsEventDto event : batch.getEvents()) {
            if (event == null) return "Analytics events cannot be null.";
            if (!requiredWithin(event.getSessionId(), 128)
                    || !requiredWithin(event.getCategory(), 64)
                    || !requiredWithin(event.getAction(), 64)) {
                return "Event identifiers are missing or too long.";
            }
            if (!optionalWithin(event.getLabel(), 160)
                    || !optionalWithin(event.getPagePath(), 512)
                    || !optionalWithin(event.getReferrerPage(), 512)
                    || !optionalWithin(event.getDeviceType(), 64)
                    || !optionalWithin(event.getBrowser(), 64)
                    || !optionalWithin(event.getScreenSize(), 64)
                    || !optionalWithin(event.getOs(), 64)) {
                return "An analytics event field is too long.";
            }
            if (event.getValue() != null && !Double.isFinite(event.getValue())) {
                return "Analytics values must be finite numbers.";
            }
            if (event.getMetadata() != null) {
                if (event.getMetadata().size() > 10) return "Event metadata may contain at most 10 fields.";
                for (Map.Entry<String, Object> entry : event.getMetadata().entrySet()) {
                    if (!requiredWithin(entry.getKey(), 64) || !safeMetadataValue(entry.getValue())) {
                        return "Event metadata must contain only short scalar values.";
                    }
                }
            }
        }

        SessionDto session = batch.getSession();
        if (session != null && (!optionalWithin(session.getSessionId(), 128)
                || !optionalWithin(session.getStartTime(), 64)
                || !optionalWithin(session.getEndTime(), 64)
                || !optionalWithin(session.getEntryPage(), 512)
                || !optionalWithin(session.getExitPage(), 512)
                || !optionalWithin(session.getDeviceType(), 64)
                || !optionalWithin(session.getBrowser(), 64)
                || !optionalWithin(session.getOs(), 64)
                || session.getPageCount() < 0
                || session.getEventCount() < 0)) {
            return "Session analytics are invalid.";
        }
        return null;
    }

    private boolean requiredWithin(String value, int maxLength) {
        return value != null && !value.isBlank() && value.length() <= maxLength;
    }

    private boolean optionalWithin(String value, int maxLength) {
        return value == null || value.length() <= maxLength;
    }

    private boolean safeMetadataValue(Object value) {
        return value == null
                || value instanceof Boolean
                || value instanceof Number
                || (value instanceof String text && text.length() <= 200);
    }
}
