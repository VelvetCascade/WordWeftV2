package com.wordweft.discovery.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HookFeedServiceTest {
    @Mock BookRepository books;
    @Mock UserRepository users;
    @Mock ContentAccessService access;
    private HookFeedService service;

    @BeforeEach
    void setUp() {
        service = new HookFeedService(books, users, access);
        when(access.canDiscover(any(Book.class))).thenReturn(true);
    }

    @Test
    void ranksExplicitGenreMatchesBeforePopularFallbacks() {
        User reader = user("reader", "Reader", List.of("Fantasy"));
        Book popularMystery = story("mystery", "Mystery", List.of("Mystery"), 500,
                chapter("m1", "published", "<p>A locked room.</p>"));
        Book fantasy = story("fantasy", "Fantasy", List.of("Fantasy", "Adventure"), 5,
                chapter("f1", "published", "<p>A dragon woke beneath the city.</p>"));
        when(users.findById("reader")).thenReturn(Optional.of(reader));
        when(users.findById("author")).thenReturn(Optional.of(user("author", "Mira Vale", List.of())));
        when(books.findByPublicationStatus("published")).thenReturn(List.of(popularMystery, fantasy));

        HookFeedResponse result = service.getFeed("reader", Set.of(), 10);

        assertEquals(List.of("fantasy", "mystery"), result.items().stream().map(HookFeedResponse.Hook::bookId).toList());
        assertEquals(List.of("Fantasy"), result.items().get(0).matchedGenres());
        assertEquals("Mira Vale", result.items().get(0).authorName());
    }

    @Test
    void exposesOnlyPublishedOpeningsAndHonorsSeenStories() {
        Book seen = story("seen", "Seen", List.of("Fantasy"), 1,
                chapter("seen-1", "published", "Visible"));
        Book draftOpening = story("draft-opening", "Draft", List.of("Fantasy"), 2,
                chapter("draft-1", "draft", "Secret"));
        Book mixed = story("mixed", "Mixed", List.of("Fantasy"), 3,
                chapter("private", "draft", "Do not leak"),
                chapter("public", "published", "<p>The public beginning.</p>"));
        when(books.findByPublicationStatus("published")).thenReturn(List.of(seen, draftOpening, mixed));
        when(users.findById("author")).thenReturn(Optional.empty());

        HookFeedResponse result = service.getFeed(null, Set.of("seen"), 10);

        assertEquals(1, result.items().size());
        assertEquals("mixed", result.items().get(0).bookId());
        assertEquals("public", result.items().get(0).chapterId());
        assertFalse(result.items().get(0).excerpt().contains("<p>"));
        assertFalse(result.items().get(0).excerpt().contains("Do not leak"));
    }

    @Test
    void createsAReadableBoundedExcerpt() {
        String repeated = "<p>" + "A very long opening sentence. ".repeat(40) + "</p>";
        Book book = story("long", "Long", List.of("Literary"), 1,
                chapter("chapter", "published", repeated));
        when(books.findByPublicationStatus("published")).thenReturn(List.of(book));
        when(users.findById("author")).thenReturn(Optional.empty());

        String excerpt = service.getFeed(null, Set.of(), 10).items().get(0).excerpt();

        assertTrue(excerpt.length() <= 520);
        assertTrue(excerpt.endsWith("…"));
    }

    private Book story(String id, String title, List<String> genres, int recentReads, Chapter... chapters) {
        Book book = new Book();
        book.setId(id);
        book.setTitle(title);
        book.setAuthorId("author");
        book.setPublicationStatus("published");
        book.setGenres(genres);
        book.setReadCountLast7Days(recentReads);
        book.setChapters(List.of(chapters));
        return book;
    }

    private Chapter chapter(String id, String status, String content) {
        Chapter chapter = new Chapter();
        chapter.setId(id);
        chapter.setTitle("Opening");
        chapter.setStatus(status);
        chapter.setContent(content);
        chapter.updateWordCount();
        return chapter;
    }

    private User user(String id, String name, List<String> genres) {
        User user = new User();
        user.setId(id);
        user.setUsername(name);
        user.setFavoriteGenres(genres);
        return user;
    }
}
