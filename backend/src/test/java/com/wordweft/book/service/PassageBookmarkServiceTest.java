package com.wordweft.book.service;

import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.model.PassageBookmark;
import com.wordweft.book.repository.PassageBookmarkRepository;
import com.wordweft.exception.AuthRequiredException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PassageBookmarkServiceTest {
    private final PassageBookmarkRepository repository = mock(PassageBookmarkRepository.class);
    private final ChapterContentService content = mock(ChapterContentService.class);
    private final ContentAccessService access = mock(ContentAccessService.class);
    private final PassageBookmarkService service = new PassageBookmarkService(repository, content, access);
    @BeforeEach void setup() {
        when(access.currentUserId()).thenReturn("reader");
        when(content.load("book", "chapter")).thenReturn(new ChapterContentResponse("book","Story","chapter","First",0,ChapterContentResponse.ChapterAccess.FULL,"<p>First passage</p><blockquote><p>Nested passage</p></blockquote><p>Last passage</p>",6,6));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
    }
    @Test void savesServerPassageAndPrivateNoteWithStableAccountScopedIdentity() {
        PassageBookmark first = service.save("book","chapter",1," My note ");
        assertEquals("Nested passage", first.getQuote()); assertEquals("My note", first.getNote());
        assertEquals("reader", first.getUserId());
        assertEquals(first.getId(), service.save("book","chapter",1,"Revised note").getId());
        when(access.currentUserId()).thenReturn("other-reader");
        assertNotEquals(first.getId(), service.save("book","chapter",1,"").getId());
    }
    @Test void invalidAnchorOrOversizedNotesCannotBeSaved() {
        assertThrows(ResponseStatusException.class, () -> service.save("book","chapter",9,"Note"));
        assertThrows(ResponseStatusException.class, () -> service.save("book","chapter",0,"x".repeat(4001)));
        verify(repository, never()).save(any());
    }
    @Test void nestedQuoteAndListAnchorsUseAuthoredBlockWordBoundaries() {
        when(content.load("book", "chapter")).thenReturn(new ChapterContentResponse("book","Story","chapter","First",0,ChapterContentResponse.ChapterAccess.FULL,
                "<blockquote><p>First line</p><p>Second line</p></blockquote><ul><li>First item</li><li>Second item</li></ul><p>Adjacent <em>inline</em>text<br>Next line</p>",16,16));
        assertEquals("First line Second line", service.save("book","chapter",0,"").getQuote());
        assertEquals("First item Second item", service.save("book","chapter",3,"").getQuote());
        assertEquals("Adjacent inlinetext Next line", service.save("book","chapter",4,"").getQuote());
    }
    @Test void anonymousOrLockedContentNeverCreatesPrivateRecords() {
        when(access.currentUserId()).thenReturn(null);
        assertThrows(ResponseStatusException.class, () -> service.save("book","chapter",0,""));
        when(access.currentUserId()).thenReturn("reader");
        when(content.load("book","chapter")).thenThrow(new AuthRequiredException());
        assertThrows(AuthRequiredException.class, () -> service.save("book","chapter",0,""));
        verify(repository, never()).save(any());
    }
    @Test void listingIsAccountScopedAndFiltersNowUnavailableChapters() {
        PassageBookmark visible = new PassageBookmark(); visible.setChapterId("chapter");
        PassageBookmark removed = new PassageBookmark(); removed.setChapterId("removed");
        when(repository.findByUserIdAndBookIdOrderByUpdatedAtDesc("reader","book")).thenReturn(List.of(visible,visible,removed));
        when(content.load("book","removed")).thenThrow(new ChapterContentService.ContentNotFoundException());
        assertEquals(List.of(visible,visible), service.list("book"));
        verify(content, times(1)).load("book","chapter");
        verify(repository).findByUserIdAndBookIdOrderByUpdatedAtDesc("reader","book");
    }
    @Test void foreignRecordCannotBeDeletedEvenIfItsIdIsKnown() {
        PassageBookmark foreign = new PassageBookmark(); foreign.setUserId("other-reader");
        when(repository.findById("foreign")).thenReturn(Optional.of(foreign));
        service.delete("foreign"); verify(repository, never()).delete(any());
    }
}
