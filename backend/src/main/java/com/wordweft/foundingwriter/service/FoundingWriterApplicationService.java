package com.wordweft.foundingwriter.service;

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

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class FoundingWriterApplicationService {
    private static final Logger log = LoggerFactory.getLogger(FoundingWriterApplicationService.class);

    private final FoundingWriterApplicationRepository repository;
    private final FoundingWriterStorageService storage;

    public FoundingWriterApplicationService(
            FoundingWriterApplicationRepository repository,
            FoundingWriterStorageService storage) {
        this.repository = repository;
        this.storage = storage;
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
        // Keep the identifier compatible with the currently deployed Worker route,
        // while still generating it before the R2 upload.
        application.setId(java.util.UUID.randomUUID().toString().replace("-", ""));
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

        try {
            String r2Key = storage.upload(application.getId(), chapterFile.name(), chapterFile.contentType(), chapterFile.data());
            application.setR2FileKey(r2Key);
            application.setFileUploaded(true);
            application.setUpdatedAt(Instant.now());
            repository.save(application);
        } catch (RuntimeException error) {
            try {
                repository.delete(application);
            } catch (RuntimeException cleanupError) {
                log.error("Could not remove failed Founding Writer application {}", application.getId(), cleanupError);
            }
            throw error;
        }

        return true;
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
