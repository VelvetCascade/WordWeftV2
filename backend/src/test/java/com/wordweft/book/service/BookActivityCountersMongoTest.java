package com.wordweft.book.service;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class BookActivityCountersMongoTest {
    MongoClient client; MongoTemplate mongo; BookActivityCounters counters;
    @BeforeEach void setup() {
        client = MongoClients.create(System.getenv("WORDWEFT_TEST_MONGO_URI"));
        mongo = new MongoTemplate(client, "wordweft_activity_test_" + UUID.randomUUID().toString().replace("-", ""));
        counters = new BookActivityCounters(mongo);
        mongo.getCollection("books").insertOne(new Document("_id", "book").append("title", "Current title")
                .append("chapters", List.of(new Document("_id", "first").append("content", "Latest draft")
                    .append("editRevision", 7L).append("status", "scheduled"),
                    new Document("_id", "second").append("content", "Another draft").append("viewCount", 19))));
    }
    @AfterEach void cleanup() { if (mongo != null) mongo.getDb().drop(); if (client != null) client.close(); }
    @Test void legacyMissingCountersAndReviewsDoNotReplaceManuscripts() {
        counters.readerOpened("book", "first"); counters.commentAdded("book", "first");
        counters.reviewsChanged("book", 2, 4.5);
        Document saved = mongo.getCollection("books").find(new Document("_id", "book")).first();
        assertNotNull(saved); assertEquals("Current title", saved.getString("title"));
        var chapters = saved.getList("chapters", Document.class);
        assertEquals("Latest draft", chapters.get(0).getString("content")); assertEquals(7L, chapters.get(0).getLong("editRevision"));
        assertEquals("scheduled", chapters.get(0).getString("status")); assertEquals(1, chapters.get(0).getInteger("viewCount"));
        assertEquals(1, chapters.get(0).getInteger("commentCount")); assertEquals(19, chapters.get(1).getInteger("viewCount"));
        assertEquals(1, saved.getInteger("viewCountLast7Days")); assertEquals(2, saved.getInteger("reviewsCount"));
        assertEquals(4.5, saved.getDouble("rating"));
    }
    @Test void concurrentActivityKeepsEveryIncrementAndNewerDraft() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Callable<Void>> tasks = new ArrayList<>();
            for (int i = 0; i < 24; i++) tasks.add(() -> { counters.readerOpened("book", "first"); counters.commentAdded("book", "first"); return null; });
            tasks.add(() -> { mongo.getCollection("books").updateOne(new Document("_id", "book"), new Document("$set",
                    new Document("chapters.0.content", "Newer saved draft").append("chapters.0.editRevision", 8L))); return null; });
            for (Future<Void> result : pool.invokeAll(tasks)) result.get(10, TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
        Document saved = mongo.getCollection("books").find(new Document("_id", "book")).first();
        var first = saved.getList("chapters", Document.class).get(0);
        assertEquals(24, first.getInteger("viewCount")); assertEquals(24, first.getInteger("commentCount"));
        assertEquals(24, saved.getInteger("viewCountLast7Days")); assertEquals("Newer saved draft", first.getString("content"));
        assertEquals(8L, first.getLong("editRevision"));
    }
    @Test void missingChapterDoesNotIncrementStoryCounters() {
        counters.readerOpened("book", "missing");
        var saved = mongo.getCollection("books").find(new Document("_id", "book")).first();
        assertFalse(saved.containsKey("viewCountLast7Days"));
    }
}
