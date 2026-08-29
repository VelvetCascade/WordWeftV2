package com.wordweft.analytics.repository;

import com.wordweft.analytics.model.ChapterReadEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface ChapterReadEventRepository extends MongoRepository<ChapterReadEvent, String> {
    List<ChapterReadEvent> findByBookIdInAndOccurredAtBetween(
            Collection<String> bookIds, Instant from, Instant to);

    List<ChapterReadEvent> findByBookIdAndOccurredAtBetween(
            String bookId, Instant from, Instant to);
}
