package com.wordweft.support;

import com.wordweft.book.model.Book;
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
        assertTrue(response.getBody().contains("https://wordweftstudio.com/book/story-1"));
        assertTrue(response.getBody().contains("North Star by River Quinn"));
    }
}
