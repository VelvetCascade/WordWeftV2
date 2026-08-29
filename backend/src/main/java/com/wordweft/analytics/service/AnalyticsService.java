package com.wordweft.analytics.service;

import com.wordweft.analytics.dto.AnalyticsBatchDto;
import com.wordweft.analytics.dto.AnalyticsEventDto;
import com.wordweft.analytics.dto.SessionDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    @Value("${wordweft.email.apps-script-url}")
    private String appsScriptUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Sends an analytics batch to Google Sheets via the Google Apps Script.
     * Runs asynchronously so the API response is not delayed.
     * Mirrors the same pattern used in EmailService.
     */
    @Async
    public void sendAnalyticsBatch(String userId, String userName, String userEmail, AnalyticsBatchDto batch) {
        if (appsScriptUrl == null || appsScriptUrl.trim().isEmpty()) {
            System.err.println("❌ Apps Script URL not configured! Analytics batch was NOT sent.");
            return;
        }

        if (batch == null || batch.getEvents() == null || batch.getEvents().isEmpty()) {
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("action", "analytics");

            // Enrich events with user info from JWT (server-side, secure)
            List<Map<String, Object>> enrichedEvents = new ArrayList<>();
            List<Map<String, Object>> pageViews = new ArrayList<>();

            for (AnalyticsEventDto event : batch.getEvents()) {
                String timestamp = Instant.now().toString();

                Map<String, Object> ev = new HashMap<>();
                ev.put("timestamp", timestamp);
                ev.put("sessionId", event.getSessionId());
                ev.put("userId", userId);
                ev.put("userName", userName);
                ev.put("userEmail", userEmail);
                ev.put("category", event.getCategory());
                ev.put("action", event.getAction());
                ev.put("label", event.getLabel() != null ? event.getLabel() : "");
                ev.put("value", event.getValue() != null ? event.getValue() : "");
                ev.put("pagePath", event.getPagePath() != null ? event.getPagePath() : "");
                ev.put("referrerPage", event.getReferrerPage() != null ? event.getReferrerPage() : "");
                ev.put("deviceType", event.getDeviceType() != null ? event.getDeviceType() : "");
                ev.put("browser", event.getBrowser() != null ? event.getBrowser() : "");
                ev.put("screenSize", event.getScreenSize() != null ? event.getScreenSize() : "");
                ev.put("os", event.getOs() != null ? event.getOs() : "");
                ev.put("metadata", event.getMetadata() != null ? event.getMetadata() : new HashMap<>());
                enrichedEvents.add(ev);

                // Also create page view entries for page_view events
                if ("page_view".equals(event.getAction())) {
                    Map<String, Object> pv = new HashMap<>();
                    pv.put("timestamp", timestamp);
                    pv.put("sessionId", event.getSessionId());
                    pv.put("userId", userId);
                    pv.put("userName", userName);
                    pv.put("pagePath", event.getPagePath() != null ? event.getPagePath() : "");
                    pv.put("previousPage", event.getReferrerPage() != null ? event.getReferrerPage() : "");
                    pv.put("timeOnPreviousPage",
                            event.getMetadata() != null && event.getMetadata().containsKey("timeOnPreviousPage")
                                    ? event.getMetadata().get("timeOnPreviousPage") : 0);
                    pv.put("deviceType", event.getDeviceType() != null ? event.getDeviceType() : "");
                    pageViews.add(pv);
                }
            }

            payload.put("events", enrichedEvents);
            payload.put("pageViews", pageViews);

            // Session data
            if (batch.getSession() != null) {
                SessionDto s = batch.getSession();
                Map<String, Object> session = new HashMap<>();
                session.put("sessionId", s.getSessionId());
                session.put("userId", userId);
                session.put("userName", userName);
                session.put("userEmail", userEmail);
                session.put("startTime", s.getStartTime() != null ? s.getStartTime() : "");
                session.put("endTime", s.getEndTime() != null ? s.getEndTime() : "");
                session.put("duration", s.getPageCount());
                session.put("pageCount", s.getPageCount());
                session.put("eventCount", s.getEventCount());
                session.put("entryPage", s.getEntryPage() != null ? s.getEntryPage() : "");
                session.put("exitPage", s.getExitPage() != null ? s.getExitPage() : "");
                session.put("deviceType", s.getDeviceType() != null ? s.getDeviceType() : "");
                session.put("browser", s.getBrowser() != null ? s.getBrowser() : "");
                session.put("os", s.getOs() != null ? s.getOs() : "");
                payload.put("sessions", List.of(session));
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(appsScriptUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("✅ Analytics batch sent: " + enrichedEvents.size() + " events, " + pageViews.size() + " page views");
            } else {
                System.err.println("❌ Analytics send failed — Apps Script responded: " + response.getBody());
            }

        } catch (Exception e) {
            System.err.println("❌ Failed to send analytics batch via Apps Script: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
