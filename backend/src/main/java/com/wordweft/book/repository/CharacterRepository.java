package com.wordweft.book.repository;

import com.wordweft.book.model.Character;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CharacterRepository extends MongoRepository<Character, String> {
    List<Character> findByBookId(String bookId);
    void deleteByBookId(String bookId);
}
