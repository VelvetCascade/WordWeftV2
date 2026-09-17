package com.wordweft.user.service;

import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.repository.ShelfRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
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

    @Test
    void enrichUserSafelyLoadsLibraryWithoutThrowingOnRestrictedBooks() {
        UserService service = new UserService();
        service.userRepository = mock(UserRepository.class);
        service.bookRepository = mock(BookRepository.class);
        service.libraryRepository = mock(LibraryRepository.class);
        service.shelfRepository = mock(ShelfRepository.class);
        service.readingProgressRepository = mock(ReadingProgressRepository.class);
        service.bookService = mock(BookService.class);
        service.contentAccessService = mock(com.wordweft.book.service.ContentAccessService.class);

        User user = new User("youngreader", "young@example.com", "hash");
        user.setId("user-young");
        user.setDateOfBirth(java.time.LocalDate.of(2012, 6, 28)); // Age ~14
        user.setAllowMatureContent(false);

        com.wordweft.book.model.LibraryEntry entry = new com.wordweft.book.model.LibraryEntry();
        entry.setId("entry-1");
        entry.setUserId("user-young");
        entry.setBookId("book-mature-21");
        when(service.libraryRepository.findByUserId("user-young")).thenReturn(java.util.List.of(entry));
        when(service.shelfRepository.findByUserId("user-young")).thenReturn(java.util.List.of());
        when(service.readingProgressRepository.findByUserId("user-young")).thenReturn(java.util.List.of());
        when(service.bookRepository.findByAuthorId("user-young")).thenReturn(java.util.List.of());

        // enrichBookForProfileById returns a map safely (with isRestricted: true)
        java.util.Map<String, Object> matureBookMap = new java.util.HashMap<>();
        matureBookMap.put("id", "book-mature-21");
        matureBookMap.put("title", "A 21+ Story");
        matureBookMap.put("isRestricted", true);
        when(service.bookService.enrichBookForProfileById("book-mature-21", "user-young")).thenReturn(matureBookMap);

        // This MUST NOT throw ContentRestrictedException
        Map<String, Object> enriched = service.enrichUser(user, "user-young");

        assertNotNull(enriched);
        assertEquals("youngreader", enriched.get("username"));
        assertNotNull(enriched.get("library"));
        List<?> libraryShelves = (List<?>) enriched.get("library");
        assertFalse(libraryShelves.isEmpty());
    }
}
