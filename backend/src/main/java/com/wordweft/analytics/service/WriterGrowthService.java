package com.wordweft.analytics.service;

import com.wordweft.analytics.dto.WriterAnalyticsResponse;
import com.wordweft.analytics.model.ChapterReadEvent;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class WriterGrowthService {
    private static final int TREND_DAYS = 14;
    private static final int RETENTION_DAYS = 400;

    private final BookRepository books;
    private final ChapterReadEventRepository events;
    private final ReadingProgressRepository progress;

    public WriterGrowthService(
            BookRepository books,
            ChapterReadEventRepository events,
            ReadingProgressRepository progress) {
        this.books = books;
        this.events = events;
        this.progress = progress;
    }

    public WriterAnalyticsResponse getAnalytics(String authorId, String bookId, Instant now) {
        List<Book> selected = selectBooks(authorId, bookId);
        List<String> bookIds = selected.stream().map(Book::getId).filter(Objects::nonNull).toList();
        if (bookIds.isEmpty()) {
            return emptyWithTrend(now);
        }

        List<ChapterReadEvent> readEvents = events.findByBookIdInAndOccurredAtBetween(
                bookIds, now.minus(RETENTION_DAYS, ChronoUnit.DAYS), now.plusSeconds(1));
        List<ReadingProgress> readingProgress = progress.findByBookIdIn(bookIds);
        readEvents = readEvents != null ? readEvents : List.of();
        readingProgress = readingProgress != null ? readingProgress : List.of();

        Map<String, List<ChapterReadEvent>> eventsByBook = readEvents.stream()
                .collect(Collectors.groupingBy(ChapterReadEvent::getBookId));
        Map<String, List<ReadingProgress>> progressByBook = readingProgress.stream()
                .collect(Collectors.groupingBy(ReadingProgress::getBookId));

        List<WriterAnalyticsResponse.StorySummary> stories = selected.stream()
                .map(book -> storySummary(
                        book,
                        eventsByBook.getOrDefault(book.getId(), List.of()),
                        progressByBook.getOrDefault(book.getId(), List.of())))
                .toList();

        List<WriterAnalyticsResponse.ChapterFunnelRow> funnel = new ArrayList<>();
        for (Book book : selected) {
            funnel.addAll(chapterFunnel(
                    book,
                    eventsByBook.getOrDefault(book.getId(), List.of()),
                    progressByBook.getOrDefault(book.getId(), List.of())));
        }

        Set<String> readers = readEvents.stream().map(this::readerIdentity).collect(Collectors.toSet());
        if (readers.isEmpty()) {
            readers.addAll(readingProgress.stream().map(this::progressIdentity).collect(Collectors.toSet()));
        }
        int views = selected.stream().flatMap(book -> chapters(book).stream())
                .mapToInt(Chapter::getViewCount).sum();
        int likes = selected.stream().flatMap(book -> chapters(book).stream())
                .mapToInt(chapter -> chapter.getLikes() == null ? 0 : chapter.getLikes().size()).sum();
        int comments = selected.stream().flatMap(book -> chapters(book).stream())
                .mapToInt(Chapter::getCommentCount).sum();
        int completed = (int) readingProgress.stream().filter(item -> item.getOverallProgress() >= 90).count();
        int returning = returningReaders(readEvents, readingProgress);
        double averageCompletion = readingProgress.stream()
                .mapToInt(ReadingProgress::getOverallProgress).average().orElse(0);

        WriterAnalyticsResponse.Summary summary = new WriterAnalyticsResponse.Summary(
                readers.size(), views, completed, rate(completed, readers.size()), returning,
                rounded(averageCompletion), likes, comments);

        return new WriterAnalyticsResponse(
                summary,
                stories,
                funnel,
                dailyTrend(readEvents, now),
                referrers(readEvents),
                releaseMarkers(selected, now));
    }

    private List<Book> selectBooks(String authorId, String bookId) {
        if (bookId == null || bookId.isBlank()) {
            List<Book> owned = books.findByAuthorId(authorId);
            return owned != null ? owned : List.of();
        }
        Book selected = books.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (!authorId.equals(selected.getAuthorId())) {
            throw new AccessDeniedException("You do not have permission to view this story's analytics.");
        }
        return List.of(selected);
    }

    private WriterAnalyticsResponse.StorySummary storySummary(
            Book book,
            List<ChapterReadEvent> bookEvents,
            List<ReadingProgress> bookProgress) {
        Set<String> readers = bookEvents.stream().map(this::readerIdentity).collect(Collectors.toSet());
        if (readers.isEmpty()) {
            readers.addAll(bookProgress.stream().map(this::progressIdentity).collect(Collectors.toSet()));
        }
        int completed = (int) bookProgress.stream().filter(item -> item.getOverallProgress() >= 90).count();
        int views = chapters(book).stream().mapToInt(Chapter::getViewCount).sum();
        int likes = chapters(book).stream()
                .mapToInt(chapter -> chapter.getLikes() == null ? 0 : chapter.getLikes().size()).sum();
        int comments = chapters(book).stream().mapToInt(Chapter::getCommentCount).sum();
        return new WriterAnalyticsResponse.StorySummary(
                book.getId(), book.getTitle(), book.getCoverUrl(), readers.size(), views, completed,
                rate(completed, readers.size()), likes, comments);
    }

    private List<WriterAnalyticsResponse.ChapterFunnelRow> chapterFunnel(
            Book book,
            List<ChapterReadEvent> bookEvents,
            List<ReadingProgress> bookProgress) {
        List<Chapter> chapters = chapters(book).stream()
                .filter(chapter -> "published".equals(chapter.getStatus()))
                .toList();
        Map<String, Set<String>> reached = new HashMap<>();
        Map<String, Set<String>> completed = new HashMap<>();
        for (Chapter chapter : chapters) {
            reached.put(chapter.getId(), new HashSet<>());
            completed.put(chapter.getId(), new HashSet<>());
        }
        for (ChapterReadEvent event : bookEvents) {
            Set<String> readers = reached.get(event.getChapterId());
            if (readers != null) {
                readers.add(readerIdentity(event));
            }
        }
        for (ReadingProgress item : bookProgress) {
            Map<String, ReadingProgress.ChapterProgressItem> chapterProgress = item.getChapters();
            if (chapterProgress == null) {
                continue;
            }
            chapterProgress.forEach((chapterId, value) -> {
                if (value == null || value.getProgress() <= 0 || !reached.containsKey(chapterId)) {
                    return;
                }
                String reader = progressIdentity(item);
                reached.get(chapterId).add(reader);
                if (value.getProgress() >= 90) {
                    completed.get(chapterId).add(reader);
                }
            });
        }

        List<WriterAnalyticsResponse.ChapterFunnelRow> result = new ArrayList<>();
        for (int index = 0; index < chapters.size(); index++) {
            Chapter chapter = chapters.get(index);
            int reachedCount = reached.get(chapter.getId()).size();
            int completedCount = completed.get(chapter.getId()).size();
            int nextReached = index + 1 < chapters.size()
                    ? reached.get(chapters.get(index + 1).getId()).size()
                    : 0;
            result.add(new WriterAnalyticsResponse.ChapterFunnelRow(
                    book.getId(), chapter.getId(), chapter.getTitle(), index + 1,
                    chapter.getViewCount(), reachedCount, completedCount,
                    rate(completedCount, reachedCount),
                    index + 1 < chapters.size() ? rate(nextReached, reachedCount) : 0,
                    chapter.getLikes() == null ? 0 : chapter.getLikes().size(),
                    chapter.getCommentCount()));
        }
        return result;
    }

    private List<WriterAnalyticsResponse.DailyTrendPoint> dailyTrend(
            List<ChapterReadEvent> readEvents, Instant now) {
        LocalDate end = LocalDate.ofInstant(now, ZoneOffset.UTC);
        LocalDate start = end.minusDays(TREND_DAYS - 1L);
        List<WriterAnalyticsResponse.DailyTrendPoint> points = new ArrayList<>();
        for (int offset = 0; offset < TREND_DAYS; offset++) {
            LocalDate date = start.plusDays(offset);
            List<ChapterReadEvent> onDay = readEvents.stream()
                    .filter(event -> date.equals(event.getReadDate())).toList();
            int readers = onDay.stream().map(this::readerIdentity).collect(Collectors.toSet()).size();
            points.add(new WriterAnalyticsResponse.DailyTrendPoint(date, readers, onDay.size()));
        }
        return points;
    }

    private List<WriterAnalyticsResponse.ReferrerTotal> referrers(List<ChapterReadEvent> readEvents) {
        Map<String, List<ChapterReadEvent>> bySource = readEvents.stream()
                .collect(Collectors.groupingBy(event ->
                        event.getReferrer() == null || event.getReferrer().isBlank()
                                ? "direct" : event.getReferrer()));
        return bySource.entrySet().stream()
                .map(entry -> new WriterAnalyticsResponse.ReferrerTotal(
                        entry.getKey(),
                        entry.getValue().stream().map(this::readerIdentity).collect(Collectors.toSet()).size(),
                        entry.getValue().size()))
                .sorted(Comparator.comparingInt(WriterAnalyticsResponse.ReferrerTotal::views).reversed())
                .toList();
    }

    private List<WriterAnalyticsResponse.ReleaseMarker> releaseMarkers(List<Book> selected, Instant now) {
        Instant from = now.minus(TREND_DAYS - 1L, ChronoUnit.DAYS);
        List<WriterAnalyticsResponse.ReleaseMarker> result = new ArrayList<>();
        for (Book book : selected) {
            for (Chapter chapter : chapters(book)) {
                if (chapter.getPublishedAt() != null
                        && !chapter.getPublishedAt().isBefore(from)
                        && !chapter.getPublishedAt().isAfter(now)) {
                    result.add(new WriterAnalyticsResponse.ReleaseMarker(
                            book.getId(), chapter.getId(), chapter.getTitle(), chapter.getPublishedAt()));
                }
            }
        }
        result.sort(Comparator.comparing(WriterAnalyticsResponse.ReleaseMarker::publishedAt));
        return result;
    }

    private int returningReaders(
            List<ChapterReadEvent> readEvents,
            List<ReadingProgress> readingProgress) {
        Map<String, Set<String>> chaptersByReader = new HashMap<>();
        for (ChapterReadEvent event : readEvents) {
            chaptersByReader.computeIfAbsent(readerIdentity(event), ignored -> new HashSet<>())
                    .add(event.getChapterId());
        }
        for (ReadingProgress item : readingProgress) {
            if (item.getChapters() == null) {
                continue;
            }
            item.getChapters().forEach((chapterId, value) -> {
                if (value != null && value.getProgress() > 0) {
                    chaptersByReader.computeIfAbsent(progressIdentity(item), ignored -> new HashSet<>())
                            .add(chapterId);
                }
            });
        }
        return (int) chaptersByReader.values().stream().filter(chapters -> chapters.size() >= 2).count();
    }

    private String readerIdentity(ChapterReadEvent event) {
        return event.getUserId() != null && !event.getUserId().isBlank()
                ? "user:" + event.getUserId()
                : "anonymous:" + event.getReaderKeyHash();
    }

    private String progressIdentity(ReadingProgress item) {
        return "user:" + item.getUserId();
    }

    private List<Chapter> chapters(Book book) {
        return book.getChapters() != null ? book.getChapters() : List.of();
    }

    private double rate(int numerator, int denominator) {
        return denominator <= 0 ? 0 : rounded(numerator * 100.0 / denominator);
    }

    private double rounded(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private WriterAnalyticsResponse emptyWithTrend(Instant now) {
        return new WriterAnalyticsResponse(
                WriterAnalyticsResponse.empty().summary(),
                List.of(), List.of(), dailyTrend(List.of(), now), List.of(), List.of());
    }
}
