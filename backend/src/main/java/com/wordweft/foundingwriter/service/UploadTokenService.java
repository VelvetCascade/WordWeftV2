package com.wordweft.foundingwriter.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

/**
 * Generates and validates HMAC-SHA256 signed tokens for secure R2 uploads and downloads.
 * Token format: base64url(jsonPayload).base64url(hmac-sha256(base64url(jsonPayload), secret))
 */
@Service
public class UploadTokenService {

    private final String signingSecret;
    private final String workerBaseUrl;

    public UploadTokenService(
            @Value("${wordweft.upload.signing-secret}") String signingSecret,
            @Value("${wordweft.upload.worker-base-url}") String workerBaseUrl) {
        this.signingSecret = signingSecret;
        this.workerBaseUrl = workerBaseUrl;
    }

    public String getWorkerBaseUrl() {
        return workerBaseUrl;
    }

    /**
     * Generate an upload token valid for 15 minutes.
     */
    public String generateUploadToken(String applicationId, String fileName, long maxSizeBytes) {
        long expiry = Instant.now().plusSeconds(900).getEpochSecond();
        String payload = String.format(
                "{\"type\":\"upload\",\"appId\":\"%s\",\"fileName\":\"%s\",\"maxSize\":%d,\"exp\":%d}",
                escapeJson(applicationId), escapeJson(fileName), maxSizeBytes, expiry);
        return signPayload(payload);
    }

    /**
     * Generate a chapter image upload token valid for 15 minutes.
     */
    public String generateChapterImageUploadToken(String bookId, String fileName, long maxSizeBytes) {
        long expiry = Instant.now().plusSeconds(900).getEpochSecond();
        String payload = String.format(
                "{\"type\":\"chapter-image-upload\",\"bookId\":\"%s\",\"fileName\":\"%s\",\"maxSize\":%d,\"exp\":%d}",
                escapeJson(bookId), escapeJson(fileName), maxSizeBytes, expiry);
        return signPayload(payload);
    }

    /**
     * Generate a download token valid for 5 minutes.
     */
    public String generateDownloadToken(String applicationId, String r2Key) {
        long expiry = Instant.now().plusSeconds(300).getEpochSecond();
        String payload = String.format(
                "{\"type\":\"download\",\"appId\":\"%s\",\"r2Key\":\"%s\",\"exp\":%d}",
                escapeJson(applicationId), escapeJson(r2Key), expiry);
        return signPayload(payload);
    }

    private String signPayload(String payloadJson) {
        String payloadB64 = base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        byte[] signature = hmacSha256(payloadB64.getBytes(StandardCharsets.UTF_8));
        String signatureB64 = base64UrlEncode(signature);
        return payloadB64 + "." + signatureB64;
    }

    private byte[] hmacSha256(byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new RuntimeException("HMAC signing failed", e);
        }
    }

    private static String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private static String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
