package com.wordweft.book.repository;
import com.wordweft.book.model.StoryBibleEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface StoryBibleRepository extends MongoRepository<StoryBibleEntry, String> {
    List<StoryBibleEntry> findByBookId(String bookId);
    void deleteByBookId(String bookId);
}
