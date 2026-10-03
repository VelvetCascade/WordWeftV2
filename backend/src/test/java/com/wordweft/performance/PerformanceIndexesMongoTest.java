package com.wordweft.performance;

import com.mongodb.ExplainVerbosity;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.Review;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.user.model.User;
import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.QueryMapper;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Opt-in planner checks against Spring-created indexes; never touches a shared database. */
@DataMongoTest(properties = "spring.data.mongodb.auto-index-creation=true")
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PerformanceIndexesMongoTest {
    private static final String DATABASE = "wordweft_index_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final Instant NOW = Instant.parse("2026-10-02T12:00:00Z");
    private static final int FIXTURE_SIZE = 2_000;

    @Autowired private MongoTemplate mongo;
    @Autowired private BookRepository books;

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.data.mongodb.uri", () -> System.getenv("WORDWEFT_TEST_MONGO_URI"));
        properties.add("spring.data.mongodb.database", () -> DATABASE);
    }

    @BeforeAll
    void fixtures() {
        List<Document> catalog = new ArrayList<>();
        for (int i = 0; i < FIXTURE_SIZE; i++) {
            catalog.add(new Document("_id", "fixture-book-" + String.format("%04d", i))
                    .append("authorId", "author-" + i % 25)
                    .append("publicationStatus", i % 4 == 0 ? "published" : "draft")
                    .append("title", "Story " + i)
                    .append("readCountLast7Days", i % 37).append("readCount", i)
                    .append("viewCountLast7Days", i % 43).append("viewCount", i * 2)
                    .append("createdAt", date(i, ChronoUnit.DAYS))
                    .append("lastUpdatedAt", date(i % 31, ChronoUnit.DAYS))
                    .append("publishedDate", date(i, ChronoUnit.DAYS))
                    .append("genres", List.of("Genre-" + i % 50, "Other genre"))
                    .append("tags", List.of("Tag-" + i % 70, "Other tag"))
                    .append("chapters", List.of(new Document("_id", "chapter-" + i)
                            .append("status", i % 4 == 0 ? "published" : "draft"))));
        }
        mongo.getCollection("books").insertMany(catalog);

        for (String collection : List.of("characters", "comments", "reviews", "notes", "scenes",
                "reading_progress", "library", "chapter_revisions", "feedback", "chapter_read_events",
                "notifications", "community_posts", "community_comments", "community_poll_votes", "community_reactions")) {
            List<Document> rows = new ArrayList<>();
            for (int i = 0; i < FIXTURE_SIZE; i++) {
                String userId = collection.equals("library") || collection.equals("reading_progress")
                        ? "reader-" + i : "user-" + i % 20;
                Document row = new Document("_id", "fixture-" + i)
                        .append("bookId", "book-" + i % 200).append("chapterId", "chapter-" + i % 400)
                        .append("userId", userId).append("authorId", "user-" + i % 20)
                        .append("postId", "post-" + i % 200).append("optionId", "option-" + i % 3)
                        .append("targetId", "post-" + i % 200)
                        .append("targetType", i % 3 == 0 ? "COMMENT" : "POST")
                        .append("reactionType", i % 3 == 0 ? "SAVE" : "LIKE")
                        .append("status", "ACTIVE").append("read", i % 3 == 0)
                        .append("type", i % 3 == 0 ? "NEW_COMMENT" : "AUTHOR_NEW_CHAPTER")
                        .append("entityId", "book-" + i % 200)
                        .append("createdAt", date(i, ChronoUnit.MINUTES))
                        .append("occurredAt", date(i, ChronoUnit.MINUTES))
                        .append("submittedAt", date(i, ChronoUnit.MINUTES));
                // Preserve the existing one-vote and one-reaction constraints in test data.
                if (collection.equals("community_poll_votes")) {
                    row.put("postId", "post-" + i);
                }
                if (collection.equals("community_reactions")) {
                    row.put("userId", "reader-" + i);
                }
                rows.add(row);
            }
            mongo.getCollection(collection).insertMany(rows);
        }
        List<Document> users = new ArrayList<>();
        for (int i = 0; i < FIXTURE_SIZE; i++) {
            users.add(new Document("_id", "user-" + i).append("username", "Reader " + i)
                    .append("email", "reader" + i + "@example.test"));
        }
        users.get(1).put("resetPasswordToken", "token-for-reader");
        mongo.getCollection("users").insertMany(users);
    }

    @AfterAll
    void cleanup() {
        try (MongoClient client = MongoClients.create(System.getenv("WORDWEFT_TEST_MONGO_URI"))) {
            client.getDatabase(DATABASE).drop();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"most_read", "most_viewed", "recent_update", "new"})
    void publishedCatalogUsesTheServiceSortWithoutScanningOrBlockingSort(String sortName) {
        Sort sort = ReflectionTestUtils.invokeMethod(new BookService(), "discoverySort", sortName);
        assertNotNull(sort);
        Query query = Query.query(Criteria.where("publicationStatus").is("published")).with(sort).limit(20);
        QueryMapper mapper = new QueryMapper(mongo.getConverter());
        var entity = mongo.getConverter().getMappingContext().getRequiredPersistentEntity(Book.class);
        Document filter = mapper.getMappedObject(query.getQueryObject(), entity);
        Document storedSort = mapper.getMappedSort(query.getSortObject(), entity);

        assertTrue(storedSort.containsKey("_id"), "Book id must sort on MongoDB's stored _id field");
        assertFalse(storedSort.containsKey("id"));
        assertEfficient("books", filter, storedSort, 20);
    }

    @Test
    void publicAndAuthorCursorsAvoidScanningOtherPublicationStates() {
        assertEfficient("books", new Document("publicationStatus", "published"), new Document("_id", 1), 20);
        assertEfficient("books", new Document("authorId", "author-4").append("publicationStatus", "published"),
                new Document("_id", 1), 20);
    }

    @ParameterizedTest
    @ValueSource(strings = {"genres", "tags"})
    void exactSeoTaxonomyCursorWorksWithMultipleIndependentArrays(String taxonomy) {
        String value = taxonomy.equals("genres") ? "Genre-4" : "Tag-4";
        assertEfficient("books", new Document("publicationStatus", "published").append(taxonomy, value),
                new Document("_id", 1), 20);
    }

    @Test
    void dueChapterIndexBoundsBothFieldsWithinTheSameArrayElement() {
        Book due = new Book(); due.setId("scheduled-due");
        due.setGenres(List.of("Fantasy", "Adventure")); due.setTags(List.of("Magic", "Quest"));
        due.setChapters(List.of(chapter("scheduled", NOW.minusSeconds(60)), chapter("draft", NOW.plusSeconds(60))));
        Book mismatched = new Book(); mismatched.setId("scheduled-mismatched");
        mismatched.setChapters(List.of(chapter("draft", NOW.minusSeconds(60)), chapter("scheduled", NOW.plusSeconds(60))));
        books.saveAll(List.of(due, mismatched));

        assertEquals(List.of("scheduled-due"), books.findBooksWithDueChapters(NOW).stream().map(Book::getId).toList());
        Document elemMatch = new Document("status", "scheduled").append("scheduledAt", new Document("$lte", Date.from(NOW)));
        assertEfficient("books", new Document("chapters", new Document("$elemMatch", elemMatch)), new Document(), 20);
    }

    @Test
    void bookAndChapterOperationsExamineOnlyTheMatchingRows() {
        for (String collection : List.of("characters", "comments", "reviews", "notes", "scenes",
                "reading_progress", "library", "chapter_revisions", "chapter_read_events")) {
            assertEfficient(collection, new Document("bookId", "book-1"), new Document(), 0);
        }
        for (String collection : List.of("comments", "notes", "scenes", "chapter_revisions", "chapter_read_events")) {
            Document sort = collection.equals("comments") || collection.equals("chapter_revisions")
                    ? new Document("createdAt", -1) : new Document();
            assertEfficient(collection, new Document("chapterId", "chapter-1"), sort, 0);
        }
        for (String collection : List.of("comments", "reviews")) {
            assertEfficient(collection, new Document("bookId", "book-1").append("userId", "user-1"), new Document(), 0);
        }
    }

    @Test
    void notificationPagesUnreadCountsAndDedupUseTheirFullFilters() {
        Document sort = new Document("createdAt", -1);
        assertEfficient("notifications", new Document("userId", "user-1"), sort, 20);
        assertEfficient("notifications", new Document("userId", "user-1").append("type",
                new Document("$in", List.of("NEW_COMMENT", "COMMENT_REPLY"))), sort, 20);
        assertEfficient("notifications", new Document("userId", "user-1").append("read", false), new Document(), 0);
        assertEfficient("notifications", new Document("userId", "user-1").append("type", "AUTHOR_NEW_CHAPTER")
                .append("entityId", "book-1").append("createdAt", afterHours(12)), new Document(), 0);
    }

    @Test
    void analyticsFeedbackAndCommunityQueriesBoundTimeOrReactionFilters() {
        assertEfficient("chapter_read_events", new Document("bookId", new Document("$in", List.of("book-1", "book-2")))
                .append("occurredAt", afterHours(12)), new Document(), 0);
        assertEfficient("feedback", new Document("userId", "user-1").append("submittedAt", afterHours(12)), new Document(), 0);
        for (String collection : List.of("community_posts", "community_comments")) {
            assertEfficient(collection, new Document("authorId", "user-1").append("createdAt", afterHours(12)), new Document(), 0);
        }
        assertEfficient("community_poll_votes", new Document("userId", "user-1").append("createdAt", afterHours(12)), new Document(), 0);
        assertEfficient("community_reactions", new Document("targetType", "POST").append("reactionType", "LIKE")
                .append("targetId", new Document("$in", List.of("post-1", "post-2", "post-3"))), new Document(), 0);
    }

    @Test
    void resetTokenLookupAvoidsUserScanAndPerformanceIndexesDoNotAddUniquenessOrUserExpiry() {
        assertEfficient("users", new Document("resetPasswordToken", "token-for-reader"), new Document(), 0);
        User another = new User("Another", "another@example.test", "password");
        another.setResetPasswordToken("token-for-reader");
        assertDoesNotThrow(() -> mongo.save(another), "Reset tokens must remain nonunique");
        assertEquals(2, mongo.count(Query.query(Criteria.where("resetPasswordToken").is("token-for-reader")), User.class));

        Review first = new Review(); first.setBookId("duplicate-book"); first.setUserId("duplicate-reader");
        Review second = new Review(); second.setBookId("duplicate-book"); second.setUserId("duplicate-reader");
        assertDoesNotThrow(() -> mongo.insert(List.of(first, second), Review.class), "Historical duplicate reviews must remain valid");
        List<Document> userIndexes = mongo.getCollection("users").listIndexes().into(new ArrayList<>());
        assertTrue(userIndexes.stream().noneMatch(index -> index.containsKey("expireAfterSeconds")), "A users TTL index would delete accounts");
        assertTrue(userIndexes.stream().anyMatch(index -> Boolean.TRUE.equals(index.get("sparse"))
                && index.get("key", Document.class).containsKey("resetPasswordToken")));
        for (Map.Entry<String, String> existing : Map.of("reading_progress", "user_book_idx", "library", "user_book_lib_idx",
                "community_reactions", "unique_community_reaction", "community_poll_votes", "unique_poll_voter").entrySet()) {
            assertTrue(mongo.getCollection(existing.getKey()).listIndexes().into(new ArrayList<>()).stream()
                    .anyMatch(index -> existing.getValue().equals(index.getString("name")) && Boolean.TRUE.equals(index.get("unique"))),
                    "Existing unique index must remain: " + existing.getValue());
        }
        assertTrue(mongo.getCollection("chapter_read_events").listIndexes().into(new ArrayList<>()).stream()
                .anyMatch(index -> new Document("expiresAt", 1).equals(index.get("key", Document.class))),
                "Existing read-event expiresAt index must remain");
    }

    private void assertEfficient(String collection, Document filter, Document sort, int limit) {
        var find = mongo.getCollection(collection).find(filter).sort(sort);
        if (limit > 0) find.limit(limit);
        Document explain = find.explain(ExplainVerbosity.EXECUTION_STATS);
        Document plan = explain.get("queryPlanner", Document.class).get("winningPlan", Document.class);
        Document stats = explain.get("executionStats", Document.class);
        long returned = ((Number) stats.get("nReturned")).longValue();
        long examined = ((Number) stats.get("totalDocsExamined")).longValue();
        assertTrue(returned > 0, "Fixture must exercise a nonempty query: " + collection + filter.toJson());
        assertFalse(hasStage(plan, "COLLSCAN"), () -> collection + " scanned the collection: " + explain.toJson());
        assertFalse(hasStage(plan, "SORT"), () -> collection + " used a blocking sort: " + explain.toJson());
        assertTrue(examined <= returned + 2, () -> collection + " examined unrelated rows (" + examined + " for " + returned + "): " + explain.toJson());
        System.out.println("INDEX EXPLAIN " + collection + " " + filter.toJson() + " sort=" + sort.toJson() + " returned=" + returned
                + " docsExamined=" + examined + " keysExamined=" + stats.get("totalKeysExamined"));
    }

    private static boolean hasStage(Object value, String stage) {
        if (value instanceof Map<?, ?> map) {
            if (stage.equals(map.get("stage"))) return true;
            return map.values().stream().anyMatch(child -> hasStage(child, stage));
        }
        if (value instanceof Iterable<?> children) {
            for (Object child : children) if (hasStage(child, stage)) return true;
        }
        return false;
    }

    private static Document afterHours(int hours) {
        return new Document("$gt", Date.from(NOW.minus(hours, ChronoUnit.HOURS)));
    }

    private static Date date(int amount, ChronoUnit unit) {
        return Date.from(NOW.minus(amount, unit));
    }

    private static Chapter chapter(String status, Instant scheduledAt) {
        Chapter chapter = new Chapter(); chapter.setStatus(status); chapter.setScheduledAt(scheduledAt); return chapter;
    }
}
