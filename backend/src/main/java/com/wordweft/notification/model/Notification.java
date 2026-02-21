
package com.wordweft.notification.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    @Indexed
    private String userId; // receiver

    private String actorId; // who triggered (nullable for system)

    // NOTIFICATION TYPES:
    // NEW_FOLLOWER, NEW_COMMENT, COMMENT_REPLY,
    // AUTHOR_NEW_CHAPTER, AUTHOR_NEW_STORY, BOOK_UPDATE,
    // SYSTEM_UPDATE
    private String type;

    // ENTITY TYPES: USER, BOOK, CHAPTER, SYSTEM
    private String entityType;

    private String entityId;

    private String message;

    @Indexed
    private boolean read = false;

    private Instant createdAt = Instant.now();

    // Extra context: actorName, actorAvatar, bookTitle, coverUrl, chapterTitle,
    // etc.
    private Map<String, String> metadata = new HashMap<>();

    public Notification(String userId, String actorId, String type, String entityType,
            String entityId, String message, Map<String, String> metadata) {
        this.userId = userId;
        this.actorId = actorId;
        this.type = type;
        this.entityType = entityType;
        this.entityId = entityId;
        this.message = message;
        this.metadata = metadata != null ? metadata : new HashMap<>();
        this.createdAt = Instant.now();
    }
}
