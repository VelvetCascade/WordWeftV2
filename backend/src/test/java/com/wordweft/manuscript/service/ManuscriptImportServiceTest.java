package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManuscriptImportServiceTest {
    @Test
    void importAppendsDraftChaptersWithoutOverwritingExistingWork() {
        BookRepository books = mock(BookRepository.class);
        Book book = new Book();
        book.setId("book");
        book.setAuthorId("author");
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(books.save(any(Book.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser());

        ManuscriptImportService.ImportResult result = service.importManuscript(
                "author", "book", "story.md",
                "# Chapter One\nOpening text".getBytes(StandardCharsets.UTF_8));

        assertEquals(1, result.importedChapters());
        assertEquals("draft", book.getChapters().get(0).getStatus());
        verify(books).save(book);
    }

    @Test
    void importRejectsAnotherWritersStory() {
        BookRepository books = mock(BookRepository.class);
        Book book = new Book();
        book.setId("book");
        book.setAuthorId("author");
        when(books.findById("book")).thenReturn(Optional.of(book));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.importManuscript("intruder", "book", "story.txt", "text".getBytes(StandardCharsets.UTF_8)));

        assertEquals(403, error.getStatusCode().value());
    }
}
