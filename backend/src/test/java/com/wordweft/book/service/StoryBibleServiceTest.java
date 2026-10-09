package com.wordweft.book.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoryBibleServiceTest {
    @Mock StoryBibleRepository entries;
    @Mock BookRepository books;
    @Mock PlanningAccessService planning;
    @Mock ContentAccessService access;
    @Mock ReadingProgressRepository progress;
    StoryBibleService service;
    Book book;
    @BeforeEach void setup() {
        service = new StoryBibleService(entries, books, planning, access, progress);
        book = new Book(); book.setId("story"); book.setAuthorId("writer"); book.setPublicationStatus("published");
        book.setChapters(new ArrayList<>(List.of(chapter("one", "published"), chapter("two", "published"), chapter("draft", "draft"))));
    }
    Chapter chapter(String id, String status) { Chapter ch = new Chapter(); ch.setId(id); ch.setStatus(status); return ch; }
    StoryBibleEntry entry(String id, String visibility, String chapter) {
        StoryBibleEntry e = new StoryBibleEntry(); e.setId(id); e.setBookId("story"); e.setKind("LORE");
        e.setTitle(id); e.setDetail("Detail " + id); e.setVisibility(visibility); e.setRevealChapterId(chapter); return e;
    }
    void readable(String user) {
        when(books.findAnalyticsMetadataById("story")).thenReturn(Optional.of(book));
        when(access.currentUserId()).thenReturn(user);
        if (!"writer".equals(user)) when(access.canAccess(book)).thenReturn(true);
        when(entries.findByBookId("story")).thenReturn(List.of(entry("start", "PUBLIC", null), entry("private", "PRIVATE", null), entry("first", "PUBLIC", "one"), entry("future", "PUBLIC", "two"), entry("unpublished", "PUBLIC", "draft"), entry("deleted", "PUBLIC", "gone")));
    }
    void completed(int first, int second) {
        ReadingProgress record = new ReadingProgress();
        ReadingProgress.ChapterProgressItem one = new ReadingProgress.ChapterProgressItem(); one.setProgress(first);
        ReadingProgress.ChapterProgressItem two = new ReadingProgress.ChapterProgressItem(); two.setProgress(second);
        record.setChapters(Map.of("one", one, "two", two));
        when(progress.findByUserIdAndBookId("reader", "story")).thenReturn(Optional.of(record));
    }
    List<String> ids(String chapter, boolean readerView) { return service.read("story", chapter, null, readerView).stream().map(StoryBibleEntry::getId).toList(); }
    @Test void guestAndForgedFutureContextExposeOnlyPublicInitialDetails() {
        readable(null);
        assertEquals(List.of("start"), ids("two", false));
        assertEquals(List.of("start"), ids(null, true));
        verifyNoInteractions(progress);
    }
    @Test void signingInOrRequestingReaderPreviewCannotUnlockUnreadChapters() {
        readable("reader"); completed(89, 0);
        assertEquals(List.of("start"), ids("two", true));
        assertEquals(List.of("start"), ids("two", false));
    }
    @Test void CompletionUnlocksOnlyPublishedChapterDetailsAndContextCanNarrowThem() {
        readable("reader"); completed(90, 100);
        assertEquals(List.of("start", "first", "future"), ids(null, false));
        assertEquals(List.of("start", "first"), ids("one", false));
        assertEquals(List.of("start"), ids("draft", false));
        assertEquals(List.of("start"), ids("missing", false));
        book.getChapters().get(1).setStatus("draft");
        assertEquals(List.of("start", "first"), ids(null, false));
    }
    @Test void MissingProgressFailsClosed() {
        readable("reader"); when(progress.findByUserIdAndBookId("reader", "story")).thenReturn(Optional.empty());
        assertEquals(List.of("start"), ids(null, false));
    }
    @Test void OwnerEditsAllEntriesButReaderPreviewExcludesPrivateAndUnreleasedEntries() {
        readable("writer");
        assertEquals(6, ids(null, false).size());
        assertEquals(List.of("start", "first"), ids("one", true));
        assertEquals(List.of("start"), ids("draft", true));
        verifyNoInteractions(progress);
    }
    @Test void CharacterFilterDoesNotRevealAnyOtherCastDetails() {
        readable(null);
        StoryBibleEntry linked = entry("linked", "PUBLIC", null); linked.setCharacterIds(List.of("lyra"));
        when(entries.findByBookId("story")).thenReturn(List.of(linked, entry("unlinked", "PUBLIC", null)));
        assertEquals(List.of(linked), service.read("story", null, "lyra", true));
    }
    @Test void DraftAndRestrictedStoriesRejectReadersBeforeReadingBibleOrProgress() {
        when(books.findAnalyticsMetadataById("story")).thenReturn(Optional.of(book));
        when(access.currentUserId()).thenReturn("reader");
        book.setPublicationStatus("draft");
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> ids(null, false)).getStatusCode());
        book.setPublicationStatus("published"); when(access.canAccess(book)).thenReturn(false);
        assertThrows(ResponseStatusException.class, () -> ids(null, false));
        verifyNoInteractions(entries, progress);
    }
    @Test void CreationCannotUpsertAndNormalizesLinksWithoutChangingRevealRules() {
        when(planning.requireOwner("story")).thenReturn(book);
        when(entries.save(any())).thenAnswer(call -> call.getArgument(0));
        StoryBibleEntry draft = entry("some-other-id", "PRIVATE", "one"); draft.setTitle("  Early goal  "); draft.setCharacterIds(List.of("lyra", "lyra"));
        StoryBibleEntry saved = service.create(draft);
        assertNull(saved.getId()); assertEquals("Early goal", saved.getTitle()); assertEquals(List.of("lyra"), saved.getCharacterIds());
        verify(planning).validateChapter(book, "one"); verify(planning).validateCharacters(book, List.of("lyra", "lyra"));
    }
    @Test void RelationshipsNeedTwoDifferentCharactersAndMotivationsNeedCast() {
        when(planning.requireOwner("story")).thenReturn(book);
        StoryBibleEntry draft = entry(null, "PRIVATE", null); draft.setKind("RELATIONSHIP"); draft.setCharacterIds(List.of("lyra", "lyra"));
        assertThrows(ResponseStatusException.class, () -> service.create(draft));
        draft.setKind("MOTIVATION"); draft.setCharacterIds(List.of());
        assertThrows(ResponseStatusException.class, () -> service.create(draft));
        verify(entries, never()).save(any());
    }
    @Test void UpdatesStayInOriginalStoryAndRequireItsOwner() {
        StoryBibleEntry existing = entry("existing", "PRIVATE", null);
        when(entries.findById("existing")).thenReturn(Optional.of(existing));
        when(planning.requireOwner("story")).thenReturn(book); when(entries.save(any())).thenAnswer(call -> call.getArgument(0));
        StoryBibleEntry changes = entry("foreign-id", "PUBLIC", "two"); changes.setBookId("foreign-story");
        StoryBibleEntry saved = service.update("existing", changes);
        assertEquals("story", saved.getBookId()); assertEquals("existing", saved.getId());
        verify(planning).validateChapter(book, "two");
    }
    @Test void GuestsAndOtherWritersCannotMutateEntries() {
        doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED)).when(planning).requireAccount();
        assertThrows(ResponseStatusException.class, () -> service.delete("entry")); verifyNoInteractions(entries);
        reset(planning);
        when(entries.findById("entry")).thenReturn(Optional.of(entry("entry", "PRIVATE", null)));
        when(planning.requireOwner("story")).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class, () -> service.delete("entry"));
        assertThrows(ResponseStatusException.class, () -> service.update("entry", entry(null, "PUBLIC", null)));
        verify(entries, never()).save(any()); verify(entries, never()).deleteById(any());
    }
}
