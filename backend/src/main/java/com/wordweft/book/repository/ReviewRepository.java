
package com.wordweft.book.repository;

import com.wordweft.book.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByBookId(String bookId);
    void deleteByUserIdAndBookId(String userId, String bookId);
}
