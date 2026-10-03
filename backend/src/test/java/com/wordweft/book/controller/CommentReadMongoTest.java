package com.wordweft.book.controller;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import com.wordweft.book.model.Comment;
import com.wordweft.book.repository.CommentRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "WORDWEFT_TEST_MONGO_URI", matches = ".+")
class CommentReadMongoTest {
    private MongoClient client;
    private MongoTemplate mongo;
    private CommentController controller;
    private final AtomicInteger authorReads = new AtomicInteger();
    private final AtomicBoolean privateData = new AtomicBoolean();

    @BeforeEach void setUp() {
        client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(System.getenv("WORDWEFT_TEST_MONGO_URI")))
                .addCommandListener(new CommandListener() {
                    @Override public void commandStarted(CommandStartedEvent event) {
                        if ("find".equals(event.getCommandName()) && "users".equals(event.getCommand().getString("find").getValue())) authorReads.incrementAndGet();
                    }
                    @Override public void commandSucceeded(CommandSucceededEvent event) {
                        if (List.of("find", "getMore").contains(event.getCommandName()) && event.getResponse().toJson().contains("PRIVATE_DATA_MARKER")) privateData.set(true);
                    }
                }).build());
        mongo = new MongoTemplate(client, "wordweft_comments_test_" + UUID.randomUUID().toString().replace("-", ""));
        var repositories = new MongoRepositoryFactory(mongo);
        controller = new CommentController();
        controller.userRepository = repositories.getRepository(UserRepository.class);
        controller.commentRepository = repositories.getRepository(CommentRepository.class);
        for (int i = 0; i < 3; i++) {
            User author = new User(); author.setId("writer-" + i); author.setUsername("Writer " + i);
            author.setPassword("PRIVATE_DATA_MARKER"); author.setResetPasswordToken("PRIVATE_DATA_MARKER");
            author.setFollowing(Set.of("PRIVATE_DATA_MARKER")); mongo.save(author);
        }
        for (int i = 0; i < 40; i++) {
            Comment comment = new Comment(); comment.setId("comment-" + i); comment.setBookId("book");
            comment.setChapterId("chapter"); comment.setUserId("writer-" + i % 3);
            comment.setContent("Comment " + i); comment.setCreatedAt(LocalDateTime.now().minusMinutes(i));
            if (i > 0) comment.setParentId("comment-0");
            comment.setParagraphIndex(i); mongo.save(comment);
        }
        authorReads.set(0); privateData.set(false);
    }

    @AfterEach void tearDown() { if (mongo != null) mongo.getDb().drop(); if (client != null) client.close(); }

    @Test void commentsKeepOrderThreadsAndAuthorsWithoutRepeatedPrivateProfileReads() {
        var response = controller.getComments("book", "chapter");
        List<?> comments = (List<?>) response.getBody();
        assertNotNull(comments); assertEquals(40, comments.size());
        Map<?, ?> first = (Map<?, ?>) comments.get(0), second = (Map<?, ?>) comments.get(1);
        assertEquals("Comment 0", first.get("content"));
        assertEquals("Writer 0", ((Map<?, ?>) first.get("user")).get("name"));
        assertEquals("comment-0", second.get("parentId")); assertEquals(1, second.get("paragraphIndex"));
        assertEquals("Comment 39", ((Map<?, ?>) comments.get(39)).get("content"));
        assertEquals(1, authorReads.get(), "Author work must be bounded by one batch rather than one query per comment");
        assertFalse(privateData.get(), "Comment metadata must not load credentials, reset tokens or social graphs");
    }

    @Test void deletedAuthorsRetainCommentsWithoutExposingOtherProfiles() {
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), User.class);
        authorReads.set(0);
        List<?> comments = (List<?>) controller.getComments("book", "chapter").getBody();
        assertNotNull(comments); assertEquals(40, comments.size());
        Map<?, ?> author = (Map<?, ?>) ((Map<?, ?>) comments.get(0)).get("user");
        assertNull(author.get("id")); assertNull(author.get("name")); assertNull(author.get("avatarUrl"));
        assertEquals(1, authorReads.get());
    }

    @Test void emptyAndLegacyAnonymousThreadsNeedNoAuthorQueries() {
        assertEquals(List.of(), controller.getComments("book", "empty-chapter").getBody());
        mongo.updateMulti(new org.springframework.data.mongodb.core.query.Query(),
                new org.springframework.data.mongodb.core.query.Update().unset("userId"), Comment.class);
        List<?> comments = (List<?>) controller.getComments("book", "chapter").getBody();
        assertNotNull(comments); assertEquals(40, comments.size());
        assertNull(((Map<?, ?>) ((Map<?, ?>) comments.get(0)).get("user")).get("name"));
        assertEquals(0, authorReads.get());
    }
}
