package com.wordweft.user.service;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.Shelf;
import com.wordweft.book.repository.*;
import com.wordweft.book.service.BookService;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.book.service.ReadingProgressService;
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
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class UserProfilePerformanceMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private UserService service;
    private final List<Document> reads = new ArrayList<>();
    private final List<Document> returned = new ArrayList<>();

    @BeforeEach void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if ("find".equals(event.getCommandName())) reads.add(Document.parse(event.getCommand().toJson()));
                    }
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (!event.getResponse().containsKey("cursor")) return;
                        Document cursor = Document.parse(event.getResponse().getDocument("cursor").toJson());
                        returned.addAll(cursor.getList("firstBatch", Document.class, List.of()));
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_profile_perf_" + UUID.randomUUID().toString().replace("-", ""));
        MongoRepositoryFactory factory = new MongoRepositoryFactory(mongo);
        UserRepository users = factory.getRepository(UserRepository.class);
        BookRepository books = factory.getRepository(BookRepository.class);
        LibraryRepository library = factory.getRepository(LibraryRepository.class);
        ContentAccessService access = new ContentAccessService(); ReflectionTestUtils.setField(access, "userRepository", users);
        BookService bookService = new BookService();
        ReflectionTestUtils.setField(bookService, "mongoTemplate", mongo);
        ReflectionTestUtils.setField(bookService, "bookRepository", books);
        ReflectionTestUtils.setField(bookService, "userRepository", users);
        ReflectionTestUtils.setField(bookService, "contentAccessService", access);
        service = new UserService();
        service.userRepository = users; service.bookRepository = books; service.libraryRepository = library;
        service.shelfRepository = factory.getRepository(ShelfRepository.class); service.bookService = bookService;
        service.contentAccessService = access;
        service.readingProgressService = new ReadingProgressService(mongo, books, factory.getRepository(ReadingProgressRepository.class), access);

        User reader = new User("Reader", "reader@example.test", "PRIVATE_HASH"); reader.setId("reader");
        reader.setDateOfBirth(LocalDate.now().minusYears(25)); reader.setFollowers(Set.of("writer")); reader.setFollowing(Set.of("writer"));
        reader.setResetPasswordToken("PRIVATE_TOKEN"); users.save(reader);
        User writer = new User("Writer", "writer@example.test", "PRIVATE_WRITER_HASH"); writer.setId("writer"); users.save(writer);
        mongo.getCollection("books").insertMany(List.of(book("own", "reader", "draft"), book("saved", "writer", "published"),
                book("restricted", "writer", "published").append("ageRating", "ADULT_21")));
        for (String id : List.of("saved", "restricted")) {
            LibraryEntry entry = new LibraryEntry(); entry.setId("entry-" + id); entry.setUserId("reader"); entry.setBookId(id);
            entry.setShelfIds(new java.util.HashSet<>(Set.of("favorites"))); library.save(entry);
        }
        Shelf shelf = new Shelf(); shelf.setId("favorites"); shelf.setUserId("reader"); shelf.setName("Favorites"); service.shelfRepository.save(shelf);
        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", reader.getEmail(), "", List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        reads.clear(); returned.clear();
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void privateProfileBatchesSavedBookMetadataAndPreservesOwnerEditingFlagsAndShelves() {
        Map<String, Object> profile = service.getUserProfile("reader");
        assertEquals("reader@example.test", profile.get("email"));
        List<?> written = (List<?>) profile.get("writtenBooks");
        assertEquals(1, written.size());
        List<?> chapters = (List<?>) ((Map<?, ?>) written.get(0)).get("chapters");
        assertEquals(2, chapters.size());
        assertEquals(true, ((Map<?, ?>) chapters.get(0)).get("hasUnpublishedChanges"));
        assertEquals("First draft title", ((Map<?, ?>) chapters.get(0)).get("title"));
        for (Object item : (List<?>) profile.get("library")) {
            Map<?, ?> shelf = (Map<?, ?>) item;
            List<?> books = (List<?>) shelf.get("books");
            assertFalse(books.stream().anyMatch(book -> "restricted".equals(((Map<?, ?>) book).get("id"))));
            if (List.of("all", "toread", "favorites").contains(shelf.get("id"))) {
                assertEquals(1, books.size());
                Map<?, ?> saved = (Map<?, ?>) books.get(0);
                assertEquals("saved", saved.get("id")); assertEquals("entry-saved", saved.get("libraryEntryId"));
                assertEquals("First released title", ((Map<?, ?>) ((List<?>) saved.get("chapters")).get(0)).get("title"));
            }
        }
        assertFalse(returned.toString().contains("BODY_SECRET"), "Profile reads must not hydrate manuscripts");
        assertTrue(reads.stream().filter(read -> "books".equals(read.get("find"))).count() <= 2, "Saved books must be fetched as one metadata batch");
        assertFalse(returned.toString().contains("PRIVATE_"), "Profile/card lookups must not load credential fields");
    }

    @Test void publicProfileAndFollowerCardsUsePublicAccountProjections() {
        Map<String, Object> profile = service.getPublicProfile("reader", "writer");
        assertEquals(true, profile.get("isFollowing"));
        assertFalse(profile.containsKey("email")); assertFalse(profile.containsKey("library"));
        List<Map<String, Object>> followers = service.getFollowersList("reader", "reader");
        assertEquals("Writer", followers.get(0).get("name")); assertEquals(true, followers.get(0).get("isFollowing"));
        assertFalse(returned.toString().contains("PRIVATE_"));
        assertTrue(reads.stream().allMatch(read -> read.containsKey("projection")));
        assertTrue(reads.stream().noneMatch(read -> "books".equals(read.get("find"))));
    }

    private Document book(String id, String author, String status) {
        return new Document("_id", id).append("title", "Story " + id).append("authorId", author).append("publicationStatus", status)
                .append("chapters", List.of(new Document("_id", "first").append("status", "published").append("title", "First draft title")
                                .append("publishedTitle", "First released title").append("wordCount", 150).append("publishedWordCount", 100)
                                .append("content", "DRAFT_BODY_SECRET".repeat(300)).append("publishedContent", "PUBLISHED_BODY_SECRET".repeat(300)),
                        new Document("_id", "draft").append("status", "draft").append("content", "HIDDEN_BODY_SECRET".repeat(300))));
    }
}
