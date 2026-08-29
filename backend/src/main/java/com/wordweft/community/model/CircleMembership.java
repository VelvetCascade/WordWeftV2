package com.wordweft.community.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "community_circle_memberships")
@CompoundIndex(name = "unique_circle_member", def = "{'userId': 1, 'circleId': 1}", unique = true)
public class CircleMembership {
    @Id private String id;
    @Indexed private String userId;
    @Indexed private String circleId;
    private Instant joinedAt = Instant.now();

    public CircleMembership(String userId, String circleId) {
        this.userId = userId;
        this.circleId = circleId;
    }
}
