package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Character;
import com.wordweft.book.model.Note;
import com.wordweft.book.model.Scene;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class WriterQuickstartService {
    private final MongoTemplate mongo;
    public WriterQuickstartService(MongoTemplate mongo) { this.mongo = mongo; }
    public record Progress(boolean characters, boolean mentions, boolean atmosphere, boolean planning) {}
    public Progress get(String authorId) {
        if (authorId == null || authorId.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to view your writer guide.");
        Query owned = Query.query(Criteria.where("authorId").is(authorId)); owned.fields().include("_id");
        List<String> bookIds = mongo.find(owned, Book.class).stream().map(Book::getId).toList();
        if (bookIds.isEmpty()) return new Progress(false, false, false, false);
        boolean characters = mongo.exists(Query.query(Criteria.where("bookId").in(bookIds)), Character.class);
        // Exists queries return booleans, so private manuscripts never leave Mongo for these checks.
        boolean mentions = mongo.exists(Query.query(Criteria.where("authorId").is(authorId).and("chapters.content")
                .regex("<span\\b[^>]*\\bdata-type\\s*=\\s*[\"']mention[\"']", "i")), Book.class);
        boolean atmosphere = mongo.exists(Query.query(Criteria.where("authorId").is(authorId).and("chapters.content")
                .regex("<div\\b[^>]*\\bdata-mood\\s*=\\s*[\"'][^\"']+[\"']", "i")), Book.class);
        boolean planning = mongo.exists(Query.query(Criteria.where("bookId").in(bookIds)), Scene.class)
                || mongo.exists(Query.query(Criteria.where("bookId").in(bookIds)), Note.class);
        return new Progress(characters, mentions, atmosphere, planning);
    }
}
