package com.wordweft.book.service;

import com.wordweft.book.model.PassageBookmark;
import com.wordweft.book.repository.PassageBookmarkRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PassageBookmarkService {
    private final PassageBookmarkRepository bookmarks;
    private final ChapterContentService content;
    private final ContentAccessService access;
    public PassageBookmarkService(PassageBookmarkRepository bookmarks, ChapterContentService content, ContentAccessService access) {
        this.bookmarks = bookmarks; this.content = content; this.access = access;
    }
    private String account() {
        String id = access.currentUserId();
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to save a private passage.");
        return id;
    }
    public List<PassageBookmark> list(String bookId) {
        String userId = account();
        // Recheck current access after a story/rating/release change. Never return a now-locked passage.
        var permittedChapters = new java.util.HashMap<String, Boolean>();
        return bookmarks.findByUserIdAndBookIdOrderByUpdatedAtDesc(userId, bookId).stream().filter(bookmark ->
            permittedChapters.computeIfAbsent(bookmark.getChapterId(), chapterId -> {
                try { content.load(bookId, chapterId); return true; }
                catch (ChapterContentService.ContentNotFoundException | com.wordweft.exception.ContentRestrictedException | com.wordweft.exception.AuthRequiredException unavailable) { return false; }
            })).toList();
    }
    public PassageBookmark save(String bookId, String chapterId, int paragraphIndex, String note) {
        String userId = account();
        if (note == null) note = "";
        if (note.length() > 4000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Private notes can be up to 4,000 characters.");
        var permitted = content.load(bookId, chapterId);
        List<Element> blocks = Jsoup.parseBodyFragment(permitted.content()).body().select("p,h1,h2,h3,h4,h5,h6,blockquote,ul,ol,pre").stream().toList();
        if (paragraphIndex < 0 || paragraphIndex >= blocks.size()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This passage is no longer available.");
        // Deterministic account-scoped IDs make retried saves idempotent without exposing another account's notes.
        String key = UUID.nameUUIDFromBytes((userId + "\u0000" + bookId + "\u0000" + chapterId + "\u0000" + paragraphIndex).getBytes(StandardCharsets.UTF_8)).toString();
        PassageBookmark bookmark = new PassageBookmark();
        bookmark.setId(key); bookmark.setUserId(userId); bookmark.setBookId(bookId); bookmark.setChapterId(chapterId);
        bookmark.setParagraphIndex(paragraphIndex); bookmark.setQuote(blocks.get(paragraphIndex).text());
        bookmark.setNote(note.trim()); bookmark.setUpdatedAt(Instant.now());
        return bookmarks.save(bookmark);
    }
    public void delete(String id) {
        String userId = account();
        PassageBookmark bookmark = bookmarks.findById(id).orElse(null);
        if (bookmark != null && userId.equals(bookmark.getUserId())) bookmarks.delete(bookmark);
    }
}
