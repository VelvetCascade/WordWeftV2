import React, { useState, useEffect, useId } from 'react';
import type { Character, Scene, Note, Chapter } from '../types';
import * as api from '../api/client';
import { CharacterAvatar } from './CharacterAvatar';
import { X, LockKeyhole } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { CharacterList } from './CharacterList';
import { SceneList } from './SceneList';
import { NoteList } from './NoteList';
import { StoryBible } from './StoryBible';
import '../styles/planning.css';
import { filterPlanningCharacters, filterPlanningScenes, filterPlanningNotes } from '../utils/planningSearch';

interface WorldBuildingSidebarProps { bookId:string; ownerId?:string; chapterId?:string; isOpen:boolean; onClose:()=>void; }
type Tab='characters'|'scenes'|'notes'|'bible';
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
    const [query,setQuery]=useState('');
    const [sceneChapter,setSceneChapter]=useState('');
    const [sceneCharacter,setSceneCharacter]=useState('');
    const prefix=useId();
    const dialogRef=useDialog(isOpen,onClose);
    useEffect(()=>{
        const updated=(event:Event)=>{if((event as CustomEvent<{bookId:string}>).detail?.bookId===bookId&&activeTab!=='bible')setRefresh(value=>value+1);};
        window.addEventListener('wordweft:planning-updated',updated);
        return()=>window.removeEventListener('wordweft:planning-updated',updated);
    },[bookId,activeTab]);
    useEffect(()=>{
        if(!isOpen)return;
        let active=true;setLoading(true);setError('');
        if(activeTab==='bible'){api.getBookById(bookId).then(book=>{if(active)setChapters(book?.chapters||[]);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'Chapter choices could not load.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};}
        const read=activeTab==='characters'?api.getCharactersByBookId(bookId):activeTab==='scenes'?api.getScenesByBookId(bookId):chapterNotes&&chapterId&&chapterId!=='new'?api.getNotesByChapterId(chapterId):api.getNotesByBookId(bookId);
        read.then(data=>{if(!active)return;if(activeTab==='characters')setCharacters(data as Character[]);else if(activeTab==='scenes')setScenes(data as Scene[]);else setNotes(data as Note[]);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'The story guide could not load.');}).finally(()=>{if(active)setLoading(false);});
        if(activeTab==='scenes')api.getCharactersByBookId(bookId).then(data=>{if(active)setCharacters(data);}).catch(()=>{});
        api.getBookById(bookId).then(book=>{if(active)setChapters(book?.chapters||[]);}).catch(()=>{});
        return()=>{active=false;};
    },[isOpen,activeTab,bookId,chapterId,chapterNotes,refresh]);
    useEffect(()=>{setManaging(false);setChapterNotes(!!chapterId&&chapterId!=='new');setCharacters([]);setScenes([]);setNotes([]);setQuery('');setSceneChapter('');setSceneCharacter('');},[bookId,chapterId]);
    const visibleCharacters=filterPlanningCharacters(characters,query);
    const visibleScenes=filterPlanningScenes(scenes,query,sceneChapter,sceneCharacter,chapters,characters);
    const visibleNotes=filterPlanningNotes(notes,query,chapterNotes?chapterId:undefined);
    const chapterTitle=chapters.find(ch=>ch.id===chapterId)?.title;
    if(!isOpen)return null;
    return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Story guide" tabIndex={-1} className={`ww-editor-world-guide fixed inset-y-0 right-0 w-full max-w-[560px] bg-white dark:bg-dark-surface border-l dark:border-dark-border shadow-2xl z-40 flex flex-col ${managing?'ww-guide-manage':''}`}>
        <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-surface-alt"><h3 className="font-bold">Story guide</h3><button onClick={onClose} aria-label="Close story guide" className="p-3"><X size={20}/></button></div>
        <nav aria-label="Story guide sections" className="flex border-b dark:border-dark-border">{(['characters','bible','scenes','notes'] as Tab[]).map(tab=><button key={tab} aria-pressed={activeTab===tab} onClick={()=>{setActiveTab(tab);setQuery('');}} className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab===tab?'text-primary border-b-2 border-primary bg-primary/5':'text-text-muted'}`}>{tab==='bible'?'Story Bible':tab}</button>)}</nav>
        <div className="flex-1 overflow-y-auto p-4">
            {activeTab!=='bible'&&!managing&&error&&<div className="ww-studio-alert" role="alert">{error}<button onClick={()=>setRefresh(value=>value+1)}>Try again</button></div>}
            {activeTab==='notes'&&<p className="ww-editor-note-privacy"><LockKeyhole size={16}/>Private notes · only visible to you</p>}
            {activeTab==='bible'&&ownerId?<><p className="ww-editor-note-privacy"><LockKeyhole size={16}/>Private entries and reader reveals · you control visibility</p>{loading?<p role="status">Loading chapter choices…</p>:error?<div role="alert" className="ww-studio-alert">{error}<button onClick={()=>setRefresh(value=>value+1)}>Try again</button></div>:<StoryBible key={bookId} bookId={bookId} ownerId={ownerId} chapters={chapters}/>}</>:managing&&ownerId?<>
                {activeTab==='characters'&&<CharacterList key={`characters:${bookId}`} bookId={bookId} ownerId={ownerId} compact/>}
                {activeTab==='scenes'&&<SceneList key={`scenes:${bookId}`} bookId={bookId} ownerId={ownerId} chapters={chapters} compact/>}
                {activeTab==='notes'&&<NoteList key={`notes:${bookId}`} bookId={bookId} ownerId={ownerId} chapterId={chapterId} chapterTitle={chapterTitle} initialScope={chapterNotes?'chapter':'story'} onScopeChange={scope=>setChapterNotes(scope==='chapter')} compact/>}

            </>:<>
                {activeTab==='notes'&&<div className="ww-planning-scope" role="group" aria-label="Note scope"><button aria-pressed={!chapterNotes} onClick={()=>{setChapterNotes(false);setQuery('');}}>Story-wide notes</button>{chapterId&&chapterId!=='new'&&<button aria-pressed={chapterNotes} onClick={()=>{setChapterNotes(true);setQuery('');}}>This chapter</button>}</div>}
                <div className="ww-planning-controls"><label htmlFor={`${prefix}-search`}>Search {activeTab}<input id={`${prefix}-search`} type="search" value={query} placeholder={activeTab==='characters'?'Name, alias, or detail':activeTab==='scenes'?'Scene, chapter, or character':'Title or content'} onChange={event=>setQuery(event.target.value)}/></label>{activeTab==='scenes'&&<><label htmlFor={`${prefix}-chapter`}>Chapter<select id={`${prefix}-chapter`} value={sceneChapter} onChange={event=>setSceneChapter(event.target.value)}><option value="">All chapters</option><option value="unlinked">Unlinked scenes</option>{chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label><label htmlFor={`${prefix}-character`}>Character<select id={`${prefix}-character`} value={sceneCharacter} onChange={event=>setSceneCharacter(event.target.value)}><option value="">All characters</option>{characters.map(char=><option key={char.id} value={char.id}>{char.name}</option>)}</select></label></>}</div>
                {loading?<p role="status" className="text-center py-8 text-sm">Loading…</p>:error?null:<div className="space-y-4">
                {activeTab==='characters'&&(visibleCharacters.length?visibleCharacters.map(char=><article key={char.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded-xl border border-border dark:border-dark-border"><div className="flex items-center gap-3 mb-2"><CharacterAvatar name={char.name} imageUrl={char.imageUrl} size="sm"/><div><h4 className="font-bold text-sm">{char.name}</h4><p className="text-xs text-primary">{char.role}</p></div></div>{('aliases' in char)&&Array.isArray(char.aliases)&&char.aliases.length>0&&<p className="ww-planning-aliases">Also known as {char.aliases.join(', ')}</p>}<div className="ww-planning-badges"><span>Background · {char.descriptionVisibility==='PRIVATE'?'Private':'Public'}</span><span>Goal · {char.goalVisibility==='PUBLIC'?'Public':'Private'}</span></div><p className="text-sm whitespace-pre-wrap">{char.description}</p>{char.goal&&<p className="text-sm mt-2"><strong>Goal:</strong> {char.goal}</p>}</article>):<p className="text-sm text-center">{query?'No characters match your search.':'No characters yet.'}</p>)}
                {activeTab==='scenes'&&(visibleScenes.length?visibleScenes.map(scene=><article key={scene.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded-xl border border-border dark:border-dark-border"><h4 className="font-bold text-sm mb-1">{scene.title}</h4><div className="ww-planning-badges"><span>Private plan</span><span>{chapters.find(ch=>ch.id===scene.chapterId)?.title||'No chapter linked'}</span></div><p className="text-xs mb-2">{[scene.setting,scene.time].filter(Boolean).join(' · ')}</p><p className="text-sm whitespace-pre-wrap">{scene.description}</p>{scene.characterIds?.length>0&&<p className="ww-planning-help">{scene.characterIds.map(id=>characters.find(char=>char.id===id)?.name).filter(Boolean).join(', ')}</p>}</article>):<p className="text-sm text-center">{query||sceneChapter||sceneCharacter?'No scenes match these filters.':'No scenes yet.'}</p>)}
                {activeTab==='notes'&&(visibleNotes.length?visibleNotes.map(note=><article key={note.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-900/30"><h4 className="font-bold text-sm mb-1">{note.title||'Untitled note'}</h4><div className="ww-planning-badges"><span>Private</span><span>{chapterNotes?chapterTitle||'This chapter':'Story-wide'}</span></div><p className="text-sm whitespace-pre-wrap">{note.content}</p></article>):<p className="text-sm text-center">{query?'No notes match your search.':chapterNotes?'No notes for this chapter yet.':'No story-wide notes yet.'}</p>)}
            </div>}</>}
        </div>
        <div className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt text-center" style={{paddingBottom:'max(16px, env(safe-area-inset-bottom))'}}>{activeTab==='bible'?null:ownerId?<button className="ww-studio-text-link min-h-11" onClick={()=>setManaging(value=>!value)}>{managing?'Back to guide':'Add or edit here'}</button>:<a href={`/write/book/${bookId}/manage?tab=${activeTab}`} className="ww-studio-text-link">Manage your story guide</a>}<p className="text-xs mt-2">Close the guide to continue at the same place in your manuscript.</p></div>
    </div>;
};
