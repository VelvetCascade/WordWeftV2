package com.wordweft.security.services;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class UserDetailsProjectionMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private UserDetailsServiceImpl service;
    private BCryptPasswordEncoder encoder;
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
        mongo = new MongoTemplate(client, "wordweft_auth_details_" + UUID.randomUUID().toString().replace("-", ""));
        encoder = new BCryptPasswordEncoder(4);
        UserRepository users = new MongoRepositoryFactory(mongo).getRepository(UserRepository.class);
        service = new UserDetailsServiceImpl(); ReflectionTestUtils.setField(service, "userRepository", users);
        User reader = new User("Reader", "reader@example.test", encoder.encode("original-password")); reader.setId("reader");
        reader.setRoles(Set.of("ROLE_USER", "ROLE_ADMIN")); reader.setResetPasswordToken("PRIVATE_TOKEN");
        reader.setBio("PRIVATE_PROFILE"); reader.setFollowers(Set.of("PRIVATE_GRAPH_MEMBER")); users.save(reader);
        reads.clear(); returned.clear();
    }

    @AfterEach void tearDown() {
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void authenticatedRequestsLoadOnlyIdentityPasswordAndFreshRoles() {
        UserDetailsImpl initial = (UserDetailsImpl) service.loadUserByUsername("reader@example.test");
        assertEquals("reader", initial.getId()); assertEquals("Reader", initial.getUsername());
        assertTrue(encoder.matches("original-password", initial.getPassword()));
        assertEquals(Set.of("ROLE_USER", "ROLE_ADMIN"), authorities(initial));
        assertFalse(returned.toString().contains("PRIVATE_"));
        assertTrue(reads.stream().allMatch(read -> read.containsKey("projection")));

        mongo.getCollection("users").updateOne(new Document("_id", "reader"), new Document("$set",
                new Document("password", encoder.encode("changed-password")).append("roles", List.of("ROLE_USER"))));
        UserDetailsImpl refreshed = (UserDetailsImpl) service.loadUserByUsername("Reader");
        assertEquals("reader", refreshed.getId());
        assertEquals(Set.of("ROLE_USER"), authorities(refreshed));
        assertTrue(encoder.matches("changed-password", refreshed.getPassword()));
        assertFalse(encoder.matches("original-password", refreshed.getPassword()));
        assertFalse(returned.toString().contains("PRIVATE_"));
    }

    @Test void emailLookupKeepsPrecedenceAndUnknownUsersStillFailAuthentication() {
        mongo.getCollection("users").insertOne(new Document("_id", "email-owner").append("username", "Other")
                .append("email", "Reader").append("password", encoder.encode("other-password")).append("roles", List.of("ROLE_USER")));
        UserDetailsImpl selected = (UserDetailsImpl) service.loadUserByUsername("Reader");
        assertEquals("email-owner", selected.getId());
        assertEquals(new Document("email", "Reader"), reads.get(0).get("filter"));
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("missing"));
        assertFalse(returned.toString().contains("PRIVATE_"));
    }

    private Set<String> authorities(UserDetailsImpl user) {
        return user.getAuthorities().stream().map(authority -> authority.getAuthority()).collect(Collectors.toSet());
    }
}
