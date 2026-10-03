package com.wordweft.discovery.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.service.BookMetadataProjection;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.book.service.PublishedChapterView;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.user.model.User;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class HookFeedService {
    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 20;
    private static final int EXCERPT_LENGTH = 500;
    private final MongoTemplate mongo;
    private final ContentAccessService access;

    public HookFeedService(MongoTemplate mongo, ContentAccessService access) {
        this.mongo = mongo;
        this.access = access;
    }

    public HookFeedResponse getFeed(String userId, Set<String> excludedBookIds, int limit) {
        User preferences = null;
        if (userId != null) {
            Query query = Query.query(Criteria.where("_id").is(userId));
            query.fields().include("favoriteGenres", "dateOfBirth", "allowMatureContent");
            preferences = mongo.findOne(query, User.class);
        }
        Set<AgeRating> ratings = Objects.equals(userId, access.currentUserId())
                ? access.allowedRatings(preferences) : access.allowedRatings();
        return getFeed(userId, preferences == null ? List.of() : preferences.getFavoriteGenres(),
                excludedBookIds, limit, ratings);
    }

    public HookFeedResponse getFeed(String userId, List<String> requestedTaste, Set<String> excludedBookIds, int limit) {
        return getFeed(userId, requestedTaste, excludedBookIds, limit, access.allowedRatings());
    }

    private HookFeedResponse getFeed(String userId, List<String> requestedTaste, Set<String> excludedBookIds,
                                     int limit, Set<AgeRating> allowedRatings) {
        List<String> taste = normalizeGenres(requestedTaste);
        Set<String> excluded = excludedBookIds == null ? Set.of() : excludedBookIds;
        int safeLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        Map<String, String> tasteLookup = taste.stream().collect(Collectors.toMap(
                genre -> genre.toLowerCase(Locale.ROOT), Function.identity(), (first, ignored) -> first, LinkedHashMap::new));
        Criteria visible = new Criteria().andOperator(ContentAccessService.discoverableCriteria(allowedRatings),
                Criteria.where("_id").nin(excluded), Criteria.where("chapters.status").regex("^published$", "i"));
        Object matchScore = genreMatchScore(tasteLookup.keySet(), visible);

        List<Candidate> candidates = new ArrayList<>(safeLimit);
        long offset = 0;
        while (candidates.size() < safeLimit) {
            List<Book> window = rankedMetadata(visible, matchScore, offset);
            if (window.isEmpty()) break;
            offset += window.size();
            // A bounded metadata window may contain blank released chapters. Read only the
            // openings needed to fill this page, advancing blank chapters with the same cleanup.
            int position = 0;
            while (position < window.size() && candidates.size() < safeLimit) {
                int end = Math.min(window.size(), position + safeLimit - candidates.size());
                candidates.addAll(openings(window.subList(position, end), tasteLookup.keySet(), allowedRatings));
                position = end;
            }
            if (window.size() < MAX_LIMIT) break;
        }

        Map<String, String> authorNames = authorNames(candidates);
        List<HookFeedResponse.Hook> items = candidates.stream()
                .map(candidate -> toHook(candidate, userId, authorNames))
                .toList();
        return new HookFeedResponse(items, taste, !taste.isEmpty());
    }

    private Object genreMatchScore(Set<String> taste, Criteria visible) {
        if (taste.isEmpty()) return 0;
        // Mongo's $toLower is ASCII-defined. Resolve only distinct genre labels so ranking
        // retains Java's exact trim/Locale.ROOT rules, including legacy non-ASCII genres.
        Map<String, List<String>> variants = mongo.findDistinct(Query.query(visible), "genres", Book.class, String.class)
                .stream().filter(genre -> genre != null && !genre.isBlank())
                .collect(Collectors.groupingBy(genre -> genre.trim().toLowerCase(Locale.ROOT)));
        List<Object> matches = taste.stream().map(key -> {
            List<String> labels = variants.getOrDefault(key, List.of());
            if (labels.isEmpty()) return (Object) 0;
            Object intersection = new Document("$setIntersection", List.of(ifNull("$genres", List.of()), literal(labels)));
            return (Object) new Document("$cond", List.of(new Document("$gt", List.of(new Document("$size", intersection), 0)), 1, 0));
        }).toList();
        return new Document("$sum", matches);
    }

    private List<Book> rankedMetadata(Criteria visible, Object matchScore, long offset) {
        Document ranking = new Document("hookMatches", matchScore)
                .append("hookReads", ifNull("$readCountLast7Days", 0))
                .append("hookViews", ifNull("$viewCountLast7Days", 0))
                .append("hookId", new Document("$toString", "$_id"));
        Document projection = new Document("_id", 1).append("title", 1).append("authorId", 1)
                .append("coverUrl", 1).append("genres", 1)
                .append("chapters", BookMetadataProjection.fields().get("chapters"));
        return mongo.aggregate(Aggregation.newAggregation(Aggregation.match(visible),
                context -> new Document("$set", ranking),
                context -> new Document("$sort", new Document("hookMatches", -1).append("hookReads", -1)
                        .append("hookViews", -1).append("hookId", 1)),
                Aggregation.skip(offset), Aggregation.limit(MAX_LIMIT),
                context -> new Document("$project", projection)), Book.class, Book.class).getMappedResults();
    }

    private List<Candidate> openings(List<Book> window, Set<String> taste, Set<AgeRating> ratings) {
        List<PendingOpening> pending = window.stream().map(PendingOpening::new)
                .filter(opening -> !opening.chapters.isEmpty()).collect(Collectors.toCollection(ArrayList::new));
        Map<String, Candidate> selected = new HashMap<>();
        while (!pending.isEmpty()) {
            Map<String, String> bodies = openingBodies(pending, ratings);
            for (Iterator<PendingOpening> iterator = pending.iterator(); iterator.hasNext();) {
                PendingOpening opening = iterator.next();
                String content = bodies.getOrDefault(opening.book.getId(), "");
                if (!plainText(content).isBlank()) {
                    List<String> matched = safeGenres(opening.book).stream()
                            .filter(genre -> taste.contains(genre.toLowerCase(Locale.ROOT))).toList();
                    selected.put(opening.book.getId(), new Candidate(opening.book, opening.chapter(), content, matched));
                    iterator.remove();
                } else if (++opening.position == opening.chapters.size()) {
                    iterator.remove();
                }
            }
        }
        return window.stream().map(book -> selected.get(book.getId())).filter(Objects::nonNull).toList();
    }

    private Map<String, String> openingBodies(List<PendingOpening> pending, Set<AgeRating> ratings) {
        List<String> ids = pending.stream().map(opening -> opening.book.getId()).toList();
        List<Integer> chapterIndexes = pending.stream().map(opening -> opening.chapterIndexes.get(opening.position)).toList();
        Object chapterIndex = new Document("$arrayElemAt", List.of(literal(chapterIndexes), new Document("$indexOfArray",
                List.of(literal(ids), new Document("$toString", "$_id")))));
        Object chapter = new Document("$arrayElemAt", List.of(ifNull("$chapters", List.of()), chapterIndex));
        Object publicBody = new Document("$let", new Document("vars", new Document("opening", chapter))
                .append("in", new Document("$cond", List.of(new Document("$eq", List.of(
                        new Document("$toLower", ifNull("$$opening.status", "")), "published")),
                        ifNull("$$opening.publishedContent", ifNull("$$opening.content", "")), ""))));
        Criteria criteria = new Criteria().andOperator(ContentAccessService.discoverableCriteria(ratings), Criteria.where("_id").in(ids));
        List<Document> rows = mongo.aggregate(Aggregation.newAggregation(Aggregation.match(criteria),
                context -> new Document("$project", new Document("_id", 1).append("openingContent", publicBody))),
                Book.class, Document.class).getMappedResults();
        Map<String, String> result = new HashMap<>();
        rows.forEach(row -> result.put(row.get("_id").toString(), row.getString("openingContent")));
        return result;
    }

    private Map<String, String> authorNames(List<Candidate> candidates) {
        Set<String> ids = candidates.stream().map(candidate -> candidate.book().getAuthorId())
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) return Map.of();
        Query query = Query.query(Criteria.where("_id").in(ids));
        query.fields().include("username");
        Map<String, String> names = new HashMap<>();
        mongo.find(query, User.class).forEach(author -> {
            if (author.getUsername() != null) names.put(author.getId(), author.getUsername());
        });
        return names;
    }

    private HookFeedResponse.Hook toHook(Candidate candidate, String userId, Map<String, String> authorNames) {
        Book book = candidate.book();
        Chapter chapter = candidate.chapter();
        PublishedChapterView.Snapshot publicChapter = PublishedChapterView.of(chapter);
        String authorId = book.getAuthorId();
        String authorName = authorId == null ? "WordWeft Writer" : authorNames.getOrDefault(authorId, "WordWeft Writer");
        int words = publicChapter.wordCount();
        if (words <= 0) words = plainText(candidate.content()).split("\\s+").length;
        return new HookFeedResponse.Hook(
                book.getId(), chapter.getId(), book.getTitle(), publicChapter.title(), authorId, authorName,
                book.getCoverUrl(), excerpt(candidate.content()), safeGenres(book), candidate.matchedGenres(),
                words, Math.max(1, (int) Math.ceil(words / 250.0)),
                chapter.getLikes() == null ? 0 : chapter.getLikes().size(),
                userId != null && chapter.getLikes() != null && chapter.getLikes().contains(userId));
    }

    private List<String> safeGenres(Book book) {
        return normalizeGenres(book.getGenres());
    }

    private List<String> normalizeGenres(List<String> genres) {
        if (genres == null) return List.of();
        LinkedHashMap<String, String> unique = new LinkedHashMap<>();
        genres.stream().filter(genre -> genre != null && !genre.isBlank()).map(String::trim)
                .forEach(genre -> unique.putIfAbsent(genre.toLowerCase(Locale.ROOT), genre));
        return new ArrayList<>(unique.values());
    }

    private String excerpt(String html) {
        String text = plainText(html);
        if (text.length() <= EXCERPT_LENGTH) return text;
        int boundary = text.lastIndexOf(' ', EXCERPT_LENGTH);
        if (boundary < EXCERPT_LENGTH - 80) boundary = EXCERPT_LENGTH;
        return text.substring(0, boundary).stripTrailing() + "…";
    }

    private String plainText(String html) {
        if (html == null) return "";
        return html
                .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("(?i)<br\\s*/?>|</p>|</div>|</li>|</h[1-6]>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<")
                .replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'")
                .replaceAll("\\s+", " ").trim();
    }

    private static Object ifNull(Object value, Object fallback) {
        return new Document("$ifNull", List.of(value, fallback));
    }

    private static Object literal(Object value) { return new Document("$literal", value); }

    private static final class PendingOpening {
        private final Book book;
        private final List<Chapter> chapters;
        private final List<Integer> chapterIndexes;
        private int position;

        private PendingOpening(Book book) {
            this.book = book;
            chapterIndexes = book.getChapters() == null ? List.of() : java.util.stream.IntStream.range(0, book.getChapters().size())
                    .filter(index -> book.getChapters().get(index) != null
                            && "published".equalsIgnoreCase(book.getChapters().get(index).getStatus())).boxed().toList();
            chapters = chapterIndexes.stream().map(index -> book.getChapters().get(index)).toList();
        }

        private Chapter chapter() { return chapters.get(position); }
    }

    private record Candidate(Book book, Chapter chapter, String content, List<String> matchedGenres) {}
}
