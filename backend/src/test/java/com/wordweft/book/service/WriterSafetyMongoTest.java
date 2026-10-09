package com.wordweft.book.service;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.manuscript.model.ChapterRevision;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import com.wordweft.manuscript.service.ChapterRevisionService;
import com.wordweft.manuscript.service.ManuscriptImportService;
import com.wordweft.manuscript.service.ManuscriptParser;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.bson.Document;
import java.util.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class WriterSafetyMongoTest {
    private MongoClient client; private MongoTemplate mongo; private BookRepository books; private ChapterWriteService writes;
    @BeforeEach void setup() {
        client = MongoClients.create(System.getenv("WORDWEFT_TEST_MONGO_URI"));
        mongo = new MongoTemplate(client, "wordweft_writer_test_" + UUID.randomUUID().toString().replace("-", ""));
        books = new MongoRepositoryFactory(mongo).getRepository(BookRepository.class); writes = new ChapterWriteService(mongo);
    }
    @AfterEach void cleanup() { if (mongo != null) mongo.getDb().drop(); if (client != null) client.close(); }
    private Chapter chapter(String id, String status) {
        Chapter c = new Chapter(); c.setId(id); c.setTitle(id); c.setContent("<p>" + id + " text</p>"); c.setStatus(status); c.updateWordCount();
        if ("published".equals(status)) { PublishedChapterView.capture(c); c.setPublishedAt(Instant.parse("2026-09-01T00:00:00Z")); }
        return c;
    }
    private Book story(Chapter... chapters) {
        Book book = new Book(); book.setId("book"); book.setAuthorId("author"); book.setTitle("Story"); book.setPublicationStatus("published");
        book.setChapters(new ArrayList<>(List.of(chapters))); return books.save(book);
    }
    @Test void reorderPreservesLiveIdsAndCounterUpdateThatRacedTheRead() {
        story(chapter("live", "published"), chapter("a", "draft"), chapter("b", "draft"));
        BookRepository racing = mock(BookRepository.class);
        doAnswer(call -> {
            var result = books.findById("book");
            mongo.getCollection("books").updateOne(new Document("_id", "book"), new Document("$inc", new Document("chapters.1.viewCount", 7)));
            return result;
        }).when(racing).findById("book");
        new ChapterOrganizationService(racing, mongo, writes).reorder("author", "book", List.of("live", "b", "a"));
        Book saved = books.findById("book").orElseThrow();
        assertEquals(List.of("live", "b", "a"), saved.getChapters().stream().map(Chapter::getId).toList());
        assertEquals(7, saved.getChapters().get(2).getViewCount()); assertEquals("<p>live text</p>", saved.getChapters().get(0).getPublishedContent());
    }
    @Test void workingDraftRestoreLeavesPublishedProjectionAndLaterScheduleUnchangedInMongo() {
        Chapter live = chapter("live", "published"), scheduled = chapter("next", "scheduled"); scheduled.setScheduledAt(Instant.parse("2030-01-01T00:00:00Z"));
        story(live, chapter("later", "published"), scheduled);
        ChapterRevisionRepository repository = new MongoRepositoryFactory(mongo).getRepository(ChapterRevisionRepository.class);
        ChapterRevision revision = new ChapterRevision(); revision.setAuthorId("author"); revision.setBookId("book"); revision.setChapterId("live"); revision.setTitle("Earlier draft"); revision.setContent("<p>earlier<strong>draft</strong> words</p>"); repository.save(revision);
        ChapterRevisionService service = new ChapterRevisionService(repository, books); ReflectionTestUtils.setField(service, "chapterWrites", writes);
        service.restore("author", "book", "live", revision.getId(), 0L, true);
        Book saved = books.findById("book").orElseThrow(); Chapter restored = saved.getChapters().get(0);
        assertEquals("Earlier draft", restored.getTitle()); assertEquals(2, restored.getWordCount()); assertEquals("published", restored.getStatus());
        assertEquals("<p>live text</p>", restored.getPublishedContent()); assertEquals(live.getPublishedAt(), restored.getPublishedAt());
        assertEquals("published", saved.getChapters().get(1).getStatus()); assertEquals("scheduled", saved.getChapters().get(2).getStatus());
        assertEquals(scheduled.getScheduledAt(), saved.getChapters().get(2).getScheduledAt());
    }
    @Test void writerGuideUsesOnlyPersistedAccomplishmentsInOwnedStories() {
        Book book = story(chapter("live", "published"));
        Book other = new Book(); other.setId("other"); other.setAuthorId("other-author");
        Chapter otherChapter = chapter("other-chapter", "draft"); otherChapter.setContent("<div data-mood='tense'><span data-type='mention' data-id='other'>Other</span></div>"); other.setChapters(List.of(otherChapter)); books.save(other);
        mongo.getCollection("characters").insertOne(new Document("_id", "other-character").append("bookId", "other"));
        mongo.getCollection("notes").insertOne(new Document("_id", "other-note").append("bookId", "other"));
        WriterQuickstartService service = new WriterQuickstartService(mongo);
        assertEquals(new WriterQuickstartService.Progress(false, false, false, false), service.get("author"));
        mongo.getCollection("characters").insertOne(new Document("_id", "owned-character").append("bookId", "book"));
        mongo.getCollection("scenes").insertOne(new Document("_id", "owned-scene").append("bookId", "book"));
        assertEquals(new WriterQuickstartService.Progress(true, false, false, true), service.get("author"));
        book.getChapters().get(0).setContent("<div data-mood=\"serene\"><span data-type=\"mention\" data-id=\"owned-character\">Name</span></div>"); books.save(book);
        assertEquals(new WriterQuickstartService.Progress(true, true, true, true), service.get("author"));
        assertEquals(new WriterQuickstartService.Progress(false, false, false, false), service.get("new-author"));
    }
    @Test void metadataWritePersistsIndependentSummaryAndTagsWithoutChangingLiveChapter() {
        Book book = story(chapter("live", "published"));
        var snapshot = ChapterWriteService.snapshotQuery(book);
        book.setTags(List.of("family", "homecoming")); book.setSummary("Independent summary"); book.setDescription("Changed description");
        writes.updateMetadata(book, snapshot);
        Book saved = books.findById("book").orElseThrow();
        assertEquals(List.of("family", "homecoming"), saved.getTags()); assertEquals("Independent summary", saved.getSummary()); assertEquals("Changed description", saved.getDescription());
        assertEquals("published", saved.getChapters().get(0).getStatus()); assertEquals("<p>live text</p>", saved.getChapters().get(0).getPublishedContent());
    }
    @Test void undoRemovesOnlyImportedDraftsAndRejectsAConcurrentRelease() {
        story(chapter("live", "published"));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        var imported = service.importManuscript("author", "book", "story.md", "# Chapter One\nFresh draft".getBytes(StandardCharsets.UTF_8));
        assertEquals(1, service.undo("author", "book", imported.importId()));
        assertEquals(List.of("live"), books.findById("book").orElseThrow().getChapters().stream().map(Chapter::getId).toList());
        imported = service.importManuscript("author", "book", "story.md", "# Chapter Two\nAnother draft".getBytes(StandardCharsets.UTF_8));
        BookRepository racing = mock(BookRepository.class);
        doAnswer(call -> {
            var result = books.findById("book");
            mongo.getCollection("books").updateOne(new Document("_id", "book"), new Document("$set", new Document("chapters.1.status", "published").append("chapters.1.editRevision", 1L)));
            return result;
        }).when(racing).findById("book");
        String batch = imported.importId();
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> new ManuscriptImportService(racing, new ManuscriptParser(), mongo).undo("author", "book", batch)).getStatusCode().value());
        assertEquals(2, books.findById("book").orElseThrow().getChapters().size());
    }
}
