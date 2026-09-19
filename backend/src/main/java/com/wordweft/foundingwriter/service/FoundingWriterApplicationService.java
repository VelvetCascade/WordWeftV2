package com.wordweft.foundingwriter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wordweft.foundingwriter.dto.FoundingWriterApplicationRequest;
import com.wordweft.foundingwriter.dto.FoundingWriterApplicationUpdateRequest;
import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.foundingwriter.repository.FoundingWriterApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class FoundingWriterApplicationService {
    private static final Logger log = LoggerFactory.getLogger(FoundingWriterApplicationService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final FoundingWriterApplicationRepository repository;
    private final UploadTokenService uploadTokenService;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public FoundingWriterApplicationService(
            FoundingWriterApplicationRepository repository,
            UploadTokenService uploadTokenService) {
        this.repository = repository;
        this.uploadTokenService = uploadTokenService;
    }

    public boolean submit(FoundingWriterApplicationRequest request, org.springframework.web.multipart.MultipartFile file) {
        var chapterFile = ChapterFileValidator.validate(file);

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (repository.existsByEmail(email)) throw new DuplicateFoundingWriterApplicationException();

        FoundingWriterApplication application = new FoundingWriterApplication();
        application.setFullName(required(request.getFullName()));
        application.setPenName(optional(request.getPenName()));
        application.setEmail(email);
        application.setCountry(required(request.getCountry()));
        application.setInstagramProfileUrl(optional(request.getInstagramProfileUrl()));
        application.setGenre(required(request.getGenre()));
        application.setStoryTitle(required(request.getStoryTitle()));
        application.setStoryDescription(required(request.getStoryDescription()));
        application.setWritingSampleUrl(optional(request.getWritingSampleUrl()));
        application.setPastedWritingSample(optional(request.getPastedWritingSample()));
        application.setChapterFileName(chapterFile.name());
        application.setChapterFileContentType(chapterFile.contentType());
        application.setChapterFileSize(chapterFile.data().length);
        application.setChaptersConfirmed(request.isChaptersConfirmed());
        application.setExistingPublishingPlatform(optional(request.getExistingPublishingPlatform()));
        application.setDraftedChapterCount(request.getDraftedChapterCount());
        application.setPlannedChapterCount(request.getPlannedChapterCount());
        application.setExpectedCompletionPeriod(request.getExpectedCompletionPeriod());
        application.setAgeConfirmed(request.isAgeConfirmed());
        application.setRightsConfirmed(request.isRightsConfirmed());
        application.setCompletionCommitted(request.isCompletionCommitted());
        application.setWeeklyPublishingCommitted(request.isWeeklyPublishingCommitted());
        application.setEarningsDisclaimerConfirmed(request.isEarningsDisclaimerConfirmed());
        application.setTermsConfirmed(request.isTermsConfirmed());
        application.setStatus(FoundingWriterApplicationStatus.PENDING);
        application.setAdminNotes(null);
        application.setFileUploaded(false);
        application.setHoneypotTriggered(request.isHoneypotFilled());
        Instant now = Instant.now();
        application.setCreatedAt(now);
        application.setUpdatedAt(now);

        try {
            repository.insert(application);
        } catch (DuplicateKeyException duplicate) {
            throw new DuplicateFoundingWriterApplicationException();
        }

        // Upload file to R2 via Cloudflare Worker (server-to-server — token never reaches the browser)
        try {
            String r2Key = uploadToR2(application.getId(), chapterFile.name(), chapterFile.contentType(), chapterFile.data());
            application.setR2FileKey(r2Key);
            application.setFileUploaded(true);
            application.setUpdatedAt(Instant.now());
            repository.save(application);
        } catch (Exception e) {
            log.error("R2 upload failed for application {}. Admin will see fileUploaded=false.", application.getId(), e);
        }

        return true;
    }

    private String uploadToR2(String applicationId, String fileName, String contentType, byte[] data) {
        String workerBaseUrl = uploadTokenService.getWorkerBaseUrl();
        if (workerBaseUrl == null || workerBaseUrl.isBlank()) {
            log.warn("Worker base URL not configured, skipping R2 upload for application {}", applicationId);
            return "founding-writers/" + applicationId + "/" + fileName;
        }

        String token = uploadTokenService.generateUploadToken(applicationId, fileName, data.length);
        String url = workerBaseUrl.replaceAll("/+$", "") + "/upload/" + applicationId;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(data))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", contentType)
                    .header("X-File-Name", fileName)
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Worker returned HTTP " + response.statusCode() + ": " + response.body());
            }

            JsonNode result = objectMapper.readTree(response.body());
            return result.get("r2Key").asText();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("R2 upload was interrupted", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload to R2: " + e.getMessage(), e);
        }
    }

    public FoundingWriterApplication findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found."));
    }

    public List<FoundingWriterApplication> list(FoundingWriterApplicationStatus status) {
        return status == null
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByStatusOrderByCreatedAtDesc(status);
    }

    public FoundingWriterApplication update(String id, FoundingWriterApplicationUpdateRequest request) {
        FoundingWriterApplication application = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found."));
        application.setStatus(request.getStatus());
        application.setAdminNotes(optional(request.getAdminNotes()));
        application.setUpdatedAt(Instant.now());
        return repository.save(application);
    }

    private static String required(String value) {
        return value.trim();
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
