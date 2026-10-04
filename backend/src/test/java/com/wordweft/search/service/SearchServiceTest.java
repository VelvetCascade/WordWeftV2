package com.wordweft.search.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Query;
import org.bson.Document;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class)))
                .thenThrow(new IllegalStateException("Atlas Search is unavailable"));

        Map<String, Object> result = service.fullSearch("missing", "books", 0, 12);
        @SuppressWarnings("unchecked")
        Map<String, Object> books = (Map<String, Object>) result.get("books");

        assertEquals(0L, books.get("total"));
        assertEquals(List.of(), books.get("items"));
    }

    @Test
    void autocompleteFindsTitleWordsAndSubstringsWhenAtlasIsUnavailable() {
        SearchService service = fallbackServiceFor(List.of(book("spring", "The Last Spring in Bellweather", "published")));

        assertEquals(List.of("spring"), autocompleteIds(service, "Bellweather"));
        assertEquals(List.of("spring"), autocompleteIds(service, "bellwea"));
        assertEquals(List.of("spring"), autocompleteIds(service, "spring in"));
    }

    @Test
    void autocompleteFallbackTreatsRegexPunctuationLiterally() {
        SearchService service = fallbackServiceFor(List.of(
                book("literal", "The A. Garden", "published"),
                book("other", "The Any Garden", "published")));

        assertEquals(List.of("literal"), autocompleteIds(service, "a."));
    }

    @Test
    void autocompleteFallbackKeepsTitlePrefixMatchesFirstWithoutDuplicates() {
        SearchService service = fallbackServiceFor(List.of(
                book("substring", "The Last Spring in Bellweather", "published"),
                book("prefix", "Bellweather Stories", "published")));

        assertEquals(List.of("prefix", "substring"), autocompleteIds(service, "Bellweather"));
    }

    @Test
    void autocompleteFallbackExcludesDraftsAndRestrictedStories() {
        Book accessible = book("accessible", "A Journey to Bellweather", "published");
        Book draft = book("draft", "Hidden Bellweather Letters", "draft");
        Book mature = book("mature", "Dark Bellweather", "published");
        mature.setAgeRating(AgeRating.MATURE_18);
        Book restrictedByWarnings = book("warnings", "Bellweather at Midnight", "published");
        restrictedByWarnings.setContentWarnings(List.of("SELF_HARM"));
        SearchService service = fallbackServiceFor(List.of(accessible, draft, mature, restrictedByWarnings));

        assertEquals(List.of("accessible"), autocompleteIds(service, "Bellweather"));
    }

    @Test
    void standaloneFullSearchQueriesThemeFieldsWithLiteralInput() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        SearchService service = new SearchService();
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        ReflectionTestUtils.setField(service, "contentAccessService", new ContentAccessService());
        SecurityContextHolder.clearContext();
        when(mongo.count(any(Query.class), eq(Book.class))).thenAnswer(invocation -> {
            Query query = invocation.getArgument(0);
            for (String field : List.of("summary", "description", "tags", "genres")) {
                Pattern pattern = (Pattern) criterionValue(query.getQueryObject(), field);
                assertTrue(pattern != null, field + " must be searchable on standalone Mongo");
                assertTrue(pattern.matcher("A found.family adventure").find());
                assertFalse(pattern.matcher("A foundXfamily adventure").find());
            }
            return 0L;
        });
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class)))
                .thenThrow(new IllegalStateException("Atlas Search is unavailable"));
        service.fullSearch("found.family", "books", 0, 12);
    }

    private SearchService fallbackServiceFor(List<Book> storedBooks) {
        SecurityContextHolder.clearContext(); // These searches run as anonymous readers.
        MongoTemplate mongo = mock(MongoTemplate.class);
        SearchService service = new SearchService();
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        ContentAccessService access = new ContentAccessService();
        ReflectionTestUtils.setField(service, "contentAccessService", access);
        when(mongo.find(any(Query.class), eq(Book.class))).thenAnswer(invocation -> {
            Query query = invocation.getArgument(0);
            Pattern titlePattern = (Pattern) criterionValue(query.getQueryObject(), "title");
            String publicationStatus = (String) criterionValue(query.getQueryObject(), "publicationStatus");
            // Apply the real query's literal regex/status to a small in-memory collection.
            return storedBooks.stream()
                    .filter(book -> book.getPublicationStatus().equals(publicationStatus))
                    .filter(book -> titlePattern.matcher(book.getTitle()).find())
                    .filter(access::canDiscover)
                    .limit(query.getLimit())
                    .toList();
        });
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class)))
                .thenThrow(new IllegalStateException("Atlas Search is unavailable"));
        when(mongo.aggregate(any(Aggregation.class), eq(User.class), eq(Document.class)))
                .thenReturn(new AggregationResults<>(List.of(), new Document()));
        return service;
    }

    private Object criterionValue(Document criteria, String field) {
        if (criteria.containsKey(field)) return criteria.get(field);
        for (String operator : List.of("$and", "$or")) {
            for (Document nested : criteria.getList(operator, Document.class, List.of())) {
                Object found = criterionValue(nested, field);
                if (found != null) return found;
            }
        }
        return null;
    }

    private Book book(String id, String title, String status) {
        Book book = new Book();
        book.setId(id); book.setTitle(title); book.setPublicationStatus(status);
        return book;
    }

    @SuppressWarnings("unchecked")
    private List<String> autocompleteIds(SearchService service, String query) {
        List<Map<String, Object>> books = (List<Map<String, Object>>) service.autocomplete(query).get("books");
        return books.stream().map(book -> (String) book.get("id")).toList();
    }
}
