package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.bson.Document;
import java.util.List;
import java.util.ArrayList;

@Service
public class ChapterOrganizationService {
    private final BookRepository books;
    private final MongoTemplate mongo;
    private final ChapterWriteService writes;
    public ChapterOrganizationService(BookRepository books, MongoTemplate mongo, ChapterWriteService writes) {
        this.books = books; this.mongo = mongo; this.writes = writes;
    }
    private Book owned(String authorId, String bookId) {
        Book book = books.findById(bookId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (authorId == null || !authorId.equals(book.getAuthorId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can organize chapters.");
        return book;
    }
    public Chapter duplicate(String authorId, String bookId, String chapterId) {
        Book book = owned(authorId, bookId);
        Chapter source = book.getChapters().stream().filter(c -> chapterId.equals(c.getId())).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
        Chapter copy = new Chapter();
        copy.setTitle((source.getTitle() == null ? "Untitled chapter" : source.getTitle()) + " (copy)");
        copy.setContent(source.getContent());
        copy.setContentWarnings(new ArrayList<>(source.getContentWarnings() == null ? List.of() : source.getContentWarnings()));
        copy.setDisclaimerNote(source.getDisclaimerNote()); copy.updateWordCount();
        writes.save(book, copy, true, 0);
        return copy;
    }
    public void reorder(String authorId, String bookId, List<String> chapterIds) {
        Book book = owned(authorId, bookId);
        List<Chapter> chapters = book.getChapters() == null ? List.of() : book.getChapters();
        if (chapterIds == null || chapterIds.size() != chapters.size() || new java.util.HashSet<>(chapterIds).size() != chapterIds.size()
                || !new java.util.HashSet<>(chapterIds).equals(chapters.stream().map(Chapter::getId).collect(java.util.stream.Collectors.toSet()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Include every chapter once when changing chapter order.");
        }
        if (chapters.isEmpty()) return;
        for (int i = 0; i < chapters.size(); i++) {
            Chapter c = chapters.get(i);
            if ((!"draft".equals(c.getStatus()) || c.getPublishedContent() != null || c.getPublishedAt() != null)
                    && !c.getId().equals(chapterIds.get(i))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Released and scheduled chapters must keep their chapter positions.");
            }
        }
        // Select the current stored objects in the requested order, preserving reader counters updated concurrently.
        Document ordered = new Document("$map", new Document("input", new Document("$literal", chapterIds)).append("as", "chapterId")
                .append("in", new Document("$arrayElemAt", List.of(new Document("$filter", new Document("input", "$chapters").append("as", "chapter")
                        .append("cond", new Document("$eq", List.of("$$chapter._id", "$$chapterId")))), 0))));
        if (mongo.updateFirst(ChapterWriteService.snapshotQuery(book), AggregationUpdate.from(List.of(context -> new Document("$set", new Document("chapters", ordered)))), Book.class).getMatchedCount() != 1) throw ChapterWriteService.conflict();
    }
}
