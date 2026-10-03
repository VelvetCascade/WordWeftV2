package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import com.wordweft.book.model.AgeRating;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class BookServiceDraftAccessTest {
    @Test void directAnonymousLookupDoesNotExposeOrCountADraft() {
        SecurityContextHolder.clearContext();
        Book draft = new Book(); draft.setId("draft"); draft.setAuthorId("writer"); draft.setPublicationStatus("draft");
        BookRepository repository = mock(BookRepository.class);
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.findOne(any(Query.class), eq(Book.class))).thenReturn(draft);
        BookService service = new BookService(); ReflectionTestUtils.setField(service, "bookRepository", repository);
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        assertNull(service.getBookById("draft", true)); verify(repository, never()).save(any(Book.class));
        verify(mongo, never()).updateFirst(any(Query.class),
                any(org.springframework.data.mongodb.core.query.UpdateDefinition.class), eq(Book.class));
    }

    @Test void publicBookProjectionContainsMetadataButNoChapterContent() {
        SecurityContextHolder.clearContext();
        Chapter first = new Chapter();
        first.setId("first"); first.setTitle("First"); first.setStatus("published");
        first.setContent("FIRST_END_SECRET");
        Chapter second = new Chapter();
        second.setId("second"); second.setTitle("Second"); second.setStatus("published");
        second.setContent("SECOND_END_SECRET");
        Book book = new Book();
        book.setId("book"); book.setAuthorId("writer"); book.setPublicationStatus("published");
        book.setChapters(List.of(first, second));

        BookRepository repository = mock(BookRepository.class);
        UserRepository users = mock(UserRepository.class);
        ContentAccessService access = mock(ContentAccessService.class);
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.findOne(any(Query.class), eq(Book.class))).thenReturn(book);
        when(mongo.find(any(Query.class), eq(com.wordweft.user.model.User.class))).thenReturn(List.of());
        when(access.allowedRatings()).thenReturn(java.util.EnumSet.allOf(AgeRating.class));
        when(access.effectiveRating(book)).thenReturn(AgeRating.ALL_AGES);

        BookService service = new BookService();
        ReflectionTestUtils.setField(service, "bookRepository", repository);
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "contentAccessService", access);
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);

        Map<String, Object> dto = service.getBookById("book", false);
        List<?> chapters = (List<?>) dto.get("chapters");
        Map<?, ?> firstDto = (Map<?, ?>) chapters.get(0);
        Map<?, ?> secondDto = (Map<?, ?>) chapters.get(1);
        assertFalse(dto.toString().contains("FIRST_END_SECRET"));
        assertFalse(firstDto.containsKey("content"));
        assertEquals("PREVIEW", firstDto.get("accessLabel"));
        assertEquals("SIGN_IN", secondDto.get("accessLabel"));
    }
}
