package com.wordweft.book.repository;

import com.wordweft.book.model.StoryElement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StoryElementRepository extends MongoRepository<StoryElement, String> {
    List<StoryElement> findByBookId(String bookId);
    List<StoryElement> findByBookIdAndNameRegexIgnoreCase(String bookId, String regex);
    Optional<StoryElement> findByBookIdAndNameIgnoreCase(String bookId, String name);
}
