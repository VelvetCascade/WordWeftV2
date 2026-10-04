package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.service.BookActivityCounters;
import com.wordweft.book.model.Review;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReviewRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ReviewControllerTest {
    final ReviewController controller = new ReviewController();
    final ReviewRepository reviews = mock(ReviewRepository.class);

    @BeforeEach void setup() {
        controller.reviewRepository = reviews;
        controller.counters = mock(BookActivityCounters.class);
        controller.bookRepository = mock(BookRepository.class);
        controller.userRepository = mock(UserRepository.class);
        Book book = new Book(); book.setId("story");
        when(controller.bookRepository.findById("story")).thenReturn(Optional.of(book));
        User user = new User(); user.setId("reader"); user.setUsername("Reader"); user.setAvatarUrl("");
        when(controller.userRepository.findById(anyString())).thenReturn(Optional.of(user));
        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", "reader@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    @AfterEach void clearSession() { SecurityContextHolder.clearContext(); }

    @Test void reviewUpdatesNeverReplaceTheManuscriptDocument() {
        when(reviews.findByBookId("story")).thenReturn(List.of());
        Review input = new Review(); input.setRating(4); input.setComment("An ordinary reader review.");
        controller.addReview("story", input);
        verify(controller.bookRepository, never()).save(any(Book.class));
        verify(controller.counters).reviewsChanged("story", 0, 0.0);
    }

    @Test void editingKeepsTheExistingReviewAndReplies() {
        Review existing = new Review(); existing.setId("existing"); existing.setUserId("reader"); existing.setBookId("story"); existing.setDate(LocalDate.of(2026, 9, 1));
        existing.getReplies().add(new Review.Reply());
        when(reviews.findByBookId("story")).thenReturn(List.of(existing));
        Review update = new Review(); update.setRating(5); update.setComment("An updated review.");
        controller.addReview("story", update);
        verify(reviews).save(existing);
        assertEquals("existing", existing.getId()); assertEquals(5, existing.getRating());
        assertEquals("An updated review.", existing.getComment()); assertEquals(1, existing.getReplies().size());
        assertEquals(LocalDate.of(2026, 9, 1), existing.getDate());
    }

    @Test void creatingIgnoresClientOwnedIdentifiersAndReplies() {
        when(reviews.findByBookId("story")).thenReturn(List.of());
        Review input = new Review(); input.setId("another-readers-review"); input.setUserId("another-reader"); input.setBookId("another-story"); input.setRating(4); input.setComment("A new review."); input.getReplies().add(new Review.Reply());
        controller.addReview("story", input);
        ArgumentCaptor<Review> saved = ArgumentCaptor.forClass(Review.class); verify(reviews).save(saved.capture());
        assertNull(saved.getValue().getId()); assertEquals("reader", saved.getValue().getUserId());
        assertEquals("story", saved.getValue().getBookId()); assertTrue(saved.getValue().getReplies().isEmpty());
    }
}
