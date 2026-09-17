package com.wordweft.foundingwriter.service;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

/**
 * Asynchronously logs all Founding Writer application attempts (successes, errors, duplicates)
 * to the Google Sheet via the fcsheet Apps Script Web App.
 */
@Service
public class FoundingWriterSheetService {
    private static final Logger log = LoggerFactory.getLogger(FoundingWriterSheetService.class);

    @Value("${wordweft.founding-writer.sheet-url:}")
    private String sheetUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void logAttempt(
            FoundingWriterApplicationRequest request,
            String fileName,
            Long fileSize,
            String clientIp,
            String status,
            String errorMessage) {

        if (sheetUrl == null || sheetUrl.trim().isEmpty()) {
            log.info("FCSHEET_URL not configured. Skipping Google Sheet submission log.");
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("action", "founding_writer_submission");
            payload.put("timestamp", Instant.now().toString());
            payload.put("status", status != null ? status : "UNKNOWN");
            payload.put("error", errorMessage != null ? errorMessage : "None");
            payload.put("chapterFileName", fileName != null ? fileName : "");
            payload.put("chapterFileSize", fileSize != null ? fileSize : 0L);
            payload.put("ipAddress", clientIp != null ? clientIp : "");

            if (request != null) {
                payload.put("fullName", request.getFullName());
                payload.put("penName", request.getPenName());
                payload.put("email", request.getEmail());
                payload.put("country", request.getCountry());
                payload.put("genre", request.getGenre());
                payload.put("storyTitle", request.getStoryTitle());
                payload.put("storyDescription", request.getStoryDescription());
                payload.put("writingSampleUrl", request.getWritingSampleUrl());
                payload.put("draftedChapters", request.getDraftedChapterCount());
                payload.put("plannedChapters", request.getPlannedChapterCount());
                payload.put("completionPeriod", request.getExpectedCompletionPeriod() != null
                        ? request.getExpectedCompletionPeriod().name() : "");
            }

            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(payload, headers);
            var response = restTemplate.postForEntity(sheetUrl.trim(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Logged founding writer submission [{}] for email [{}] to fcsheet", status, request != null ? request.getEmail() : "n/a");
            } else {
                log.warn("fcsheet responded with status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.warn("Failed to log founding writer submission to fcsheet: {}", e.getMessage());
        }
    }
}
