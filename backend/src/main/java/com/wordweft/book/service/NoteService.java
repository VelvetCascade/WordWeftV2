package com.wordweft.book.service;

import com.wordweft.book.model.Note;
import com.wordweft.book.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NoteService {

    @Autowired
    private NoteRepository noteRepository;

    public List<Note> getNotesByBookId(String bookId) {
        return noteRepository.findByBookId(bookId);
    }

    public List<Note> getNotesByChapterId(String chapterId) {
        return noteRepository.findByChapterId(chapterId);
    }

    public Note createNote(Note note) {
        return noteRepository.save(note);
    }

    public Optional<Note> getNoteById(String id) {
        return noteRepository.findById(id);
    }

    public Note updateNote(String id, Note noteDetails) {
        return noteRepository.findById(id).map(note -> {
            note.setTitle(noteDetails.getTitle());
            note.setContent(noteDetails.getContent());
            return noteRepository.save(note);
        }).orElse(null);
    }

    public void deleteNote(String id) {
        noteRepository.deleteById(id);
    }
}
