package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BookServiceReleaseProjectionTest {
    private BookService service;
    private Book book;
    private Chapter published;
    private Chapter scheduled;

    @BeforeEach
    void setUp() {
        service = new BookService();
        BookRepository books = mock(BookRepository.class);
        UserRepository users = mock(UserRepository.class);
        ContentAccessService access = mock(ContentAccessService.class);
        ReflectionTestUtils.setField(service, "bookRepository", books);
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "contentAccessService", access);

        User author = new User();
        author.setId("author");
        author.setUsername("Writer");
        when(users.findById("author")).thenReturn(Optional.of(author));

        published = new Chapter();
        published.setId("published");
        published.setTitle("Published");
        published.setContent("Visible");
        published.setStatus("published");
        published.setPublishedAt(Instant.parse("2026-08-20T10:00:00Z"));

        scheduled = new Chapter();
        scheduled.setId("scheduled");
        scheduled.setTitle("Secret draft");
        scheduled.setContent("Not public yet");
        scheduled.setStatus("scheduled");
        scheduled.setScheduledAt(Instant.parse("2026-09-01T12:30:00Z"));

        Chapter later = new Chapter();
        later.setId("later");
        later.setTitle("Later draft");
        later.setContent("Also private");
        later.setStatus("scheduled");
        later.setScheduledAt(Instant.parse("2026-09-10T12:30:00Z"));

        book = new Book();
        book.setId("book");
        book.setAuthorId("author");
        book.setTitle("North Star");
        book.setPublicationStatus("published");
        book.setChapters(List.of(published, scheduled, later));
    }

    @Test
    void publicProjectionHidesUnpublishedChaptersAndShowsOnlyEarliestRelease() {
        Map<String, Object> response = service.enrichBook(book, null);

        List<?> chapters = (List<?>) response.get("chapters");
        assertEquals(1, chapters.size());
        assertEquals(Instant.parse("2026-09-01T12:30:00Z"), response.get("nextScheduledReleaseAt"));
        Map<?, ?> publicChapter = (Map<?, ?>) chapters.get(0);
        assertFalse(publicChapter.containsKey("scheduledAt"));
        assertFalse(publicChapter.containsKey("publishedAt"));
    }

    @Test
    void ownerProjectionIncludesDraftsAndPrivateReleaseTimestamps() {
        Map<String, Object> response = service.enrichBook(book, "author");

        List<?> chapters = (List<?>) response.get("chapters");
        assertEquals(3, chapters.size());
        Map<?, ?> scheduledChapter = (Map<?, ?>) chapters.get(1);
        assertEquals(scheduled.getScheduledAt(), scheduledChapter.get("scheduledAt"));
        assertTrue(scheduledChapter.containsKey("publishedAt"));
    }
}
