package com.wordweft.foundingwriter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class FoundingWriterStorageService {
    private static final Logger log = LoggerFactory.getLogger(FoundingWriterStorageService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private final UploadTokenService uploadTokenService;
    private final HttpClient httpClient;

    @Autowired
    public FoundingWriterStorageService(UploadTokenService uploadTokenService) {
        this(uploadTokenService, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build());
    }

    FoundingWriterStorageService(UploadTokenService uploadTokenService, HttpClient httpClient) {
        this.uploadTokenService = uploadTokenService;
        this.httpClient = httpClient;
    }

    public String upload(String applicationId, String fileName, String contentType, byte[] data) {
        String workerBaseUrl = uploadTokenService.getWorkerBaseUrl();
        if (workerBaseUrl == null || workerBaseUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Manuscript storage is temporarily unavailable. Please try again later.");
        }

        String token = uploadTokenService.generateUploadToken(applicationId, fileName, data.length);
        String url = workerBaseUrl.replaceAll("/+$", "") + "/upload/" + applicationId;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(45))
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(data))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", contentType)
                    .header("X-File-Name", fileName)
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Founding Writer upload rejected with HTTP {}", response.statusCode());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Manuscript storage rejected the upload. Please retry.");
            }
            JsonNode result = JSON.readTree(response.body());
            String r2Key = result.path("r2Key").asText("");
            if (r2Key.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Manuscript storage returned an invalid response. Please retry.");
            }
            return r2Key;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Manuscript upload was interrupted. Please retry.", error);
        } catch (Exception error) {
            log.error("Founding Writer R2 upload failed", error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Manuscript storage is unavailable. Please retry.", error);
        }
    }
}
