package com.wordweft.community.repository;

import com.wordweft.community.model.CircleMembership;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CircleMembershipRepository extends MongoRepository<CircleMembership, String> {
    boolean existsByUserIdAndCircleId(String userId, String circleId);
    Optional<CircleMembership> findByUserIdAndCircleId(String userId, String circleId);
    List<CircleMembership> findByUserId(String userId);
    long countByCircleId(String circleId);
    void deleteByUserIdAndCircleId(String userId, String circleId);
}
