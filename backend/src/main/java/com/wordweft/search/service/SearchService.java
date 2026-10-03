package com.wordweft.search.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.user.model.User;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SearchService {
    @Autowired private MongoTemplate mongoTemplate;
    @Autowired private ContentAccessService contentAccessService;

    private static final String BOOKS_INDEX = "booksSearchIndex";
    private static final String USERS_INDEX = "userSearchIndex";
    private static final String[] BOOK_RESULT_FIELDS = {
            "title", "coverUrl", "genres", "tags", "summary", "description", "rating", "reviewsCount",
            "readingStatus", "authorId", "publishedDate"
    };

    public Map<String, Object> autocomplete(String query) {
        // Preferences belong to this request; never retain them between accounts or requests.
        Set<AgeRating> allowedRatings = contentAccessService.allowedRatings();
        Map<String, Object> result = new HashMap<>();
        result.put("books", searchBooksAutocomplete(query, allowedRatings));
        result.put("authors", searchAuthorsAutocomplete(query));
        return result;
    }

    private List<Map<String, Object>> searchBooksAutocomplete(String query, Set<AgeRating> allowedRatings) {
        List<BookHit> prefix = searchBookTitles(prefixPattern(query), 5, allowedRatings);
        if (prefix.size() >= 5) return enrichBooks(prefix);
        List<BookHit> additional;
        try {
            List<AggregationOperation> stages = new ArrayList<>();
            stages.add(context -> atlasBooksStage(query));
            stages.add(Aggregation.match(ContentAccessService.discoverableCriteria(allowedRatings)));
            stages.add(Aggregation.limit(5));
            stages.add(context -> bookProjection(false));
            additional = bookDocuments(stages).stream().map(doc -> bookHit(doc, false)).toList();
        } catch (RuntimeException unavailableAtlasSearch) {
            // Standalone Mongo supports the same literal substring fallback as before.
            additional = searchBookTitles(containsPattern(query), 5, allowedRatings);
        }
        return enrichBooks(mergeBooks(prefix, additional, 5));
    }

    private List<Map<String, Object>> searchAuthorsAutocomplete(String query) {
        List<Map<String, Object>> prefix = authorDocuments(Criteria.where("username").regex(prefixPattern(query)), 0, 3);
        if (prefix.size() >= 3) return prefix;
        try {
            List<Document> fuzzy = mongoTemplate.aggregate(Aggregation.newAggregation(
                    context -> atlasAuthorsStage(query), Aggregation.limit(3), context -> authorProjection()),
                    User.class, Document.class).getMappedResults();
            return mergeById(prefix, fuzzy.stream().map(this::authorResult).toList(), 3);
        } catch (RuntimeException unavailableAtlasSearch) {
            return prefix;
        }
    }

    public Map<String, Object> fullSearch(String query, String type, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        Set<AgeRating> allowedRatings = contentAccessService.allowedRatings();
        Map<String, Object> result = new HashMap<>();
        if ("all".equals(type) || "books".equals(type))
            result.put("books", searchBooksFull(query, safePage, safeSize, allowedRatings));
        if ("all".equals(type) || "authors".equals(type))
            result.put("authors", searchAuthorsFull(query, safePage, safeSize));
        return result;
    }

    private Map<String, Object> searchBooksFull(String query, int page, int size, Set<AgeRating> allowedRatings) {
        Criteria criteria = new Criteria().andOperator(ContentAccessService.discoverableCriteria(allowedRatings),
                new Criteria().orOperator(Criteria.where("title").regex(containsPattern(query)),
                        Criteria.where("genres").regex(prefixPattern(query)), Criteria.where("tags").regex(prefixPattern(query))));
        long total = mongoTemplate.count(Query.query(criteria), Book.class);
        if (total > 0) {
            Query data = bookQuery(criteria).skip((long) page * size).limit(size);
            return page(enrichBooks(mongoTemplate.find(data, Book.class).stream().map(this::bookHit).toList()), total, page, size);
        }
        Map<String, Object> empty = page(List.of(), 0, page, size);
        try {
            List<AggregationOperation> guards = List.of(context -> atlasBooksStage(query),
                    Aggregation.match(ContentAccessService.discoverableCriteria(allowedRatings)));
            List<AggregationOperation> countStages = new ArrayList<>(guards);
            countStages.add(Aggregation.count().as("total"));
            total = count(bookDocuments(countStages));
            if (total == 0) return empty;
            List<AggregationOperation> dataStages = new ArrayList<>(guards);
            dataStages.add(Aggregation.skip((long) page * size));
            dataStages.add(Aggregation.limit(size));
            dataStages.add(context -> bookProjection(true));
            List<BookHit> hits = bookDocuments(dataStages).stream().map(doc -> bookHit(doc, true)).toList();
            return page(enrichBooks(hits), total, page, size);
        } catch (RuntimeException unavailableAtlasSearch) {
            return empty;
        }
    }

    private Map<String, Object> searchAuthorsFull(String query, int page, int size) {
        Criteria criteria = new Criteria().orOperator(Criteria.where("username").regex(prefixPattern(query)),
                Criteria.where("bio").regex(containsPattern(query)));
        long total = mongoTemplate.count(Query.query(criteria), User.class);
        if (total > 0) return page(authorDocuments(criteria, (long) page * size, size), total, page, size);
        Map<String, Object> empty = page(List.of(), 0, page, size);
        try {
            List<Document> countRows = mongoTemplate.aggregate(Aggregation.newAggregation(
                    context -> atlasAuthorsStage(query), Aggregation.count().as("total")), User.class, Document.class).getMappedResults();
            total = count(countRows);
            if (total == 0) return empty;
            List<Document> rows = mongoTemplate.aggregate(Aggregation.newAggregation(
                    context -> atlasAuthorsStage(query), Aggregation.skip((long) page * size), Aggregation.limit(size),
                    context -> authorProjection()), User.class, Document.class).getMappedResults();
            return page(rows.stream().map(this::authorResult).toList(), total, page, size);
        } catch (RuntimeException unavailableAtlasSearch) {
            return empty;
        }
    }

    static Pattern prefixPattern(String query) {
        return Pattern.compile("^" + Pattern.quote(query == null ? "" : query.trim()), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    private static Pattern containsPattern(String query) {
        return Pattern.compile(Pattern.quote(query == null ? "" : query.trim()), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    private List<BookHit> searchBookTitles(Pattern pattern, int limit, Set<AgeRating> allowedRatings) {
        Criteria criteria = new Criteria().andOperator(ContentAccessService.discoverableCriteria(allowedRatings),
                Criteria.where("title").regex(pattern));
        return mongoTemplate.find(bookQuery(criteria).limit(limit), Book.class).stream().map(this::bookHit).toList();
    }

    private Query bookQuery(Criteria criteria) {
        Query query = Query.query(criteria).with(Sort.by("_id"));
        query.fields().include(BOOK_RESULT_FIELDS);
        return query;
    }

    private List<Document> bookDocuments(List<AggregationOperation> stages) {
        return mongoTemplate.aggregate(Aggregation.newAggregation(stages), Book.class, Document.class).getMappedResults();
    }

    private List<Map<String, Object>> authorDocuments(Criteria criteria, long skip, int limit) {
        return mongoTemplate.aggregate(Aggregation.newAggregation(Aggregation.match(criteria), Aggregation.sort(Sort.by("_id")),
                Aggregation.skip(skip), Aggregation.limit(limit), context -> authorProjection()), User.class, Document.class)
                .getMappedResults().stream().map(this::authorResult).toList();
    }

    private static Document atlasBooksStage(String query) {
        Document text = new Document("query", query).append("path", List.of("title", "summary", "genres", "tags", "description"))
                .append("fuzzy", new Document("maxEdits", 1).append("prefixLength", 2));
        Document compound = new Document("must", List.of(new Document("text", text)))
                .append("filter", List.of(new Document("text", new Document("query", "published").append("path", "publicationStatus"))));
        return new Document("$search", new Document("index", BOOKS_INDEX).append("compound", compound));
    }

    private static Document atlasAuthorsStage(String query) {
        return new Document("$search", new Document("index", USERS_INDEX).append("text", new Document("query", query)
                .append("path", List.of("username", "bio")).append("fuzzy", new Document("maxEdits", 1).append("prefixLength", 2))));
    }

    private static Document bookProjection(boolean full) {
        Document fields = new Document("_id", 0).append("id", new Document("$toString", "$_id"))
                .append("title", 1).append("coverUrl", 1).append("genres", 1).append("rating", 1).append("authorId", 1)
                .append("score", new Document("$meta", "searchScore"));
        if (full) for (String field : BOOK_RESULT_FIELDS) fields.put(field, 1);
        return new Document("$project", fields);
    }

    private static Document authorProjection() {
        return new Document("$project", new Document("_id", 0).append("id", new Document("$toString", "$_id"))
                .append("name", "$username").append("avatarUrl", 1).append("bio", 1).append("favoriteGenres", 1)
                .append("followersCount", new Document("$size", new Document("$ifNull", List.of("$followers", List.of()))))
                .append("followingCount", new Document("$size", new Document("$ifNull", List.of("$following", List.of())))));
    }

    private record BookHit(Map<String, Object> item, String authorId) {}

    private BookHit bookHit(Book book) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", book.getId()); map.put("title", book.getTitle()); map.put("coverUrl", book.getCoverUrl());
        map.put("genres", book.getGenres()); map.put("tags", book.getTags()); map.put("summary", book.getSummary());
        map.put("description", book.getDescription()); map.put("rating", book.getRating()); map.put("reviewsCount", book.getReviewsCount());
        map.put("readingStatus", book.getReadingStatus()); map.put("publishedDate", book.getPublishedDate());
        return new BookHit(map, book.getAuthorId());
    }

    private BookHit bookHit(Document doc, boolean full) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (String key : List.of("id", "title", "coverUrl", "genres", "rating", "score")) map.put(key, doc.get(key));
        if (full) {
            for (String key : List.of("tags", "summary", "description", "readingStatus", "publishedDate")) map.put(key, doc.get(key));
            map.put("reviewsCount", doc.getOrDefault("reviewsCount", 0));
        }
        return new BookHit(map, doc.getString("authorId"));
    }

    private List<Map<String, Object>> enrichBooks(List<BookHit> hits) {
        Set<String> ids = hits.stream().map(BookHit::authorId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, User> authors = new HashMap<>();
        if (!ids.isEmpty()) {
            Query query = Query.query(Criteria.where("_id").in(ids));
            query.fields().include("username", "avatarUrl", "bio");
            mongoTemplate.find(query, User.class).forEach(author -> authors.put(author.getId(), author));
        }
        return hits.stream().map(hit -> {
            User user = authors.get(hit.authorId());
            if (user != null) {
                Map<String, Object> author = new LinkedHashMap<>();
                author.put("id", user.getId()); author.put("name", user.getUsername());
                author.put("avatarUrl", user.getAvatarUrl()); author.put("bio", user.getBio());
                hit.item().put("author", author);
            }
            return hit.item();
        }).toList();
    }

    private Map<String, Object> authorResult(Document doc) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (String field : List.of("id", "name", "avatarUrl", "bio", "favoriteGenres")) result.put(field, doc.get(field));
        result.put("followersCount", doc.getOrDefault("followersCount", 0));
        result.put("followingCount", doc.getOrDefault("followingCount", 0));
        return result;
    }

    private static long count(List<Document> rows) {
        return rows.isEmpty() ? 0 : ((Number) rows.get(0).getOrDefault("total", 0)).longValue();
    }

    private static Map<String, Object> page(List<Map<String, Object>> items, long total, int page, int size) {
        Map<String, Object> result = new HashMap<>();
        result.put("items", items); result.put("total", total); result.put("page", page);
        result.put("totalPages", (int) Math.ceil((double) total / size));
        return result;
    }

    private static List<BookHit> mergeBooks(List<BookHit> first, List<BookHit> second, int limit) {
        Map<Object, BookHit> merged = new LinkedHashMap<>();
        first.forEach(hit -> merged.put(hit.item().get("id"), hit));
        second.forEach(hit -> merged.putIfAbsent(hit.item().get("id"), hit));
        return merged.values().stream().limit(limit).toList();
    }

    private static List<Map<String, Object>> mergeById(List<Map<String, Object>> first, List<Map<String, Object>> second, int limit) {
        Map<Object, Map<String, Object>> merged = new LinkedHashMap<>();
        first.forEach(item -> merged.put(item.get("id"), item));
        second.forEach(item -> merged.putIfAbsent(item.get("id"), item));
        return merged.values().stream().limit(limit).toList();
    }
}
