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
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FoundingWriterApplicationServiceTest {
    private final FoundingWriterApplicationRepository repository = mock(FoundingWriterApplicationRepository.class);
    private final FoundingWriterStorageService storage = mock(FoundingWriterStorageService.class);
    private final FoundingWriterApplicationService service = new FoundingWriterApplicationService(repository, storage);

    @org.junit.jupiter.api.Test
    void storageServiceConstructorIsExplicitlyAutowiredForTheProductionContext() throws Exception {
        var constructor = FoundingWriterStorageService.class.getConstructor(UploadTokenService.class);
        org.junit.jupiter.api.Assertions.assertTrue(
                constructor.isAnnotationPresent(org.springframework.beans.factory.annotation.Autowired.class));
    }

    @Test
    void storesANormalizedPendingApplication() throws Exception {
        FoundingWriterApplicationRequest request = request();
        request.setEmail("  Writer@Example.COM ");
        
        when(storage.upload(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn("founding-writers/application/chapters.txt");

        assertTrue(service.submit(request, file()));

        ArgumentCaptor<FoundingWriterApplication> captor = ArgumentCaptor.forClass(FoundingWriterApplication.class);
        verify(repository).insert(captor.capture());
        verify(repository).save(captor.getValue());
        assertEquals("writer@example.com", captor.getValue().getEmail());
        assertTrue(captor.getValue().isFileUploaded());
        assertEquals("founding-writers/application/chapters.txt", captor.getValue().getR2FileKey());
    }

    @Test
    void rejectsDuplicatesIncludingInsertRaces() {
        FoundingWriterApplicationRequest request = request();
        when(repository.existsByEmail("writer@example.com")).thenReturn(true);
        assertThrows(DuplicateFoundingWriterApplicationException.class, () -> service.submit(request, file()));

        reset(repository);
        when(repository.insert(any(FoundingWriterApplication.class))).thenThrow(new DuplicateKeyException("unique email"));
        assertThrows(DuplicateFoundingWriterApplicationException.class, () -> service.submit(request, file()));
    }

    @Test
    void flagsHoneypotSubmissionsWithoutDroppingData() {
        FoundingWriterApplicationRequest request = request();
        request.setWebsite_ref_hp("Spam Bot Entry");
        when(storage.upload(anyString(), anyString(), anyString(), any(byte[].class))).thenReturn("stored/key");
        boolean result = service.submit(request, file());
        assertTrue(result);
        ArgumentCaptor<FoundingWriterApplication> captor = ArgumentCaptor.forClass(FoundingWriterApplication.class);
        verify(repository).insert(captor.capture());
        assertTrue(captor.getValue().isHoneypotTriggered());
    }

    @Test
    void failedR2UploadRollsBackTheApplicationAndReportsFailure() {
        when(storage.upload(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "storage offline"));

        assertThrows(ResponseStatusException.class, () -> service.submit(request(), file()));

        ArgumentCaptor<FoundingWriterApplication> captor = ArgumentCaptor.forClass(FoundingWriterApplication.class);
        verify(repository).insert(captor.capture());
        verify(repository).delete(captor.getValue());
        verify(repository, never()).save(any());
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
        request.setChaptersConfirmed(true);
        return request;
    }

    private org.springframework.mock.web.MockMultipartFile file() {
        return new org.springframework.mock.web.MockMultipartFile("file", "chapters.txt", "text/plain",
                "Chapter 1\nOpening\nChapter 2\nMiddle\nChapter 3\nEnding".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void rejectsMissingEmptyOversizedAndDisguisedFiles() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.submit(request(), null));
        for (var invalid : java.util.List.of(
                new org.springframework.mock.web.MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]),
                new org.springframework.mock.web.MockMultipartFile("file", "large.txt", "text/plain", new byte[5 * 1024 * 1024 + 1]),
                new org.springframework.mock.web.MockMultipartFile("file", "fake.pdf", "application/pdf", "not a pdf".getBytes()),
                new org.springframework.mock.web.MockMultipartFile("file", "fake.docx", "application/zip", "not a zip".getBytes()),
                new org.springframework.mock.web.MockMultipartFile("file", "script.html", "text/html", "<script>".getBytes()))) {
            assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.submit(request(), invalid));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void fileKeysAreNeverSerializedInApplicationJson() throws Exception {
        var application = new FoundingWriterApplication();
        application.setR2FileKey("secret-key.pdf");
        application.setCreatedAt(null);
        application.setUpdatedAt(null);
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(application);
        assertFalse(json.contains("secret-key"));
    }

    @Test
    void acceptsPdfAndDocxContainersAndSanitizesNames() throws Exception {
        var pdf = new org.springframework.mock.web.MockMultipartFile("file", "../../chapters.pdf", "application/pdf", "%PDF-1.7\nexample".getBytes());
        assertEquals("chapters.pdf", ChapterFileValidator.validate(pdf).name());
        var bytes = new java.io.ByteArrayOutputStream();
        try (var zip = new java.util.zip.ZipOutputStream(bytes)) {
            for (String name : java.util.List.of("[Content_Types].xml", "word/document.xml")) {
                zip.putNextEntry(new java.util.zip.ZipEntry(name));
                zip.write("<document/>".getBytes());
                zip.closeEntry();
            }
        }
        var docx = new org.springframework.mock.web.MockMultipartFile("file", "chapters.docx", "application/octet-stream", bytes.toByteArray());
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ChapterFileValidator.validate(docx).contentType());
    }
}
