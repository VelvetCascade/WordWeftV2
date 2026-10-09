import React, { useState, useEffect, useId, useCallback } from 'react';
import type { Note } from '../types';
import * as api from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { PlanningDraftForm } from './PlanningDraftForm';
import { notifyPlanningUpdated } from '../utils/planningTools';
import { filterPlanningNotes } from '../utils/planningSearch';
import { usePlanningCollection } from '../hooks/usePlanningCollection';
import { useDialog } from '../hooks/useDialog';
import { PlanningLoadState } from './PlanningLoadState';

interface NoteListProps { bookId: string; ownerId: string; chapterId?: string; chapterTitle?: string; compact?: boolean; initialScope?: 'story' | 'chapter'; onScopeChange?: (scope: 'story' | 'chapter') => void; }
const emptyNote = { title: '', content: '' };
export const NoteList: React.FC<NoteListProps> = ({ bookId, ownerId, chapterId, chapterTitle, compact = false, initialScope, onScopeChange }) => {
    const availableChapterId = chapterId && chapterId !== 'new' ? chapterId : undefined;
    const [scope, setScope] = useState<'story' | 'chapter'>(initialScope || (availableChapterId ? 'chapter' : 'story'));
    const scopedChapterId = scope === 'chapter' ? availableChapterId : undefined;
    const { data: notes, setData: setNotes, loading, loadError, retry } = usePlanningCollection<Note>(`${bookId}:${scopedChapterId || 'story'}`, useCallback(() => scopedChapterId ? api.getNotesByChapterId(scopedChapterId) : api.getNotesByBookId(bookId), [bookId, scopedChapterId, ownerId]));
    const [editing, setEditing] = useState<Note | 'new' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const expandedRef = useDialog(expanded, () => setExpanded(false), !busyAction);
    const prefix = useId();
    useEffect(() => { setEditing(null); setDeleteTarget(null); setExpanded(false); setError(''); setSuccess(''); setQuery(''); }, [bookId, chapterId, ownerId]);
    useEffect(() => { if (!availableChapterId) setScope('story'); }, [availableChapterId]);
    const changeScope = (next: 'story' | 'chapter') => { setScope(next); setQuery(''); setSuccess(''); onScopeChange?.(next); };
    const closeEditor = () => { setEditing(null); setExpanded(false); };
    const save = async (draft: typeof emptyNote, clear: () => void) => {
        if (!draft.content.trim() || busyAction || !editing) return;
        setBusyAction('save'); setError(''); setSuccess('');
        try {
            const payload = { ...draft, title: draft.title.trim(), bookId, chapterId: scopedChapterId || null };
            const saved = editing === 'new' ? await api.createNote(payload) : await api.updateNote(editing.id, payload);
            setNotes(current => editing === 'new' ? [...current, saved] : current.map(note => note.id === saved.id ? saved : note));
            clear(); closeEditor(); setSuccess('Private note saved online.'); notifyPlanningUpdated(bookId);
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'The note could not be saved. Your draft is kept here.'); }
        finally { setBusyAction(null); }
    };
    const remove = async () => {
        if (!deleteTarget || busyAction) return;
        setBusyAction('delete'); setError('');
        try { await api.deleteNote(deleteTarget.id); setNotes(current => current.filter(note => note.id !== deleteTarget.id)); setDeleteTarget(null); notifyPlanningUpdated(bookId); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'The note could not be deleted.'); }
        finally { setBusyAction(null); }
    };
    const scopedNotes = filterPlanningNotes(notes, '', scopedChapterId);
    const visibleNotes = filterPlanningNotes(notes, query, scopedChapterId);
    const scopeLabel = scopedChapterId ? chapterTitle || 'This chapter' : 'Story-wide';
    return <div className="ww-story-tool ww-notes-tool">
        <div className="ww-story-tool-heading"><div>{!compact && <><span>Private notebook</span><h3>Notes</h3></>}<p>Collect research, loose lines, and questions. Only you can see these notes.</p></div><button className="ww-story-tool-add" disabled={!!editing} onClick={() => { setEditing('new'); setSuccess(''); }}><span>+</span>Add note</button></div>
        <div className="ww-planning-scope" role="group" aria-label="Note scope"><button aria-pressed={scope === 'story'} disabled={!!editing} onClick={() => changeScope('story')}>Story-wide notes</button>{availableChapterId && <button aria-pressed={scope === 'chapter'} disabled={!!editing} onClick={() => changeScope('chapter')}>This chapter</button>}</div>
        <p className="ww-planning-help">{scopedChapterId ? `Notes linked to ${scopeLabel}.` : 'Notes for the whole story, without a chapter link.'}{chapterId === 'new' && ' Save this chapter first to add chapter notes.'}{editing && ' Finish or cancel this note to change scope.'}</p>
        <PlanningLoadState loading={loading} error={loadError} retry={retry} label="notes" />
        {error && <p role="alert" className="ww-studio-alert">{error}</p>}{success && <p role="status">{success}</p>}
        {editing && <div ref={expandedRef} className={expanded ? 'ww-note-editor-expanded' : undefined} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? 'Private note editor' : undefined} tabIndex={expanded ? -1 : undefined}>
            <PlanningDraftForm disabled={busyAction === 'save'} key={editing === 'new' ? 'new' : editing.id} ownerId={ownerId} journey={`note:${bookId}:${scopedChapterId || 'story'}:${editing === 'new' ? 'new' : editing.id}`} initial={editing === 'new' ? emptyNote : { title: editing.title || '', content: editing.content || '' }}>{(draft, update, clear) => <>
                <div className="ww-note-editor-heading"><h4>{editing === 'new' ? 'New private note' : 'Edit private note'}</h4><button type="button" disabled={!!busyAction} onClick={() => setExpanded(value => !value)}>{expanded ? 'Return to panel' : 'Expand note editor'}</button></div>
                <div className="ww-planning-badges"><span>Private</span><span>{scopeLabel}</span></div>
                {expanded && error && <p role="alert" className="ww-studio-alert">{error}</p>}
                <div className="ww-planning-fields"><div className="ww-planning-field"><label htmlFor={`${prefix}-title`}>Private note title <small>(optional)</small></label><input id={`${prefix}-title`} autoFocus maxLength={100} value={draft.title} onChange={event => update({ ...draft, title: event.target.value })} /></div><div className="ww-planning-field"><label htmlFor={`${prefix}-content`}>Private note content <small aria-hidden="true">{draft.content.length}/10000</small></label><textarea id={`${prefix}-content`} aria-label="Private note content" className="ww-note-content" maxLength={10000} value={draft.content} onChange={event => update({ ...draft, content: event.target.value })} /></div></div>
                <div className="ww-planning-actions"><button disabled={!!busyAction} onClick={closeEditor}>Cancel</button><button className="primary" disabled={!draft.content.trim() || !!busyAction} onClick={() => save(draft, clear)}>{busyAction === 'save' ? 'Saving…' : 'Save note'}</button></div>
            </>}</PlanningDraftForm>
        </div>}
        {!editing && !loading && !loadError && !scopedNotes.length && <div className="ww-tool-empty"><span>{scopedChapterId ? 'Chapter notebook' : 'Story notebook'}</span><h4>Save the thought before it disappears.</h4><p>Keep a fragment, research link, or future plot turn beside the story.</p><button onClick={() => setEditing('new')}>Write the first note →</button></div>}
        {!!scopedNotes.length && <div className="ww-planning-controls"><label htmlFor={`${prefix}-search`}>Search notes<input id={`${prefix}-search`} type="search" value={query} placeholder="Title or content" onChange={event => setQuery(event.target.value)} /></label></div>}
        {!loading && !loadError && !!scopedNotes.length && !visibleNotes.length && <p className="ww-planning-no-results" role="status">No notes match your search. <button onClick={() => setQuery('')}>Clear search</button></p>}
        <div className="ww-story-tool-grid grid grid-cols-1 md:grid-cols-2 gap-4">{visibleNotes.map(note => <article key={note.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-900/30"><h4 className="font-bold text-lg mb-2">{note.title || 'Untitled note'}</h4><div className="ww-planning-badges"><span>Private</span><span>{scopeLabel}</span></div><p className="text-sm whitespace-pre-wrap ww-note-card-content">{note.content}</p><div className="ww-planning-card-actions"><button disabled={!!editing || !!busyAction} onClick={() => { setEditing(note); setSuccess(''); }}>Edit</button><button disabled={!!busyAction} onClick={() => setDeleteTarget(note)}>Delete</button></div></article>)}</div>
        <ConfirmDialog isOpen={!!deleteTarget} title="Delete note?" message={`“${deleteTarget?.title || 'Untitled note'}” will be permanently removed.`} confirmLabel="Delete note" processingLabel="Deleting…" isProcessing={busyAction === 'delete'} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    </div>;
};
