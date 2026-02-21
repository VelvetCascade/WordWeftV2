package com.wordweft.book.repository;

import com.wordweft.book.model.Scene;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SceneRepository extends MongoRepository<Scene, String> {
    List<Scene> findByBookId(String bookId);

    List<Scene> findByChapterId(String chapterId);
}
