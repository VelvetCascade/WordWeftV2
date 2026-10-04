import React, { useState, useEffect, useId } from 'react';
import type { Scene, Character, Chapter } from '../types';
import * as api from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { PlanningDraftForm } from './PlanningDraftForm';
import { notifyPlanningUpdated } from '../utils/planningTools';

interface SceneListProps { bookId: string; ownerId: string; chapters?: Chapter[]; }
const emptyScene = { title: '', description: '', setting: '', time: '', chapterId: '', characterIds: [] as string[] };
export const SceneList: React.FC<SceneListProps> = ({ bookId, ownerId, chapters = [] }) => {
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [editing, setEditing] = useState<Scene | 'new' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const prefix = useId();
    useEffect(() => {
        let active = true;
        setScenes([]); setEditing(null); setError('');
        api.getScenesByBookId(bookId).then(data => { if(active) setScenes(data); }).catch(failure=>{ if(active) setError(failure instanceof Error ? failure.message : 'Scenes could not load.'); });
        api.getCharactersByBookId(bookId).then(data => { if(active) setCharacters(data); }).catch(()=>{ if(active) setCharacters([]); });
        return () => { active = false; };
    }, [bookId, ownerId]);
    const save = async (draft: typeof emptyScene, clear: ()=>void) => {
        if (!draft.title.trim() || busyAction || !editing) return;
        setBusyAction('save'); setError(''); setSuccess('');
        try {
            const payload = { ...draft, title: draft.title.trim(), chapterId: draft.chapterId || null, bookId };
            const saved = editing === 'new' ? await api.createScene(payload) : await api.updateScene(editing.id, payload);
            setScenes(current => editing === 'new' ? [...current, saved] : current.map(scene => scene.id === saved.id ? saved : scene));
            clear(); setEditing(null); setSuccess('Scene saved online.'); notifyPlanningUpdated(bookId);
        } catch(failure) { setError(failure instanceof Error ? failure.message : 'The scene could not be saved. Your draft is kept here.'); }
        finally { setBusyAction(null); }
    };
    const remove = async () => {
        if (!deleteTarget || busyAction) return;
        setBusyAction('delete'); setError('');
        try { await api.deleteScene(deleteTarget.id); setScenes(current=>current.filter(scene=>scene.id!==deleteTarget.id)); setDeleteTarget(null); notifyPlanningUpdated(bookId); }
        catch(failure) { setError(failure instanceof Error ? failure.message : 'The scene could not be deleted.'); }
        finally { setBusyAction(null); }
    };
    const initial = editing && editing !== 'new' ? { title: editing.title||'', description:editing.description||'', setting:editing.setting||'', time:editing.time||'', chapterId:editing.chapterId||'', characterIds:editing.characterIds||[] } : emptyScene;
    return <div className="ww-story-tool ww-scenes-tool">
        <div className="ww-story-tool-heading"><div><span>Story map</span><h3>Scenes</h3><p>Plan where each turning point happens, who is present, and what changes.</p></div><button className="ww-story-tool-add" disabled={!!editing} onClick={()=>{setEditing('new');setSuccess('');}}><span>+</span>Add scene</button></div>
        {error && <p role="alert" className="ww-studio-alert">{error}</p>}{success && <p role="status">{success}</p>}
        {editing && <PlanningDraftForm disabled={busyAction==='save'} key={editing==='new'?'new':editing.id} ownerId={ownerId} journey={`scene:${bookId}:${editing==='new'?'new':editing.id}`} initial={initial}>{(draft,update,clear)=><>
            <h4 className="font-bold mb-4">{editing==='new'?'New scene':'Edit scene'}</h4><div className="ww-planning-fields">
                {(['title','setting','time','description'] as const).map(field=><div className="ww-planning-field" key={field}><label htmlFor={`${prefix}-${field}`}>{field==='title'?'Scene title':field==='description'?'Description':field==='setting'?'Setting':'Time'}</label>{field==='description'?<textarea id={`${prefix}-${field}`} maxLength={2000} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/>:<input id={`${prefix}-${field}`} maxLength={field==='title'?100:200} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/>}</div>)}
                <div className="ww-planning-field"><label htmlFor={`${prefix}-chapter`}>Chapter <small>(optional)</small></label><select id={`${prefix}-chapter`} value={draft.chapterId} onChange={event=>update({...draft,chapterId:event.target.value})}><option value="">No chapter</option>{chapters.map(chapter=><option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}{draft.chapterId&&!chapters.some(chapter=>chapter.id===draft.chapterId)&&<option value={draft.chapterId}>Previously linked chapter · currently unavailable</option>}</select></div>
                <fieldset><legend className="text-sm font-semibold mb-2">Characters in this scene</legend><div className="flex flex-wrap gap-2">{characters.map(character=><button type="button" className="px-3 py-2 rounded-full border text-sm" key={character.id} aria-pressed={draft.characterIds.includes(character.id)} onClick={()=>update({...draft,characterIds:draft.characterIds.includes(character.id)?draft.characterIds.filter(id=>id!==character.id):[...draft.characterIds,character.id]})}>{draft.characterIds.includes(character.id)?'✓ ':''}{character.name}</button>)}{draft.characterIds.filter(id=>!characters.some(character=>character.id===id)).map(id=><button type="button" key={id} className="px-3 py-2 rounded-full border text-sm" onClick={()=>update({...draft,characterIds:draft.characterIds.filter(candidate=>candidate!==id)})}>Remove unavailable character link</button>)}</div></fieldset>
            </div><div className="ww-planning-actions"><button disabled={!!busyAction} onClick={()=>setEditing(null)}>Cancel</button><button className="primary" disabled={!draft.title.trim()||!!busyAction} onClick={()=>save(draft,clear)}>{busyAction==='save'?'Saving…':'Save scene'}</button></div>
        </>}</PlanningDraftForm>}
        {!editing && !scenes.length && <div className="ww-tool-empty"><span>Sequence</span><h4>Map the moments that matter.</h4><p>Capture a setting, conflict, or reveal. Link it to a chapter whenever you’re ready.</p><button onClick={()=>setEditing('new')}>Plan the first scene →</button></div>}
        <div className="ww-story-tool-list space-y-4">{scenes.map(scene=><article key={scene.id} className="p-4 bg-card-bg dark:bg-dark-card-bg rounded-2xl border border-border dark:border-dark-border"><h4 className="font-bold text-lg">{scene.title}</h4><p className="text-sm text-text-muted dark:text-dark-text-muted">{[scene.setting,scene.time,chapters.find(ch=>ch.id===scene.chapterId)?.title].filter(Boolean).join(' · ')}</p><p className="mt-3 text-sm whitespace-pre-wrap">{scene.description}</p>{scene.characterIds?.length>0&&<p className="mt-3 text-xs">{scene.characterIds.map(id=>characters.find(c=>c.id===id)?.name).filter(Boolean).join(', ')}</p>}<div className="ww-planning-card-actions"><button disabled={!!editing||!!busyAction} onClick={()=>{setEditing(scene);setSuccess('');}}>Edit</button><button disabled={!!busyAction} onClick={()=>setDeleteTarget(scene)}>Delete</button></div></article>)}</div>
        <ConfirmDialog isOpen={!!deleteTarget} title="Delete scene?" message={`“${deleteTarget?.title||'This scene'}” will be permanently removed from your story plan.`} confirmLabel="Delete scene" processingLabel="Deleting…" isProcessing={busyAction==='delete'} onCancel={()=>setDeleteTarget(null)} onConfirm={remove}/>
    </div>;
};
