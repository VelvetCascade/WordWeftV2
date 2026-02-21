
package com.wordweft.book.repository;

import com.wordweft.book.model.Feedback;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface FeedbackRepository extends MongoRepository<Feedback, String> {
    List<Feedback> findByUserId(String userId);

    long countByUserIdAndSubmittedAtAfter(String userId, Instant after);
}
