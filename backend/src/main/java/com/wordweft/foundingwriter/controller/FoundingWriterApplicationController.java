package com.wordweft.foundingwriter.controller;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationRequest;
import com.wordweft.foundingwriter.service.DuplicateFoundingWriterApplicationException;
import com.wordweft.foundingwriter.service.FoundingWriterApplicationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/founding-writer-applications")
public class FoundingWriterApplicationController {
    private static final Logger log = LoggerFactory.getLogger(FoundingWriterApplicationController.class);
    private static final String SUCCESS_MESSAGE = "Your application has been received.";
    private static final String DUPLICATE_MESSAGE = "It looks like an application has already been submitted with this email address. We’ll review the application already on file.";
    private static final String FAILURE_MESSAGE = "We couldn’t submit your application right now. Please try again shortly.";

    private final FoundingWriterApplicationService service;

    public FoundingWriterApplicationController(FoundingWriterApplicationService service) {
        this.service = service;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> submit(
            @Valid @org.springframework.web.bind.annotation.RequestPart("application") FoundingWriterApplicationRequest request,
            @org.springframework.web.bind.annotation.RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            service.submit(request, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "message", SUCCESS_MESSAGE));
        } catch (DuplicateFoundingWriterApplicationException duplicate) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "errorCode", "DUPLICATE_APPLICATION",
                    "message", DUPLICATE_MESSAGE));
        } catch (org.springframework.web.server.ResponseStatusException invalid) {
            return ResponseEntity.status(invalid.getStatusCode()).body(Map.of("success", false, "message", invalid.getReason()));
        } catch (Exception failure) {
            log.error("Unable to store a founding writer application", failure);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", FAILURE_MESSAGE));
        }
    }
}
