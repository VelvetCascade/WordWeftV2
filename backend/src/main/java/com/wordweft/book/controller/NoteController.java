package com.wordweft.book.controller;

import com.wordweft.book.model.Note;
import com.wordweft.book.service.NoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    @Autowired
    private NoteService noteService;

    @GetMapping("/book/{bookId}")
    public List<Note> getNotesByBookId(@PathVariable String bookId) {
        return noteService.getNotesByBookId(bookId);
    }

    @GetMapping("/chapter/{chapterId}")
    public List<Note> getNotesByChapterId(@PathVariable String chapterId) {
        return noteService.getNotesByChapterId(chapterId);
    }

    @PostMapping
    public Note createNote(@Valid @RequestBody Note note) {
        return noteService.createNote(note);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Note> getNoteById(@PathVariable String id) {
        return noteService.getNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Note> updateNote(@PathVariable String id, @Valid @RequestBody Note noteDetails) {
        Note updatedNote = noteService.updateNote(id, noteDetails);
        if (updatedNote != null) {
            return ResponseEntity.ok(updatedNote);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable String id) {
        noteService.deleteNote(id);
        return ResponseEntity.ok().build();
    }
}
