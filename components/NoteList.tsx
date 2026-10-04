import React, { useState, useEffect, useId } from 'react';
import type { Note } from '../types';
import * as api from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { PlanningDraftForm } from './PlanningDraftForm';
import { notifyPlanningUpdated } from '../utils/planningTools';

interface NoteListProps { bookId: string; ownerId: string; chapterId?: string; }
const emptyNote = { title: '', content: '' };
export const NoteList: React.FC<NoteListProps> = ({ bookId, ownerId, chapterId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [editing, setEditing] = useState<Note|'new'|null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Note|null>(null);
    const [busyAction, setBusyAction] = useState<string|null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const prefix = useId();
    useEffect(()=>{
        let active = true; setEditing(null); setNotes([]); setError('');
        (chapterId ? api.getNotesByChapterId(chapterId):api.getNotesByBookId(bookId)).then(data=>{if(active)setNotes(data);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'Notes could not load.');});
        return()=>{active=false;};
    },[bookId,chapterId,ownerId]);
    const save = async (draft:typeof emptyNote,clear:()=>void)=>{
        if(!draft.content.trim()||busyAction||!editing)return;
        setBusyAction('save');setError('');setSuccess('');
        try {
            const payload={...draft,bookId,...(chapterId?{chapterId}:{})};
            const saved=editing==='new'?await api.createNote(payload):await api.updateNote(editing.id,payload);
            setNotes(current=>editing==='new'?[...current,saved]:current.map(note=>note.id===saved.id?saved:note));
            clear();setEditing(null);setSuccess('Private note saved online.');notifyPlanningUpdated(bookId);
        } catch(failure){setError(failure instanceof Error?failure.message:'The note could not be saved. Your draft is kept here.');}finally{setBusyAction(null);}
    };
    const remove=async()=>{
        if(!deleteTarget||busyAction)return;setBusyAction('delete');setError('');
        try{await api.deleteNote(deleteTarget.id);setNotes(current=>current.filter(note=>note.id!==deleteTarget.id));setDeleteTarget(null);notifyPlanningUpdated(bookId);}catch(failure){setError(failure instanceof Error?failure.message:'The note could not be deleted.');}finally{setBusyAction(null);}
    };
    return <div className="ww-story-tool ww-notes-tool"><div className="ww-story-tool-heading"><div><span>Private notebook</span><h3>Notes</h3><p>Collect lore, research, loose lines, and questions. Only you can see these notes.</p></div><button className="ww-story-tool-add" disabled={!!editing} onClick={()=>{setEditing('new');setSuccess('');}}><span>+</span>Add note</button></div>
        {error&&<p role="alert" className="ww-studio-alert">{error}</p>}{success&&<p role="status">{success}</p>}
        {editing&&<PlanningDraftForm disabled={busyAction==='save'} key={editing==='new'?'new':editing.id} ownerId={ownerId} journey={`note:${bookId}:${chapterId||'story'}:${editing==='new'?'new':editing.id}`} initial={editing==='new'?emptyNote:{title:editing.title||'',content:editing.content||''}}>{(draft,update,clear)=><><h4 className="font-bold mb-4">{editing==='new'?'New private note':'Edit private note'}</h4><div className="ww-planning-fields"><div className="ww-planning-field"><label htmlFor={`${prefix}-title`}>Private note title <small>(optional)</small></label><input id={`${prefix}-title`} maxLength={100} value={draft.title} onChange={event=>update({...draft,title:event.target.value})}/></div><div className="ww-planning-field"><label htmlFor={`${prefix}-content`}>Private note content</label><textarea id={`${prefix}-content`} maxLength={10000} value={draft.content} onChange={event=>update({...draft,content:event.target.value})}/></div></div><div className="ww-planning-actions"><button disabled={!!busyAction} onClick={()=>setEditing(null)}>Cancel</button><button className="primary" disabled={!draft.content.trim()||!!busyAction} onClick={()=>save(draft,clear)}>{busyAction==='save'?'Saving…':'Save note'}</button></div></>}</PlanningDraftForm>}
        {!editing&&!notes.length&&<div className="ww-tool-empty"><span>Scratchpad</span><h4>Save the thought before it disappears.</h4><p>Keep a fragment, research link, or future plot turn beside the story.</p><button onClick={()=>setEditing('new')}>Write the first note →</button></div>}
        <div className="ww-story-tool-grid grid grid-cols-1 md:grid-cols-2 gap-4">{notes.map(note=><article key={note.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-900/30"><h4 className="font-bold text-lg mb-2">{note.title||'Untitled note'}</h4><p className="text-sm whitespace-pre-wrap">{note.content}</p><div className="ww-planning-card-actions"><button disabled={!!editing||!!busyAction} onClick={()=>{setEditing(note);setSuccess('');}}>Edit</button><button disabled={!!busyAction} onClick={()=>setDeleteTarget(note)}>Delete</button></div></article>)}</div>
        <ConfirmDialog isOpen={!!deleteTarget} title="Delete note?" message={`“${deleteTarget?.title||'Untitled note'}” will be permanently removed.`} confirmLabel="Delete note" processingLabel="Deleting…" isProcessing={busyAction==='delete'} onCancel={()=>setDeleteTarget(null)} onConfirm={remove}/>
    </div>;
};
