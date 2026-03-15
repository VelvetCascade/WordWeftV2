
package com.wordweft.book.repository;

import com.wordweft.book.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CommentRepository extends MongoRepository<Comment, String> {
    List<Comment> findByChapterIdOrderByCreatedAtDesc(String chapterId);
    void deleteByUserIdAndBookId(String userId, String bookId); // Cleanup
    void deleteByBookId(String bookId);
}
