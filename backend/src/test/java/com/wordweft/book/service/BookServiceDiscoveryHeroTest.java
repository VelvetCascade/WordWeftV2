package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BookServiceDiscoveryHeroTest {
    private BookService service;
    private MongoTemplate mongo;

    @BeforeEach void setUp() {
        service = new BookService();
        mongo = mock(MongoTemplate.class);
        service.mongoTemplate = mongo;
        service.contentAccessService = new ContentAccessService();
        service.userRepository = mock(UserRepository.class);
        User writer = new User(); writer.setId("writer"); writer.setUsername("A writer");
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(writer));
    }

    @Test void groupsUseActualFormatsAndPublishedProjection() {
        List<Book> catalog = List.of(book("short", "Short Story"), book("novella", "Novella"), book("fan", "Fan Fiction"),
                book("novel", "Novel"), book("web", "Web Novel"), book("light", "Light Novel"),
                book("poem", "Poem"), book("collection", "Poetry Collection"), book("poetry", "Poetry"));
        when(mongo.stream(any(Query.class), eq(Book.class))).thenAnswer(call -> catalog.stream());
        var result = service.getDiscoveryHero();
        assertEquals(List.of("short", "novella", "fan"), ids(result.get("stories")));
        assertEquals(List.of("novel", "web", "light"), ids(result.get("novels")));
        assertEquals(List.of("poem", "collection", "poetry"), ids(result.get("poems")));
        assertFalse(result.toString().contains("Private draft title"));
        assertFalse(result.toString().contains("Private manuscript"));
    }

    @Test void heroExcludesMatureDraftUnpublishedAndNonFictionAcrossAllGroups() {
        Book adult = book("Adult title must not leak", "Poetry"); adult.setAgeRating(AgeRating.ADULT_21);
        Book legacyMature = book("Legacy mature title", "Novel"); legacyMature.setMature(true);
        Book warned = book("Warning restricted title", "Short Story"); warned.setContentWarnings(List.of("SEXUAL_CONTENT"));
        Book draft = book("Draft title", "Novel"); draft.setPublicationStatus("draft");
        Book noChapter = book("Unpublished chapter only", "Poetry"); noChapter.setChapters(List.of());
        Book legitimate = book("Safe novel", "Novel");
        List<Book> catalog = List.of(adult, legacyMature, warned, draft, noChapter, book("Guide", "Guide"), legitimate);
        when(mongo.stream(any(Query.class), eq(Book.class))).thenAnswer(call -> catalog.stream());
        var result = service.getPublicDiscoveryHero();
        assertEquals(List.of("Safe novel"), ids(result.get("stories")));
        assertEquals(List.of("Safe novel"), ids(result.get("novels")));
        assertEquals(List.of(), ids(result.get("poems")));
        assertFalse(result.toString().contains("must not leak"));
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongo, atLeastOnce()).stream(query.capture(), eq(Book.class));
        for (Query value : query.getAllValues()) {
            String filters = value.getQueryObject().toString();
            assertTrue(filters.contains("publicationStatus"));
            assertTrue(filters.contains("contentWarnings"));
            assertTrue(filters.contains("ageRating"));
            assertTrue(value.getSortObject().containsKey("id"));
            assertTrue(value.getFieldsObject().containsKey("chapters"));
            assertEquals(3, value.getLimit());
        }
    }

    @Test void formatSelectionHasNoArbitraryTopCatalogCutoff() {
        List<Book> catalog = new ArrayList<>();
        for (int index = 0; index < 75; index++) catalog.add(book("novel-" + index, "Novel"));
        catalog.add(book("late-poetry", "Poetry"));
        when(mongo.stream(any(Query.class), eq(Book.class))).thenAnswer(call -> catalog.stream());
        var result = service.getDiscoveryHero();
        assertEquals(List.of("late-poetry"), ids(result.get("poems")));
        assertEquals(3, result.get("novels").size());
        assertEquals(3, result.get("stories").size());
    }

    @Test void explicitFormatWinsOverPoetryGenreAndLegacyPoetryStillAppears() {
        Book novel = book("Poetic novel", "Novel"); novel.setGenres(List.of("Poetry"));
        Book legacy = book("Legacy poem", ""); legacy.setGenres(List.of("Poetry"));
        when(mongo.stream(any(Query.class), eq(Book.class))).thenAnswer(call -> List.of(novel, legacy).stream());
        var result = service.getDiscoveryHero();
        assertEquals(List.of("Poetic novel"), ids(result.get("novels")));
        assertEquals(List.of("Legacy poem"), ids(result.get("poems")));
    }

    @Test void publicHeroFlagsStayAnonymousEvenWhenTheCallerHasNarrowerVisibility() {
        Book teen = book("Teen poem", "Poetry"); teen.setAgeRating(AgeRating.TEEN_13);
        ContentAccessService access = spy(new ContentAccessService());
        doReturn(java.util.EnumSet.of(AgeRating.ALL_AGES)).when(access).allowedRatings();
        service.contentAccessService = access;
        when(mongo.stream(any(Query.class), eq(Book.class))).thenAnswer(call -> List.of(teen).stream());
        var result = service.getPublicDiscoveryHero();
        assertEquals(List.of("Teen poem"), ids(result.get("poems")));
        assertEquals(true, result.get("poems").get(0).get("isDiscoverable"));
        assertEquals(false, result.get("poems").get(0).get("isRestricted"));
    }

    private List<Object> ids(List<Map<String, Object>> items) { return items.stream().map(item -> item.get("id")).toList(); }
    private Book book(String id, String format) {
        Chapter published = new Chapter(); published.setId(id + "-chapter"); published.setTitle("Published opening"); published.setStatus("published");
        Chapter draft = new Chapter(); draft.setId(id + "-draft"); draft.setTitle("Private draft title"); draft.setContent("Private manuscript"); draft.setStatus("draft");
        Book book = new Book(); book.setId(id); book.setTitle(id); book.setCategory(format); book.setAuthorId("writer");
        book.setPublicationStatus("published"); book.setCoverUrl("https://example.com/" + id + ".jpg"); book.setChapters(List.of(published, draft));
        return book;
    }
}
