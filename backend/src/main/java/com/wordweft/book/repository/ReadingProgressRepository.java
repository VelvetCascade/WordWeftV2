
package com.wordweft.book.repository;

import com.wordweft.book.model.ReadingProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface ReadingProgressRepository extends MongoRepository<ReadingProgress, String> {
    Optional<ReadingProgress> findByUserIdAndBookId(String userId, String bookId);
    List<ReadingProgress> findByUserId(String userId);
    List<ReadingProgress> findByBookIdIn(Collection<String> bookIds);
    void deleteByUserIdAndBookId(String userId, String bookId);
    void deleteByBookId(String bookId);
}
