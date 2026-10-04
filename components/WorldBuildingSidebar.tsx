import React, { useState, useEffect } from 'react';
import type { Character, Scene, Note, Chapter } from '../types';
import * as api from '../api/client';
import { CharacterAvatar } from './CharacterAvatar';
import { X, LockKeyhole } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { CharacterList } from './CharacterList';
import { SceneList } from './SceneList';
import { NoteList } from './NoteList';
import '../styles/planning.css';

interface WorldBuildingSidebarProps { bookId:string; ownerId?:string; chapterId?:string; isOpen:boolean; onClose:()=>void; }
type Tab='characters'|'scenes'|'notes';
export const WorldBuildingSidebar:React.FC<WorldBuildingSidebarProps>=({bookId,ownerId,chapterId,isOpen,onClose})=>{
    const [activeTab,setActiveTab]=useState<Tab>('characters');
    const [characters,setCharacters]=useState<Character[]>([]);
    const [scenes,setScenes]=useState<Scene[]>([]);
    const [notes,setNotes]=useState<Note[]>([]);
    const [chapters,setChapters]=useState<Chapter[]>([]);
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState('');
    const [managing,setManaging]=useState(false);
    const [chapterNotes,setChapterNotes]=useState(false);
    const [refresh,setRefresh]=useState(0);
    const dialogRef=useDialog(isOpen,onClose);
    useEffect(()=>{
        const updated=(event:Event)=>{if((event as CustomEvent<{bookId:string}>).detail?.bookId===bookId)setRefresh(value=>value+1);};
        window.addEventListener('wordweft:planning-updated',updated);
        return()=>window.removeEventListener('wordweft:planning-updated',updated);
    },[bookId]);
    useEffect(()=>{
        if(!isOpen)return;
        let active=true;setLoading(true);setError('');
        const read=activeTab==='characters'?api.getCharactersByBookId(bookId):activeTab==='scenes'?api.getScenesByBookId(bookId):Promise.all([api.getNotesByBookId(bookId),chapterId&&chapterId!=='new'?api.getNotesByChapterId(chapterId):Promise.resolve([])]).then(([bookNotes,chapterNotes])=>Array.from(new Map([...bookNotes,...chapterNotes].map(note=>[note.id,note])).values()));
        read.then(data=>{if(!active)return;if(activeTab==='characters')setCharacters(data as Character[]);else if(activeTab==='scenes')setScenes(data as Scene[]);else setNotes(data as Note[]);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'The story guide could not load.');}).finally(()=>{if(active)setLoading(false);});
        api.getBookById(bookId).then(book=>{if(active)setChapters(book?.chapters||[]);}).catch(()=>{});
        return()=>{active=false;};
    },[isOpen,activeTab,bookId,chapterId,refresh]);
    useEffect(()=>{setManaging(false);setChapterNotes(false);},[bookId,chapterId]);
    if(!isOpen)return null;
    return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Story guide" tabIndex={-1} className={`ww-editor-world-guide fixed inset-y-0 right-0 w-full max-w-[560px] bg-white dark:bg-dark-surface border-l dark:border-dark-border shadow-2xl z-40 flex flex-col ${managing?'ww-guide-manage':''}`}>
        <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-surface-alt"><h3 className="font-bold">Story guide</h3><button onClick={onClose} aria-label="Close story guide" className="p-3"><X size={20}/></button></div>
        <nav aria-label="Story guide sections" className="flex border-b dark:border-dark-border">{(['characters','scenes','notes'] as Tab[]).map(tab=><button key={tab} aria-pressed={activeTab===tab} onClick={()=>setActiveTab(tab)} className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab===tab?'text-primary border-b-2 border-primary bg-primary/5':'text-text-muted'}`}>{tab}</button>)}</nav>
        <div className="flex-1 overflow-y-auto p-4">
            {error&&<div className="ww-studio-alert" role="alert">{error}<button onClick={()=>setRefresh(value=>value+1)}>Try again</button></div>}
            {activeTab==='notes'&&<p className="ww-editor-note-privacy"><LockKeyhole size={16}/>Private notes · only visible to you</p>}
            {managing&&ownerId?<>
                {activeTab==='characters'&&<CharacterList key={`characters:${bookId}`} bookId={bookId} ownerId={ownerId}/>}
                {activeTab==='scenes'&&<SceneList key={`scenes:${bookId}`} bookId={bookId} ownerId={ownerId} chapters={chapters}/>}
                {activeTab==='notes'&&<>{chapterId&&chapterId!=='new'&&<label className="flex gap-3 items-center mb-4 min-h-11"><input type="checkbox" checked={chapterNotes} onChange={event=>setChapterNotes(event.target.checked)}/>Notes for this chapter</label>}<NoteList key={`notes:${bookId}:${chapterNotes?chapterId:'story'}`} bookId={bookId} ownerId={ownerId} chapterId={chapterNotes?chapterId:undefined}/></>}
            </>:loading?<p role="status" className="text-center py-8 text-sm">Loading…</p>:<div className="space-y-4">
                {activeTab==='characters'&&(characters.length?characters.map(char=><article key={char.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded-xl border border-border dark:border-dark-border"><div className="flex items-center gap-3 mb-2"><CharacterAvatar name={char.name} imageUrl={char.imageUrl} size="sm"/><div><h4 className="font-bold text-sm">{char.name}</h4><p className="text-xs text-primary">{char.role}</p></div></div><p className="text-sm whitespace-pre-wrap">{char.description}</p>{char.goal&&<p className="text-sm mt-2"><strong>Goal:</strong> {char.goal}</p>}</article>):<p className="text-sm text-center">No characters yet.</p>)}
                {activeTab==='scenes'&&(scenes.length?scenes.map(scene=><article key={scene.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded-xl border border-border dark:border-dark-border"><h4 className="font-bold text-sm mb-1">{scene.title}</h4><p className="text-xs mb-2">{[scene.setting,scene.time].filter(Boolean).join(' · ')}</p><p className="text-sm whitespace-pre-wrap">{scene.description}</p></article>):<p className="text-sm text-center">No scenes yet.</p>)}
                {activeTab==='notes'&&(notes.length?notes.map(note=><article key={note.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-900/30"><h4 className="font-bold text-sm mb-1">{note.title||'Untitled note'}</h4><p className="text-sm whitespace-pre-wrap">{note.content}</p></article>):<p className="text-sm text-center">No notes yet.</p>)}
            </div>}
        </div>
        <div className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt text-center" style={{paddingBottom:'max(16px, env(safe-area-inset-bottom))'}}>{ownerId?<button className="ww-studio-text-link min-h-11" onClick={()=>setManaging(value=>!value)}>{managing?'Back to guide':'Add or edit here'}</button>:<a href={`/write/book/${bookId}/manage?tab=${activeTab}`} className="ww-studio-text-link">Manage your story guide</a>}<p className="text-xs mt-2">Close the guide to continue at the same place in your manuscript.</p></div>
    </div>;
};
