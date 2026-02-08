
package com.wordweft.book.repository;

import com.wordweft.book.model.LibraryEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface LibraryRepository extends MongoRepository<LibraryEntry, String> {
    List<LibraryEntry> findByUserId(String userId);
    Optional<LibraryEntry> findByUserIdAndBookId(String userId, String bookId);
    void deleteByUserIdAndBookId(String userId, String bookId);
}
