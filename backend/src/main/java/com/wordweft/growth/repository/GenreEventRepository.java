package com.wordweft.growth.repository;

import com.wordweft.growth.model.GenreEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GenreEventRepository extends MongoRepository<GenreEvent, String> {
    List<GenreEvent> findByStatusOrderByStartAtAsc(String status);
}
