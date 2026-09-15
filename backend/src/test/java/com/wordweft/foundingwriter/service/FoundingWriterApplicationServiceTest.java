package com.wordweft.foundingwriter.service;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationRequest;
import com.wordweft.foundingwriter.dto.FoundingWriterApplicationUpdateRequest;
import com.wordweft.foundingwriter.model.ExpectedCompletionPeriod;
import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.foundingwriter.repository.FoundingWriterApplicationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FoundingWriterApplicationServiceTest {
    private final FoundingWriterApplicationRepository repository = mock(FoundingWriterApplicationRepository.class);
    private final FoundingWriterApplicationService service = new FoundingWriterApplicationService(repository);

    @Test
    void storesANormalizedPendingApplication() {
        FoundingWriterApplicationRequest request = request();
        request.setEmail("  Writer@Example.COM ");

        assertTrue(service.submit(request));

        ArgumentCaptor<FoundingWriterApplication> saved = ArgumentCaptor.forClass(FoundingWriterApplication.class);
        verify(repository).insert(saved.capture());
        assertEquals("writer@example.com", saved.getValue().getEmail());
        assertEquals(FoundingWriterApplicationStatus.PENDING, saved.getValue().getStatus());
        assertNotNull(saved.getValue().getCreatedAt());
        assertEquals(saved.getValue().getCreatedAt(), saved.getValue().getUpdatedAt());
    }

    @Test
    void rejectsDuplicatesIncludingInsertRaces() {
        FoundingWriterApplicationRequest request = request();
        when(repository.existsByEmail("writer@example.com")).thenReturn(true);
        assertThrows(DuplicateFoundingWriterApplicationException.class, () -> service.submit(request));

        reset(repository);
        when(repository.insert(any(FoundingWriterApplication.class))).thenThrow(new DuplicateKeyException("unique email"));
        assertThrows(DuplicateFoundingWriterApplicationException.class, () -> service.submit(request));
    }

    @Test
    void silentlyIgnoresHoneypotSubmissions() {
        FoundingWriterApplicationRequest request = request();
        request.setOrganizationName("Spam Incorporated");
        assertFalse(service.submit(request));
        verifyNoInteractions(repository);
    }

    @Test
    void updatesStatusNotesAndTimestamp() {
        FoundingWriterApplication application = new FoundingWriterApplication();
        application.setId("application-1");
        var originalTimestamp = application.getUpdatedAt();
        when(repository.findById("application-1")).thenReturn(Optional.of(application));
        when(repository.save(application)).thenReturn(application);
        FoundingWriterApplicationUpdateRequest update = new FoundingWriterApplicationUpdateRequest();
        update.setStatus(FoundingWriterApplicationStatus.ACCEPTED);
        update.setAdminNotes(" Strong opening. ");

        FoundingWriterApplication saved = service.update("application-1", update);

        assertEquals(FoundingWriterApplicationStatus.ACCEPTED, saved.getStatus());
        assertEquals("Strong opening.", saved.getAdminNotes());
        assertFalse(saved.getUpdatedAt().isBefore(originalTimestamp));
    }

    private FoundingWriterApplicationRequest request() {
        FoundingWriterApplicationRequest request = new FoundingWriterApplicationRequest();
        request.setFullName("Writer Name");
        request.setEmail("writer@example.com");
        request.setCountry("India");
        request.setGenre("Fantasy");
        request.setStoryTitle("A Story");
        request.setStoryDescription("An original serial story.");
        request.setPastedWritingSample("Once upon a time...");
        request.setDraftedChapterCount(3);
        request.setPlannedChapterCount(20);
        request.setExpectedCompletionPeriod(ExpectedCompletionPeriod.TWO_TO_FOUR_MONTHS);
        request.setAgeConfirmed(true);
        request.setRightsConfirmed(true);
        request.setCompletionCommitted(true);
        request.setWeeklyPublishingCommitted(true);
        request.setEarningsDisclaimerConfirmed(true);
        request.setTermsConfirmed(true);
        return request;
    }
}
