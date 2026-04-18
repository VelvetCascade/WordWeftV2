package com.wordweft.analytics;

import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AnalyticsService — fire-and-forget event tracking to Google Sheets.
 *
 * Design:
 * - All public track() calls are @Async → no impact on request latency.
 * - User activity (lastActiveAt, timeSpent) is buffered in a ConcurrentHashMap.
 * - The DB is only written once per hour per user to avoid excessive writes.
 * - If ANALYTICS_APPS_SCRIPT_URL is not set, all calls silently skip.
 */
@Service
public class AnalyticsService {

    @Value("${wordweft.analytics.apps-script-url:}")
    private String analyticsUrl;

    @Autowired
    private UserRepository userRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    // In-memory buffer: userId -> last DB flush time (to debounce DB writes to once/hour)
    private final ConcurrentHashMap<String, Instant> lastDbFlush = new ConcurrentHashMap<>();

    // ─────────────────────────────────────────────────────────────────────────────
    // Public tracking methods
    // ─────────────────────────────────────────────────────────────────────────────

    @Async
    public void trackSignup(String userId, String username, String email, String authProvider) {
        sendEvent("Signups", new String[]{
                now(), userId, username, email, authProvider
        });
    }

    @Async
    public void trackLogin(String userId, String username, String authProvider) {
        // Update lastActiveAt in DB (logins always flush immediately)
        updateUserActivity(userId, 0, true);
        sendEvent("Logins", new String[]{
                now(), userId, username, authProvider, Instant.now().toString()
        });
    }

    @Async
    public void trackChapterView(String bookId, String bookTitle, String chapterId, String chapterTitle, int totalViews) {
        sendEvent("ChapterViews", new String[]{
                now(), bookId, bookTitle, chapterId, chapterTitle, String.valueOf(totalViews)
        });
    }

    @Async
    public void trackLike(String userId, String bookId, String chapterId, String action) {
        sendEvent("Likes", new String[]{
                now(), userId, bookId, chapterId, action
        });
    }

    @Async
    public void trackComment(String userId, String bookId, String chapterId, String paragraphIndex, boolean isReply) {
        sendEvent("Comments", new String[]{
                now(), userId, bookId, chapterId, paragraphIndex, String.valueOf(isReply)
        });
    }

    @Async
    public void trackReadingProgress(String userId, String bookId, String chapterId, int progressPct) {
        sendEvent("ReadingProgress", new String[]{
                now(), userId, bookId, chapterId, progressPct + "%"
        });
    }

    @Async
    public void trackSearch(String userId, String query, int resultCount) {
        sendEvent("Searches", new String[]{
                now(), userId, query, String.valueOf(resultCount)
        });
    }

    @Async
    public void trackPublishing(String authorId, String bookId, String bookTitle, String chapterId, String type) {
        sendEvent("Publishing", new String[]{
                now(), authorId, bookId, bookTitle, chapterId, type
        });
    }

    @Async
    public void trackFollow(String followerId, String followedId) {
        sendEvent("Follows", new String[]{
                now(), followerId, followedId
        });
    }

    /**
     * Tracks a frontend page-level event (pageview, time-on-page, session start).
     * Called from AnalyticsController (public endpoint, no auth required).
     */
    @Async
    public void trackFrontendEvent(String sheet, String[] row) {
        sendEvent(sheet, row);
    }

    /**
     * Updates user's lastActiveAt and totalTimeSpent.
     * Debounced: only writes to DB if >1 hour since last flush.
     * Always syncs to Google Sheet's RetentionEngine tab.
     */
    @Async
    public void trackUserActivity(String userId, long additionalSeconds) {
        updateUserActivity(userId, additionalSeconds, false);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private internals
    // ─────────────────────────────────────────────────────────────────────────────

    private void updateUserActivity(String userId, long additionalSeconds, boolean forceFlush) {
        try {
            Instant now = Instant.now();
            Instant lastFlush = lastDbFlush.get(userId);
            boolean shouldFlush = forceFlush || lastFlush == null ||
                    now.getEpochSecond() - lastFlush.getEpochSecond() > 3600; // > 1 hour

            if (shouldFlush) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.setLastActiveAt(now);
                    user.setTotalTimeSpentSeconds(user.getTotalTimeSpentSeconds() + additionalSeconds);
                    userRepository.save(user);

                    // Sync to Google Sheet's RetentionEngine tab
                    syncRetentionEngine(user);
                });
                lastDbFlush.put(userId, now);
            }
        } catch (Exception e) {
            // Analytics must never crash the app
            System.err.println("⚠️ Analytics activity update failed (non-critical): " + e.getMessage());
        }
    }

    private void syncRetentionEngine(User user) {
        if (analyticsUrl == null || analyticsUrl.isBlank()) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "retention_sync");
            payload.put("userId", user.getId());
            payload.put("username", user.getUsername());
            payload.put("email", user.getEmail());
            payload.put("lastActiveAt", user.getLastActiveAt() != null ? user.getLastActiveAt().toString() : "");
            payload.put("totalTimeSpentSeconds", user.getTotalTimeSpentSeconds());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForObject(analyticsUrl, new HttpEntity<>(payload, headers), String.class);
        } catch (Exception e) {
            System.err.println("⚠️ RetentionEngine sync failed (non-critical): " + e.getMessage());
        }
    }

    private void sendEvent(String sheet, String[] row) {
        if (analyticsUrl == null || analyticsUrl.isBlank()) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "event");
            payload.put("sheet", sheet);
            payload.put("row", row);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForObject(analyticsUrl, new HttpEntity<>(payload, headers), String.class);
        } catch (Exception e) {
            // Never crash the main request thread
            System.err.println("⚠️ Analytics event [" + sheet + "] failed (non-critical): " + e.getMessage());
        }
    }

    private String now() {
        return Instant.now().toString();
    }
}
