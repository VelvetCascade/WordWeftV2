package com.wordweft.seo;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.service.ChapterPreviewService;
import com.wordweft.book.service.PublishedChapterView;
import com.wordweft.user.model.User;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Anonymous, read-only projections. Never use the caller's identity for cached public HTML. */
@Service
public class PublicSeoService {
    public static final int PAGE_SIZE = 24;
    public static final int SITEMAP_SIZE = 1000;
    private static final Set<String> SITEMAP_KINDS = Set.of("books", "chapters", "authors", "genres", "tags");
    private final MongoTemplate mongo;
    private final ChapterPreviewService chapterPreviewService;

    public PublicSeoService(MongoTemplate mongo, ChapterPreviewService chapterPreviewService) {
        this.mongo = mongo;
        this.chapterPreviewService = chapterPreviewService;
    }

    public static boolean isPublic(Book book) {
        return book != null && "published".equals(book.getPublicationStatus()) && !book.isMature()
                && (book.getAgeRating() == null || book.getAgeRating() == AgeRating.ALL_AGES || book.getAgeRating() == AgeRating.TEEN_13)
                && book.getChapters() != null && book.getChapters().stream().anyMatch(ch -> "published".equals(ch.getStatus()));
    }

    private Criteria publicCriteria() {
        return Criteria.where("publicationStatus").is("published").and("isMature").ne(true)
                .and("ageRating").in(null, AgeRating.ALL_AGES, AgeRating.TEEN_13)
                .and("chapters").elemMatch(Criteria.where("status").is("published"));
    }

    public Map<String, Object> book(String id) {
        return book(id, null);
    }

    public Map<String, Object> book(String id, String chapterId) {
        Book book = mongo.findById(id, Book.class);
        if (!isPublic(book)) return null;
        Map<String, Object> result = bookDto(book);
        if (chapterId != null) {
            @SuppressWarnings("unchecked") var chapters = (List<Map<String, Object>>) result.get("chapters");
            String firstChapterId = chapters.isEmpty() ? null : String.valueOf(chapters.get(0).get("id"));
            for (var chapter : chapters) if (chapterId.equals(chapter.get("id")) && chapterId.equals(firstChapterId)) {
                book.getChapters().stream()
                        .filter(ch -> chapterId.equals(ch.getId()) && "published".equals(ch.getStatus()))
                        .findFirst()
                        .ifPresent(ch -> {
                            ChapterPreviewService.Preview preview = chapterPreviewService.preview(
                                    PublishedChapterView.of(ch).content());
                            chapter.put("content", preview.html());
                            chapter.put("previewWordCount", preview.previewWordCount());
                            chapter.put("fullWordCount", preview.fullWordCount());
                        });
            }
        }
        return result;
    }

    public Map<String, Object> catalog(String genre, String tag, String authorId, int page) {
        if (page < 1 || page > 100000) throw new IllegalArgumentException("Invalid page");
        List<Criteria> filters = new ArrayList<>(List.of(publicCriteria()));
        // Exact matching prevents wildcard/regex URLs and keeps the sitemap and visible listings aligned.
        if (genre != null && !genre.isBlank()) filters.add(Criteria.where("genres").is(genre));
        if (tag != null && !tag.isBlank()) filters.add(Criteria.where("tags").is(tag));
        if (authorId != null) filters.add(Criteria.where("authorId").is(authorId));
        Criteria criteria = new Criteria().andOperator(filters.toArray(Criteria[]::new));
        Query query = Query.query(criteria).with(Sort.by(Sort.Direction.ASC, "_id"))
                .skip((long) (page - 1) * PAGE_SIZE).limit(PAGE_SIZE + 1);
        // Never load complete manuscripts for listing pages.
        query.fields().exclude("chapters.content").exclude("chapters.likes").exclude("likes");
        List<Book> matches = mongo.find(query, Book.class);
        boolean hasMore = matches.size() > PAGE_SIZE;
        List<Map<String, Object>> books = matches.stream().limit(PAGE_SIZE).map(this::bookDto).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("books", books); result.put("page", page); result.put("hasMore", hasMore);
        return result;
    }

    public Map<String, Object> author(String id, int page) {
        User user = mongo.findById(id, User.class);
        if (user == null) return null;
        Map<String, Object> result = catalog(null, null, id, page);
        result.put("author", authorDto(user, id));
        return result;
    }

