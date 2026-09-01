package com.wordweft.analytics.service;

import com.wordweft.analytics.model.ChapterReadEvent;
import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class ChapterReadEventService {
    private static final long RETENTION_DAYS = 400;

    private final ChapterReadEventRepository events;
    private final BookRepository books;

    public ChapterReadEventService(ChapterReadEventRepository events, BookRepository books) {
        this.events = events;
        this.books = books;
    }

    public ChapterReadEvent record(
            String bookId,
            String chapterId,
            String userId,
            String sessionId,
            String referrer,
            Instant now) {
        Book book = books.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        Chapter chapter = book.getChapters().stream()
                .filter(candidate -> chapterId.equals(candidate.getId()))
                .filter(candidate -> "published".equals(candidate.getStatus()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
        if (!"published".equals(book.getPublicationStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found.");
        }

        String readerKey = readerKey(userId, sessionId);
        String readerKeyHash = sha256(readerKey);
        LocalDate readDate = LocalDate.ofInstant(now, ZoneOffset.UTC);

        ChapterReadEvent event = new ChapterReadEvent();
        event.setId(sha256(String.join(":", bookId, chapterId, readerKeyHash, readDate.toString())));
        event.setBookId(bookId);
        event.setChapterId(chapterId);
        event.setReaderKeyHash(readerKeyHash);
        event.setUserId(userId);
        event.setOccurredAt(now);
        event.setReadDate(readDate);
        event.setReferrer(normalizeReferrer(referrer));
        event.setExpiresAt(now.plus(RETENTION_DAYS, ChronoUnit.DAYS));
        ChapterReadEvent saved = events.save(event);

        chapter.setViewCount(chapter.getViewCount() + 1);
        book.setViewCountLast7Days((book.getViewCountLast7Days() == null ? 0 : book.getViewCountLast7Days()) + 1);
        books.save(book);
        return saved;
    }

    private String readerKey(String userId, String sessionId) {
        if (userId != null && !userId.isBlank()) {
            return "user:" + userId;
        }
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid reader session is required.");
        }
        try {
            return "session:" + UUID.fromString(sessionId);
        } catch (IllegalArgumentException invalidUuid) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid reader session is required.");
        }
    }

    private String normalizeReferrer(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return "direct";
        }
        try {
            String host = URI.create(referrer).getHost();
            if (host == null || host.isBlank()) {
                return "direct";
            }
            host = host.toLowerCase(Locale.ROOT);
            if (host.equals("localhost")
                    || host.equals("127.0.0.1")
                    || host.equals("wordweftstudio.com")
                    || host.endsWith(".wordweftstudio.com")) {
                return "wordweft";
            }
            return host.length() > 120 ? host.substring(0, 120) : host;
        } catch (IllegalArgumentException invalidUri) {
            return "direct";
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
