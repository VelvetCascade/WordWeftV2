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
    void restoringAPublishedChapterAlsoReturnsLaterChaptersToDraft() {
        Chapter later = new Chapter();
        later.setId("later");
        later.setTitle("Later title");
        later.setContent("<p>Later content</p>");
        later.setStatus("published");
        later.setPublishedAt(NOW.minusSeconds(60));
        book.setChapters(List.of(chapter, later));

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

        assertEquals("draft", later.getStatus());
        assertEquals(null, later.getPublishedAt());
    }

    @Test
    void checkpointRejectsStaleTabRevisionBeforeLabelingAnotherTabsDraft() {
        when(books.findById("book")).thenReturn(Optional.of(book)); chapter.setEditRevision(4);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.checkpoint("author", "book", "chapter", "My saved draft", 3L)).getStatusCode().value());
        verify(revisions, never()).save(any());
    }

    @Test
    void workingDraftRestoreKeepsTheLiveReleaseAndAllLaterReleasesAndSchedules() {
        chapter.setPublishedAt(NOW.minusSeconds(120));
        Chapter later = new Chapter(); later.setId("later"); later.setStatus("published"); later.setPublishedAt(NOW.minusSeconds(60));
        Chapter scheduled = new Chapter(); scheduled.setId("scheduled"); scheduled.setStatus("scheduled"); scheduled.setScheduledAt(NOW.plusSeconds(3600));
        book.setPublicationStatus("published"); book.setChapters(List.of(chapter, later, scheduled));
        ChapterRevision old = new ChapterRevision(); old.setId("revision"); old.setAuthorId("author"); old.setBookId("book"); old.setChapterId("chapter");
        old.setTitle("Earlier title"); old.setContent("<p>sun<strong>rise</strong>&nbsp;again</p>");
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(revisions.findById("revision")).thenReturn(Optional.of(old));
        service.restore("author", "book", "chapter", "revision", 0L, true);
        assertEquals("Earlier title", chapter.getTitle()); assertEquals(2, chapter.getWordCount());
        assertEquals("published", chapter.getStatus()); assertEquals(NOW.minusSeconds(120), chapter.getPublishedAt());
        assertEquals("Current title", chapter.getPublishedTitle()); assertEquals("<p>Current content</p>", chapter.getPublishedContent());
        assertEquals("published", later.getStatus()); assertEquals(NOW.minusSeconds(60), later.getPublishedAt()); assertEquals(0, later.getEditRevision());
        assertEquals("scheduled", scheduled.getStatus()); assertEquals(NOW.plusSeconds(3600), scheduled.getScheduledAt()); assertEquals(0, scheduled.getEditRevision());
        assertEquals("published", book.getPublicationStatus()); assertEquals(1, chapter.getEditRevision());
    }

    @Test
    void revisionContentCannotBeReadAcrossAnAuthorsChapters() {
        when(books.findById("book")).thenReturn(Optional.of(book));
        ChapterRevision unrelated = new ChapterRevision(); unrelated.setAuthorId("author"); unrelated.setBookId("another-book"); unrelated.setChapterId("chapter");
        when(revisions.findById("revision")).thenReturn(Optional.of(unrelated));
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.get("author", "book", "chapter", "revision")).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.get("reader", "book", "chapter", "revision")).getStatusCode().value());
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
