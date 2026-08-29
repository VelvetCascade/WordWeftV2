package com.wordweft.community.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "community_moderation_events")
public class CommunityModerationEvent {
    @Id private String id;
    private String actorId;
    private String targetType;
    private String targetId;
    private String action;
    private String reason;
    private Instant createdAt = Instant.now();
}
