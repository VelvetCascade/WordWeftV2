package com.wordweft.book.repository;

import com.wordweft.book.model.Shelf;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ShelfRepository extends MongoRepository<Shelf, String> {
    List<Shelf> findByUserId(String userId);
}
