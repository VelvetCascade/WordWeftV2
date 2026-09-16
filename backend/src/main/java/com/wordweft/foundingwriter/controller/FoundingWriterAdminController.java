package com.wordweft.foundingwriter.controller;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationUpdateRequest;
import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.foundingwriter.service.FoundingWriterApplicationService;
import com.wordweft.foundingwriter.service.UploadTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/founding-writer-applications")
public class FoundingWriterAdminController {
    private final FoundingWriterApplicationService service;
    private final UploadTokenService uploadTokenService;

    public FoundingWriterAdminController(
            FoundingWriterApplicationService service,
            UploadTokenService uploadTokenService) {
        this.service = service;
        this.uploadTokenService = uploadTokenService;
    }

    @GetMapping
    public List<FoundingWriterApplication> list(
            @RequestParam(required = false) FoundingWriterApplicationStatus status) {
        return service.list(status);
    }

    @PatchMapping("/{id}")
    public FoundingWriterApplication update(
            @PathVariable String id,
            @Valid @RequestBody FoundingWriterApplicationUpdateRequest request) {
        return service.update(id, request);
    }

    /**
     * Returns a time-limited signed download URL for the chapter file stored in R2.
     * The admin's browser will fetch the file directly from the Cloudflare Worker.
     */
    @GetMapping("/{id}/chapter-file")
    public ResponseEntity<Map<String, String>> chapterFileUrl(@PathVariable String id) {
        FoundingWriterApplication application = service.findById(id);
        if (application.getR2FileKey() == null || !application.isFileUploaded()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No chapter file was uploaded with this application.");
        }

        String token = uploadTokenService.generateDownloadToken(
                application.getId(), application.getR2FileKey());
        String downloadUrl = String.format("%s/download/%s/%s?token=%s",
                uploadTokenService.getWorkerBaseUrl(),
                application.getId(),
                encodeUriComponent(application.getChapterFileName()),
                token);

        return ResponseEntity.ok(Map.of("downloadUrl", downloadUrl));
    }

    private static String encodeUriComponent(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
                    .replace("+", "%20");
        } catch (Exception e) {
            return value;
        }
    }
}
