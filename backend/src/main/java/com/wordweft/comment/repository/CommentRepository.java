package com.wordweft.comment.repository;

import com.wordweft.comment.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CommentRepository extends MongoRepository<Comment, String> {
    List<Comment> findByChapterId(String chapterId);

    List<Comment> findByBookId(String bookId);

    void deleteByBookId(String bookId);
}
