package com.wordweft.search.service;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.Document;
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

/** Measures real Mongo page cardinality and payloads, including the standalone Atlas fallback. */
@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class SearchPerformanceMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private SearchService service;
    private final List<Document> commands = new ArrayList<>();
    private final List<Document> returnedBooks = new ArrayList<>();

    @BeforeEach void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if (List.of("find", "aggregate").contains(event.getCommandName()))
                            commands.add(Document.parse(event.getCommand().toJson()));
                    }
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (!event.getResponse().containsKey("cursor")) return;
                        Document cursor = Document.parse(event.getResponse().getDocument("cursor").toJson());
                        if (cursor.getString("ns").endsWith(".books"))
                            cursor.getList("firstBatch", Document.class, List.of()).stream()
                                    .filter(row -> row.containsKey("title")).forEach(returnedBooks::add);
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_search_perf_" + UUID.randomUUID().toString().replace("-", ""));
        ContentAccessService access = new ContentAccessService();
        ReflectionTestUtils.setField(access, "userRepository", new MongoRepositoryFactory(mongo).getRepository(UserRepository.class));
        service = new SearchService();
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        ReflectionTestUtils.setField(service, "contentAccessService", access);
        mongo.getCollection("users").insertOne(new Document("_id", "writer").append("username", "Writer")
                .append("email", "PRIVATE_EMAIL").append("password", "PRIVATE_HASH")
                .append("resetPasswordToken", "PRIVATE_TOKEN"));
        SecurityContextHolder.clearContext();
        clearRecordedCommands();
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void fullBookSearchReturnsPagesBeyondTheFirstFiveHundredAndOnlyTransfersOnePage() {
        List<Document> books = new ArrayList<>();
        for (int i = 0; i < 620; i++) books.add(book(String.format("book-%04d", i)));
        books.add(book("hidden-warning").append("contentWarnings", List.of(" self_harm ")));
        books.add(book("hidden-chapter").append("chapters", List.of(new Document("contentWarnings", List.of(" Abuse ")))));
        books.add(book("hidden-mature").append("isMature", true));
        books.add(book("hidden-draft").append("publicationStatus", "draft"));
        mongo.getCollection("books").insertMany(books);
        clearRecordedCommands();

        Map<String, Object> result = section(service.fullSearch("Amber", "books", 50, 12), "books");
        List<Map<String, Object>> items = items(result);

        assertEquals(620L, result.get("total"));
        assertEquals(52, result.get("totalPages"));
        assertEquals(12, items.size());
        assertEquals("book-0600", items.get(0).get("id"));
        assertEquals("Writer", ((Map<?, ?>) items.get(0).get("author")).get("name"));
        assertEquals(12, returnedBooks.size(), "Mongo must transfer only the requested page");
        assertFalse(returnedBooks.toString().contains("BODY_SECRET"));
        assertEquals(1, userFinds().size(), "A page resolves authors in one projected batch");
        assertFalse(userFinds().get(0).get("projection", Document.class).containsKey("password"));
        assertFalse(items.toString().contains("PRIVATE_"));
    }

    @Test void autocompleteAppliesVisibilityBeforeItsLimitAndNeverTransfersChapterBodies() {
        List<Document> books = new ArrayList<>();
        for (int i = 0; i < 20; i++) books.add(book("hidden-" + i).append("contentWarnings", List.of("ABUSE")));
        for (int i = 0; i < 5; i++) books.add(book("visible-" + i));
        mongo.getCollection("books").insertMany(books);
        clearRecordedCommands();

        List<Map<String, Object>> items = items(Map.of("items", service.autocomplete("Amber").get("books")));

        assertEquals(5, items.size());
        assertTrue(items.stream().allMatch(item -> String.valueOf(item.get("id")).startsWith("visible-")));
        assertEquals(5, returnedBooks.size());
        assertFalse(returnedBooks.toString().contains("BODY_SECRET"));
        assertEquals(1, userFinds().size());
    }

    @Test void fullAuthorSearchHasAnExactTotalAndDoesNotLoadPrivateAccountFields() {
        List<Document> users = new ArrayList<>();
        for (int i = 0; i < 620; i++) users.add(new Document("_id", String.format("author-%04d", i))
                .append("username", "Amber Author " + i).append("followers", List.of("reader"))
                .append("following", List.of("writer", "reader"))
                .append("password", "PRIVATE_HASH").append("resetPasswordToken", "PRIVATE_TOKEN"));
        mongo.getCollection("users").insertMany(users);
        clearRecordedCommands();

        Map<String, Object> result = section(service.fullSearch("Amber", "authors", 50, 12), "authors");

        assertEquals(620L, result.get("total"));
        assertEquals(12, items(result).size());
        assertEquals("author-0600", items(result).get(0).get("id"));
        assertEquals(1, items(result).get(0).get("followersCount"));
        assertEquals(2, items(result).get(0).get("followingCount"));
        assertTrue(commands.stream().filter(command -> "users".equals(command.get("find")))
                .allMatch(command -> command.containsKey("projection")), "User queries must use public projections");
        assertFalse(items(result).toString().contains("PRIVATE_"));
    }

    @Test void accountPreferenceChangesAreAppliedOnEachSearchRequest() {
        User reader = new User("Reader", "reader@example.test", "test");
        reader.setId("reader"); reader.setDateOfBirth(LocalDate.now().minusYears(25)); reader.setAllowMatureContent(true);
        mongo.save(reader);
        mongo.getCollection("books").insertOne(book("mature").append("ageRating", "MATURE_18"));
        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", reader.getEmail(), "", List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        assertEquals(1L, section(service.fullSearch("Amber", "books", 0, 12), "books").get("total"));

        reader.setAllowMatureContent(false); mongo.save(reader);
        assertEquals(0L, section(service.fullSearch("Amber", "books", 0, 12), "books").get("total"));
    }

    private Document book(String id) {
        return new Document("_id", id).append("title", "Amber Story").append("publicationStatus", "published")
                .append("authorId", "writer").append("ageRating", "ALL_AGES")
                .append("chapters", List.of(new Document("_id", "chapter").append("status", "published")
                        .append("content", "DRAFT_BODY_SECRET".repeat(500))
                        .append("publishedContent", "PUBLISHED_BODY_SECRET".repeat(500))));
    }

    private void clearRecordedCommands() { commands.clear(); returnedBooks.clear(); }
    private List<Document> userFinds() { return commands.stream().filter(command -> "users".equals(command.get("find"))).toList(); }
    @SuppressWarnings("unchecked") private static Map<String, Object> section(Map<String, Object> result, String name) {
        return (Map<String, Object>) result.get(name);
    }
    @SuppressWarnings("unchecked") private static List<Map<String, Object>> items(Map<String, Object> result) {
        return (List<Map<String, Object>>) result.get("items");
    }
}
