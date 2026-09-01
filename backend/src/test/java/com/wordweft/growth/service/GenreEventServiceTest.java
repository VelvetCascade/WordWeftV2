package com.wordweft.growth.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.growth.model.GenreEvent;
import com.wordweft.growth.repository.GenreEventRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenreEventServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T12:00:00Z");
    @Mock GenreEventRepository events;
    @Mock BookRepository books;
    @Mock UserRepository users;
    private GenreEventService service;
    private GenreEvent event;

    @BeforeEach
    void setUp() {
        service = new GenreEventService(events, books, users);
        event = new GenreEvent();
        event.setId("event");
        event.setTitle("Fantasy First Chapters");
        event.setGenre("Fantasy");
        event.setStatus("published");
        event.setStartAt(NOW.minusSeconds(3600));
        event.setEndAt(NOW.plusSeconds(3600));
        event.setBookIds(new ArrayList<>());
        when(events.findById("event")).thenReturn(Optional.of(event));
    }

    @Test
    void acceptsOnlyTheWritersPublishedMatchingStoryAndDoesNotDuplicateIt() {
        Book eligible = book("book", "writer", "published", List.of("Fantasy", "Adventure"));
        when(books.findById("book")).thenReturn(Optional.of(eligible));
        when(events.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("writer")).thenReturn(Optional.of(user("writer", "Ari")));

        service.submit("writer", "event", "book", NOW);
        service.submit("writer", "event", "book", NOW);

        assertEquals(List.of("book"), event.getBookIds());
        verify(events).save(event);
    }

    @Test
    void rejectsSomeoneElsesStoryAndWrongGenre() {
        when(books.findById("book")).thenReturn(Optional.of(book("book", "other", "published", List.of("Fantasy"))));
        assertThrows(AccessDeniedException.class, () -> service.submit("writer", "event", "book", NOW));

        when(books.findById("book")).thenReturn(Optional.of(book("book", "writer", "published", List.of("Romance"))));
        assertThrows(IllegalArgumentException.class, () -> service.submit("writer", "event", "book", NOW));
        verify(events, never()).save(any());
    }

    private Book book(String id, String authorId, String status, List<String> genres) {
        Book book = new Book();
        book.setId(id);
        book.setAuthorId(authorId);
        book.setTitle("The Lantern Road");
        book.setPublicationStatus(status);
        book.setGenres(genres);
        return book;
    }

    private User user(String id, String name) {
        User user = new User();
        user.setId(id);
        user.setUsername(name);
        return user;
    }
}
