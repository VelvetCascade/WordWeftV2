package com.wordweft.growth.repository;

import com.wordweft.growth.model.ReadingChallengeEnrollment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReadingChallengeEnrollmentRepository extends MongoRepository<ReadingChallengeEnrollment, String> {
    List<ReadingChallengeEnrollment> findByUserId(String userId);
    Optional<ReadingChallengeEnrollment> findByUserIdAndChallengeId(String userId, String challengeId);
}
