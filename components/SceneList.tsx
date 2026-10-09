import React, { useState, useEffect, useId, useCallback } from 'react';
import type { Scene, Character, Chapter } from '../types';
import * as api from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { PlanningDraftForm } from './PlanningDraftForm';
import { notifyPlanningUpdated } from '../utils/planningTools';
import { usePlanningCollection } from '../hooks/usePlanningCollection';
import { PlanningLoadState } from './PlanningLoadState';
import { filterPlanningScenes } from '../utils/planningSearch';

interface SceneListProps { bookId: string; ownerId: string; chapters?: Chapter[]; compact?: boolean; }
const emptyScene = { title: '', description: '', setting: '', time: '', chapterId: '', characterIds: [] as string[] };
export const SceneList: React.FC<SceneListProps> = ({ bookId, ownerId, chapters = [], compact = false }) => {
    const {data:scenes,setData:setScenes,loading,loadError,retry}=usePlanningCollection<Scene>(bookId,useCallback(()=>api.getScenesByBookId(bookId),[bookId,ownerId]));
    const characterData=usePlanningCollection<Character>(bookId,useCallback(()=>api.getCharactersByBookId(bookId),[bookId,ownerId]));
    const characters=characterData.data;
    const [query,setQuery]=useState('');
    const [chapterFilter,setChapterFilter]=useState('');
    const [characterFilter,setCharacterFilter]=useState('');
    const [editing, setEditing] = useState<Scene | 'new' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const prefix = useId();
    useEffect(()=>{setEditing(null);setDeleteTarget(null);setError('');setSuccess('');setQuery('');setChapterFilter('');setCharacterFilter('');},[bookId,ownerId]);
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
    const visibleScenes=filterPlanningScenes(scenes,query,chapterFilter,characterFilter,chapters,characters);
    return <div className="ww-story-tool ww-scenes-tool">
        <div className="ww-story-tool-heading"><div>{!compact&&<><span>Story map</span><h3>Scenes</h3></>}<p>Plan where each turning point happens, who is present, and what changes.</p></div><button className="ww-story-tool-add" disabled={!!editing} onClick={()=>{setEditing('new');setSuccess('');}}><span>+</span>Add scene</button></div>
        <PlanningLoadState loading={loading} error={loadError} retry={retry} label="scenes"/>
        {error && <p role="alert" className="ww-studio-alert">{error}</p>}{success && <p role="status">{success}</p>}
        {editing && <PlanningDraftForm disabled={busyAction==='save'} key={editing==='new'?'new':editing.id} ownerId={ownerId} journey={`scene:${bookId}:${editing==='new'?'new':editing.id}`} initial={initial}>{(draft,update,clear)=><>
            <h4 className="font-bold mb-4">{editing==='new'?'New scene':'Edit scene'}</h4><div className="ww-planning-fields">
                {(['title','setting','time','description'] as const).map(field=><div className="ww-planning-field" key={field}><label htmlFor={`${prefix}-${field}`}>{field==='title'?'Scene title':field==='description'?'Description':field==='setting'?'Setting':'Time'}</label>{field==='description'?<textarea id={`${prefix}-${field}`} maxLength={2000} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/>:<input id={`${prefix}-${field}`} autoFocus={field==='title'} maxLength={field==='title'?100:200} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/>}</div>)}
                <div className="ww-planning-field"><label htmlFor={`${prefix}-chapter`}>Chapter <small>(optional)</small></label><select id={`${prefix}-chapter`} value={draft.chapterId} onChange={event=>update({...draft,chapterId:event.target.value})}><option value="">No chapter</option>{chapters.map(chapter=><option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}{draft.chapterId&&!chapters.some(chapter=>chapter.id===draft.chapterId)&&<option value={draft.chapterId}>Previously linked chapter · currently unavailable</option>}</select></div>
                <PlanningLoadState loading={characterData.loading} error={characterData.loadError} retry={characterData.retry} label="character choices"/>
                <fieldset><legend className="text-sm font-semibold mb-2">Characters in this scene</legend><div className="flex flex-wrap gap-2">{!characterData.loading&&!characterData.loadError&&!characters.length&&<p className="ww-planning-help">Add a character in Characters to link your cast here.</p>}{characters.map(character=><button type="button" className="px-3 py-2 rounded-full border text-sm" key={character.id} aria-pressed={draft.characterIds.includes(character.id)} onClick={()=>update({...draft,characterIds:draft.characterIds.includes(character.id)?draft.characterIds.filter(id=>id!==character.id):[...draft.characterIds,character.id]})}>{draft.characterIds.includes(character.id)?'✓ ':''}{character.name}</button>)}{draft.characterIds.filter(id=>!characters.some(character=>character.id===id)).map(id=><button type="button" key={id} className="px-3 py-2 rounded-full border text-sm" onClick={()=>update({...draft,characterIds:draft.characterIds.filter(candidate=>candidate!==id)})}>Remove unavailable character link</button>)}</div></fieldset>
            </div><div className="ww-planning-actions"><button disabled={!!busyAction} onClick={()=>setEditing(null)}>Cancel</button><button className="primary" disabled={!draft.title.trim()||!!busyAction} onClick={()=>save(draft,clear)}>{busyAction==='save'?'Saving…':'Save scene'}</button></div>
        </>}</PlanningDraftForm>}
        {!editing && !loading && !loadError && !scenes.length && <div className="ww-tool-empty"><span>Sequence</span><h4>Map the moments that matter.</h4><p>Capture a setting, conflict, or reveal. Link it to a chapter whenever you’re ready.</p><button onClick={()=>setEditing('new')}>Plan the first scene →</button></div>}
        {!!scenes.length&&<div className="ww-planning-controls"><label htmlFor={`${prefix}-search`}>Search scenes<input id={`${prefix}-search`} type="search" value={query} placeholder="Title, setting, chapter, or character" onChange={event=>setQuery(event.target.value)}/></label><label htmlFor={`${prefix}-chapter-filter`}>Chapter<select id={`${prefix}-chapter-filter`} value={chapterFilter} onChange={event=>setChapterFilter(event.target.value)}><option value="">All chapters</option><option value="unlinked">Unlinked scenes</option>{chapters.map(chapter=><option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><label htmlFor={`${prefix}-character-filter`}>Character<select id={`${prefix}-character-filter`} value={characterFilter} onChange={event=>setCharacterFilter(event.target.value)}><option value="">All characters</option>{characters.map(character=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label></div>}
        {!loading&&!loadError&&!!scenes.length&&!visibleScenes.length&&<p className="ww-planning-no-results" role="status">No scenes match these filters. <button onClick={()=>{setQuery('');setChapterFilter('');setCharacterFilter('');}}>Clear filters</button></p>}
        <div className="ww-story-tool-list space-y-4">{visibleScenes.map(scene=><article key={scene.id} className="p-4 bg-card-bg dark:bg-dark-card-bg rounded-2xl border border-border dark:border-dark-border"><h4 className="font-bold text-lg">{scene.title}</h4><div className="ww-planning-badges"><span>Private plan</span><span>{chapters.find(ch=>ch.id===scene.chapterId)?.title||(scene.chapterId?'Chapter unavailable':'No chapter linked')}</span></div><p className="text-sm text-text-muted dark:text-dark-text-muted">{[scene.setting,scene.time,chapters.find(ch=>ch.id===scene.chapterId)?.title].filter(Boolean).join(' · ')}</p><p className="mt-3 text-sm whitespace-pre-wrap">{scene.description}</p>{scene.characterIds?.length>0&&<p className="mt-3 text-xs">{scene.characterIds.map(id=>characters.find(c=>c.id===id)?.name).filter(Boolean).join(', ')}</p>}<div className="ww-planning-card-actions"><button disabled={!!editing||!!busyAction} onClick={()=>{setEditing(scene);setSuccess('');}}>Edit</button><button disabled={!!busyAction} onClick={()=>setDeleteTarget(scene)}>Delete</button></div></article>)}</div>
        <ConfirmDialog isOpen={!!deleteTarget} title="Delete scene?" message={`“${deleteTarget?.title||'This scene'}” will be permanently removed from your story plan.`} confirmLabel="Delete scene" processingLabel="Deleting…" isProcessing={busyAction==='delete'} onCancel={()=>setDeleteTarget(null)} onConfirm={remove}/>
    </div>;
};
