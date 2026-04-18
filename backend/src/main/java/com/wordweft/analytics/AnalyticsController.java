package com.wordweft.analytics;

import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Public analytics ingestion endpoint.
 * No JWT required — also tracks anonymous users (page views, sessions).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    /**
     * Ingests a batch of frontend analytics events.
     * Payload: { events: [ { sheet, row: [...] }, ... ], userId?, timeSpentSeconds? }
     */
    @PostMapping("/events")
    public ResponseEntity<?> ingestEvents(@RequestBody Map<String, Object> payload) {
        try {
            // Resolve userId — either from JWT (if logged in) or "anon"
            String userId = resolveUserId();

            // Forward each event row to the analytics service
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> events = (List<Map<String, Object>>) payload.get("events");
            if (events != null) {
                for (Map<String, Object> event : events) {
                    String sheet = (String) event.get("sheet");
                    @SuppressWarnings("unchecked")
                    List<String> rowList = (List<String>) event.get("row");
                    if (sheet != null && rowList != null) {
                        String[] row = rowList.toArray(new String[0]);
                        analyticsService.trackFrontendEvent(sheet, row);
                    }
                }
            }

            // If a logged-in user sent time-spent data, record it
            if (!"anon".equals(userId)) {
                Number timeSpentRaw = (Number) payload.get("timeSpentSeconds");
                if (timeSpentRaw != null && timeSpentRaw.longValue() > 0) {
                    analyticsService.trackUserActivity(userId, timeSpentRaw.longValue());
                }
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Never return errors for analytics — frontend should never handle analytics failures
            return ResponseEntity.ok().build();
        }
    }

    private String resolveUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserDetailsImpl) {
                return ((UserDetailsImpl) principal).getId();
            }
        } catch (Exception ignored) {}
        return "anon";
    }
}
