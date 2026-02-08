
package com.wordweft.book.repository;

import com.wordweft.book.model.ReadingProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ReadingProgressRepository extends MongoRepository<ReadingProgress, String> {
    Optional<ReadingProgress> findByUserIdAndBookId(String userId, String bookId);
    List<ReadingProgress> findByUserId(String userId);
    void deleteByUserIdAndBookId(String userId, String bookId);
}
