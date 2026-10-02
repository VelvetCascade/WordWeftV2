package com.wordweft.book.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.service.ReadingProgressService;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/** Opt-in real Mongo regression checks; each run owns and removes a separate database. */
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class ReadingProgressMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private ReadingController controller;
    private ReadingProgressRepository progress;
    private BookRepository books;
    private UserRepository users;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("WORDWEFT_TEST_MONGO_URI"));
        mongo = new MongoTemplate(client, "wordweft_reading_test_" + UUID.randomUUID().toString().replace("-", ""));
        mongo.indexOps(ReadingProgress.class).ensureIndex(
                new Index().on("userId", Sort.Direction.ASC).on("bookId", Sort.Direction.ASC).unique());
        mongo.indexOps(LibraryEntry.class).ensureIndex(
                new Index().on("userId", Sort.Direction.ASC).on("bookId", Sort.Direction.ASC).unique());
        MongoRepositoryFactory factory = new MongoRepositoryFactory(mongo);
        progress = factory.getRepository(ReadingProgressRepository.class);
        books = factory.getRepository(BookRepository.class);
        users = factory.getRepository(UserRepository.class);
        controller = new ReadingController();
        ReflectionTestUtils.setField(controller, "progressService", readingService(progress));

        Book book = new Book();
        book.setId("book");
        book.setPublicationStatus("published");
        book.setChapters(List.of(chapter("one", "published", 100), chapter("two", "published", 200),
                chapter("draft", "draft", 300)));
        books.save(book);
        User user = new User("Reader", "reader@example.test", "test");
        user.setId("reader");
        users.save(user);
        signIn();
    }

    private ReadingProgressService readingService(ReadingProgressRepository repository) {
        ContentAccessService access = new ContentAccessService();
        ReflectionTestUtils.setField(access, "userRepository", users);
        return new ReadingProgressService(mongo, books, repository, access);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test
    void rereadingPreservesCompletionAndStoresLatestScroll() {
        save("one", 100, 900);
        save("one", 25, 120);

        ReadingProgress saved = progress.findByUserIdAndBookId("reader", "book").orElseThrow();
        assertEquals(100, saved.getChapters().get("one").getProgress());
        assertEquals(120, saved.getChapters().get("one").getScrollPosition());
        assertEquals(120, saved.getLastReadScrollPosition());
        assertEquals(50, saved.getOverallProgress());
        Document persisted = mongo.getCollection("reading_progress").find().first();
        assertNotNull(persisted);
        assertEquals("one", persisted.getString("lastReadChapterId"));
        assertEquals(1, users.findById("reader").orElseThrow().getStats().getChaptersRead());
    }

    @Test
    void concurrentChapterSavesRetainBothAndCountCompletionsOnce() throws Exception {
        ReadingProgress initial = new ReadingProgress();
        initial.setUserId("reader");
        initial.setBookId("book");
        progress.save(initial);

        // Force the old read/replace implementation to use the same snapshot in both requests.
        CountDownLatch snapshots = new CountDownLatch(2);
        ReadingProgressRepository simultaneousReads = mock(ReadingProgressRepository.class, delegatesTo(progress));
        doAnswer(invocation -> {
            var snapshot = progress.findByUserIdAndBookId(invocation.getArgument(0), invocation.getArgument(1));
            snapshots.countDown();
            assertTrue(snapshots.await(10, TimeUnit.SECONDS));
            return snapshot;
        }).when(simultaneousReads).findByUserIdAndBookId(anyString(), anyString());
        ReflectionTestUtils.setField(controller, "progressService", readingService(simultaneousReads));

        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> { signIn(); save("one", 100, 900); });
            var second = executor.submit(() -> { signIn(); save("two", 100, 1000); });
            first.get(15, TimeUnit.SECONDS);
            second.get(15, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        ReadingProgress saved = progress.findByUserIdAndBookId("reader", "book").orElseThrow();
        assertEquals(Set.of("one", "two"), saved.getChapters().keySet());
        assertEquals(100, saved.getOverallProgress());
        assertEquals(Set.of("one", "two"), saved.getCompletedChapterIds());
        User.UserStats stats = users.findById("reader").orElseThrow().getStats();
        assertEquals(2, stats.getChaptersRead());
        assertEquals(300, stats.getTotalWordsRead());
        assertEquals(1, stats.getBooksRead());
    }

    @Test
    void restartClearsPositionWithoutCountingLifetimeCompletionsAgain() {
        save("one", 100, 900);
        save("two", 100, 1000);
        controller.clearProgress("book");
        ReadingProgress reset = (ReadingProgress) controller.getProgress("book").getBody();
        assertTrue(reset == null || reset.getOverallProgress() == 0);
        save("one", 100, 900);
        save("two", 100, 1000);

        User.UserStats stats = users.findById("reader").orElseThrow().getStats();
        assertEquals(2, stats.getChaptersRead());
        assertEquals(300, stats.getTotalWordsRead());
        assertEquals(1, stats.getBooksRead());
    }

    @Test
    void resumeUsesStableChapterIdAndPublishedOnlyTotalAfterChapterRemoval() {
        save("one", 100, 900);
        save("two", 50, 200);
        Book book = books.findById("book").orElseThrow();
        book.setChapters(List.of(chapter("draft", "draft", 300), chapter("two", "published", 200)));
        books.save(book);

        ReadingProgress saved = (ReadingProgress) controller.getProgress("book").getBody();
        assertNotNull(saved);
        assertEquals(0, saved.getLastReadChapterIndex());
        assertEquals(200, saved.getLastReadScrollPosition());
        assertEquals(50, saved.getOverallProgress());
    }

    @Test
    void legacyHighAverageIsNotMistakenForAllChaptersCompleted() {
        ReadingProgress legacy = new ReadingProgress();
        legacy.setUserId("reader"); legacy.setBookId("book"); legacy.setOverallProgress(90);
        ReadingProgress.ChapterProgressItem one = new ReadingProgress.ChapterProgressItem(); one.setProgress(100);
        ReadingProgress.ChapterProgressItem two = new ReadingProgress.ChapterProgressItem(); two.setProgress(80);
        legacy.setChapters(new java.util.HashMap<>(Map.of("one", one, "two", two)));
        legacy.setCompletedChapterIds(Set.of("one"));
        progress.save(legacy);
        save("two", 90, 500);
        assertEquals(1, users.findById("reader").orElseThrow().getStats().getBooksRead());
        assertTrue(((ReadingProgress) controller.getProgress("book").getBody()).isFinished());
    }

    private void save(String chapterId, int percentage, int scroll) {
        controller.saveProgress(Map.of("bookId", "book", "scrollPosition", scroll,
                "chapterData", Map.of("id", chapterId, "progress", percentage, "scroll", scroll)));
    }

    private static void signIn() {
        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", "reader@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static Chapter chapter(String id, String status, int words) {
        Chapter chapter = new Chapter();
        chapter.setId(id);
        chapter.setStatus(status);
        chapter.setWordCount(words);
        return chapter;
    }
}
