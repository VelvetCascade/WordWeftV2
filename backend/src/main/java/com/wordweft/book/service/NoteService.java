package com.wordweft.book.service;

import com.wordweft.book.model.Note;
import com.wordweft.book.model.Book;
import com.wordweft.book.repository.NoteRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class NoteService {
    private final NoteRepository notes;
    private final PlanningAccessService access;
    public NoteService(NoteRepository notes, PlanningAccessService access) { this.notes = notes; this.access = access; }
    public List<Note> getNotesByBookId(String bookId) {
        access.requireOwner(bookId);
        return notes.findByBookId(bookId);
    }
    public List<Note> getNotesByChapterId(String chapterId) {
        access.requireChapterOwner(chapterId);
        return notes.findByChapterId(chapterId);
    }
    public Note createNote(Note note) {
        Book book = access.requireOwner(note.getBookId());
        access.validateChapter(book, note.getChapterId());
        note.setId(null);
        return notes.save(note);
    }
    public Optional<Note> getNoteById(String id) {
        access.requireAccount();
        return notes.findById(id).map(note -> { access.requireOwner(note.getBookId()); return note; });
    }
    public Note updateNote(String id, Note details) {
        access.requireAccount();
        return notes.findById(id).map(note -> {
            access.requireOwner(note.getBookId());
            // The original story/chapter association is immutable in this title/content edit.
            note.setTitle(details.getTitle());
            note.setContent(details.getContent());
            return notes.save(note);
        }).orElse(null);
    }
    public void deleteNote(String id) {
        access.requireAccount();
        notes.findById(id).ifPresent(note -> { access.requireOwner(note.getBookId()); notes.deleteById(id); });
    }
}
