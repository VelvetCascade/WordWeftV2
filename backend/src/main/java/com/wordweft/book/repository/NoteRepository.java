package com.wordweft.book.repository;

import com.wordweft.book.model.Note;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NoteRepository extends MongoRepository<Note, String> {
    List<Note> findByBookId(String bookId);
    void deleteByBookId(String bookId);

    List<Note> findByChapterId(String chapterId);
}
