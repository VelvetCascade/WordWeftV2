import React, { useState, useEffect } from 'react';
import type { Note } from '../types';
import * as api from '../api/client';

interface NoteListProps {
    bookId: string;
}

export const NoteList: React.FC<NoteListProps> = ({ bookId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newNote, setNewNote] = useState<Partial<Note>>({ title: '', content: '' });

    useEffect(() => {
        loadNotes();
    }, [bookId]);

    const loadNotes = async () => {
        const data = await api.getNotesByBookId(bookId);
        setNotes(data);
    };

    const handleCreate = async () => {
        if (!newNote.content) return;
        await api.createNote({ ...newNote, bookId });
        setIsCreating(false);
        setNewNote({ title: '', content: '' });
        loadNotes();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            await api.deleteNote(id);
            loadNotes();
        }
    };

    return (
        <div className="ww-story-tool ww-notes-tool">
            <div className="ww-story-tool-heading">
                <div><span>Private notebook</span><h3>Notes</h3><p>Collect lore, research, loose lines, and questions without interrupting the draft.</p></div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="ww-story-tool-add"
                >
                    <span>+</span> Add note
                </button>
            </div>

            {isCreating && (
                <div className="ww-story-tool-form p-4 bg-card-bg dark:bg-dark-card-bg rounded-lg border border-border dark:border-dark-border space-y-4">
                    <input
                        type="text"
                        placeholder="Title (Optional)"
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <textarea
                        placeholder="Content"
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-text-body dark:text-dark-text-body hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {!isCreating && notes.length === 0 && (
                <div className="ww-tool-empty">
                    <span>Scratchpad</span>
                    <h4>Save the thought before it disappears.</h4>
                    <p>Keep a fragment, research link, continuity reminder, or future plot turn beside the story.</p>
                    <button onClick={() => setIsCreating(true)}>Write the first note <span>→</span></button>
                </div>
            )}

            <div className="ww-story-tool-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                    <div key={note.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30 shadow-sm relative group">
                        <button
                            onClick={() => handleDelete(note.id)}
                            className="absolute top-2 right-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            ×
                        </button>
                        {note.title && <h4 className="font-bold text-lg text-text-header dark:text-dark-text-header mb-2">{note.title}</h4>}
                        <p className="text-sm text-text-body dark:text-dark-text-body whitespace-pre-wrap">{note.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
