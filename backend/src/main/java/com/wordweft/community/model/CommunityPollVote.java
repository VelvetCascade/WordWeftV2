package com.wordweft.community.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "community_poll_votes")
@CompoundIndexes({
        @CompoundIndex(name = "unique_poll_voter", def = "{'userId': 1, 'postId': 1}", unique = true),
        @CompoundIndex(name = "poll_option_totals", def = "{'postId': 1, 'optionId': 1}")
})
public class CommunityPollVote {
    @Id private String id;
    @Indexed private String userId;
    @Indexed private String postId;
    private String optionId;
    private Instant createdAt = Instant.now();

    public CommunityPollVote(String userId, String postId, String optionId) {
        this.userId = userId;
        this.postId = postId;
        this.optionId = optionId;
    }
}
