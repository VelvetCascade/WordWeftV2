package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.mockito.Mockito.*;

class ScheduledChapterPublisherTest {
    @Test
    void oneBrokenStoryDoesNotPreventLaterDueStoriesFromPublishing() {
        Instant now = Instant.parse("2026-08-29T10:00:00Z");
        Book broken = new Book();
        broken.setId("broken");
        Book healthy = new Book();
        healthy.setId("healthy");
        BookRepository books = mock(BookRepository.class);
        ChapterPublishingService publishing = mock(ChapterPublishingService.class);
        when(books.findBooksWithDueChapters(now)).thenReturn(List.of(broken, healthy));
        when(publishing.publishDue(broken, now)).thenThrow(new IllegalStateException("broken story"));

        ScheduledChapterPublisher scheduler = new ScheduledChapterPublisher(
                books, publishing, Clock.fixed(now, ZoneOffset.UTC));
        scheduler.publishDueChapters();

        verify(publishing).publishDue(healthy, now);
    }
}
