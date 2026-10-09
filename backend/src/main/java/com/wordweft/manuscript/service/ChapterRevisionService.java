package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.PublishedChapterView;
import com.wordweft.manuscript.model.ChapterRevision;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class ChapterRevisionService {
    private static final int MAX_REVISIONS = 50;
    private static final long AUTOSAVE_INTERVAL_MINUTES = 5;

    private final ChapterRevisionRepository revisions;
    private final BookRepository books;
    private final Clock clock;
    @Autowired(required = false)
    com.wordweft.book.service.ChapterWriteService chapterWrites;

    @Autowired
    public ChapterRevisionService(ChapterRevisionRepository revisions, BookRepository books) {
        this(revisions, books, Clock.systemUTC());
    }

    ChapterRevisionService(ChapterRevisionRepository revisions, BookRepository books, Clock clock) {
        this.revisions = revisions;
        this.books = books;
        this.clock = clock;
    }

    public Optional<ChapterRevision> capture(
            String authorId,
            Book book,
            Chapter chapter,
            String reason,
            boolean force) {
        requireOwner(authorId, book);
        if (blank(chapter.getTitle()) && blank(stripHtml(chapter.getContent()))) {
            return Optional.empty();
        }

        String hash = hash(chapter.getTitle() + "\n" + chapter.getContent() + "\n" + chapter.getContentWarnings() + "\n" + chapter.getDisclaimerNote());
        Optional<ChapterRevision> latest = revisions.findFirstByChapterIdOrderByCreatedAtDesc(chapter.getId());
        if (latest.isPresent() && hash.equals(latest.get().getContentHash())) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        if (!force && latest.isPresent() && latest.get().getCreatedAt() != null
                && latest.get().getCreatedAt().isAfter(now.minus(AUTOSAVE_INTERVAL_MINUTES, ChronoUnit.MINUTES))) {
            return Optional.empty();
        }

        ChapterRevision revision = new ChapterRevision();
        revision.setAuthorId(authorId);
        revision.setBookId(book.getId());
        revision.setChapterId(chapter.getId());
        revision.setTitle(chapter.getTitle());
        revision.setContent(chapter.getContent());
        revision.setContentWarnings(chapter.getContentWarnings() == null ? java.util.List.of() : new java.util.ArrayList<>(chapter.getContentWarnings()));
        revision.setDisclaimerNote(chapter.getDisclaimerNote());
        revision.setWordCount(ManuscriptText.wordCount(chapter.getContent()));
        revision.setReason(reason);
        revision.setContentHash(hash);
        revision.setPlainTextPreview(preview(chapter.getContent()));
        revision.setCreatedAt(now);
        ChapterRevision saved = revisions.save(revision);
        prune(chapter.getId());
        return Optional.ofNullable(saved != null ? saved : revision);
    }

    public List<ChapterRevision> list(String authorId, String bookId, String chapterId) {
        OwnedChapter owned = requireOwnedChapter(authorId, bookId, chapterId);
        List<ChapterRevision> result = revisions.findByChapterIdOrderByCreatedAtDesc(owned.chapter().getId());
        return result == null ? List.of() : result.stream().limit(MAX_REVISIONS).map(this::semanticRevision).toList();
    }

    public Book restore(String authorId, String bookId, String chapterId, String revisionId) {
        return restore(authorId, bookId, chapterId, revisionId, null);
    }

    public Book restore(String authorId, String bookId, String chapterId, String revisionId, Long expectedRevision) {
        return restore(authorId, bookId, chapterId, revisionId, expectedRevision, false);
    }

    public ChapterRevision get(String authorId, String bookId, String chapterId, String revisionId) {
        requireOwnedChapter(authorId, bookId, chapterId);
        return semanticRevision(requireRevision(authorId, bookId, chapterId, revisionId));
    }

    public ChapterRevision checkpoint(String authorId, String bookId, String chapterId, String label) {
        return checkpoint(authorId, bookId, chapterId, label, null);
    }

    public ChapterRevision checkpoint(String authorId, String bookId, String chapterId, String label, Long expectedRevision) {
        OwnedChapter owned = requireOwnedChapter(authorId, bookId, chapterId);
        com.wordweft.book.service.ChapterWriteService.requireRevision(owned.chapter(), expectedRevision);
        if (label != null && label.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checkpoint names must be 100 characters or fewer.");
        ChapterRevision revision = new ChapterRevision();
        revision.setAuthorId(authorId); revision.setBookId(bookId); revision.setChapterId(chapterId);
        revision.setTitle(owned.chapter().getTitle()); revision.setContent(owned.chapter().getContent());
        revision.setContentWarnings(owned.chapter().getContentWarnings() == null ? List.of() : new java.util.ArrayList<>(owned.chapter().getContentWarnings()));
        revision.setDisclaimerNote(owned.chapter().getDisclaimerNote());
        revision.setWordCount(ManuscriptText.wordCount(revision.getContent())); revision.setReason("CHECKPOINT");
        revision.setPlainTextPreview(preview(revision.getContent())); revision.setCreatedAt(clock.instant());
        revision.setContentHash(hash(revision.getTitle() + "\n" + revision.getContent() + "\n" + revision.getContentWarnings() + "\n" + revision.getDisclaimerNote()));
        revision.setLabel(label == null || label.isBlank() ? null : label.trim());
        ChapterRevision saved = revisions.save(revision);
        prune(chapterId);
        return saved == null ? revision : saved;
    }

    private ChapterRevision semanticRevision(ChapterRevision revision) {
        revision.setWordCount(ManuscriptText.wordCount(revision.getContent()));
        revision.setPlainTextPreview(preview(revision.getContent()));
        return revision;
    }

    private ChapterRevision requireRevision(String authorId, String bookId, String chapterId, String revisionId) {
        return revisions.findById(revisionId)
                .filter(candidate -> bookId.equals(candidate.getBookId()))
                .filter(candidate -> chapterId.equals(candidate.getChapterId()))
                .filter(candidate -> authorId.equals(candidate.getAuthorId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Revision not found."));
    }

    public Book restore(String authorId, String bookId, String chapterId, String revisionId, Long expectedRevision, boolean workingDraft) {
        OwnedChapter owned = requireOwnedChapter(authorId, bookId, chapterId);
        com.wordweft.book.service.ChapterWriteService.requireRevision(owned.chapter(), expectedRevision);
        var snapshot = com.wordweft.book.service.ChapterWriteService.snapshotQuery(owned.book());
        ChapterRevision revision = requireRevision(authorId, bookId, chapterId, revisionId);

        capture(authorId, owned.book(), owned.chapter(), "PRE_RESTORE", true);
        PublishedChapterView.preserveLegacySnapshot(owned.chapter());
        owned.chapter().setTitle(revision.getTitle());
        owned.chapter().setContent(revision.getContent());
        if (revision.getContentWarnings() != null) {
            owned.chapter().setContentWarnings(new java.util.ArrayList<>(revision.getContentWarnings()));
            owned.chapter().setDisclaimerNote(revision.getDisclaimerNote());
        }
        owned.chapter().updateWordCount();
        if (workingDraft) {
            long previousRevision = owned.chapter().getEditRevision();
            owned.chapter().setEditRevision(previousRevision + 1);
            if (chapterWrites == null) return books.save(owned.book());
            chapterWrites.restoreWorkingDraft(owned.book(), owned.chapter(), snapshot);
            return owned.book();
        }
        int restoredIndex = owned.book().getChapters().indexOf(owned.chapter());
        for (int index = restoredIndex; index < owned.book().getChapters().size(); index++) {
            Chapter affected = owned.book().getChapters().get(index);
            affected.setEditRevision(affected.getEditRevision() + 1);
            affected.setStatus("draft");
            affected.setScheduledAt(null);
            affected.setPublishedAt(null);
        }
        if (chapterWrites == null) return books.save(owned.book()); // Unit-test constructor only.
        chapterWrites.restore(owned.book(), snapshot);
        return owned.book();
    }

    private OwnedChapter requireOwnedChapter(String authorId, String bookId, String chapterId) {
        Book book = books.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        requireOwner(authorId, book);
        Chapter chapter = book.getChapters().stream()
                .filter(candidate -> chapterId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
        return new OwnedChapter(book, chapter);
    }

    private void requireOwner(String authorId, Book book) {
        if (authorId == null || !authorId.equals(book.getAuthorId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You do not have permission to manage this story.");
        }
    }

    private void prune(String chapterId) {
        List<ChapterRevision> all = revisions.findByChapterIdOrderByCreatedAtDesc(chapterId);
        if (all != null && all.size() > MAX_REVISIONS) {
            revisions.deleteAll(all.subList(MAX_REVISIONS, all.size()));
        }
    }

    private String preview(String content) {
        String text = stripHtml(content).replaceAll("\\s+", " ").trim();
        return text.length() <= 240 ? text : text.substring(0, 237) + "...";
    }

    private String stripHtml(String content) {
        return ManuscriptText.plainText(content);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private record OwnedChapter(Book book, Chapter chapter) {}
}
