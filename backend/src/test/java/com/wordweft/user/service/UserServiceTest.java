package com.wordweft.user.service;

import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.repository.ShelfRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {
    @Test void publicProfileDoesNotLoadOrExposePrivateLibraryData() {
        UserService service = new UserService();
        service.userRepository = mock(UserRepository.class);
        service.bookRepository = mock(BookRepository.class);
        service.libraryRepository = mock(LibraryRepository.class);
        service.shelfRepository = mock(ShelfRepository.class);
        service.readingProgressRepository = mock(ReadingProgressRepository.class);
        service.bookService = mock(BookService.class);
        User user = new User("storyperson", "private@example.com", "hash");
        user.setId("user-1"); user.setBio("Public bio"); user.setLocation("Public place");
        when(service.userRepository.findById("user-1")).thenReturn(Optional.of(user));

        Map<String, Object> profile = service.getPublicProfile("user-1", null);

        assertEquals("user-1", profile.get("id"));
        assertEquals("storyperson", profile.get("username"));
        assertFalse(profile.containsKey("email"));
        assertFalse(profile.containsKey("library"));
        assertFalse(profile.containsKey("dateOfBirth"));
        assertFalse(profile.containsKey("following"));
        verifyNoInteractions(service.bookService, service.bookRepository, service.libraryRepository,
                service.shelfRepository, service.readingProgressRepository);
    }
}
