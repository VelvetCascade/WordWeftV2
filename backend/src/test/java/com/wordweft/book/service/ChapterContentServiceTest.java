package com.wordweft.book.service;

import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.exception.AuthRequiredException;
import com.wordweft.exception.ContentRestrictedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.FULL;
import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.PREVIEW;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChapterContentServiceTest {

    private final BookRepository repository = mock(BookRepository.class);
    private final ContentAccessService contentAccess = mock(ContentAccessService.class);
    private final ChapterPreviewService previewService = new ChapterPreviewService();
    private ChapterContentService service;

    @BeforeEach
    void setUp() {
        service = new ChapterContentService(repository, contentAccess, previewService);
        when(contentAccess.canAccess(any(Book.class))).thenReturn(true);
        when(contentAccess.effectiveRating(any(Book.class))).thenReturn(AgeRating.ALL_AGES);
        when(contentAccess.allowedRatings()).thenReturn(java.util.Set.of(AgeRating.ALL_AGES, AgeRating.TEEN_13, AgeRating.MATURE_18, AgeRating.ADULT_21));
    }

    @Test
    void guestGetsOnlyFirstPublishedPreview() {
        Book book = publishedBook();
        when(repository.findById("book")).thenReturn(Optional.of(book));
        when(contentAccess.currentUserId()).thenReturn(null);

        ChapterContentResponse response = service.load("book", "first");

        assertEquals(PREVIEW, response.access());
        assertFalse(response.content().contains("FIRST_END_SECRET"));
        assertEquals(0, response.chapterIndex());
    }

    @Test
    void guestCannotRequestLaterChapterText() {
        when(repository.findById("book")).thenReturn(Optional.of(publishedBook()));
        when(contentAccess.currentUserId()).thenReturn(null);

        assertThrows(AuthRequiredException.class, () -> service.load("book", "second"));
    }

    @Test
    void signedInEligibleReaderGetsFullText() {
        when(repository.findById("book")).thenReturn(Optional.of(publishedBook()));
        when(contentAccess.currentUserId()).thenReturn("reader");

        ChapterContentResponse response = service.load("book", "second");

        assertEquals(FULL, response.access());
        assertEquals("SECOND_FULL", response.content());
    }

    @Test
    void signedInReaderGetsPublishedSnapshotWhileWriterEditsWorkingDraft() {
        Book book = publishedBook();
        Chapter chapter = book.getChapters().get(1);
        chapter.setPublishedTitle("Second — live");
        chapter.setPublishedContent("SECOND_PUBLISHED");
        chapter.setPublishedWordCount(1);
        chapter.setTitle("Second — revised privately");
        chapter.setContent("SECOND_WORKING_DRAFT");
        when(repository.findById("book")).thenReturn(Optional.of(book));
        when(contentAccess.currentUserId()).thenReturn("reader");

        ChapterContentResponse response = service.load("book", "second");

        assertEquals("Second — live", response.chapterTitle());
        assertEquals("SECOND_PUBLISHED", response.content());
    }

    @Test
    void emergencyRollbackFlagRestoresLegacyGuestReading() {
        when(repository.findById("book")).thenReturn(Optional.of(publishedBook()));
        when(contentAccess.currentUserId()).thenReturn(null);
        ReflectionTestUtils.setField(service, "readerSignInGateEnabled", false);

        ChapterContentResponse response = service.load("book", "second");

        assertEquals(FULL, response.access());
        assertEquals("SECOND_FULL", response.content());
    }

    @Test
    void ageRestrictedReaderIsRejectedBeforeContentIsReturned() {
        when(repository.findById("book")).thenReturn(Optional.of(publishedBook()));
        when(contentAccess.currentUserId()).thenReturn("reader");
        when(contentAccess.canAccess(any(Book.class))).thenReturn(false);

        assertThrows(ContentRestrictedException.class, () -> service.load("book", "first"));
    }

    @Test
    void draftStoriesAndDraftChaptersLookMissingToGuests() {
        Book draftBook = publishedBook();
        draftBook.setPublicationStatus("draft");
        when(repository.findById("draft")).thenReturn(Optional.of(draftBook));
        when(repository.findById("book")).thenReturn(Optional.of(publishedBook()));
        when(contentAccess.currentUserId()).thenReturn(null);

        assertThrows(ChapterContentService.ContentNotFoundException.class,
                () -> service.load("draft", "first"));
        assertThrows(ChapterContentService.ContentNotFoundException.class,
                () -> service.load("book", "draft"));
    }

    private static Book publishedBook() {
        Book book = new Book();
        book.setId("book");
        book.setTitle("Story");
        book.setAuthorId("writer");
        book.setPublicationStatus("published");
        book.setChapters(List.of(
                chapter("first", "First", numberedWords(700) + " FIRST_END_SECRET", "published"),
                chapter("second", "Second", "SECOND_FULL", "published"),
                chapter("draft", "Draft", "DRAFT_SECRET", "draft")
        ));
        return book;
    }

    private static Chapter chapter(String id, String title, String content, String status) {
        Chapter chapter = new Chapter();
        chapter.setId(id);
        chapter.setTitle(title);
        chapter.setContent(content);
        chapter.setStatus(status);
        chapter.setWordCount(content.split("\\s+").length);
        return chapter;
    }

    private static String numberedWords(int count) {
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < count; index++) {
            if (!result.isEmpty()) {
                result.append(' ');
            }
            result.append("WORD_").append(index);
        }
        return result.toString();
    }
}
