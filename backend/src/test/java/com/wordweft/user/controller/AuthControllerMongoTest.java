package com.wordweft.user.controller;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.wordweft.user.dto.AuthDtos.ResetPasswordRequest;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class AuthControllerMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private UserRepository users;
    private AuthController controller;
    private BCryptPasswordEncoder encoder;
    private final List<Document> reads = new ArrayList<>();

    @BeforeEach void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if ("find".equals(event.getCommandName())) reads.add(Document.parse(event.getCommand().toJson()));
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_auth_perf_" + UUID.randomUUID().toString().replace("-", ""));
        users = new MongoRepositoryFactory(mongo).getRepository(UserRepository.class);
        encoder = new BCryptPasswordEncoder(4);
        controller = new AuthController();
        ReflectionTestUtils.setField(controller, "userRepository", users);
        ReflectionTestUtils.setField(controller, "encoder", encoder);
        save("other", "other-test-token", Instant.now().plusSeconds(600));
        save("target", "target-test-token", Instant.now().plusSeconds(600));
        reads.clear();
    }

    @AfterEach void tearDown() {
        if (mongo != null) mongo.getDb().drop();
        if (client != null) client.close();
    }

    @Test void resetLooksUpTheExactTokenAndChangesOnlyItsAccount() {
        var response = controller.resetPassword(request("target-test-token", "new-password"));
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, reads.size());
        assertEquals(new Document("resetPasswordToken", "target-test-token"), reads.get(0).get("filter"));
        User target = users.findById("target").orElseThrow();
        assertTrue(encoder.matches("new-password", target.getPassword()));
        assertNull(target.getResetPasswordToken());
        assertNull(target.getResetPasswordTokenExpiry());
        assertEquals(1, target.getPreviousPasswords().size());
        assertTrue(encoder.matches("original-password", users.findById("other").orElseThrow().getPassword()));
    }

    @Test void expiredMissingAndRecentlyUsedTokensKeepTheExistingResetRules() {
        User target = users.findById("target").orElseThrow();
        target.setResetPasswordTokenExpiry(Instant.now().minusSeconds(1)); users.save(target);
        assertEquals(400, controller.resetPassword(request("target-test-token", "new-password")).getStatusCode().value());
        assertEquals(400, controller.resetPassword(request("missing-test-token", "new-password")).getStatusCode().value());
        target.setResetPasswordTokenExpiry(Instant.now().plusSeconds(600));
        target.setPreviousPasswords(new ArrayList<>(List.of(encoder.encode("previous-password")))); users.save(target);
        assertEquals(400, controller.resetPassword(request("target-test-token", "original-password")).getStatusCode().value());
        assertEquals(400, controller.resetPassword(request("target-test-token", "previous-password")).getStatusCode().value());
        assertTrue(encoder.matches("original-password", users.findById("target").orElseThrow().getPassword()));
    }

    private void save(String id, String token, Instant expiry) {
        User user = new User(id, id + "@example.test", encoder.encode("original-password"));
        user.setId(id); user.setResetPasswordToken(token); user.setResetPasswordTokenExpiry(expiry); users.save(user);
    }
    private ResetPasswordRequest request(String token, String password) {
        ResetPasswordRequest request = new ResetPasswordRequest(); request.setToken(token); request.setNewPassword(password); return request;
    }
}
