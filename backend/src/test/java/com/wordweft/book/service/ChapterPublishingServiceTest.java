package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChapterPublishingServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T10:00:00Z");

    @Mock BookRepository books;
    @Mock NotificationService notifications;

    private ChapterPublishingService service;
    private Book book;
    private Chapter chapter;

    @BeforeEach
    void setUp() {
        service = new ChapterPublishingService(books, notifications, Clock.fixed(NOW, ZoneOffset.UTC));
        chapter = new Chapter();
        chapter.setId("chapter-1");
        chapter.setTitle("The Return");
        chapter.setContent("A complete chapter ready for readers.");
        chapter.updateWordCount();

        book = new Book();
        book.setId("book-1");
        book.setTitle("North Star");
        book.setAuthorId("author-1");
        book.setPublicationStatus("published");
        book.setChapters(List.of(chapter));

        lenient().when(books.findById("book-1")).thenReturn(Optional.of(book));
        lenient().when(books.save(any(Book.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void scheduleStoresTheUtcInstantAndScheduledStatus() {
        Instant release = NOW.plus(2, ChronoUnit.HOURS);

        service.schedule("author-1", "book-1", "chapter-1", release);

        assertEquals("scheduled", chapter.getStatus());
        assertEquals(release, chapter.getScheduledAt());
        assertNull(chapter.getPublishedAt());
    }

    @Test
    void scheduleRejectsAReleaseLessThanTwoMinutesAway() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(119)));

        assertEquals(400, error.getStatusCode().value());
        assertEquals("Choose a release time at least two minutes from now.", error.getReason());
        assertEquals("draft", chapter.getStatus());
    }

    @Test
    void scheduleRejectsAnotherWritersStory() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.schedule("other-author", "book-1", "chapter-1", NOW.plusSeconds(600)));

        assertEquals(403, error.getStatusCode().value());
        assertEquals("You do not have permission to manage this story.", error.getReason());
    }

    @Test
    void scheduleRequiresACompleteChapterAndPublishedStory() {
        chapter.setContent("   ");

        ResponseStatusException emptyChapter = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        assertEquals("Add a chapter title and content before scheduling it.", emptyChapter.getReason());

        chapter.setContent("Ready again");
        book.setPublicationStatus("draft");
        ResponseStatusException draftStory = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        assertEquals("Publish the story before scheduling a chapter.", draftStory.getReason());
    }

    @Test
    void cancelScheduleReturnsTheChapterToDraft() {
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.plusSeconds(600));

        service.cancelSchedule("author-1", "book-1", "chapter-1");

        assertEquals("draft", chapter.getStatus());
        assertNull(chapter.getScheduledAt());
    }

    @Test
    void publishNowClearsTheScheduleAndDoesNotNotifyTwice() {
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.plusSeconds(600));

        service.publishNow("author-1", "book-1", "chapter-1");
        service.publishNow("author-1", "book-1", "chapter-1");

        assertEquals("published", chapter.getStatus());
        assertNull(chapter.getScheduledAt());
        assertEquals(NOW, chapter.getPublishedAt());
        verify(notifications, times(1)).notifyFollowers(
                eq("author-1"), eq("AUTHOR_NEW_CHAPTER"), eq("CHAPTER"), eq("chapter-1"),
                contains("The Return"), argThat(metadata -> "North Star".equals(metadata.get("bookTitle"))));
    }

    @Test
    void publishDueTransitionsOnlyChaptersWhoseTimeHasArrived() {
        Chapter later = new Chapter();
        later.setId("chapter-2");
        later.setTitle("Later");
        later.setContent("Not yet");
        later.setStatus("scheduled");
        later.setScheduledAt(NOW.plusSeconds(60));
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.minusSeconds(1));
        book.setChapters(List.of(chapter, later));

        boolean changed = service.publishDue(book, NOW);

        assertTrue(changed);
        assertEquals("published", chapter.getStatus());
        assertEquals("scheduled", later.getStatus());
        verify(notifications, times(1)).notifyFollowers(anyString(), anyString(), anyString(), anyString(), anyString(), anyMap());
    }
}
