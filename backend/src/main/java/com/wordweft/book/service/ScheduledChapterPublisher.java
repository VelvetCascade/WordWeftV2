package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
public class ScheduledChapterPublisher {
    private static final Logger logger = LoggerFactory.getLogger(ScheduledChapterPublisher.class);

    private final BookRepository books;
    private final ChapterPublishingService publishing;
    private final Clock clock;

    @Autowired
    public ScheduledChapterPublisher(BookRepository books, ChapterPublishingService publishing) {
        this(books, publishing, Clock.systemUTC());
    }

    ScheduledChapterPublisher(BookRepository books, ChapterPublishingService publishing, Clock clock) {
        this.books = books;
        this.publishing = publishing;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${wordweft.scheduling.publisher-delay-ms:30000}")
    public void publishDueChapters() {
        Instant now = clock.instant();
        for (Book book : books.findBooksWithDueChapters(now)) {
            try {
                publishing.publishDue(book, now);
            } catch (RuntimeException exception) {
                logger.error("Could not publish due chapters for story {}", book.getId(), exception);
            }
        }
    }
}
