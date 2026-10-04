package com.wordweft.book.repository;

import com.wordweft.book.model.PassageBookmark;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PassageBookmarkRepository extends MongoRepository<PassageBookmark, String> {
    List<PassageBookmark> findByUserIdAndBookIdOrderByUpdatedAtDesc(String userId, String bookId);
}
