package com.wordweft.book.service;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.analytics.service.WriterGrowthService;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class MetadataReadMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private BookRepository books;
    private ReadingProgressService service;
    private WriterGrowthService analytics;
    private final AtomicBoolean transferredManuscript = new AtomicBoolean();

    @BeforeEach
    void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (List.of("find", "getMore", "aggregate").contains(event.getCommandName()) &&
                                event.getResponse().toJson().contains("LARGE_MANUSCRIPT_SECRET")) transferredManuscript.set(true);
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_metadata_test_" + UUID.randomUUID().toString().replace("-", ""));
        var repositories = new MongoRepositoryFactory(mongo);
        books = repositories.getRepository(BookRepository.class);
        var progress = repositories.getRepository(ReadingProgressRepository.class);
        var access = mock(ContentAccessService.class);
        when(access.canAccess(any(Book.class))).thenReturn(true);
        service = new ReadingProgressService(mongo, books, progress, access);
        analytics = new WriterGrowthService(books, repositories.getRepository(ChapterReadEventRepository.class), progress);
        Chapter chapter = new Chapter(); chapter.setId("chapter"); chapter.setStatus("published");
        chapter.setContent("LARGE_MANUSCRIPT_SECRET".repeat(5000)); chapter.setWordCount(10);
        chapter.setPublishedContent("LARGE_MANUSCRIPT_SECRET".repeat(5000)); chapter.setPublishedWordCount(10);
        Book book = new Book(); book.setId("book"); book.setAuthorId("writer"); book.setTitle("Story");
        book.setPublicationStatus("published"); book.setChapters(List.of(chapter)); books.save(book);
        ReadingProgress record = new ReadingProgress(); record.setUserId("reader"); record.setBookId("book");
        var completed = new ReadingProgress.ChapterProgressItem(); completed.setProgress(100); completed.setScrollPosition(40);
        record.setChapters(Map.of("chapter", completed));
        progress.save(record);
        transferredManuscript.set(false);
    }

    @AfterEach
    void tearDown() { if (mongo != null) mongo.getDb().drop(); if (client != null) client.close(); }

    @Test
    void progressListNormalizesWithoutReadingManuscripts() {
        var record = service.getAllProgress("reader").get("book");
        assertEquals(100, record.getOverallProgress());
        assertTrue(record.isFinished());
        assertFalse(transferredManuscript.get());
    }

    @Test
    void progressDetailNormalizesWithoutReadingManuscripts() {
        assertEquals("chapter", service.getProgress("reader", "book").getLastReadChapterId());
        assertFalse(transferredManuscript.get());
    }

    @Test
    void savingProgressDoesNotFetchOrModifyManuscripts() {
        var record = service.saveProgress("reader", new ReadingProgressService.SaveRequest("book", "chapter", 100, 40, 40));
        assertEquals(100, record.getOverallProgress());
        assertFalse(transferredManuscript.get());
        assertEquals("LARGE_MANUSCRIPT_SECRET".repeat(5000), books.findById("book").orElseThrow().getChapters().get(0).getContent());
    }

    @Test
    void writerAnalyticsReadsOnlyMetadata() {
        assertEquals(1, analytics.getAnalytics("writer", null, Instant.now()).stories().size());
        assertEquals(1, analytics.getAnalytics("writer", "book", Instant.now()).stories().size());
        assertFalse(transferredManuscript.get());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> analytics.getAnalytics("other-writer", "book", Instant.now()));
    }
}
