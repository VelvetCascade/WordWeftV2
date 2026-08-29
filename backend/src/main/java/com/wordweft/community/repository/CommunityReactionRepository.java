package com.wordweft.community.repository;

import com.wordweft.community.model.CommunityEnums.ReactionTarget;
import com.wordweft.community.model.CommunityEnums.ReactionType;
import com.wordweft.community.model.CommunityReaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityReactionRepository extends MongoRepository<CommunityReaction, String> {
    Optional<CommunityReaction> findByUserIdAndTargetTypeAndTargetIdAndReactionType(String userId, ReactionTarget targetType, String targetId, ReactionType reactionType);
    boolean existsByUserIdAndTargetTypeAndTargetIdAndReactionType(String userId, ReactionTarget targetType, String targetId, ReactionType reactionType);
    List<CommunityReaction> findByUserIdAndTargetTypeAndReactionType(String userId, ReactionTarget targetType, ReactionType reactionType);
    void deleteByUserIdAndTargetTypeAndTargetIdAndReactionType(String userId, ReactionTarget targetType, String targetId, ReactionType reactionType);
    List<CommunityReaction> findByUserIdAndTargetTypeAndTargetIdIn(String userId, ReactionTarget targetType, java.util.Collection<String> targetIds);
}
