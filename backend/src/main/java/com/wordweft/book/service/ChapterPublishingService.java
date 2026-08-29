package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.notification.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Service
public class ChapterPublishingService {
    private static final long MINIMUM_SCHEDULE_LEAD_SECONDS = 120;
    private static final long MAXIMUM_SCHEDULE_LEAD_DAYS = 365;

    private final BookRepository books;
    private final NotificationService notifications;
    private final Clock clock;

    public ChapterPublishingService(BookRepository books, NotificationService notifications) {
        this(books, notifications, Clock.systemUTC());
    }

    ChapterPublishingService(BookRepository books, NotificationService notifications, Clock clock) {
        this.books = books;
        this.notifications = notifications;
        this.clock = clock;
    }

    public Book schedule(String authorId, String bookId, String chapterId, Instant releaseAt) {
        Book book = requireOwnedBook(authorId, bookId);
        Chapter chapter = requireChapter(book, chapterId);
        requirePublishedStory(book);
        requireCompleteChapter(chapter);

        Instant now = clock.instant();
        if (releaseAt == null || releaseAt.isBefore(now.plusSeconds(MINIMUM_SCHEDULE_LEAD_SECONDS))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose a release time at least two minutes from now.");
        }
        if (releaseAt.isAfter(now.plus(MAXIMUM_SCHEDULE_LEAD_DAYS, ChronoUnit.DAYS))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose a release time within the next year.");
        }

        chapter.setStatus("scheduled");
        chapter.setScheduledAt(releaseAt);
        chapter.setPublishedAt(null);
        return books.save(book);
    }

    public Book cancelSchedule(String authorId, String bookId, String chapterId) {
        Book book = requireOwnedBook(authorId, bookId);
        Chapter chapter = requireChapter(book, chapterId);
        if ("scheduled".equals(chapter.getStatus())) {
            chapter.setStatus("draft");
            chapter.setScheduledAt(null);
            return books.save(book);
        }
        return book;
    }

    public Book publishNow(String authorId, String bookId, String chapterId) {
        Book book = requireOwnedBook(authorId, bookId);
        Chapter chapter = requireChapter(book, chapterId);
        if ("published".equals(chapter.getStatus())) {
            return book;
        }

        requirePublishedStory(book);
        requireCompleteChapter(chapter);
        Instant publishedAt = clock.instant();
        publishChapter(chapter, publishedAt);
        markStoryUpdated(book, publishedAt);
        Book saved = books.save(book);
        notifyFollowers(saved, chapter);
        return saved;
    }

    public boolean publishDue(Book book, Instant now) {
        boolean changed = false;
        for (Chapter chapter : book.getChapters()) {
            if ("scheduled".equals(chapter.getStatus())
                    && chapter.getScheduledAt() != null
                    && !chapter.getScheduledAt().isAfter(now)) {
                requireCompleteChapter(chapter);
                publishChapter(chapter, now);
                changed = true;
            }
        }

        if (!changed) {
            return false;
        }

        markStoryUpdated(book, now);
        books.save(book);
        book.getChapters().stream()
                .filter(chapter -> now.equals(chapter.getPublishedAt()))
                .forEach(chapter -> notifyFollowers(book, chapter));
        return true;
    }

    private Book requireOwnedBook(String authorId, String bookId) {
        Book book = books.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (authorId == null || !authorId.equals(book.getAuthorId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to manage this story.");
        }
        return book;
    }

    private Chapter requireChapter(Book book, String chapterId) {
        return book.getChapters().stream()
                .filter(chapter -> chapterId.equals(chapter.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
    }

    private void requirePublishedStory(Book book) {
        if (!"published".equals(book.getPublicationStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Publish the story before scheduling a chapter.");
        }
    }

    private void requireCompleteChapter(Chapter chapter) {
        if (isBlank(chapter.getTitle()) || isBlank(stripHtml(chapter.getContent()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Add a chapter title and content before scheduling it.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String stripHtml(String value) {
        return value == null ? "" : value.replaceAll("<[^>]*>", " ");
    }

    private void publishChapter(Chapter chapter, Instant publishedAt) {
        chapter.setStatus("published");
        chapter.setScheduledAt(null);
        chapter.setPublishedAt(publishedAt);
    }

    private void markStoryUpdated(Book book, Instant publishedAt) {
        book.setLastUpdatedAt(LocalDate.ofInstant(publishedAt, ZoneOffset.UTC));
    }

    private void notifyFollowers(Book book, Chapter chapter) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("bookId", book.getId());
        metadata.put("bookTitle", book.getTitle());
        metadata.put("chapterTitle", chapter.getTitle());
        if (book.getCoverUrl() != null) {
            metadata.put("coverUrl", book.getCoverUrl());
        }
        notifications.notifyFollowers(
                book.getAuthorId(),
                "AUTHOR_NEW_CHAPTER",
                "CHAPTER",
                chapter.getId(),
                "published a new chapter: " + chapter.getTitle(),
                metadata);
    }
}
