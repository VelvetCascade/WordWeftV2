package com.wordweft.book.service;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.BsonDocument;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Real query/payload regressions. Each run owns a temporary database, never the preview data. */
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class BookServiceCatalogMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private BookService service;
    private final Reads reads = new Reads();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(reads).build());
        mongo = new MongoTemplate(client, "wordweft_catalog_test_" + UUID.randomUUID().toString().replace("-", ""));
        MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
        ContentAccessService access = new ContentAccessService();
        ReflectionTestUtils.setField(access, "userRepository", repositories.getRepository(UserRepository.class));
        service = new BookService();
        service.mongoTemplate = mongo;
        service.bookRepository = repositories.getRepository(BookRepository.class);
        service.userRepository = repositories.getRepository(UserRepository.class);
        service.contentAccessService = access;
        saveAuthor("writer");
        reads.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test
    void catalogNeverReadsManuscriptsAndKeepsReleasedChapterMetadata() {
        Book book = book("story", "writer");
        Chapter released = book.getChapters().get(0);
        released.setPublishedTitle("Released chapter title");
        released.setPublishedWordCount(17);
        released.setPublishedContentWarnings(List.of("GRIEF"));
        released.setPublishedDisclaimerNote("Released note");
        released.setTitle("Unreleased edited title");
        released.setWordCount(9999);
        released.setDisclaimerNote("Unreleased edited note");
        mongo.save(book);
        reads.clear();

        Map<String, Object> page = service.getAllBooks("most_read", null, 0, 12);
        Map<?, ?> card = (Map<?, ?>) ((List<?>) page.get("content")).get(0);
        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) card.get("chapters")).get(0);

        assertEquals("story-chapter", chapter.get("id"));
        assertEquals("Released chapter title", chapter.get("title"));
        assertEquals(17, chapter.get("wordCount"));
        assertEquals(List.of("GRIEF"), chapter.get("contentWarnings"));
        assertEquals("Released note", chapter.get("disclaimerNote"));
        assertFalse(reads.returnedManuscript(), "Catalog Mongo responses must contain chapter metadata only");
        assertFalse(card.toString().contains("MANUSCRIPT_SECRET"));
        assertFalse(card.toString().contains("Private draft title"));
        assertEquals(1, ((List<?>) card.get("chapters")).size());
    }

    @Test
    void aFullCatalogPageLoadsViewerOnceAndAllAuthorsInOneRead() {
        for (int i = 0; i < 50; i++) {
            saveAuthor("writer-" + i);
            mongo.save(book("book-" + i, "writer-" + i));
        }
        saveAuthor("reader");
        signIn("reader");
        reads.clear();

        Map<String, Object> page = service.getAllBooks("most_read", null, 0, 50);

        assertEquals(50, ((List<?>) page.get("content")).size());
        assertEquals(2, reads.finds("users"), "One viewer read plus one batch of author display fields");
        assertFalse(reads.returnedPrivateUserData(), "Author display queries must not read passwords or social graphs");
    }

    @Test
    void genresAndHomeShelvesDoNotHydrateThePublishedCatalog() {
        for (int i = 0; i < 90; i++) {
            Book book = book("book-" + i, "writer");
            book.setGenres(List.of("Shelf " + (i % 6), "Fantasy"));
            book.setReadCount(i);
            mongo.save(book);
        }
        reads.clear();

        Map<String, List<Map<String, Object>>> shelves = service.getHomeGenres();

        assertEquals(5, shelves.size());
        assertTrue(shelves.values().stream().allMatch(books -> books.size() == 6));
        assertEquals(5, reads.finds("books"));
        for (BsonDocument query : reads.findCommands("books")) {
            assertTrue(query.containsKey("limit") && query.getNumber("limit").intValue() <= 6,
                    "Each shelf query must stop at six books");
        }
        assertEquals(1, reads.finds("users"));
        assertFalse(reads.returnedManuscript());

        reads.clear();
        assertTrue(service.getAllGenres().contains("Shelf 5"));
        assertEquals(0, reads.finds("books"), "Genre names come from Mongo distinct metadata, not full books");
        assertFalse(reads.returnedManuscript());

        reads.clear();
        List<Map<String, Object>> ranked = service.getGenresRanked();
        assertEquals("Fantasy", ranked.get(0).get("name"));
        assertEquals(90L, ranked.get(0).get("bookCount"));
        assertEquals(4005L, ranked.get(0).get("readCount"));
        assertEquals(0, reads.finds("books"));
        assertFalse(reads.returnedManuscript());
    }

    @Test
    void normalizedRestrictedWarningsAreFilteredBeforeCountsAndPagination() {
        Book safe = book("safe", "writer");
        Book restrictedBook = book("restricted-book", "writer");
        restrictedBook.setContentWarnings(List.of(" sexual_content "));
        restrictedBook.setReadCountLast7Days(999);
        Book restrictedChapter = book("restricted-chapter", "writer");
        restrictedChapter.getChapters().get(0).setContentWarnings(List.of(" gore "));
        restrictedChapter.setReadCountLast7Days(998);
        mongo.insertAll(List.of(safe, restrictedBook, restrictedChapter));
        reads.clear();

        Map<String, Object> page = service.getAllBooks("most_read", null, 0, 1);

        assertEquals(1L, page.get("totalElements"));
        assertEquals(1, ((List<?>) page.get("content")).size());
        assertEquals("safe", ((Map<?, ?>) ((List<?>) page.get("content")).get(0)).get("id"));
        assertEquals(false, page.get("hasMore"));
    }

    @Test
    void homeShelvesMatchStoredCustomGenreNamesLiterally() {
        Book spaced = book("spaced", "writer"); spaced.setGenres(List.of(" Shelf "));
        Book plain = book("plain", "writer"); plain.setGenres(List.of("Shelf"));
        Book empty = book("empty", "writer"); empty.setGenres(List.of(""));
        mongo.insertAll(List.of(spaced, plain, empty));

        var shelves = service.getHomeGenres();

        assertEquals(List.of("spaced"), shelves.get(" Shelf ").stream().map(card -> card.get("id")).toList());
        assertEquals(List.of("plain"), shelves.get("Shelf").stream().map(card -> card.get("id")).toList());
        assertEquals(List.of("empty"), shelves.get("").stream().map(card -> card.get("id")).toList());
    }

    @Test
    void anonymousHeroKeepsSnapshotsWithoutReadingManuscripts() {
        Book novel = book("novel", "writer");
        novel.getChapters().get(0).setPublishedTitle("Released hero chapter");
        novel.getChapters().get(0).setTitle("Private edited hero chapter");
        mongo.save(novel);
        reads.clear();

        var hero = service.getPublicDiscoveryHero();

        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) hero.get("novels").get(0).get("chapters")).get(0);
        assertEquals("Released hero chapter", chapter.get("title"));
        assertFalse(reads.returnedManuscript());
        assertEquals(1, reads.finds("users"));
    }

    @Test
    void authorMetadataRetainsOwnerChangesAndPublishedOnlyTotals() {
        Book book = book("owned", "writer");
        Chapter chapter = book.getChapters().get(0);
        chapter.setTitle("Changed title");
        chapter.setViewCount(7);
        chapter.setCommentCount(3);
        book.getChapters().get(1).setViewCount(100);
        mongo.save(book);
        signIn("writer");
        reads.clear();

        List<Map<String, Object>> cards = service.getBooksByAuthor("writer");

        assertEquals(true, ((Map<?, ?>) ((List<?>) cards.get(0).get("chapters")).get(0)).get("hasUnpublishedChanges"));
        assertEquals(2, ((List<?>) cards.get(0).get("chapters")).size());
        assertFalse(reads.returnedManuscript());

        SecurityContextHolder.clearContext();
        Map<String, Object> publicCard = service.getBooksByAuthor("writer").get(0);
        assertEquals(7, publicCard.get("viewCount"));
        assertEquals(3, publicCard.get("commentCount"));
        assertEquals(1, ((List<?>) publicCard.get("chapters")).size());
    }

    @Test
    void projectedOwnerChangeFlagsDistinguishUnchangedSnapshotsAndLegacyReleases() {
        Book unchanged = book("unchanged", "writer");
        unchanged.getChapters().get(0).setContent(unchanged.getChapters().get(0).getPublishedContent());
        Book changed = book("changed", "writer");
        Book legacy = book("legacy", "writer");
        legacy.getChapters().get(0).setPublishedContent(null);
        legacy.getChapters().get(0).setPublishedTitle(null);
        legacy.getChapters().get(0).setPublishedWordCount(null);
        legacy.getChapters().get(0).setTitle("Legacy released title");
        legacy.getChapters().get(0).setWordCount(29);
        mongo.insertAll(List.of(unchanged, changed, legacy));
        signIn("writer");
        reads.clear();

        Map<Object, Map<?, ?>> chapters = new java.util.HashMap<>();
        service.getBooksByAuthor("writer").forEach(card -> chapters.put(card.get("id"),
                (Map<?, ?>) ((List<?>) card.get("chapters")).get(0)));

        assertEquals(false, chapters.get("unchanged").get("hasUnpublishedChanges"));
        assertEquals(true, chapters.get("changed").get("hasUnpublishedChanges"));
        assertEquals(false, chapters.get("legacy").get("hasUnpublishedChanges"));
        assertFalse(reads.returnedManuscript());

        SecurityContextHolder.clearContext();
        Map<String, Object> publicLegacy = service.getBooksByAuthor("writer").stream()
                .filter(card -> "legacy".equals(card.get("id"))).findFirst().orElseThrow();
        Map<?, ?> chapter = (Map<?, ?>) ((List<?>) publicLegacy.get("chapters")).get(0);
        assertEquals("Legacy released title", chapter.get("title"));
        assertEquals(29, chapter.get("wordCount"));
    }

    @Test
    void accessPreferencesRemainFreshAcrossViewersAndProfileChanges() {
        User adult = saveAuthor("adult");
        adult.setAllowMatureContent(true);
        mongo.save(adult);
        User child = saveAuthor("child");
        child.setDateOfBirth(LocalDate.now().minusYears(10));
        mongo.save(child);
        Book teen = book("teen", "writer"); teen.setAgeRating(AgeRating.TEEN_13);
        Book mature = book("mature", "writer"); mature.setAgeRating(AgeRating.MATURE_18);
        mongo.insertAll(List.of(book("safe", "writer"), teen, mature));

        signIn("adult");
        assertEquals(3L, service.getAllBooks(null, null, 0, 50).get("totalElements"));
        signIn("child");
        assertEquals(1L, service.getAllBooks(null, null, 0, 50).get("totalElements"));
        adult.setAllowMatureContent(false); mongo.save(adult);
        signIn("adult");
        assertEquals(2L, service.getAllBooks(null, null, 0, 50).get("totalElements"));
    }

    @Test
    void detailReadsOnlyMetadataAndUpdatesLegacyNullCountersWithoutReplacingManuscripts() {
        Book book = book("detail", "writer");
        book.setReadCount(null); book.setReadCountLast7Days(null); book.setViewCount(null);
        mongo.save(book);
        reads.clear();

        Map<String, Object> detail = service.getBookById("detail", true);

        assertNotNull(detail);
        assertEquals(1, detail.get("readCount"));
        assertEquals(1, detail.get("readCountLast7Days"));
        assertFalse(reads.returnedManuscript(), "Detail metadata is separate from chapter content delivery");
        Book persisted = mongo.findById("detail", Book.class);
        assertNotNull(persisted);
        assertEquals(1, persisted.getViewCount());
        assertEquals(1, persisted.getReadCount());
        assertEquals(1, persisted.getReadCountLast7Days());
        assertEquals(book.getChapters().get(0).getContent(), persisted.getChapters().get(0).getContent());
        assertEquals(book.getChapters().get(0).getPublishedContent(), persisted.getChapters().get(0).getPublishedContent());
    }

    @Test
    void aViewCounterUpdateDoesNotOverwriteAChapterEditBetweenReadAndWrite() {
        mongo.save(book("concurrent", "writer"));
        reads.onNextBookRead(() -> mongo.updateFirst(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("_id").is("concurrent")),
                new org.springframework.data.mongodb.core.query.Update().set("chapters.0.title", "Concurrent writer edit"), Book.class));

        service.getBookById("concurrent", true);

        Book persisted = mongo.findById("concurrent", Book.class);
        assertNotNull(persisted);
        assertEquals("Concurrent writer edit", persisted.getChapters().get(0).getTitle());
        assertEquals(1, persisted.getReadCount());
    }

    private User saveAuthor(String id) {
        User author = new User(); author.setId(id); author.setUsername(id);
        author.setDateOfBirth(LocalDate.now().minusYears(25));
        author.setPassword("PRIVATE_PASSWORD_SECRET");
        author.setFollowers(java.util.Set.of("PRIVATE_SOCIAL_GRAPH_SECRET"));
        mongo.save(author);
        return author;
    }

    private Book book(String id, String authorId) {
        Chapter published = new Chapter(); published.setId(id + "-chapter");
        published.setTitle("Released chapter title"); published.setWordCount(17); published.setStatus("published");
        published.setContent("DRAFT_MANUSCRIPT_SECRET".repeat(3000));
        published.setPublishedContent("PUBLISHED_MANUSCRIPT_SECRET".repeat(3000));
        published.setPublishedTitle("Released chapter title"); published.setPublishedWordCount(17);
        Chapter draft = new Chapter(); draft.setId(id + "-draft"); draft.setTitle("Private draft title");
        draft.setContent("DRAFT_MANUSCRIPT_SECRET".repeat(3000));
        Book book = new Book(); book.setId(id); book.setAuthorId(authorId); book.setTitle(id);
        book.setCategory("Novel"); book.setPublicationStatus("published");
        book.setGenres(List.of("Fantasy")); book.setCoverUrl("https://example.test/cover.jpg");
        book.setChapters(List.of(published, draft));
        return book;
    }

    private static void signIn(String userId) {
        UserDetailsImpl principal = new UserDetailsImpl(userId, userId, userId + "@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static final class Reads implements CommandListener {
        private final List<BsonDocument> finds = new ArrayList<>();
        private boolean manuscripts;
        private boolean privateUserData;
        private Runnable nextBookRead;
        private Integer nextBookRequest;

        @Override public synchronized void commandStarted(CommandStartedEvent event) {
            if ("find".equals(event.getCommandName())) {
                finds.add(event.getCommand().clone());
                if (nextBookRead != null && "books".equals(event.getCommand().getString("find").getValue())) {
                    nextBookRequest = event.getRequestId();
                }
            }
        }
        @Override public synchronized void commandSucceeded(CommandSucceededEvent event) {
            if (List.of("find", "aggregate", "distinct", "getMore").contains(event.getCommandName())) {
                String payload = event.getResponse().toJson();
                manuscripts |= payload.contains("MANUSCRIPT_SECRET");
                // A DOB-only viewer lookup is expected; author enrichment never needs these fields.
                privateUserData |= payload.contains("PRIVATE_PASSWORD_SECRET") || payload.contains("PRIVATE_SOCIAL_GRAPH_SECRET");
            }
            if (nextBookRead != null && Integer.valueOf(event.getRequestId()).equals(nextBookRequest)) {
                Runnable callback = nextBookRead; nextBookRead = null; nextBookRequest = null;
                callback.run();
            }
        }
        synchronized int finds(String collection) { return findCommands(collection).size(); }
        synchronized List<BsonDocument> findCommands(String collection) {
            return finds.stream().filter(command -> collection.equals(command.getString("find").getValue())).toList();
        }
        synchronized boolean returnedManuscript() { return manuscripts; }
        synchronized boolean returnedPrivateUserData() { return privateUserData; }
        synchronized void onNextBookRead(Runnable callback) { nextBookRead = callback; }
        synchronized void clear() { finds.clear(); manuscripts = false; privateUserData = false; nextBookRead = null; nextBookRequest = null; }
    }
}
