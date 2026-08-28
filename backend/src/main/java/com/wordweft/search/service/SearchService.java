
package com.wordweft.search.service;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.service.ContentAccessService;

@Service
public class SearchService {

    @Autowired
    private MongoTemplate mongoTemplate;
    @Autowired
    private ContentAccessService contentAccessService;

    private static final String BOOKS_COLLECTION = "books";
    private static final String USERS_COLLECTION = "users";
    private static final String BOOKS_INDEX = "booksSearchIndex";
    private static final String USERS_INDEX = "userSearchIndex";

    // ─── Autocomplete ─────────────────────────────────────────────────

    public Map<String, Object> autocomplete(String query) {
        Map<String, Object> result = new HashMap<>();
        result.put("books", searchBooksAutocomplete(query));
        result.put("authors", searchAuthorsAutocomplete(query));
        return result;
    }

    private List<Map<String, Object>> searchBooksAutocomplete(String query) {
        List<Document> pipeline = List.of(
                new Document("$search", new Document("index", BOOKS_INDEX)
                        .append("compound", new Document("must", List.of(
                                new Document("text", new Document("query", query)
                                        .append("path", List.of("title", "summary", "genres", "tags", "description"))
                                        .append("fuzzy", new Document("maxEdits", 1)
                                                .append("prefixLength", 2)))))
                                .append("filter", List.of(
                                        new Document("text", new Document("query", "published")
                                                .append("path", "publicationStatus")))))),
                new Document("$limit", 5),
                new Document("$project", new Document("_id", 0)
                        .append("id", new Document("$toString", "$_id"))
                        .append("title", 1)
                        .append("coverUrl", 1)
                        .append("genres", 1)
                        .append("authorId", 1)
                        .append("ageRating", 1)
                        .append("isMature", 1)
                        .append("rating", 1)
                        .append("score", new Document("$meta", "searchScore"))));

        List<Document> results = mongoTemplate.getCollection(BOOKS_COLLECTION)
                .aggregate(pipeline).into(new ArrayList<>());

        // Enrich with author names
        return results.stream().filter(this::isAllowedBookResult).map(doc -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", doc.getString("id"));
            map.put("title", doc.getString("title"));
            map.put("coverUrl", doc.getString("coverUrl"));
            map.put("genres", doc.getList("genres", String.class));
            map.put("rating", doc.getDouble("rating"));
            map.put("score", doc.getDouble("score"));

            // Resolve author name
            String authorId = doc.getString("authorId");
            if (authorId != null) {
                Document user = mongoTemplate.getCollection(USERS_COLLECTION)
                        .find(new Document("_id", new org.bson.types.ObjectId(authorId)))
                        .projection(new Document("username", 1).append("avatarUrl", 1))
                        .first();
                if (user != null) {
                    Map<String, String> author = new HashMap<>();
                    author.put("id", authorId);
                    author.put("name", user.getString("username"));
                    author.put("avatarUrl", user.getString("avatarUrl"));
                    map.put("author", author);
                }
            }
            return map;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> searchAuthorsAutocomplete(String query) {
        List<Document> pipeline = List.of(
                new Document("$search", new Document("index", USERS_INDEX)
                        .append("text", new Document("query", query)
                                .append("path", List.of("username", "bio"))
                                .append("fuzzy", new Document("maxEdits", 1)
                                        .append("prefixLength", 2)))),
                new Document("$limit", 3),
                new Document("$project", new Document("_id", 0)
                        .append("id", new Document("$toString", "$_id"))
                        .append("name", "$username")
                        .append("avatarUrl", 1)
                        .append("bio", 1)
                        .append("followers", 1)
                        .append("score", new Document("$meta", "searchScore"))));

        List<Document> results = mongoTemplate.getCollection(USERS_COLLECTION)
                .aggregate(pipeline).into(new ArrayList<>());

        return results.stream().map(doc -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", doc.getString("id"));
            map.put("name", doc.getString("name"));
            map.put("avatarUrl", doc.getString("avatarUrl"));
            map.put("bio", doc.getString("bio"));
            List<?> followers = doc.getList("followers", String.class);
            map.put("followersCount", followers != null ? followers.size() : 0);
            return map;
        }).collect(Collectors.toList());
    }

    // ─── Full Search ──────────────────────────────────────────────────

    public Map<String, Object> fullSearch(String query, String type, int page, int size) {
        Map<String, Object> result = new HashMap<>();

        if ("all".equals(type) || "books".equals(type)) {
            result.put("books", searchBooksFull(query, page, size));
        }
        if ("all".equals(type) || "authors".equals(type)) {
            result.put("authors", searchAuthorsFull(query, page, size));
        }

        return result;
    }

    private Map<String, Object> searchBooksFull(String query, int page, int size) {
        int skip = page * size;

        // Count pipeline
        List<Document> countPipeline = List.of(
                new Document("$search", new Document("index", BOOKS_INDEX)
                        .append("compound", new Document("must", List.of(
                                new Document("text", new Document("query", query)
                                        .append("path", List.of("title", "summary", "genres", "tags", "description"))
                                        .append("fuzzy", new Document("maxEdits", 1)
                                                .append("prefixLength", 2)))))
                                .append("filter", List.of(
                                        new Document("text", new Document("query", "published")
                                                .append("path", "publicationStatus")))))),
                new Document("$count", "total"));

        List<Document> countResult = mongoTemplate.getCollection(BOOKS_COLLECTION)
                .aggregate(countPipeline).into(new ArrayList<>());
        long total = countResult.isEmpty() ? 0 : countResult.get(0).getInteger("total", 0);

        // Data pipeline
        List<Document> dataPipeline = List.of(
                new Document("$search", new Document("index", BOOKS_INDEX)
                        .append("compound", new Document("must", List.of(
                                new Document("text", new Document("query", query)
                                        .append("path", List.of("title", "summary", "genres", "tags", "description"))
                                        .append("fuzzy", new Document("maxEdits", 1)
                                                .append("prefixLength", 2)))))
                                .append("filter", List.of(
                                        new Document("text", new Document("query", "published")
                                                .append("path", "publicationStatus")))))),
                new Document("$skip", skip),
                new Document("$limit", size),
                new Document("$project", new Document("_id", 0)
                        .append("id", new Document("$toString", "$_id"))
                        .append("title", 1)
                        .append("coverUrl", 1)
                        .append("genres", 1)
                        .append("tags", 1)
                        .append("summary", 1)
                        .append("description", 1)
                        .append("rating", 1)
                        .append("reviewsCount", 1)
                        .append("readingStatus", 1)
                        .append("authorId", 1)
                        .append("publishedDate", 1)
                        .append("ageRating", 1)
                        .append("isMature", 1)
                        .append("score", new Document("$meta", "searchScore"))));

        List<Document> results = mongoTemplate.getCollection(BOOKS_COLLECTION)
                .aggregate(dataPipeline).into(new ArrayList<>());

        List<Map<String, Object>> enriched = results.stream().filter(this::isAllowedBookResult).map(doc -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", doc.getString("id"));
            map.put("title", doc.getString("title"));
            map.put("coverUrl", doc.getString("coverUrl"));
            map.put("genres", doc.getList("genres", String.class));
            map.put("tags", doc.getList("tags", String.class));
            map.put("summary", doc.getString("summary"));
            map.put("description", doc.getString("description"));
            map.put("rating", doc.getDouble("rating"));
            map.put("reviewsCount", doc.getInteger("reviewsCount", 0));
            map.put("readingStatus", doc.getString("readingStatus"));
            map.put("publishedDate", doc.get("publishedDate"));
            map.put("score", doc.getDouble("score"));

            // Resolve author
            String authorId = doc.getString("authorId");
            if (authorId != null) {
                try {
                    Document user = mongoTemplate.getCollection(USERS_COLLECTION)
                            .find(new Document("_id", new org.bson.types.ObjectId(authorId)))
                            .projection(new Document("username", 1).append("avatarUrl", 1).append("bio", 1))
                            .first();
                    if (user != null) {
                        Map<String, String> author = new HashMap<>();
                        author.put("id", authorId);
                        author.put("name", user.getString("username"));
                        author.put("avatarUrl", user.getString("avatarUrl"));
                        author.put("bio", user.getString("bio"));
                        map.put("author", author);
                    }
                } catch (Exception e) {
                    // Author not found, skip enrichment
                }
            }
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("items", enriched);
        response.put("total", total);
        response.put("page", page);
        response.put("totalPages", (int) Math.ceil((double) total / size));
        return response;
    }

    private boolean isAllowedBookResult(Document doc) {
        String value = doc.getString("ageRating");
        AgeRating rating;
        try {
            rating = value != null ? AgeRating.valueOf(value) : (Boolean.TRUE.equals(doc.getBoolean("isMature")) ? AgeRating.MATURE_18 : AgeRating.ALL_AGES);
        } catch (IllegalArgumentException ignored) {
            rating = AgeRating.ALL_AGES;
        }
        return contentAccessService.allowedRatings().contains(rating);
    }

    private Map<String, Object> searchAuthorsFull(String query, int page, int size) {
        int skip = page * size;

        // Count pipeline
        List<Document> countPipeline = List.of(
                new Document("$search", new Document("index", USERS_INDEX)
                        .append("text", new Document("query", query)
                                .append("path", List.of("username", "bio"))
                                .append("fuzzy", new Document("maxEdits", 1)
                                        .append("prefixLength", 2)))),
                new Document("$count", "total"));

        List<Document> countResult = mongoTemplate.getCollection(USERS_COLLECTION)
                .aggregate(countPipeline).into(new ArrayList<>());
        long total = countResult.isEmpty() ? 0 : countResult.get(0).getInteger("total", 0);

        // Data pipeline
        List<Document> dataPipeline = List.of(
                new Document("$search", new Document("index", USERS_INDEX)
                        .append("text", new Document("query", query)
                                .append("path", List.of("username", "bio"))
                                .append("fuzzy", new Document("maxEdits", 1)
                                        .append("prefixLength", 2)))),
                new Document("$skip", skip),
                new Document("$limit", size),
                new Document("$project", new Document("_id", 0)
                        .append("id", new Document("$toString", "$_id"))
                        .append("name", "$username")
                        .append("avatarUrl", 1)
                        .append("bio", 1)
                        .append("followers", 1)
                        .append("following", 1)
                        .append("favoriteGenres", 1)
                        .append("score", new Document("$meta", "searchScore"))));

        List<Document> results = mongoTemplate.getCollection(USERS_COLLECTION)
                .aggregate(dataPipeline).into(new ArrayList<>());

        List<Map<String, Object>> enriched = results.stream().map(doc -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", doc.getString("id"));
            map.put("name", doc.getString("name"));
            map.put("avatarUrl", doc.getString("avatarUrl"));
            map.put("bio", doc.getString("bio"));
            List<?> followers = doc.getList("followers", String.class);
            List<?> following = doc.getList("following", String.class);
            map.put("followersCount", followers != null ? followers.size() : 0);
            map.put("followingCount", following != null ? following.size() : 0);
            map.put("favoriteGenres", doc.getList("favoriteGenres", String.class));
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("items", enriched);
        response.put("total", total);
        response.put("page", page);
        response.put("totalPages", (int) Math.ceil((double) total / size));
        return response;
    }
}
