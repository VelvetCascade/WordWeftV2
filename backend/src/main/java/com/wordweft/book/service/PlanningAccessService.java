package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CharacterRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Scenes and notes are private author planning data, including on published stories. */
@Service
public class PlanningAccessService {
    private final BookRepository books;
    private final CharacterRepository characters;
    private final ContentAccessService access;
    public PlanningAccessService(BookRepository books, CharacterRepository characters, ContentAccessService access) {
        this.books = books; this.characters = characters; this.access = access;
    }
    public String requireAccount() {
        String userId = access.currentUserId();
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to access your story planning.");
        return userId;
    }
    public Book requireOwner(String bookId) {
        String userId = requireAccount();
        if (bookId == null || bookId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A story is required.");
        Book book = books.findAnalyticsMetadataById(bookId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (!userId.equals(book.getAuthorId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the story's author can access its planning.");
        return book;
    }
    public Book requireChapterOwner(String chapterId) {
        String userId = requireAccount();
        Book book = books.findPlanningMetadataByChapterId(chapterId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found."));
        if (!userId.equals(book.getAuthorId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the story's author can access its planning.");
        return book;
    }
    public void validateChapter(Book book, String chapterId) {
        if (chapterId == null || chapterId.isBlank()) return;
        if (book.getChapters() == null || book.getChapters().stream().noneMatch(chapter -> chapterId.equals(chapter.getId())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a chapter from this story.");
    }
    public void validateCharacters(Book book, List<String> characterIds) {
        if (characterIds == null) return;
        if (characterIds.size() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A scene can include at most 200 characters.");
        for (String characterId : characterIds) {
            if (characterId == null || characterId.isBlank() || characters.findById(characterId).filter(character -> book.getId().equals(character.getBookId())).isEmpty())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose characters from this story.");
        }
    }
}
