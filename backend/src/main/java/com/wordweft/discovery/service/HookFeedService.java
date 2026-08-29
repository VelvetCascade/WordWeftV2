package com.wordweft.discovery.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class HookFeedService {
    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 20;
    private static final int EXCERPT_LENGTH = 500;

    private final BookRepository books;
    private final UserRepository users;
    private final ContentAccessService access;

    public HookFeedService(BookRepository books, UserRepository users, ContentAccessService access) {
        this.books = books;
        this.users = users;
        this.access = access;
    }

    public HookFeedResponse getFeed(String userId, Set<String> excludedBookIds, int limit) {
        List<String> storedTaste = userId == null
                ? List.of()
                : users.findById(userId).map(User::getFavoriteGenres).orElse(List.of());
        return getFeed(userId, storedTaste, excludedBookIds, limit);
    }

    public HookFeedResponse getFeed(String userId, List<String> requestedTaste, Set<String> excludedBookIds, int limit) {
        List<String> taste = normalizeGenres(requestedTaste);
        Set<String> excluded = excludedBookIds == null ? Set.of() : excludedBookIds;
        int safeLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        Map<String, String> tasteLookup = taste.stream().collect(Collectors.toMap(
                genre -> genre.toLowerCase(Locale.ROOT), Function.identity(), (first, ignored) -> first, LinkedHashMap::new));

        List<Candidate> candidates = new ArrayList<>();
        for (Book book : books.findByPublicationStatus("published")) {
            if (book == null || book.getId() == null || excluded.contains(book.getId()) || !access.canDiscover(book)) continue;
            Chapter opening = firstPublishedChapter(book);
            if (opening == null) continue;
            List<String> matched = safeGenres(book).stream()
                    .filter(genre -> tasteLookup.containsKey(genre.toLowerCase(Locale.ROOT)))
                    .toList();
            candidates.add(new Candidate(book, opening, matched));
        }

        candidates.sort(Comparator
                .comparingInt((Candidate candidate) -> candidate.matchedGenres().size()).reversed()
                .thenComparing(Comparator.comparingInt((Candidate candidate) -> safeInt(candidate.book().getReadCountLast7Days())).reversed())
                .thenComparing(Comparator.comparingInt((Candidate candidate) -> safeInt(candidate.book().getViewCountLast7Days())).reversed())
                .thenComparing(candidate -> candidate.book().getId()));

        Map<String, String> authorNames = new java.util.HashMap<>();
        List<HookFeedResponse.Hook> items = candidates.stream().limit(safeLimit)
                .map(candidate -> toHook(candidate, authorNames))
                .toList();
        return new HookFeedResponse(items, taste, !taste.isEmpty());
    }

    private HookFeedResponse.Hook toHook(Candidate candidate, Map<String, String> authorNames) {
        Book book = candidate.book();
        Chapter chapter = candidate.chapter();
        String authorId = book.getAuthorId();
        String authorName = authorNames.computeIfAbsent(authorId == null ? "" : authorId,
                id -> users.findById(id).map(User::getUsername).orElse("WordWeft Writer"));
        int words = chapter.getWordCount();
        if (words <= 0) words = plainText(chapter.getContent()).split("\\s+").length;
        return new HookFeedResponse.Hook(
                book.getId(), chapter.getId(), book.getTitle(), chapter.getTitle(), authorId, authorName,
                book.getCoverUrl(), excerpt(chapter.getContent()), safeGenres(book), candidate.matchedGenres(),
                words, Math.max(1, (int) Math.ceil(words / 250.0)),
                chapter.getLikes() == null ? 0 : chapter.getLikes().size());
    }

    private Chapter firstPublishedChapter(Book book) {
        if (book.getChapters() == null) return null;
        return book.getChapters().stream()
                .filter(chapter -> chapter != null && "published".equalsIgnoreCase(chapter.getStatus()))
                .filter(chapter -> chapter.getContent() != null && !plainText(chapter.getContent()).isBlank())
                .findFirst().orElse(null);
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

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private record Candidate(Book book, Chapter chapter, List<String> matchedGenres) {}
}
