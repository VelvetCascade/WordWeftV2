package com.wordweft.search.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.service.ContentAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SearchServiceTest {

    @Test
    void usernamePrefixMatchingIsCaseInsensitiveAndLiteral() {
        assertTrue(SearchService.prefixPattern("Sri").matcher("Srijib").find());
        assertTrue(SearchService.prefixPattern("sri").matcher("SRIJIB").find());
        assertFalse(SearchService.prefixPattern("rij").matcher("Srijib").find());
        assertTrue(SearchService.prefixPattern("A.").matcher("A.Writer").find());
        assertFalse(SearchService.prefixPattern("A.").matcher("Any Writer").find());
    }

    @Test
    void fullSearchFallsBackCleanlyWhenAtlasSearchIsUnavailable() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        SearchService service = new SearchService();
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        ReflectionTestUtils.setField(service, "contentAccessService", mock(ContentAccessService.class));
        when(mongo.find(any(Query.class), eq(Book.class))).thenReturn(List.of());
        when(mongo.getCollection("books")).thenThrow(new IllegalStateException("Atlas Search is unavailable"));

        Map<String, Object> result = service.fullSearch("missing", "books", 0, 12);
        @SuppressWarnings("unchecked")
        Map<String, Object> books = (Map<String, Object>) result.get("books");

        assertEquals(0L, books.get("total"));
        assertEquals(List.of(), books.get("items"));
    }
}
