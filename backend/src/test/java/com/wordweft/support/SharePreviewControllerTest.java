package com.wordweft.support;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.AgeRating;
import java.util.List;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SharePreviewControllerTest {
    @Test
    void publishedBookPreviewUsesTheStoryCoverAndCanonicalPage() {
        BookRepository books = mock(BookRepository.class);
        UserRepository users = mock(UserRepository.class);
        Book book = new Book();
        book.setId("story-1");
        book.setTitle("North Star");
        book.setAuthorId("author-1");
        book.setPublicationStatus("published");
        Chapter chapter = new Chapter(); chapter.setId("chapter-1"); chapter.setStatus("published");
        book.setChapters(List.of(chapter));
        book.setSummary("A story written for the long road home.");
        book.setCoverUrl("https://images.example.test/north-star.jpg");
        User author = new User();
        author.setId("author-1");
        author.setUsername("River Quinn");
        when(books.findById("story-1")).thenReturn(Optional.of(book));
        when(users.findById("author-1")).thenReturn(Optional.of(author));

        ResponseEntity<String> response = new SharePreviewController(books, users).book("story-1");

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("https://images.example.test/north-star.jpg"));
        assertTrue(response.getBody().contains("https://www.wordweftstudio.com/book/story-1"));
        assertTrue(response.getBody().contains("North Star by River Quinn"));
    }

    @Test void draftAndMatureBooksHaveNoAnonymousSharePreview() {
        BookRepository books = mock(BookRepository.class);
        UserRepository users = mock(UserRepository.class);
        Book book = new Book(); book.setId("private-story"); book.setAuthorId("author");
        Chapter chapter = new Chapter(); chapter.setStatus("published"); book.setChapters(List.of(chapter));
        when(books.findById("private-story")).thenReturn(Optional.of(book));
        var controller = new SharePreviewController(books, users);
        assertEquals(404, controller.book("private-story").getStatusCode().value());
        book.setPublicationStatus("published"); book.setAgeRating(AgeRating.MATURE_18);
        assertEquals(404, controller.book("private-story").getStatusCode().value());
    }

    @Test void authorShareDoesNotExposeRestrictedBookCoversOrCacheProfile() {
        BookRepository books = mock(BookRepository.class);
        UserRepository users = mock(UserRepository.class);
        User author = new User(); author.setId("author"); author.setUsername("Author");
        Book restricted = new Book(); restricted.setId("restricted"); restricted.setPublicationStatus("published");
        restricted.setAgeRating(AgeRating.ADULT_21); restricted.setCoverUrl("https://example.test/restricted.jpg");
        Chapter chapter = new Chapter(); chapter.setStatus("published"); restricted.setChapters(List.of(chapter));
        when(users.findById("author")).thenReturn(Optional.of(author));
        when(books.findByAuthorIdAndPublicationStatus("author", "published")).thenReturn(List.of(restricted));
        var response = new SharePreviewController(books, users).author("author");
        assertEquals(200, response.getStatusCode().value());
        assertTrue(!response.getBody().contains("restricted.jpg"));
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals("noindex, follow", response.getHeaders().getFirst("X-Robots-Tag"));
    }
}
