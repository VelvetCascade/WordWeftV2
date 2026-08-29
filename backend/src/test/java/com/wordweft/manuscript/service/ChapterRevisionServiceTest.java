package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.manuscript.model.ChapterRevision;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChapterRevisionServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T10:00:00Z");

    @Mock ChapterRevisionRepository revisions;
    @Mock BookRepository books;
    private ChapterRevisionService service;
    private Book book;
    private Chapter chapter;

    @BeforeEach
    void setUp() {
        service = new ChapterRevisionService(
                revisions, books, Clock.fixed(NOW, ZoneOffset.UTC));
        chapter = new Chapter();
        chapter.setId("chapter");
        chapter.setTitle("Current title");
        chapter.setContent("<p>Current content</p>");
        chapter.setStatus("published");
        book = new Book();
        book.setId("book");
        book.setAuthorId("author");
        book.setChapters(List.of(chapter));
    }

    @Test
    void autosaveCaptureStoresAHashButIsThrottledForFiveMinutes() {
        ChapterRevision recent = new ChapterRevision();
        recent.setCreatedAt(NOW.minusSeconds(60));
        recent.setContentHash("a-different-hash");
        when(revisions.findFirstByChapterIdOrderByCreatedAtDesc("chapter")).thenReturn(Optional.of(recent));

        service.capture("author", book, chapter, "AUTOSAVE", false);

        verify(revisions, never()).save(any());
    }

    @Test
    void explicitSaveCapturesImmediatelyWithoutStoringRawContentAsTheHash() {
        when(revisions.findFirstByChapterIdOrderByCreatedAtDesc("chapter")).thenReturn(Optional.empty());

        service.capture("author", book, chapter, "MANUAL_SAVE", true);

        ArgumentCaptor<ChapterRevision> captured = ArgumentCaptor.forClass(ChapterRevision.class);
        verify(revisions).save(captured.capture());
        assertEquals("Current content", captured.getValue().getPlainTextPreview());
        assertNotEquals(chapter.getContent(), captured.getValue().getContentHash());
        assertEquals(NOW, captured.getValue().getCreatedAt());
    }

    @Test
    void restoringACopyReturnsChapterToDraftAndPreservesTheCurrentVersionFirst() {
        ChapterRevision old = new ChapterRevision();
        old.setId("revision");
        old.setAuthorId("author");
        old.setBookId("book");
        old.setChapterId("chapter");
        old.setTitle("Earlier title");
        old.setContent("<p>Earlier content</p>");
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(revisions.findById("revision")).thenReturn(Optional.of(old));
        when(revisions.findFirstByChapterIdOrderByCreatedAtDesc("chapter")).thenReturn(Optional.empty());

        service.restore("author", "book", "chapter", "revision");

        assertEquals("Earlier title", chapter.getTitle());
        assertEquals("<p>Earlier content</p>", chapter.getContent());
        assertEquals("draft", chapter.getStatus());
        verify(books).save(book);
        verify(revisions).save(any(ChapterRevision.class));
    }

    @Test
    void anotherWriterCannotListOrRestoreRevisions() {
        when(books.findById("book")).thenReturn(Optional.of(book));

        ResponseStatusException listError = assertThrows(ResponseStatusException.class,
                () -> service.list("intruder", "book", "chapter"));
        ResponseStatusException restoreError = assertThrows(ResponseStatusException.class,
                () -> service.restore("intruder", "book", "chapter", "revision"));

        assertEquals(403, listError.getStatusCode().value());
        assertEquals(403, restoreError.getStatusCode().value());
    }
}
