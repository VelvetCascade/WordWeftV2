package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.StoryBibleEntry;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.repository.StoryBibleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

/** Public projections are filtered before serialization, including titles and links.
 * Chapter URL context can narrow known information, never unlock an unread chapter. */
@Service
public class StoryBibleService {
    private final StoryBibleRepository entries;
    private final BookRepository books;
    private final PlanningAccessService planning;
    private final ContentAccessService access;
    private final ReadingProgressRepository progress;
    public StoryBibleService(StoryBibleRepository entries, BookRepository books, PlanningAccessService planning, ContentAccessService access, ReadingProgressRepository progress) {
        this.entries = entries; this.books = books; this.planning = planning; this.access = access; this.progress = progress;
    }
    public List<StoryBibleEntry> read(String bookId, String chapterId, String characterId, boolean readerView) {
        Book book = books.findAnalyticsMetadataById(bookId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        String user = access.currentUserId();
        boolean owner = user != null && user.equals(book.getAuthorId());
        if (!owner && (!"published".equals(book.getPublicationStatus()) || !access.canAccess(book))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story guide unavailable.");
        }
        List<Chapter> released = book.getChapters() == null ? List.of() : book.getChapters().stream().filter(ch -> "published".equals(ch.getStatus())).toList();
        Map<String, Integer> order = new HashMap<>();
        for (int i = 0; i < released.size(); i++) order.put(released.get(i).getId(), i);
        // Explicit unknown/draft context fails closed; omitted context means all known information.
        int through = chapterId == null || chapterId.isBlank() ? released.size() - 1 : order.getOrDefault(chapterId, -1);
        Set<String> completed = new HashSet<>();
        if (!owner && user != null) progress.findByUserIdAndBookId(user, bookId).ifPresent(record -> {
            if (record.getChapters() != null) record.getChapters().forEach((id, item) -> { if (item != null && item.getProgress() >= 90) completed.add(id); });
        });
        return entries.findByBookId(bookId).stream()
                .filter(entry -> characterId == null || characterId.isBlank() || entry.getCharacterIds().contains(characterId))
                .filter(entry -> owner && !readerView || "PUBLIC".equals(entry.getVisibility()) && (
                        entry.getRevealChapterId() == null || entry.getRevealChapterId().isBlank() ||
                        order.containsKey(entry.getRevealChapterId()) && order.get(entry.getRevealChapterId()) <= through && (owner || completed.contains(entry.getRevealChapterId()))))
                .sorted(Comparator.comparingInt((StoryBibleEntry entry) -> order.getOrDefault(entry.getRevealChapterId(), -1)).thenComparing(StoryBibleEntry::getId))
                .toList();
    }
    private void validate(Book book, StoryBibleEntry entry) {
        planning.validateChapter(book, entry.getRevealChapterId());
        planning.validateCharacters(book, entry.getCharacterIds());
        entry.setCharacterIds(entry.getCharacterIds().stream().distinct().toList());
        int count = entry.getCharacterIds().size();
        if (("RELATIONSHIP".equals(entry.getKind()) && count != 2) || (("CHARACTER".equals(entry.getKind()) || "MOTIVATION".equals(entry.getKind())) && count == 0))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link two characters for a relationship, or at least one character for a character update or motivation.");
        entry.setTitle(entry.getTitle().trim()); entry.setDetail(entry.getDetail().trim());
        if (entry.getRevealChapterId() != null && entry.getRevealChapterId().isBlank()) entry.setRevealChapterId(null);
    }
    public StoryBibleEntry create(StoryBibleEntry entry) {
        Book book = planning.requireOwner(entry.getBookId()); validate(book, entry); entry.setId(null); return entries.save(entry);
    }
    public StoryBibleEntry update(String id, StoryBibleEntry details) {
        planning.requireAccount();
        StoryBibleEntry existing = entries.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story Bible entry not found."));
        Book book = planning.requireOwner(existing.getBookId());
        details.setBookId(existing.getBookId()); validate(book, details); details.setId(id); return entries.save(details);
    }
    public void delete(String id) {
        planning.requireAccount();
        entries.findById(id).ifPresent(entry -> { planning.requireOwner(entry.getBookId()); entries.deleteById(id); });
    }
}
