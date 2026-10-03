package com.wordweft.discovery.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.book.service.PublishedChapterView;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.user.model.User;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.ArrayList;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HookFeedServiceTest {
    @Mock MongoTemplate mongo;
    @Mock ContentAccessService access;
    private HookFeedService service;

    @BeforeEach
    void setUp() {
        service = new HookFeedService(mongo, access);
        lenient().when(access.allowedRatings()).thenReturn(Set.of(AgeRating.ALL_AGES, AgeRating.TEEN_13));
        lenient().when(access.allowedRatings(any())).thenReturn(Set.of(AgeRating.ALL_AGES, AgeRating.TEEN_13));
    }

    @Test
    void retainsTasteAndGenreLabelsForDatabaseRankedStories() {
        User reader = user("reader", "Reader", List.of("Fantasy"));
        Book popularMystery = story("mystery", "Mystery", List.of("Mystery"), 500,
                chapter("m1", "published", "<p>A locked room.</p>"));
        Book fantasy = story("fantasy", "Fantasy", List.of("Fantasy", "Adventure"), 5,
                chapter("f1", "published", "<p>A dragon woke beneath the city.</p>"));
        when(mongo.findOne(any(Query.class), eq(User.class))).thenReturn(reader);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(user("author", "Mira Vale", List.of())));
        rankedOpenings(fantasy, popularMystery);

        HookFeedResponse result = service.getFeed("reader", Set.of(), 10);

        assertEquals(List.of("fantasy", "mystery"), result.items().stream().map(HookFeedResponse.Hook::bookId).toList());
        assertEquals(List.of("Fantasy"), result.items().get(0).matchedGenres());
        assertEquals("Mira Vale", result.items().get(0).authorName());
    }

    @Test
    void exposesOnlyPublishedOpeningsAndHonorsSeenStories() {
        Book mixed = story("mixed", "Mixed", List.of("Fantasy"), 3,
                chapter("private", "draft", "Do not leak"),
                chapter("public", "published", "<p>The public beginning.</p>"));
        rankedOpenings(mixed);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());

        HookFeedResponse result = service.getFeed(null, Set.of("seen"), 10);

        assertEquals(1, result.items().size());
        assertEquals("mixed", result.items().get(0).bookId());
        assertEquals("public", result.items().get(0).chapterId());
        assertFalse(result.items().get(0).excerpt().contains("<p>"));
        assertFalse(result.items().get(0).excerpt().contains("Do not leak"));
    }

    @Test
    void createsAReadableBoundedExcerpt() {
        String repeated = "<p>" + "A very long opening sentence. ".repeat(40) + "</p>";
        Book book = story("long", "Long", List.of("Literary"), 1,
                chapter("chapter", "published", repeated));
        rankedOpenings(book);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());

        String excerpt = service.getFeed(null, Set.of(), 10).items().get(0).excerpt();

        assertTrue(excerpt.length() <= 520);
        assertTrue(excerpt.endsWith("…"));
    }

    @Test
    void includesTheCurrentReadersLikeState() {
        Chapter opening = chapter("chapter", "published", "Opening");
        opening.getLikes().add("reader");
        rankedOpenings(story("book", "Story", List.of("Literary"), 1, opening));
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());

        HookFeedResponse.Hook hook = service.getFeed("reader", List.of(), Set.of(), 10).items().get(0);

        assertTrue(hook.liked());
        assertEquals(1, hook.likesCount());
    }

    private void rankedOpenings(Book... books) {
        List<String> labels = List.of(books).stream().flatMap(book -> book.getGenres().stream()).distinct().toList();
        lenient().when(mongo.findDistinct(any(Query.class), eq("genres"), eq(Book.class), eq(String.class))).thenReturn(labels);
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Book.class)))
                .thenReturn(new AggregationResults<>(List.of(books), new Document()));
        List<Document> bodies = new ArrayList<>();
        for (Book book : books) {
            Chapter opening = book.getChapters().stream().filter(chapter -> "published".equalsIgnoreCase(chapter.getStatus())).findFirst().orElseThrow();
            bodies.add(new Document("_id", book.getId()).append("openingContent", PublishedChapterView.of(opening).content()));
        }
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class)))
                .thenReturn(new AggregationResults<>(bodies, new Document()));
    }

    private Book story(String id, String title, List<String> genres, int recentReads, Chapter... chapters) {
        Book book = new Book();
        book.setId(id);
        book.setTitle(title);
        book.setAuthorId("author");
        book.setPublicationStatus("published");
        book.setGenres(genres);
        book.setReadCountLast7Days(recentReads);
        book.setChapters(List.of(chapters));
        return book;
    }

    private Chapter chapter(String id, String status, String content) {
        Chapter chapter = new Chapter();
        chapter.setId(id);
        chapter.setTitle("Opening");
        chapter.setStatus(status);
        chapter.setContent(content);
        chapter.updateWordCount();
        return chapter;
    }

    private User user(String id, String name, List<String> genres) {
        User user = new User();
        user.setId(id);
        user.setUsername(name);
        user.setFavoriteGenres(genres);
        return user;
    }
}
