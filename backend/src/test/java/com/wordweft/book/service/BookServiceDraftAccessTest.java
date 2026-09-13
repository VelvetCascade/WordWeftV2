package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class BookServiceDraftAccessTest {
    @Test void directAnonymousLookupDoesNotExposeOrCountADraft() {
        SecurityContextHolder.clearContext();
        Book draft = new Book(); draft.setId("draft"); draft.setAuthorId("writer"); draft.setPublicationStatus("draft");
        BookRepository repository = mock(BookRepository.class);
        when(repository.findById("draft")).thenReturn(Optional.of(draft));
        BookService service = new BookService(); ReflectionTestUtils.setField(service, "bookRepository", repository);
        assertNull(service.getBookById("draft", true)); verify(repository, never()).save(any(Book.class));
    }
}
