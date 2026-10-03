package com.wordweft.seo;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.book.service.ChapterPreviewService;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class PublicSeoPerformanceMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private PublicSeoService service;
    private final List<Document> commands = new ArrayList<>();
    private final List<Document> returnedBooks = new ArrayList<>();

    @BeforeEach void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if ("find".equals(event.getCommandName())) commands.add(Document.parse(event.getCommand().toJson()));
                    }
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (!event.getResponse().containsKey("cursor")) return;
                        Document cursor = Document.parse(event.getResponse().getDocument("cursor").toJson());
                        if (cursor.getString("ns").endsWith(".books"))
                            returnedBooks.addAll(cursor.getList("firstBatch", Document.class, List.of()));
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_seo_perf_" + UUID.randomUUID().toString().replace("-", ""));
        service = new PublicSeoService(mongo, new ChapterPreviewService());
        mongo.getCollection("users").insertOne(new Document("_id", "writer").append("username", "Writer")
                .append("email", "PRIVATE_EMAIL").append("password", "PRIVATE_HASH"));
        List<Document> books = new ArrayList<>();
        for (int i = 0; i < 25; i++) books.add(new Document("_id", "book-" + i).append("title", "Story")
                .append("publicationStatus", "published").append("authorId", "writer")
                .append("chapters", List.of(
                        new Document("_id", "first").append("status", "published")
                                .append("title", "Unreleased edit").append("wordCount", 900)
                                .append("publishedTitle", "Released title").append("publishedWordCount", 700)
                                .append("content", "DRAFT_BODY_SECRET".repeat(300))
                                .append("publishedContent", "word ".repeat(700) + "PUBLISHED_BODY_SECRET"),
                        new Document("_id", "second").append("status", "published").append("content", "SECOND_BODY_SECRET".repeat(300)),
                        new Document("_id", "draft").append("status", "draft").append("content", "HIDDEN_BODY_SECRET".repeat(300)))));
        mongo.getCollection("books").insertMany(books);
        commands.clear(); returnedBooks.clear();
    }

    @AfterEach void tearDown() {
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void catalogTransfersNoManuscriptsAndBatchesProjectedAuthorsWhileKeepingReleasedChapterMetadata() {
        Map<String, Object> result = service.catalog(null, null, null, 1);
        List<?> books = (List<?>) result.get("books");
        assertEquals(24, books.size());
        assertEquals(true, result.get("hasMore"));
        Map<?, ?> first = (Map<?, ?>) books.get(0);
        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) first.get("chapters")).get(0);
        assertEquals("Released title", chapter.get("title"));
        assertEquals(700, chapter.get("wordCount"));
        assertEquals("Writer", ((Map<?, ?>) first.get("author")).get("name"));
        assertFalse(returnedBooks.toString().contains("BODY_SECRET"), "Neither draft nor published chapter bodies belong in catalog reads");
        List<Document> authorReads = commands.stream().filter(command -> "users".equals(command.get("find"))).toList();
        assertEquals(1, authorReads.size());
        assertTrue(authorReads.get(0).containsKey("projection"));
        assertFalse(result.toString().contains("PRIVATE_"));
    }

    @Test void chapterDetailLoadsOnlyTheFirstReleasedBodyNeededForItsPreview() {
        Map<String, Object> result = service.book("book-0", "first");
        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) result.get("chapters")).get(0);
        assertEquals("Released title", chapter.get("title"));
        assertTrue(chapter.containsKey("content"));
        assertFalse(result.toString().contains("BODY_SECRET"));
        assertFalse(returnedBooks.toString().contains("SECOND_BODY_SECRET"));
        assertFalse(returnedBooks.toString().contains("HIDDEN_BODY_SECRET"));
    }

    @Test void publicMetadataReadsOmitChapterReactionMembership() {
        mongo.getCollection("books").updateMany(new Document(), new Document("$set",
                new Document("chapters.0.likes", List.of("REACTION_MEMBER_SECRET"))));
        returnedBooks.clear();

        service.catalog(null, null, null, 1);
        service.book("book-0");

        assertFalse(returnedBooks.toString().contains("REACTION_MEMBER_SECRET"));
    }

    @Test void firstChapterPreviewKeepsWorkingForLegacyEmbeddedIdFields() {
        Document book = mongo.getCollection("books").find(new Document("_id", "book-0")).first();
        assertNotNull(book);
        Document first = book.getList("chapters", Document.class).get(0);
        first.put("id", first.remove("_id"));
        mongo.getCollection("books").replaceOne(new Document("_id", "book-0"), book);
        returnedBooks.clear();

        Map<String, Object> result = service.book("book-0", "first");
        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) result.get("chapters")).get(0);

        assertEquals("first", chapter.get("id"));
        assertTrue(chapter.containsKey("content"));
        assertFalse(result.toString().contains("BODY_SECRET"));
    }

    @Test void anonymousSeoCannotExposePreviewsRestrictedByLegacyBookOrChapterWarnings() {
        mongo.getCollection("books").updateOne(new Document("_id", "book-0"), new Document("$set",
                new Document("contentWarnings", List.of(" self_harm "))));
        mongo.getCollection("books").updateOne(new Document("_id", "book-1"), new Document("$set",
                new Document("chapters.0.contentWarnings", List.of(" Abuse "))));

        assertNull(service.book("book-0", "first"));
        assertNull(service.book("book-1", "first"));
        List<?> books = (List<?>) service.catalog(null, null, null, 1).get("books");
        assertEquals(23, books.size());
        assertTrue(books.stream().noneMatch(book -> List.of("book-0", "book-1").contains(((Map<?, ?>) book).get("id"))));
    }
}
