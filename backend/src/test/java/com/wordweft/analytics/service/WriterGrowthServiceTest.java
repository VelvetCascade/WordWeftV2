package com.wordweft.analytics.service;

import com.wordweft.analytics.dto.WriterAnalyticsResponse;
import com.wordweft.analytics.model.ChapterReadEvent;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WriterGrowthServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T10:00:00Z");

    @Mock BookRepository books;
    @Mock ChapterReadEventRepository events;
    @Mock ReadingProgressRepository progress;
    private WriterGrowthService service;
    private Book book;

    @BeforeEach
    void setUp() {
        service = new WriterGrowthService(books, events, progress);

        Chapter first = chapter("chapter-1", "Arrival", 8, Set.of("like-1", "like-2"), 3);
        first.setPublishedAt(Instant.parse("2026-08-28T10:00:00Z"));
        Chapter second = chapter("chapter-2", "Crossing", 4, Set.of("like-1"), 1);
        book = new Book();
        book.setId("book");
        book.setAuthorId("author");
        book.setTitle("North Star");
        book.setCoverUrl("cover.jpg");
        book.setChapters(List.of(first, second));
    }

    @Test
    void continuationUsesReadersWhoReachedTheNextChapter() {
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(events.findByBookIdInAndOccurredAtBetween(anyCollection(), any(), any()))
                .thenReturn(List.of(
                        event("chapter-1", "reader-a"),
                        event("chapter-1", "reader-b"),
                        event("chapter-2", "reader-a")));
        when(progress.findByBookIdIn(List.of("book"))).thenReturn(List.of(
                progress("reader-a", Map.of("chapter-1", 100, "chapter-2", 50), 75),
                progress("reader-b", Map.of("chapter-1", 100), 50)));

        WriterAnalyticsResponse result = service.getAnalytics("author", "book", NOW);

        assertEquals(50.0, result.chapterFunnel().get(0).continuationRate());
        assertEquals(2, result.summary().uniqueReaders());
        assertEquals(12, result.summary().views());
        assertEquals(1, result.summary().returningReaders());
        assertEquals(14, result.dailyTrend().size());
        assertEquals(2, result.dailyTrend().get(13).readers());
        assertEquals(3, result.dailyTrend().get(13).views());
        assertEquals("example.com", result.referrers().get(0).source());
        assertEquals(1, result.releaseMarkers().size());
    }

    @Test
    void portfolioIncludesOnlyTheWritersOwnStories() {
        Book other = new Book();
        other.setId("other");
        other.setAuthorId("author");
        other.setTitle("Second Story");
        when(books.findByAuthorId("author")).thenReturn(List.of(book, other));
        when(events.findByBookIdInAndOccurredAtBetween(anyCollection(), any(), any())).thenReturn(List.of());
        when(progress.findByBookIdIn(anyCollection())).thenReturn(List.of());

        WriterAnalyticsResponse result = service.getAnalytics("author", null, NOW);

        assertEquals(2, result.stories().size());
    }

    @Test
    void anotherAuthorsStoryIsRejected() {
        when(books.findById("book")).thenReturn(Optional.of(book));

        assertThrows(AccessDeniedException.class,
                () -> service.getAnalytics("intruder", "book", NOW));
    }

    private Chapter chapter(String id, String title, int views, Set<String> likes, int comments) {
        Chapter chapter = new Chapter();
        chapter.setId(id);
        chapter.setTitle(title);
        chapter.setStatus("published");
        chapter.setViewCount(views);
        chapter.setLikes(likes);
        chapter.setCommentCount(comments);
        return chapter;
    }

    private ChapterReadEvent event(String chapterId, String reader) {
        ChapterReadEvent event = new ChapterReadEvent();
        event.setBookId("book");
        event.setChapterId(chapterId);
        event.setReaderKeyHash(reader);
        event.setUserId(reader);
        event.setReadDate(LocalDate.parse("2026-08-29"));
        event.setOccurredAt(NOW);
        event.setReferrer("example.com");
        return event;
    }

    private ReadingProgress progress(String reader, Map<String, Integer> chapterValues, int overall) {
        ReadingProgress item = new ReadingProgress();
        item.setUserId(reader);
        item.setBookId("book");
        item.setOverallProgress(overall);
        Map<String, ReadingProgress.ChapterProgressItem> chapters = new HashMap<>();
        chapterValues.forEach((chapterId, value) -> {
            ReadingProgress.ChapterProgressItem chapter = new ReadingProgress.ChapterProgressItem();
            chapter.setProgress(value);
            chapters.put(chapterId, chapter);
        });
        item.setChapters(chapters);
        return item;
    }
}
