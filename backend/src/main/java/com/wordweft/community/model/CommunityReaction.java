package com.wordweft.community.model;

import com.wordweft.community.model.CommunityEnums.ReactionTarget;
import com.wordweft.community.model.CommunityEnums.ReactionType;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "community_reactions")
@CompoundIndex(name = "unique_community_reaction", def = "{'userId': 1, 'targetType': 1, 'targetId': 1, 'reactionType': 1}", unique = true)
public class CommunityReaction {
    @Id private String id;
    @Indexed private String userId;
    private ReactionTarget targetType;
    @Indexed private String targetId;
    private ReactionType reactionType;
    private Instant createdAt = Instant.now();

    public CommunityReaction(String userId, ReactionTarget targetType, String targetId, ReactionType reactionType) {
        this.userId = userId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reactionType = reactionType;
    }
}