    static Map<String, Object> authorDto(User user, String id) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("name", user == null ? "WordWeft writer" : user.getUsername());
        result.put("bio", user == null ? "" : user.getBio());
        result.put("avatarUrl", user == null ? null : user.getAvatarUrl());
        return result;
    }

    Map<String, Object> bookDto(Book book) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", book.getId()); result.put("title", book.getTitle());
        result.put("summary", book.getSummary()); result.put("description", book.getDescription());
        result.put("coverUrl", book.getCoverUrl()); result.put("genres", book.getGenres()); result.put("tags", book.getTags());
        result.put("category", book.getCategory()); result.put("readingStatus", book.getReadingStatus());
        result.put("publicationStatus", "published"); result.put("ageRating", book.getAgeRating());
        result.put("isMature", book.isMature()); result.put("isAIGenerated", book.isAIGenerated());
        result.put("publishedDate", book.getPublishedDate() == null ? null : book.getPublishedDate().toString());
        result.put("lastUpdatedAt", book.getLastUpdatedAt() == null ? null : book.getLastUpdatedAt().toString());
        result.put("contentWarnings", book.getContentWarnings()); result.put("customDisclaimer", book.getCustomDisclaimer());
        result.put("authorId", book.getAuthorId());
        result.put("author", authorDto(mongo.findById(book.getAuthorId(), User.class), book.getAuthorId()));
        List<Chapter> publishedChapters = book.getChapters().stream()
                .filter(ch -> "published".equals(ch.getStatus()))
                .toList();
        String firstChapterId = publishedChapters.isEmpty() ? null : publishedChapters.get(0).getId();
        result.put("chapters", publishedChapters.stream().map(ch -> {
            PublishedChapterView.Snapshot publicChapter = PublishedChapterView.of(ch);
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", ch.getId()); dto.put("title", publicChapter.title()); dto.put("status", "published");
            dto.put("access", Objects.equals(ch.getId(), firstChapterId) ? "PREVIEW" : "AUTH_REQUIRED");
            dto.put("wordCount", publicChapter.wordCount()); dto.put("publishedAt", ch.getPublishedAt());
            dto.put("contentWarnings", publicChapter.contentWarnings()); dto.put("disclaimerNote", publicChapter.disclaimerNote());
            return dto;
        }).toList());
        return result;
    }

    private List<AggregationOperation> sitemapPipeline(String kind) {
        if (!SITEMAP_KINDS.contains(kind)) throw new IllegalArgumentException("Unknown sitemap");
        List<AggregationOperation> ops = new ArrayList<>();
        ops.add(Aggregation.match(publicCriteria()));
        switch (kind) {
            case "chapters" -> {
                ops.add(Aggregation.unwind("chapters"));
                ops.add(Aggregation.match(Criteria.where("chapters.status").is("published")));
                ops.add(Aggregation.project().and("_id").as("bookId").and("chapters._id").as("chapterId")
                        .and("lastUpdatedAt").as("lastmod").andExclude("_id"));
                ops.add(Aggregation.sort(Sort.by("bookId", "chapterId")));
            }
            case "authors" -> { ops.add(Aggregation.group("authorId")); ops.add(Aggregation.sort(Sort.by("_id"))); }
            case "genres", "tags" -> {
                ops.add(Aggregation.unwind(kind));
                // Count distinct books, even if old data repeats a tag.
                ops.add(Aggregation.group(kind).addToSet("_id").as("books"));
                ops.add(Aggregation.project("_id").and("books").size().as("count"));
                ops.add(Aggregation.match(Criteria.where("count").gte(kind.equals("tags") ? 3 : 1).and("_id").nin(null, "")));
                ops.add(Aggregation.sort(Sort.by("_id")));
            }
            default -> { ops.add(Aggregation.project("lastUpdatedAt", "publishedDate")); ops.add(Aggregation.sort(Sort.by("_id"))); }
        }
        return ops;
    }

    public Map<String, Long> sitemapCounts() {
        Map<String, Long> counts = new TreeMap<>();
        for (String kind : SITEMAP_KINDS) {
            List<AggregationOperation> ops = sitemapPipeline(kind);
            ops.add(Aggregation.count().as("count"));
            Document row = mongo.aggregate(Aggregation.newAggregation(ops), Book.class, Document.class).getUniqueMappedResult();
            counts.put(kind, row == null ? 0L : ((Number) row.get("count")).longValue());
        }
        return counts;
    }

    public List<Map<String, String>> sitemap(String kind, int page) {
        if (page < 1 || page > 100000) throw new IllegalArgumentException("Invalid page");
        List<AggregationOperation> ops = sitemapPipeline(kind);
        ops.add(Aggregation.skip((long) (page - 1) * SITEMAP_SIZE)); ops.add(Aggregation.limit(SITEMAP_SIZE));
        return mongo.aggregate(Aggregation.newAggregation(ops), Book.class, Document.class).getMappedResults().stream().map(row -> {
            String id = String.valueOf(row.get("_id"));
            String path = switch (kind) {
                case "chapters" -> "/book/" + segment(String.valueOf(row.get("bookId"))) + "/chapter/" + segment(String.valueOf(row.get("chapterId")));
                case "authors" -> "/author/" + segment(id);
                case "genres" -> "/genre/" + segment(id);
                case "tags" -> "/tag/" + segment(id);
                default -> "/book/" + segment(id);
            };
            Map<String, String> entry = new LinkedHashMap<>(); entry.put("path", path);
            Object modified = row.getOrDefault("lastmod", row.getOrDefault("lastUpdatedAt", row.get("publishedDate")));
            if (modified instanceof Date date) entry.put("lastmod", date.toInstant().toString());
            return entry;
        }).toList();
    }

    private static String segment(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20"); }
}
