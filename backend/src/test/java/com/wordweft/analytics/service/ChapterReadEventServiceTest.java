package com.wordweft.analytics.service;

import com.wordweft.analytics.model.ChapterReadEvent;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChapterReadEventServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T10:00:00Z");
    private static final String SESSION_ID = "9f45f6dc-e555-451e-9bc9-4bf54fd715de";

    @Mock ChapterReadEventRepository events;
    @Mock BookRepository books;
    private ChapterReadEventService service;
    private Book book;

    @BeforeEach
    void setUp() {
        service = new ChapterReadEventService(events, books);
        Chapter chapter = new Chapter();
        chapter.setId("chapter");
        chapter.setStatus("published");
        book = new Book();
        book.setId("book");
        book.setPublicationStatus("published");
        book.setChapters(List.of(chapter));
        when(books.findById("book")).thenReturn(Optional.of(book));
    }

    @Test
    void sameReaderAndChapterAreUniquePerUtcDay() {
        service.record("book", "chapter", null, SESSION_ID, "https://example.com/post", NOW);
        service.record("book", "chapter", null, SESSION_ID, "https://example.com/other", NOW.plusSeconds(60));

        ArgumentCaptor<ChapterReadEvent> captured = ArgumentCaptor.forClass(ChapterReadEvent.class);
        verify(events, times(2)).save(captured.capture());
        assertEquals(captured.getAllValues().get(0).getId(), captured.getAllValues().get(1).getId());
        assertEquals(LocalDate.parse("2026-08-29"), captured.getValue().getReadDate());
    }

    @Test
    void eventStoresAHashAndHostnameInsteadOfBrowserIdentifiers() {
        service.record("book", "chapter", null, SESSION_ID, "https://news.example.com/post?id=secret", NOW);

        ArgumentCaptor<ChapterReadEvent> captured = ArgumentCaptor.forClass(ChapterReadEvent.class);
        verify(events).save(captured.capture());
        assertNotEquals(SESSION_ID, captured.getValue().getReaderKeyHash());
        assertEquals(64, captured.getValue().getReaderKeyHash().length());
        assertEquals("news.example.com", captured.getValue().getReferrer());
        assertEquals(NOW.plusSeconds(400L * 24 * 60 * 60), captured.getValue().getExpiresAt());
    }

    @Test
    void authenticatedReaderDoesNotNeedAnAnonymousSession() {
        service.record("book", "chapter", "reader", null, null, NOW);

        ArgumentCaptor<ChapterReadEvent> captured = ArgumentCaptor.forClass(ChapterReadEvent.class);
        verify(events).save(captured.capture());
        assertEquals("reader", captured.getValue().getUserId());
        assertEquals("direct", captured.getValue().getReferrer());
    }

    @Test
    void anonymousReaderMustProvideAValidUuid() {
        ResponseStatusException missing = assertThrows(ResponseStatusException.class,
                () -> service.record("book", "chapter", null, null, null, NOW));
        ResponseStatusException invalid = assertThrows(ResponseStatusException.class,
                () -> service.record("book", "chapter", null, "browser-fingerprint", null, NOW));

        assertEquals(400, missing.getStatusCode().value());
        assertEquals(400, invalid.getStatusCode().value());
    }

    @Test
    void draftsCannotBeRecordedAsReaderViews() {
        book.getChapters().get(0).setStatus("draft");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.record("book", "chapter", null, SESSION_ID, null, NOW));

        assertEquals(404, error.getStatusCode().value());
    }
}
