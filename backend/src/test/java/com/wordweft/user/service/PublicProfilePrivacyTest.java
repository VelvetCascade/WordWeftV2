package com.wordweft.user.service;

import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicProfilePrivacyTest {
    @Test void absentConsentDoesNotExposeReadingStatsEvenToOwnerPublicPreview() {
        User user = new User("Reader", "secret@example.test", "secret"); user.setId("reader");
        user.getStats().setTotalWordsRead(50000);
        UserRepository users = mock(UserRepository.class);
        when(users.findPublicProfileById("reader")).thenReturn(Optional.of(user));
        UserService service = new UserService(); service.userRepository = users;
        service.shelfRepository = mock(com.wordweft.book.repository.ShelfRepository.class);
        assertFalse(service.getPublicProfile("reader", "reader").containsKey("stats"));
        assertFalse(service.getPublicProfile("reader", null).containsKey("stats"));
        assertFalse(service.getPublicProfile("reader", null).containsKey("email"));
    }
    @Test void explicitConsentExposesOnlyAggregateStats() {
        User user = new User("Reader", "secret@example.test", "secret"); user.setId("reader");
        ReflectionTestUtils.setField(user, "publicReadingStats", true);
        UserRepository users = mock(UserRepository.class);
        when(users.findPublicProfileById("reader")).thenReturn(Optional.of(user));
        UserService service = new UserService(); service.userRepository = users;
        service.shelfRepository = mock(com.wordweft.book.repository.ShelfRepository.class);
        var profile = service.getPublicProfile("reader", "other");
        assertTrue(profile.containsKey("stats")); assertFalse(profile.containsKey("library"));
    }
}
