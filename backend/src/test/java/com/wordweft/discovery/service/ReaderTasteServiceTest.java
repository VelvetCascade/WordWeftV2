package com.wordweft.discovery.service;

import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReaderTasteServiceTest {
    @Mock UserRepository users;

    @Test
    void savesTrimmedCaseInsensitiveUniqueGenres() {
        User user = new User();
        user.setId("reader");
        when(users.findById("reader")).thenReturn(Optional.of(user));
        ReaderTasteService service = new ReaderTasteService(users);

        List<String> result = service.update("reader", List.of(" Fantasy ", "fantasy", "Mystery"));

        assertEquals(List.of("Fantasy", "Mystery"), result);
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        assertEquals(result, captor.getValue().getFavoriteGenres());
    }

    @Test
    void rejectsMoreThanEightGenres() {
        User user = new User();
        when(users.findById("reader")).thenReturn(Optional.of(user));
        ReaderTasteService service = new ReaderTasteService(users);

        assertThrows(IllegalArgumentException.class, () -> service.update("reader",
                List.of("1", "2", "3", "4", "5", "6", "7", "8", "9")));
    }
}
