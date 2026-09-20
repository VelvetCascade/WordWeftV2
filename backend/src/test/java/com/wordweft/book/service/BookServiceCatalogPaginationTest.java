package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookServiceCatalogPaginationTest {
    private BookService service;
    private MongoTemplate mongoTemplate;
    private ContentAccessService access;

    @BeforeEach
    void setUp() {
        service = new BookService();
        mongoTemplate = mock(MongoTemplate.class);
        access = mock(ContentAccessService.class);
        UserRepository users = mock(UserRepository.class);
        service.mongoTemplate = mongoTemplate;
        service.contentAccessService = access;
        service.userRepository = users;

        when(access.allowedRatings()).thenReturn(EnumSet.allOf(AgeRating.class));
        when(access.canDiscover(any(Book.class))).thenReturn(true);
        when(access.effectiveRating(any(Book.class))).thenReturn(AgeRating.ALL_AGES);
        when(users.findById("author-1")).thenReturn(Optional.of(author()));
    }

    @Test
    void catalogAppliesOffsetAndLimitInMongoInsteadOfLoadingEveryBook() {
        Book book = new Book();
        book.setId("book-41");
        book.setTitle("A paged story");
        book.setAuthorId("author-1");
        book.setPublicationStatus("published");
        when(mongoTemplate.count(any(Query.class), eq(Book.class))).thenReturn(101L);
        when(mongoTemplate.find(any(Query.class), eq(Book.class))).thenReturn(List.of(book));

        Map<String, Object> result = service.getAllBooks("new", "Fantasy", 2, 20);

        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(query.capture(), eq(Book.class));
        assertEquals(40, query.getValue().getSkip());
        assertEquals(20, query.getValue().getLimit());
        assertEquals(101L, result.get("totalElements"));
        assertEquals(2, result.get("page"));
        assertTrue((Boolean) result.get("hasMore"));
    }

    @Test
    void catalogQueryKeepsLegacyAllAgesBooksWhileFilteringRestrictedWarnings() {
        when(access.allowedRatings()).thenReturn(EnumSet.of(AgeRating.ALL_AGES, AgeRating.TEEN_13));
        when(mongoTemplate.count(any(Query.class), eq(Book.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), eq(Book.class))).thenReturn(List.of());

        service.getAllBooks("new", null, 0, 20);

        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(query.capture(), eq(Book.class));
        String queryDescription = query.getValue().getQueryObject().toString();
        assertTrue(queryDescription.contains("ageRating"), queryDescription);
        assertTrue(queryDescription.contains("$exists"), queryDescription);
        assertTrue(queryDescription.contains("isMature"), queryDescription);
        assertTrue(queryDescription.contains("contentWarnings"), queryDescription);
        assertTrue(queryDescription.contains("chapters.contentWarnings"), queryDescription);
    }

    private User author() {
        User user = new User();
        user.setId("author-1");
        user.setUsername("Author");
        return user;
    }
}
