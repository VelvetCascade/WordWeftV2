package com.wordweft.foundingwriter.service;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationRequest;
import com.wordweft.foundingwriter.dto.FoundingWriterApplicationUpdateRequest;
import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.foundingwriter.repository.FoundingWriterApplicationRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class FoundingWriterApplicationService {
    private final FoundingWriterApplicationRepository repository;

    public FoundingWriterApplicationService(FoundingWriterApplicationRepository repository) {
        this.repository = repository;
    }

    public boolean submit(FoundingWriterApplicationRequest request) {
        if (request.isHoneypotFilled()) return false;

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
        Instant now = Instant.now();
        application.setCreatedAt(now);
        application.setUpdatedAt(now);

        try {
            repository.insert(application);
        } catch (DuplicateKeyException duplicate) {
            throw new DuplicateFoundingWriterApplicationException();
        }
        return true;
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
