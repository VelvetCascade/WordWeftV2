package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Compare and write manuscript fields only; concurrent reader counters are never replaced. */
@Service
public class ChapterWriteService {
    private final MongoTemplate mongo;
    public ChapterWriteService(MongoTemplate mongo) { this.mongo = mongo; }

    public static void requireRevision(Chapter chapter, Long expectedRevision) {
        if (expectedRevision != null && expectedRevision != chapter.getEditRevision()) throw conflict();
    }

    public void save(Book book, Chapter chapter, boolean isNew, long previousRevision) {
        Query query = Query.query(Criteria.where("_id").is(book.getId()).and("authorId").is(book.getAuthorId()));
        Update update;
        if (isNew) {
            query.addCriteria(Criteria.where("chapters._id").ne(chapter.getId()));
            update = new Update().push("chapters", chapter);
        } else {
            Criteria revision = previousRevision == 0
                    ? new Criteria().orOperator(Criteria.where("editRevision").is(0), Criteria.where("editRevision").exists(false))
                    : Criteria.where("editRevision").is(previousRevision);
            query.addCriteria(Criteria.where("chapters").elemMatch(
                    new Criteria().andOperator(Criteria.where("_id").is(chapter.getId()), revision)));
            update = draftUpdate("chapters.$.", chapter);
        }
        if (mongo.updateFirst(query, update, Book.class).getMatchedCount() != 1) throw conflict();
    }

    static Update draftUpdate(String prefix, Chapter c) {
        return new Update().set(prefix + "title", c.getTitle()).set(prefix + "content", c.getContent())
                .set(prefix + "wordCount", c.getWordCount()).set(prefix + "contentWarnings", c.getContentWarnings())
                .set(prefix + "disclaimerNote", c.getDisclaimerNote()).set(prefix + "editRevision", c.getEditRevision())
                .set(prefix + "status", c.getStatus()).set(prefix + "scheduledAt", c.getScheduledAt())
                .set(prefix + "publishedTitle", c.getPublishedTitle()).set(prefix + "publishedContent", c.getPublishedContent())
                .set(prefix + "publishedWordCount", c.getPublishedWordCount())
                .set(prefix + "publishedContentWarnings", c.getPublishedContentWarnings())
                .set(prefix + "publishedDisclaimerNote", c.getPublishedDisclaimerNote());
    }

    private static Criteria snapshotField(String path, Object value, Object legacyDefault) {
        Object snapshot = value instanceof java.util.List<?> list ? new java.util.ArrayList<>(list) : value;
        if (java.util.Objects.equals(snapshot, legacyDefault)) {
            return new Criteria().orOperator(Criteria.where(path).is(snapshot), Criteria.where(path).is(null));
        }
        return Criteria.where(path).is(snapshot);
    }

    /** Frozen values, including legacy defaults, survive subsequent mutation of the loaded model. */
    public static Query snapshotQuery(Book book) {
        var conditions = new java.util.ArrayList<Criteria>();
        conditions.add(Criteria.where("_id").is(book.getId()).and("authorId").is(book.getAuthorId()).and("chapters").size(book.getChapters().size()));
        conditions.add(snapshotField("publicationStatus", book.getPublicationStatus(), "draft"));
        conditions.add(snapshotField("ageRating", book.getAgeRating(), com.wordweft.book.model.AgeRating.ALL_AGES));
        conditions.add(snapshotField("isMature", book.isMature(), false));
        conditions.add(snapshotField("contentWarnings", book.getContentWarnings(), java.util.List.of()));
        for (int i = 0; i < book.getChapters().size(); i++) {
            Chapter c = book.getChapters().get(i); String prefix = "chapters." + i + ".";
            conditions.add(Criteria.where(prefix + "_id").is(c.getId()).and(prefix + "title").is(c.getTitle())
                    .and(prefix + "content").is(c.getContent()).and(prefix + "scheduledAt").is(c.getScheduledAt())
                    .and(prefix + "disclaimerNote").is(c.getDisclaimerNote()));
            conditions.add(snapshotField(prefix + "status", c.getStatus(), "draft"));
            conditions.add(snapshotField(prefix + "contentWarnings", c.getContentWarnings(), java.util.List.of()));
            conditions.add(snapshotField(prefix + "editRevision", c.getEditRevision(), 0L));
        }
        return Query.query(new Criteria().andOperator(conditions));
    }

    public void restore(Book book, Query snapshot) {
        Update update = new Update();
        for (int i = 0; i < book.getChapters().size(); i++) {
            Chapter c = book.getChapters().get(i); String prefix = "chapters." + i + ".";
            draftUpdate(prefix, c).getUpdateObject().get("$set", org.bson.Document.class).forEach(update::set);
            update.set(prefix + "publishedAt", c.getPublishedAt());
        }
        if (mongo.updateFirst(snapshot, update, Book.class).getMatchedCount() != 1) throw conflict();
    }

    public void updateMetadata(Book book, Query snapshot) {
        Update update = new Update().set("title", book.getTitle()).set("description", book.getDescription())
                .set("summary", book.getSummary()).set("coverUrl", book.getCoverUrl()).set("coverFileId", book.getCoverFileId())
                .set("genres", book.getGenres()).set("category", book.getCategory()).set("readingStatus", book.getReadingStatus())
                .set("ageRating", book.getAgeRating()).set("isMature", book.isMature()).set("contentWarnings", book.getContentWarnings())
                .set("customDisclaimer", book.getCustomDisclaimer()).set("isAIGenerated", book.isAIGenerated())
                .set("lastUpdatedAt", book.getLastUpdatedAt());
        if (mongo.updateFirst(snapshot, update, Book.class).getMatchedCount() != 1) throw conflict();
    }

    public void deleteChapter(Book book, String chapterId, Query snapshot) {
        if (mongo.updateFirst(snapshot, new Update().pull("chapters", new org.bson.Document("_id", chapterId)), Book.class).getMatchedCount() != 1) throw conflict();
    }

    public void toggleChapterLike(String bookId, String chapterId, String userId, boolean remove) {
        Query query = Query.query(Criteria.where("_id").is(bookId).and("chapters._id").is(chapterId));
        Update update = remove ? new Update().pull("chapters.$.likes", userId) : new Update().addToSet("chapters.$.likes", userId);
        if (mongo.updateFirst(query, update, Book.class).getMatchedCount() != 1) throw conflict();
    }

    public static ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "A newer draft was saved in another session. Your text is still here. Compare both drafts before saving again.");
    }
}
