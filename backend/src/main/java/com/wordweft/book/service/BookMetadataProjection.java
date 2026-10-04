package com.wordweft.book.service;

import org.bson.Document;
import org.springframework.data.mongodb.MongoExpression;
import org.springframework.data.mongodb.core.query.Query;

import java.util.Arrays;
import java.util.List;

/**
 * Read-only book metadata for catalogs, portfolios and saved shelves. Never save these books.
 * Chapter bodies are replaced in Mongo by equality markers, so the existing released-snapshot
 * projection and owner change flag remain correct without transferring either manuscript.
 */
public final class BookMetadataProjection {
    private static final String[] BOOK_FIELDS = {
            "_id", "title", "authorId", "coverUrl", "coverFileId", "rating", "reviewsCount",
            "viewCount", "readCount", "readCountLast7Days", "viewCountLast7Days", "genres", "category",
            "tags", "summary", "description", "readingStatus", "publicationStatus", "publishedDate",
            "lastUpdatedAt", "createdAt", "ageRating", "contentWarnings", "customDisclaimer", "isMature", "isAIGenerated"
    };

    private BookMetadataProjection() {}

    public static Query apply(Query query) {
        return apply(query, true);
    }

    public static Query apply(Query query, boolean includeChapterLikes) {
        query.fields().include(BOOK_FIELDS)
                .project(MongoExpression.create(chapters(includeChapterLikes).toJson())).as("chapters");
        return query;
    }

    /** Native projection for aggregation pipelines; field names already match Mongo storage. */
    public static Document fields() {
        return fields(true);
    }

    public static Document fields(boolean includeChapterLikes) {
        Document fields = new Document();
        for (String field : BOOK_FIELDS) fields.put(field, 1);
        return fields.append("chapters", chapters(includeChapterLikes));
    }

    private static Document chapters(boolean includeChapterLikes) {
        Object snapshot = op("$ne", ifNull("$$chapter.publishedContent", null), null);
        Object publicContent = ifNull(choose(snapshot, "$$chapter.publishedContent", "$$chapter.content"), "");
        Document metadata = new Document();
        metadata.put("_id", ifNull("$$chapter._id", "$$chapter.id"));
        for (String field : List.of("title", "wordCount", "status", "editRevision", "scheduledAt", "publishedAt",
                "viewCount", "commentCount", "contentWarnings", "disclaimerNote")) {
            metadata.put(field, "$$chapter." + field);
        }
        if (includeChapterLikes) metadata.put("likes", "$$chapter.likes");
        metadata.put("publishedTitle", ifNull(choose(snapshot, "$$chapter.publishedTitle", "$$chapter.title"), ""));
        metadata.put("publishedWordCount", ifNull(choose(snapshot, "$$chapter.publishedWordCount", "$$chapter.wordCount"),
                ifNull("$$chapter.wordCount", 0)));
        metadata.put("publishedContentWarnings", ifNull(choose(snapshot,
                "$$chapter.publishedContentWarnings", "$$chapter.contentWarnings"), List.of()));
        metadata.put("publishedDisclaimerNote", choose(snapshot,
                "$$chapter.publishedDisclaimerNote", "$$chapter.disclaimerNote"));
        // An empty non-null published marker preserves PublishedChapterView's snapshot detection.
        metadata.put("publishedContent", "");
        metadata.put("content", choose(op("$eq", ifNull("$$chapter.content", null), publicContent), "", "CHANGED"));
        return new Document("$map", new Document("input", ifNull("$chapters", List.of()))
                .append("as", "chapter").append("in", metadata));
    }

    private static Document ifNull(Object value, Object fallback) { return op("$ifNull", value, fallback); }
    private static Document choose(Object condition, Object yes, Object no) { return op("$cond", condition, yes, no); }
    private static Document op(String operator, Object... values) { return new Document(operator, Arrays.asList(values)); }
}
