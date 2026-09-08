package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.security.services.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReadingControllerTest {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void overallProgressCountsPublishedChaptersOnly() {
        ReadingController controller = new ReadingController();
        ReadingProgressRepository progress = mock(ReadingProgressRepository.class);
        BookRepository books = mock(BookRepository.class);
        LibraryRepository library = mock(LibraryRepository.class);
        ReflectionTestUtils.setField(controller, "progressRepository", progress);
        ReflectionTestUtils.setField(controller, "bookRepository", books);
        ReflectionTestUtils.setField(controller, "libraryRepository", library);

        Chapter published = new Chapter();
        published.setId("published");
        published.setStatus("published");
        Chapter draft = new Chapter();
        draft.setId("draft");
        draft.setStatus("draft");
        Book book = new Book();
        book.setId("book");
        book.setChapters(List.of(published, draft));
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(progress.findByUserIdAndBookId("reader", "book")).thenReturn(Optional.empty());
        when(library.findByUserIdAndBookId("reader", "book")).thenReturn(Optional.of(new LibraryEntry()));

        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", "reader@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        controller.saveProgress(Map.of(
                "bookId", "book",
                "chapterIndex", 0,
                "scrollPosition", 120,
                "chapterData", Map.of("id", "published", "progress", 50, "scroll", 120)));

        ArgumentCaptor<ReadingProgress> saved = ArgumentCaptor.forClass(ReadingProgress.class);
        verify(progress).save(saved.capture());
        assertEquals(50, saved.getValue().getOverallProgress());
        assertEquals(0, saved.getValue().getLastReadChapterIndex());
    }
}
