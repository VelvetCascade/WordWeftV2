package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Scene;
import com.wordweft.book.model.Note;
import com.wordweft.book.repository.SceneRepository;
import com.wordweft.book.repository.NoteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanningServiceTest {
    @Mock SceneRepository sceneRepository;
    @Mock NoteRepository noteRepository;
    @Mock PlanningAccessService access;
    @InjectMocks SceneService scenes;
    @InjectMocks NoteService notes;

    @Test void otherAccountCannotReadOrMutatePrivatePlanning() {
        Scene scene = new Scene(); scene.setBookId("story");
        Note note = new Note(); note.setBookId("story");
        when(sceneRepository.findById("scene")).thenReturn(Optional.of(scene));
        when(noteRepository.findById("note")).thenReturn(Optional.of(note));
        when(access.requireOwner("story")).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class, () -> scenes.getScenesByBookId("story"));
        assertThrows(ResponseStatusException.class, () -> notes.getNotesByBookId("story"));
        assertThrows(ResponseStatusException.class, () -> scenes.getSceneById("scene"));
        assertThrows(ResponseStatusException.class, () -> notes.getNoteById("note"));
        assertThrows(ResponseStatusException.class, () -> scenes.updateScene("scene", new Scene()));
        assertThrows(ResponseStatusException.class, () -> notes.updateNote("note", new Note()));
        assertThrows(ResponseStatusException.class, () -> scenes.deleteScene("scene"));
        assertThrows(ResponseStatusException.class, () -> notes.deleteNote("note"));
        verify(sceneRepository, never()).save(any()); verify(sceneRepository, never()).deleteById(any());
        verify(noteRepository, never()).save(any()); verify(noteRepository, never()).deleteById(any());
    }
    @Test void guestIsRejectedBeforeLookingUpPrivateRecords() {
        when(access.requireAccount()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        assertThrows(ResponseStatusException.class, () -> scenes.updateScene("missing", new Scene()));
        assertThrows(ResponseStatusException.class, () -> notes.getNoteById("missing"));
        assertThrows(ResponseStatusException.class, () -> notes.deleteNote("missing"));
        verifyNoInteractions(sceneRepository, noteRepository);
    }
    @Test void sceneEditsPersistChapterReassignmentAndCanUnlinkWithoutMovingStories() {
        Book book = new Book(); book.setId("story");
        Scene saved = new Scene(); saved.setId("scene"); saved.setBookId("story"); saved.setChapterId("old");
        when(access.requireOwner("story")).thenReturn(book);
        when(sceneRepository.findById("scene")).thenReturn(Optional.of(saved));
        when(sceneRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        Scene changes = new Scene(); changes.setBookId("different"); changes.setTitle("Changed"); changes.setChapterId("next"); changes.setCharacterIds(List.of("character"));
        assertEquals("next", scenes.updateScene("scene", changes).getChapterId());
        assertEquals("story", saved.getBookId()); assertEquals("Changed", saved.getTitle());
        verify(access).validateChapter(book, "next"); verify(access).validateCharacters(book, List.of("character"));
        changes.setChapterId(null);
        assertNull(scenes.updateScene("scene", changes).getChapterId());
    }
    @Test void noteEditKeepsItsOriginalStoryAndChapterAssociation() {
        Note saved = new Note(); saved.setId("note"); saved.setBookId("story"); saved.setChapterId("chapter");
        when(noteRepository.findById("note")).thenReturn(Optional.of(saved));
        when(noteRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        Note changes = new Note(); changes.setBookId("other"); changes.setChapterId("other-chapter"); changes.setTitle(""); changes.setContent("Edited private idea");
        Note result = notes.updateNote("note", changes);
        assertEquals("Edited private idea", result.getContent()); assertEquals("", result.getTitle());
        assertEquals("story", result.getBookId()); assertEquals("chapter", result.getChapterId());
        verify(access).requireOwner("story");
    }
    @Test void creationCannotUpsertAnExistingIdAndValidatesAssociations() {
        Book book = new Book(); book.setId("story"); when(access.requireOwner("story")).thenReturn(book);
        Scene scene = new Scene(); scene.setId("someone-elses-scene"); scene.setBookId("story"); scene.setChapterId("chapter");
        Note note = new Note(); note.setId("someone-elses-note"); note.setBookId("story"); note.setChapterId("chapter");
        scenes.createScene(scene); notes.createNote(note);
        assertNull(scene.getId()); assertNull(note.getId());
        verify(access, times(2)).validateChapter(book, "chapter"); verify(access).validateCharacters(book, scene.getCharacterIds());
    }
    @Test void foreignChapterAndCharacterRejectionLeaveSavedSceneUntouched() {
        Book book = new Book(); book.setId("story");
        Scene saved = new Scene(); saved.setId("scene"); saved.setBookId("story"); saved.setTitle("Original");
        when(sceneRepository.findById("scene")).thenReturn(Optional.of(saved)); when(access.requireOwner("story")).thenReturn(book);
        Scene changes = new Scene(); changes.setTitle("Changed"); changes.setChapterId("foreign");
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST)).when(access).validateChapter(book, "foreign");
        assertThrows(ResponseStatusException.class, () -> scenes.updateScene("scene", changes));
        assertEquals("Original", saved.getTitle()); verify(sceneRepository, never()).save(any());
    }
}
