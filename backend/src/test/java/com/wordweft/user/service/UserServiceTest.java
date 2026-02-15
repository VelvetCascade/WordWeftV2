package com.wordweft.user.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.model.Shelf;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.repository.ShelfRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BookRepository bookRepository;

    @Mock
    private LibraryRepository libraryRepository;

    @Mock
    private BookService bookService;

    @Mock
    private ShelfRepository shelfRepository;

    @Mock
    private ReadingProgressRepository readingProgressRepository;

    @InjectMocks
    private UserService userService;

    private User user;
    private String userId = "user1";

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(userId);
        user.setUsername("testuser");
        user.setFollowers(new HashSet<>());
        user.setFollowing(new HashSet<>());
    }

    @Test
    void testEnrichUser_Owner_SeesDefaultShelves() {
        // Arrange
        when(bookRepository.findByAuthorId(userId)).thenReturn(new ArrayList<>());
        when(libraryRepository.findByUserId(userId)).thenReturn(new ArrayList<>());
        when(shelfRepository.findByUserId(userId)).thenReturn(new ArrayList<>());
        when(readingProgressRepository.findByUserId(userId)).thenReturn(new ArrayList<>());

        // Act
        Map<String, Object> result = userService.enrichUser(user, userId);

        // Assert
        List<Map<String, Object>> library = (List<Map<String, Object>>) result.get("library");
        assertNotNull(library);

        // Should contain default shelves: All Books, Reading, To Read, Completed
        assertTrue(library.stream().anyMatch(s -> "all".equals(s.get("id"))));
        assertTrue(library.stream().anyMatch(s -> "reading".equals(s.get("id"))));
        assertTrue(library.stream().anyMatch(s -> "toread".equals(s.get("id"))));
        assertTrue(library.stream().anyMatch(s -> "completed".equals(s.get("id"))));
    }

    @Test
    void testEnrichUser_NonOwner_DoesNotSeeDefaultShelves() {
        // Arrange
        String viewerId = "viewer1";
        when(bookRepository.findByAuthorId(userId)).thenReturn(new ArrayList<>());
        when(libraryRepository.findByUserId(userId)).thenReturn(new ArrayList<>());

        // Mock a public custom shelf to ensure logic doesn't break everything
        Shelf publicShelf = new Shelf(userId, "My Public Shelf");
        publicShelf.setId("shelf1");
        publicShelf.setVisibility("PUBLIC");

        // Mock a private custom shelf
        Shelf privateShelf = new Shelf(userId, "My Private Shelf");
        privateShelf.setId("shelf2");
        privateShelf.setVisibility("PRIVATE");

        when(shelfRepository.findByUserId(userId)).thenReturn(Arrays.asList(publicShelf, privateShelf));
        when(readingProgressRepository.findByUserId(userId)).thenReturn(new ArrayList<>());

        // Act
        Map<String, Object> result = userService.enrichUser(user, viewerId);

        // Assert
        List<Map<String, Object>> library = (List<Map<String, Object>>) result.get("library");
        assertNotNull(library);

        // Should NOT contain default shelves
        assertFalse(library.stream().anyMatch(s -> "all".equals(s.get("id"))), "Non-owner should not see 'All Books'");
        assertFalse(library.stream().anyMatch(s -> "reading".equals(s.get("id"))),
                "Non-owner should not see 'Reading'");
        assertFalse(library.stream().anyMatch(s -> "toread".equals(s.get("id"))), "Non-owner should not see 'To Read'");
        assertFalse(library.stream().anyMatch(s -> "completed".equals(s.get("id"))),
                "Non-owner should not see 'Completed'");

        // Should see PUBLIC custom shelf
        assertTrue(library.stream().anyMatch(s -> "shelf1".equals(s.get("id"))),
                "Non-owner should see public custom shelf");

        // Should NOT see PRIVATE custom shelf (this logic was already in place, but
        // good to verify)
        // Wait, the filtering for custom shelves happens inside enrichUser too, let's
        // verify that behavior matches expectation
        // Looking at code: yes, customShelves are filtered before loop.
        assertFalse(library.stream().anyMatch(s -> "shelf2".equals(s.get("id"))),
                "Non-owner should not see private custom shelf");
    }
}
