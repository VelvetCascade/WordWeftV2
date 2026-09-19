package com.wordweft.book.service;

import com.wordweft.foundingwriter.service.UploadTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChapterImageStorageServiceTest {

    @Test
    void missingStorageConfigurationFailsInsteadOfReturningAnUnstoredUrl() {
        UploadTokenService tokens = mock(UploadTokenService.class);
        when(tokens.getWorkerBaseUrl()).thenReturn("  ");
        ChapterImageStorageService service = new ChapterImageStorageService(tokens);
        byte[] png = new byte[] {
                (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
        };

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.uploadChapterImageBytes("book-1", "cover.png", png));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertTrue(error.getReason().contains("temporarily unavailable"));
    }

    @Test
    void generatedFilenameUsesTheDetectedContentExtension() {
        String name = ChapterImageStorageService.generateUniqueFilename(".webp");

        assertTrue(name.matches("img_[a-f0-9]{12}\\.webp"));
    }

    @Test
    void svgContentIsRejectedEvenWhenItHasAnAllowedFilename() {
        UploadTokenService tokens = mock(UploadTokenService.class);
        ChapterImageStorageService service = new ChapterImageStorageService(tokens);

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.uploadChapterImageBytes(
                        "book-1", "image.png", "<svg><script/></svg>".getBytes()));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }
}
