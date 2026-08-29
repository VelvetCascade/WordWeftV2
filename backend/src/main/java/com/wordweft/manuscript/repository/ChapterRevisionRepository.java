package com.wordweft.manuscript.repository;

import com.wordweft.manuscript.model.ChapterRevision;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ChapterRevisionRepository extends MongoRepository<ChapterRevision, String> {
    Optional<ChapterRevision> findFirstByChapterIdOrderByCreatedAtDesc(String chapterId);
    List<ChapterRevision> findByChapterIdOrderByCreatedAtDesc(String chapterId);
    void deleteByBookId(String bookId);
}
