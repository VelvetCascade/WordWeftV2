package com.wordweft.community.repository;

import com.wordweft.community.model.CommunityPollVote;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface CommunityPollVoteRepository extends MongoRepository<CommunityPollVote, String> {
    Optional<CommunityPollVote> findByUserIdAndPostId(String userId, String postId);
    long countByPostIdAndOptionId(String postId, String optionId);
    long countByUserIdAndCreatedAtAfter(String userId, Instant after);
    java.util.List<CommunityPollVote> findByUserIdAndPostIdIn(String userId, java.util.Collection<String> postIds);
}
