package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.Character;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CharacterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanningAccessServiceTest {
    @Mock BookRepository books;
    @Mock CharacterRepository characters;
    @Mock ContentAccessService account;
    PlanningAccessService access;
    Book book;
    @BeforeEach void setup() {
        access = new PlanningAccessService(books, characters, account);
        book = new Book(); book.setId("story"); book.setAuthorId("writer");
        Chapter chapter = new Chapter(); chapter.setId("chapter"); book.setChapters(List.of(chapter));
    }
    @Test void ownerCanAccessWhileOtherAccountsAndGuestsCannotEvenForPublishedStories() {
        book.setPublicationStatus("published"); when(books.findAnalyticsMetadataById("story")).thenReturn(Optional.of(book));
        when(account.currentUserId()).thenReturn("writer"); assertSame(book, access.requireOwner("story"));
        when(account.currentUserId()).thenReturn("reader"); assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> access.requireOwner("story")).getStatusCode());
        when(account.currentUserId()).thenReturn(null); assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class, () -> access.requireOwner("story")).getStatusCode());
    }
    @Test void chapterNoteReadRequiresTheOwnerOfThatChapter() {
        when(books.findPlanningMetadataByChapterId("chapter")).thenReturn(Optional.of(book));
        when(account.currentUserId()).thenReturn("writer"); assertSame(book, access.requireChapterOwner("chapter"));
        when(account.currentUserId()).thenReturn("reader"); assertThrows(ResponseStatusException.class, () -> access.requireChapterOwner("chapter"));
    }
    @Test void onlyChaptersAndCharactersFromTheSameStoryCanBeLinked() {
        access.validateChapter(book, "chapter"); access.validateChapter(book, null);
        assertThrows(ResponseStatusException.class, () -> access.validateChapter(book, "foreign"));
        Character own = new Character(); own.setBookId("story"); Character foreign = new Character(); foreign.setBookId("other");
        when(characters.findById("own")).thenReturn(Optional.of(own)); when(characters.findById("foreign")).thenReturn(Optional.of(foreign));
        access.validateCharacters(book, List.of("own"));
        assertThrows(ResponseStatusException.class, () -> access.validateCharacters(book, List.of("foreign")));
        assertThrows(ResponseStatusException.class, () -> access.validateCharacters(book, List.of("")));
    }
}
