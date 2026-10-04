package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import java.util.List;

/** Activity writes must never replace the document that also stores the manuscript. */
@Service
public class BookActivityCounters {
    private final MongoTemplate mongo;
    public BookActivityCounters(MongoTemplate mongo) { this.mongo = mongo; }

    public void readerOpened(String bookId, String chapterId) {
        incrementChapter(bookId, chapterId, "viewCount", true);
    }
    public void commentAdded(String bookId, String chapterId) {
        incrementChapter(bookId, chapterId, "commentCount", false);
    }
    public void reviewsChanged(String bookId, int count, double rating) {
        mongo.updateFirst(Query.query(Criteria.where("_id").is(bookId)),
                new Update().set("reviewsCount", count).set("rating", rating), Book.class);
    }
    private Document increment(String field) {
        return new Document("$add", List.of(new Document("$ifNull", List.of(field, 0)), 1));
    }
    private void incrementChapter(String bookId, String chapterId, String counter, boolean recentView) {
        Document changedChapter = new Document("$mergeObjects", List.of("$$chapter",
                new Document(counter, increment("$$chapter." + counter))));
        Document chapterMap = new Document("$map", new Document("input",
                new Document("$ifNull", List.of("$chapters", List.of())))
                .append("as", "chapter").append("in", new Document("$cond", List.of(
                        new Document("$eq", List.of("$$chapter._id", chapterId)), changedChapter, "$$chapter"))));
        Document fields = new Document("chapters", chapterMap);
        if (recentView) fields.append("viewCountLast7Days", increment("$viewCountLast7Days"));
        mongo.updateFirst(Query.query(Criteria.where("_id").is(bookId).and("chapters._id").is(chapterId)),
                AggregationUpdate.from(List.of(context -> new Document("$set", fields))), Book.class);
    }
}
