package com.wordweft.book.service;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.notification.service.NotificationService;
import org.bson.Document;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Every test owns and removes an isolated database on the disposable local Mongo runtime. */
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class ManuscriptConcurrencyMongoTest {
    MongoClient client; MongoTemplate mongo; BookRepository books; ChapterWriteService writes;
    @BeforeEach void setup() {
        client = MongoClients.create(System.getenv("WORDWEFT_TEST_MONGO_URI"));
        mongo = new MongoTemplate(client, "wordweft_session_test_" + UUID.randomUUID().toString().replace("-", ""));
        books = new MongoRepositoryFactory(mongo).getRepository(BookRepository.class); writes = new ChapterWriteService(mongo);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author"); book.setTitle("Private story");
        Chapter first = chapter("first", "First"); Chapter second = chapter("second", "Second");
        first.setStatus("scheduled"); first.setScheduledAt(java.time.Instant.now().plusSeconds(600)); first.setContentWarnings(List.of("VIOLENCE"));
        second.setViewCount(17); book.setChapters(new ArrayList<>(List.of(first, second))); books.save(book);
    }
    Chapter chapter(String id, String title) { Chapter c = new Chapter(); c.setId(id); c.setTitle(title); c.setContent("<p>" + title + " manuscript</p>"); c.updateWordCount(); return c; }
    @AfterEach void cleanup() { if (mongo != null) mongo.getDb().drop(); if (client != null) client.close(); }
    @Test void simultaneousTabsCannotBothReplaceTheSameRevisionAndCountersSurvive() throws Exception {
        CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var futures = new ArrayList<Future<String>>();
            for (String version : List.of("Tab A", "Tab B")) futures.add(executor.submit(() -> {
                Book book = books.findById("book").orElseThrow(); Chapter chapter = book.getChapters().get(1);
                chapter.setContent(version); chapter.setEditRevision(1); ready.countDown(); go.await();
                try { writes.save(book, chapter, false, 0); return "saved"; }
                catch (ResponseStatusException conflict) { assertEquals(409, conflict.getStatusCode().value()); return "conflict"; }
            }));
            assertTrue(ready.await(10, TimeUnit.SECONDS)); go.countDown();
            var results = List.of(futures.get(0).get(10, TimeUnit.SECONDS), futures.get(1).get(10, TimeUnit.SECONDS));
            assertEquals(1, Collections.frequency(results, "saved")); assertEquals(1, Collections.frequency(results, "conflict"));
        } finally { executor.shutdownNow(); }
        Chapter saved = books.findById("book").orElseThrow().getChapters().get(1);
        assertEquals(1, saved.getEditRevision()); assertEquals(17, saved.getViewCount()); assertTrue(List.of("Tab A", "Tab B").contains(saved.getContent()));
    }
    @Test void reviewedReleasePublishesPrefixPublicizesStoryAndClearsScheduleAtomically() {
        var service = new ChapterPublishingService(books, mock(NotificationService.class)); service.mongo = mongo;
        var impact = service.reviewPublication("author", "book", "second");
        assertEquals(2, impact.chapters().size()); assertTrue(impact.storyBecomesPublic());
        service.publishReviewed("author", "book", "second", impact.reviewToken());
        Book released = books.findById("book").orElseThrow();
        assertEquals("published", released.getPublicationStatus()); assertEquals("TEEN_13", released.getAgeRating().name());
        assertTrue(released.getChapters().stream().allMatch(c -> "published".equals(c.getStatus()) && c.getScheduledAt() == null));
        assertEquals(17, released.getChapters().get(1).getViewCount());
    }
    @Test void databaseChangeAfterReviewReadCannotSlipThroughPublicationWrite() {
        Book before = books.findById("book").orElseThrow();
        BookRepository retainedSnapshot = mock(BookRepository.class);
        when(retainedSnapshot.findById("book")).thenReturn(Optional.of(before));
        var service = new ChapterPublishingService(retainedSnapshot, mock(NotificationService.class)); service.mongo = mongo;
        var impact = service.reviewPublication("author", "book", "second");
        Book newer = books.findById("book").orElseThrow(); newer.getChapters().get(0).setContent("Newer earlier draft"); books.save(newer);
        var error = assertThrows(ResponseStatusException.class, () -> service.publishReviewed("author", "book", "second", impact.reviewToken()));
        assertEquals(409, error.getStatusCode().value());
        Book unchanged = books.findById("book").orElseThrow(); assertEquals("draft", unchanged.getPublicationStatus());
        assertEquals("Newer earlier draft", unchanged.getChapters().get(0).getContent()); assertEquals("draft", unchanged.getChapters().get(1).getStatus());
    }
    @Test void legacyDocumentsWithMissingOptionalFieldsCanStillBeReviewedAndReleased() {
        var collection = mongo.getCollection("books");
        collection.updateOne(new Document("_id", "book"), new Document("$unset", new Document("ageRating", "").append("isMature", "").append("contentWarnings", "").append("chapters.1.editRevision", "").append("chapters.1.contentWarnings", "")));
        var service = new ChapterPublishingService(books, mock(NotificationService.class)); service.mongo = mongo;
        var impact = service.reviewPublication("author", "book", "second");
        service.publishReviewed("author", "book", "second", impact.reviewToken());
        assertEquals("published", books.findById("book").orElseThrow().getPublicationStatus());
    }
    @Test void matureReleaseDoesNotMutateTheOldBookWarningPrecondition() {
        Book book = books.findById("book").orElseThrow(); book.getChapters().get(0).setContentWarnings(List.of("GORE")); books.save(book);
        var service = new ChapterPublishingService(books, mock(NotificationService.class)); service.mongo = mongo;
        var review = service.reviewPublication("author", "book", "second");
        service.publishReviewed("author", "book", "second", review.reviewToken());
        Book released = books.findById("book").orElseThrow();
        assertEquals("MATURE_18", released.getAgeRating().name()); assertTrue(released.getContentWarnings().contains("GORE"));
    }

    @Test void restoringWhileAnotherSessionSavesCannotReplaceTheNewerDraftOrCounters() {
        var revisions = mock(com.wordweft.manuscript.repository.ChapterRevisionRepository.class);
        var revision = new com.wordweft.manuscript.model.ChapterRevision(); revision.setId("revision"); revision.setBookId("book");
        revision.setChapterId("first"); revision.setAuthorId("author"); revision.setTitle("Old first"); revision.setContent("Old restored draft");
        when(revisions.findById("revision")).thenReturn(Optional.of(revision));
        doAnswer(call -> {
            Book concurrent = books.findById("book").orElseThrow(); Chapter newer = concurrent.getChapters().get(0);
            newer.setContent("New draft saved during restore"); newer.setEditRevision(1); writes.save(concurrent, newer, false, 0);
            mongo.getCollection("books").updateOne(new Document("_id", "book"), new Document("$inc", new Document("chapters.1.viewCount", 3)));
            return call.getArgument(0);
        }).when(revisions).save(any());
        var restore = new com.wordweft.manuscript.service.ChapterRevisionService(revisions, books);
        org.springframework.test.util.ReflectionTestUtils.setField(restore, "chapterWrites", writes);
        var error = assertThrows(ResponseStatusException.class, () -> restore.restore("author", "book", "first", "revision", 0L));
        assertEquals(409, error.getStatusCode().value());
        Book retained = books.findById("book").orElseThrow(); assertEquals("New draft saved during restore", retained.getChapters().get(0).getContent());
        assertEquals(1, retained.getChapters().get(0).getEditRevision()); assertEquals(20, retained.getChapters().get(1).getViewCount());
        assertEquals("Second manuscript", retained.getChapters().get(1).getContent().replaceAll("<[^>]+>", ""));
    }

    @Test void chapterLikeNeverReplacesAConcurrentManuscript() {
        Book oldSnapshot = books.findById("book").orElseThrow(); Book concurrent = books.findById("book").orElseThrow();
        concurrent.getChapters().get(1).setContent("Newest manuscript"); concurrent.getChapters().get(1).setEditRevision(1);
        writes.save(concurrent, concurrent.getChapters().get(1), false, 0);
        writes.toggleChapterLike(oldSnapshot.getId(), "second", "reader", false);
        Chapter retained = books.findById("book").orElseThrow().getChapters().get(1);
        assertEquals("Newest manuscript", retained.getContent()); assertEquals(1, retained.getEditRevision()); assertTrue(retained.getLikes().contains("reader"));
    }

}
