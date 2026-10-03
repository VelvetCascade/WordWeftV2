package com.wordweft.discovery.service;

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
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Opt-in, isolated real-Mongo checks for hook ranking, released content and bounded payloads. */
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class HookFeedPerformanceMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private AnnotationConfigApplicationContext context;
    private HookFeedService service;
    private final List<Document> commands = new ArrayList<>();
    private final List<Document> returnedBooks = new ArrayList<>();
    private final List<Document> returnedUsers = new ArrayList<>();

    @BeforeEach void setUp() {
        SecurityContextHolder.clearContext();
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if (List.of("find", "aggregate", "distinct", "getMore").contains(event.getCommandName()))
                            commands.add(Document.parse(event.getCommand().toJson()));
                    }
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (!event.getResponse().containsKey("cursor")) return;
                        Document cursor = Document.parse(event.getResponse().getDocument("cursor").toJson());
                        List<Document> rows = cursor.getList(cursor.containsKey("firstBatch") ? "firstBatch" : "nextBatch", Document.class, List.of());
                        if (cursor.getString("ns").endsWith(".books")) returnedBooks.addAll(rows);
                        if (cursor.getString("ns").endsWith(".users")) returnedUsers.addAll(rows);
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_hook_perf_" + UUID.randomUUID().toString().replace("-", ""));
        MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
        ContentAccessService access = new ContentAccessService();
        ReflectionTestUtils.setField(access, "userRepository", repositories.getRepository(UserRepository.class));
        context = new AnnotationConfigApplicationContext();
        context.registerBean(MongoTemplate.class, () -> mongo);
        context.registerBean(BookRepository.class, () -> repositories.getRepository(BookRepository.class));
        context.registerBean(UserRepository.class, () -> repositories.getRepository(UserRepository.class));
        context.registerBean(ContentAccessService.class, () -> access);
        context.registerBean(HookFeedService.class);
        context.refresh();
        service = context.getBean(HookFeedService.class);
        saveUser("writer", List.of());
        clearReads();
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
        if (context != null) context.close();
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void aHookPageTransfersOnlyBoundedMetadataAndItsReleasedOpeningBodies() {
        List<Book> catalog = new ArrayList<>();
        for (int i = 0; i < 150; i++) {
            saveUser("writer-" + i, List.of());
            Book book = story(String.format("story-%03d", i), List.of("Fantasy"), i, 0,
                    chapter("opening-" + i, "published", "Released opening " + i + " PUBLIC_BODY_TOKEN ".repeat(1000)),
                    chapter("later-" + i, "published", "LATER_BODY_SECRET ".repeat(1000)),
                    chapter("draft-" + i, "draft", "DRAFT_BODY_SECRET ".repeat(1000)));
            book.setAuthorId("writer-" + i);
            book.getChapters().get(0).setContent("EDITED_BODY_SECRET ".repeat(1000));
            catalog.add(book);
        }
        mongo.insertAll(catalog);
        saveUser("reader", List.of("Fantasy"));
        signIn("reader");
        clearReads();

        HookFeedResponse result = service.getFeed("reader", Set.of(), 10);

        assertEquals(10, result.items().size());
        assertEquals("story-149", result.items().get(0).bookId());
        assertEquals("writer-149", result.items().get(0).authorName());
        assertFalse(returnedBooks.toString().contains("DRAFT_BODY_SECRET"), "Draft manuscripts must never enter a hook response from Mongo");
        assertFalse(returnedBooks.toString().contains("EDITED_BODY_SECRET"), "Unreleased edits must stay in Mongo");
        assertFalse(returnedBooks.toString().contains("LATER_BODY_SECRET"), "Only the selected opening chapter is needed");
        assertEquals(10, returnedBooks.stream().filter(row -> row.toString().contains("PUBLIC_BODY_TOKEN")).count());
        assertTrue(returnedBooks.size() <= 30, "A ten-hook request must not hydrate all 150 catalog books");
        assertEquals(2, userFinds(), "One fresh preference snapshot plus one batch of author names");
        assertTrue(bookReads() <= 3, "Book request count must not grow with page author count");
        assertFalse(returnedUsers.toString().contains("PRIVATE_ACCOUNT_SECRET"));
    }

    @Test void tasteRankingIsUniqueTrimmedAndStableAfterVisibilityAndExclusionFilters() {
        Book excluded = story("excluded", List.of("Fantasy", "Mystery"), 1000, 1000, chapter("excluded", "published", "Excluded"));
        Book restricted = story("restricted", List.of("Fantasy", "Mystery"), 999, 999, chapter("restricted", "published", "Restricted"));
        restricted.setContentWarnings(List.of(" sexual_content "));
        Book restrictedChapter = story("restricted-chapter", List.of("Fantasy", "Mystery"), 998, 998, chapter("restricted-chapter", "published", "Restricted"));
        restrictedChapter.getChapters().get(0).setContentWarnings(List.of(" Gore "));
        Book draft = story("draft", List.of("Fantasy", "Mystery"), 997, 997, chapter("draft", "published", "Draft"));
        draft.setPublicationStatus("draft");
        mongo.insertAll(List.of(excluded, restricted, restrictedChapter, draft,
                story("two-matches", List.of(" fantasy ", "FANTASY", "Mystery", " "), 1, 1, chapter("two", "published", "Two")),
                story("tie-b", List.of("Fantasy"), 10, 5, chapter("b", "published", "B")),
                story("tie-a", List.of("Fantasy"), 10, 5, chapter("a", "published", "A")),
                story("more-views", List.of("Fantasy"), 10, 6, chapter("views", "published", "Views")),
                story("popular-fallback", List.of("Other"), 2000, 2000, chapter("fallback", "published", "Fallback"))));
        clearReads();

        HookFeedResponse result = service.getFeed(null, List.of(" Fantasy ", "fantasy", "Mystery"), Set.of("excluded"), 4);

        assertEquals(List.of("two-matches", "more-views", "tie-a", "tie-b"), ids(result));
        assertEquals(List.of("Fantasy", "Mystery"), result.tasteGenres());
        assertEquals(List.of("fantasy", "Mystery"), result.items().get(0).matchedGenres());
    }

    @Test void blankPublishedChaptersAdvanceWithoutExposingDraftEditsOrChangingReleasedMetadata() {
        Chapter blank = chapter("blank", "PuBlIsHeD", "<script>secret()</script><style>p{}</style><p>&nbsp;</p>");
        blank.setContent("Private edit that must not make this chapter eligible");
        Chapter opening = chapter("public", "published", "<p>One &amp; two.<br>Three.</p>");
        opening.setPublishedTitle("Released title"); opening.setTitle("Edited title");
        opening.setPublishedWordCount(0); opening.setWordCount(5000); opening.getLikes().add("reader");
        mongo.insertAll(List.of(story("eligible", List.of("Fantasy"), 8, 0,
                        chapter("draft", "draft", "Do not leak"), blank, opening),
                story("empty", List.of("Fantasy"), 100, 0, chapter("empty", "published", "<p> </p>")),
                story("legacy", List.of("Fantasy"), 7, 0, legacyChapter("legacy", "Legacy opening"))));
        clearReads();

        HookFeedResponse result = service.getFeed("reader", List.of("Fantasy"), Set.of(), 2);

        assertEquals(List.of("eligible", "legacy"), ids(result));
        HookFeedResponse.Hook hook = result.items().get(0);
        assertEquals("public", hook.chapterId()); assertEquals("Released title", hook.chapterTitle());
        assertEquals("One & two. Three.", hook.excerpt());
        assertEquals(4, hook.wordCount()); assertEquals(1, hook.readingMinutes());
        assertEquals(1, hook.likesCount()); assertTrue(hook.liked());
        assertFalse(result.toString().contains("Do not leak"));
        assertFalse(returnedBooks.toString().contains("Private edit"));
    }

    @Test void nonAsciiGenreMatchingRetainsJavaRootCaseNormalizationBeforeTheLimit() {
        mongo.insertAll(List.of(
                story("unicode", List.of(" CAFÉ ", "ΦΑΝΤΑΣΊΑ", "İstanbul"), 1, 0, chapter("unicode", "published", "Unicode opening")),
                story("popular", List.of("café"), 999, 0, chapter("popular", "published", "Popular opening"))));

        HookFeedResponse response = service.getFeed(null, List.of("café", "φαντασία", "i\u0307stanbul"), Set.of(), 1);

        assertEquals(List.of("unicode"), ids(response));
        assertEquals(List.of("CAFÉ", "ΦΑΝΤΑΣΊΑ", "İstanbul"), response.items().get(0).matchedGenres());
    }

    @Test void manyIneligibleOpeningWindowsNeverShortenTheRequestedPage() {
        List<Book> catalog = new ArrayList<>();
        for (int i = 0; i < 45; i++) catalog.add(story("blank-" + i, List.of("Fantasy"), 100 + i, 0, chapter("blank-" + i, "published", "<p>&nbsp;</p>")));
        catalog.add(story("first", List.of("Fantasy"), 2, 0, chapter("first", "published", "First")));
        catalog.add(story("second", List.of("Fantasy"), 1, 0, chapter("second", "published", "Second")));
        mongo.insertAll(catalog);
        clearReads();

        assertEquals(List.of("first", "second"), ids(service.getFeed(null, List.of("Fantasy"), Set.of(), 2)));
        assertTrue(returnedBooks.stream().allMatch(row -> !row.toString().contains("DRAFT_BODY_SECRET")));
    }

    @Test void preferenceChangesAndDifferentViewersRemainFreshOnEveryRequest() {
        User adult = saveUser("adult", List.of("Other")); adult.setAllowMatureContent(true); mongo.save(adult);
        User child = saveUser("child", List.of("Fantasy")); child.setDateOfBirth(LocalDate.now().minusYears(10)); mongo.save(child);
        Book mature = story("mature", List.of("Other"), 9, 0, chapter("mature", "published", "Mature")); mature.setAgeRating(AgeRating.MATURE_18);
        Book teen = story("teen", List.of("Fantasy"), 8, 0, chapter("teen", "published", "Teen")); teen.setAgeRating(AgeRating.TEEN_13);
        mongo.insertAll(List.of(mature, teen, story("safe", List.of("Other"), 7, 0, chapter("safe", "published", "Safe"))));

        signIn("adult"); assertEquals(List.of("mature", "safe", "teen"), ids(service.getFeed("adult", Set.of(), 10)));
        signIn("child"); assertEquals(List.of("safe"), ids(service.getFeed("child", Set.of(), 10)));
        adult.setAllowMatureContent(false); adult.setFavoriteGenres(List.of("Fantasy")); mongo.save(adult);
        signIn("adult"); assertEquals(List.of("teen", "safe"), ids(service.getFeed("adult", Set.of(), 10)));
    }

    private User saveUser(String id, List<String> genres) {
        User user = new User(); user.setId(id); user.setUsername(id); user.setFavoriteGenres(genres);
        user.setDateOfBirth(LocalDate.now().minusYears(25)); user.setPassword("PRIVATE_ACCOUNT_SECRET");
        user.setFollowers(Set.of("PRIVATE_ACCOUNT_SECRET")); mongo.save(user); return user;
    }
    private Book story(String id, List<String> genres, int reads, int views, Chapter... chapters) {
        Book book = new Book(); book.setId(id); book.setTitle(id); book.setAuthorId("writer");
        book.setPublicationStatus("published"); book.setGenres(genres);
        book.setReadCountLast7Days(reads); book.setViewCountLast7Days(views); book.setChapters(List.of(chapters)); return book;
    }
    private Chapter chapter(String id, String status, String content) {
        Chapter chapter = legacyChapter(id, content); chapter.setStatus(status);
        chapter.setPublishedContent(content); chapter.setPublishedTitle("Released " + id); chapter.setPublishedWordCount(10); return chapter;
    }
    private Chapter legacyChapter(String id, String content) {
        Chapter chapter = new Chapter(); chapter.setId(id); chapter.setTitle("Opening"); chapter.setStatus("published");
        chapter.setContent(content); chapter.setWordCount(10); return chapter;
    }
    private static void signIn(String id) {
        UserDetailsImpl user = new UserDetailsImpl(id, id, id + "@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }
    private void clearReads() { commands.clear(); returnedBooks.clear(); returnedUsers.clear(); }
    private long userFinds() { return commands.stream().filter(command -> "users".equals(command.get("find"))).count(); }
    private long bookReads() { return commands.stream().filter(command -> "books".equals(command.get("find")) || "books".equals(command.get("aggregate")) || "books".equals(command.get("distinct"))).count(); }
    private static List<String> ids(HookFeedResponse response) { return response.items().stream().map(HookFeedResponse.Hook::bookId).toList(); }
}
