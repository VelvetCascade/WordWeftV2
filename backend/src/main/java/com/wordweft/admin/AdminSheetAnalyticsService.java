package com.wordweft.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.List;

/**
 * Read-only analytics adapter. No event ingestion, Mongo writes, sheet writes
 * or data replication. The private Apps Script must expose aggregated totals.
 */
@Service
public class AdminSheetAnalyticsService {
    @Value("${wordweft.analytics.sheet-read-url:}")
    private String sheetReadUrl;
    @Value("${wordweft.analytics.sheet-read-token:}")
    private String readToken;

    private final RestTemplate rest = createClient();

    private static RestTemplate createClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        return new RestTemplate(factory);
    }
    private final ObjectMapper json;

    public AdminSheetAnalyticsService(ObjectMapper json) {
        this.json = json;
    }

    public record Summary(String source, String status, String detail, int days,
                          long pageViews, long sessions, long events, List<JsonNode> daily,
                          List<JsonNode> topPages, List<JsonNode> devices,
                          List<JsonNode> browsers, List<JsonNode> actions, Instant generatedAt) {}

    public Summary summary(int days) {
        if (days != 7 && days != 30 && days != 90)
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Choose 7, 30 or 90 days.");
        if (sheetReadUrl == null || sheetReadUrl.isBlank() || readToken == null || readToken.isBlank())
            return unavailable(days, "Read-only Google Sheets access is not configured yet.");
        // A separate private read endpoint is required. Never invoke the email/analytics POST URL
        // with write payloads, and never send the URL or token to the browser.
        try {
            String url = UriComponentsBuilder.fromUriString(sheetReadUrl)
                    .queryParam("action", "admin_analytics")
                    .queryParam("days", days)
                    .queryParam("token", readToken)
                    .build().encode().toUriString();
            String raw = rest.getForObject(url, String.class);
            if (raw == null || raw.length() > 1_000_000)
                return unavailable(days, "The spreadsheet reader returned an invalid response.");
            JsonNode root = json.readTree(raw);
            if (!root.path("ok").asBoolean(false))
                return unavailable(days, "The spreadsheet reader is unavailable or rejected this request.");
            return new Summary("google_sheets", "connected", "Read-only aggregated spreadsheet data", days,
                    Math.max(0, root.path("pageViews").asLong()),
                    Math.max(0, root.path("sessions").asLong()),
                    Math.max(0, root.path("events").asLong()),
                    rows(root.path("daily"), 90), rows(root.path("topPages"), 20),
                    rows(root.path("devices"), 12), rows(root.path("browsers"), 12),
                    rows(root.path("actions"), 20), Instant.now());
        } catch (Exception ex) {
            // Avoid leaking Apps Script tokens, URLs or spreadsheet content through API errors.
            return unavailable(days, "The spreadsheet reader could not be reached. Check its read-only deployment.");
        }
    }

    private List<JsonNode> rows(JsonNode node, int limit) {
        if (!node.isArray()) return List.of();
        java.util.ArrayList<JsonNode> safe = new java.util.ArrayList<>();
        for (JsonNode row : node) {
            if (safe.size() == limit) break;
            if (row.isObject()) safe.add(row);
        }
        return List.copyOf(safe);
    }

    private Summary unavailable(int days, String detail) {
        return new Summary("google_sheets", "unavailable", detail, days,
                0, 0, 0, List.of(), List.of(), List.of(), List.of(), List.of(), Instant.now());
    }
}
