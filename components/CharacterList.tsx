import React, { useState, useEffect, useId, useCallback } from 'react';
import type { Character, Chapter } from '../types';
import * as api from '../api/client';
import { ImageUpload } from './ImageUpload';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterPreview } from './CharacterPreview';
import { ConfirmDialog } from './ConfirmDialog';
import { PlanningDraftForm } from './PlanningDraftForm';
import { notifyPlanningUpdated } from '../utils/planningTools';
import { usePlanningCollection } from '../hooks/usePlanningCollection';
import { PlanningLoadState } from './PlanningLoadState';
import { filterPlanningCharacters, parseCharacterAliases } from '../utils/planningSearch';

type Visibility = 'PUBLIC'|'PRIVATE';
// Additive contract shared with the reader's spoiler-aware character response.
type PlanningCharacter = Character & { descriptionVisibility?:Visibility; goalVisibility?:Visibility; spoilerDetails?:string; spoilerChapterId?:string; aliases?:string[]; };
interface CharacterListProps { bookId:string; ownerId?:string; readOnly?:boolean; compact?:boolean; }
const emptyCharacter = {name:'',role:'',aliases:'',description:'',goal:'',imageUrl:'',imageFileId:'',descriptionVisibility:'PUBLIC' as Visibility,goalVisibility:'PRIVATE' as Visibility,spoilerDetails:'',spoilerChapterId:''};
const Preview = CharacterPreview as React.ComponentType<{character:PlanningCharacter|null;isOpen:boolean;onClose:()=>void;previewChapterId?:string;chapters?:Chapter[]}>;
export const CharacterList:React.FC<CharacterListProps>=({bookId,ownerId,readOnly=false,compact=false})=>{
    const {data:characters,setData:setCharacters,loading,loadError,retry}=usePlanningCollection<PlanningCharacter>(bookId,useCallback(()=>api.getCharactersByBookId(bookId),[bookId,ownerId]));
    const [query,setQuery]=useState('');
    const [visibility,setVisibility]=useState('all');
    const [chapterError,setChapterError]=useState('');
    const [chapterAttempt,setChapterAttempt]=useState(0);
    const [chapters,setChapters]=useState<Chapter[]>([]);
    const [editing,setEditing]=useState<PlanningCharacter|'new'|null>(null);
    const [selectedCharacter,setSelectedCharacter]=useState<PlanningCharacter|null>(null);
    const [deleteTarget,setDeleteTarget]=useState<PlanningCharacter|null>(null);
    const [busyAction,setBusyAction]=useState<string|null>(null);
    const [error,setError]=useState('');
    const [success,setSuccess]=useState('');
    const [isImageUploading,setIsImageUploading]=useState(false);
    const [previewChapterId,setPreviewChapterId]=useState('');
    const prefix=useId();
    useEffect(()=>{setEditing(null);setSelectedCharacter(null);setDeleteTarget(null);setError('');setSuccess('');setQuery('');setVisibility('all');setPreviewChapterId('');},[bookId,ownerId]);
    useEffect(()=>{
        let active=true;setChapters([]);setChapterError('');
        api.getBookById(bookId).then(book=>{if(active)setChapters(book?.chapters||[]);}).catch(()=>{if(active)setChapterError('Chapter choices could not load. Your selected reveal is kept.');});
        return()=>{active=false;};
    },[bookId,chapterAttempt]);
    const save=async(draft:typeof emptyCharacter,clear:()=>void)=>{
        if(!draft.name.trim()||busyAction||isImageUploading||!editing)return;
        setBusyAction('save');setError('');setSuccess('');
        try{
            const payload={...draft,aliases:parseCharacterAliases(draft.aliases),name:draft.name.trim(),bookId,spoilerChapterId:draft.spoilerChapterId||null,imageFileId:draft.imageFileId||undefined};
            const saved=editing==='new'?await api.createCharacter(payload):await api.updateCharacter(editing.id,payload);
            setCharacters(current=>editing==='new'?[...current,saved]:current.map(char=>char.id===saved.id?saved:char));
            clear();setEditing(null);setSuccess('Character saved online.');notifyPlanningUpdated(bookId);
        }catch(failure){setError(failure instanceof Error?failure.message:'The character could not be saved. Your draft is kept here.');}finally{setBusyAction(null);}
    };
    const remove=async()=>{
        if(!deleteTarget||busyAction)return;setBusyAction('delete');setError('');
        try{await api.deleteCharacter(deleteTarget.id);setCharacters(current=>current.filter(char=>char.id!==deleteTarget.id));setDeleteTarget(null);notifyPlanningUpdated(bookId);}catch(failure){setError(failure instanceof Error?failure.message:'The character could not be deleted.');}finally{setBusyAction(null);}
    };
    const initial=editing&&editing!=='new'?{name:editing.name||'',role:editing.role||'',aliases:(editing.aliases||[]).join(', '),description:editing.description||'',goal:editing.goal||'',imageUrl:editing.imageUrl||'',imageFileId:editing.imageFileId||'',descriptionVisibility:editing.descriptionVisibility||'PUBLIC',goalVisibility:editing.goalVisibility||'PRIVATE',spoilerDetails:editing.spoilerDetails||'',spoilerChapterId:editing.spoilerChapterId||''}:emptyCharacter;
    const publicCharacter=(char:PlanningCharacter):PlanningCharacter=>({...char,description:char.descriptionVisibility==='PRIVATE'?'':char.description,goal:char.goalVisibility==='PUBLIC'?char.goal:'',spoilerDetails:char.spoilerDetails,aliases:[]});
    const visibleCharacters=filterPlanningCharacters(readOnly?characters.map(publicCharacter):characters,query,visibility);
    return <div className="ww-story-tool ww-characters-tool"><div className="ww-story-tool-heading"><div>{!compact&&<><span>Story guide</span><h3>Characters</h3></>}<p>Keep motivations and relationships close to the manuscript. Choose which details readers can see.</p></div>{!readOnly&&ownerId&&<button className="ww-story-tool-add" disabled={!!editing} onClick={()=>{setEditing('new');setSuccess('');}}><span>+</span>Add character</button>}</div>
        <PlanningLoadState loading={loading} error={loadError} retry={retry} label="characters"/>
        {error&&<p role="alert" className="ww-studio-alert">{error}</p>}{success&&<p role="status">{success}</p>}
        {editing&&ownerId&&<PlanningDraftForm disabled={busyAction==='save'||isImageUploading} key={editing==='new'?'new':editing.id} ownerId={ownerId} journey={`character:${bookId}:${editing==='new'?'new':editing.id}`} initial={initial}>{(draft,update,clear)=>{
            const revealIndex=chapters.findIndex(ch=>ch.id===draft.spoilerChapterId&&ch.status==='published');
            const previewIndex=chapters.findIndex(ch=>ch.id===previewChapterId&&ch.status==='published');
            const spoilerAvailable=!draft.spoilerChapterId||(revealIndex>=0&&previewIndex>=revealIndex);
            return <><h4 className="text-xl font-serif font-bold mb-5">{editing==='new'?'New character':'Edit character'}</h4><div className="ww-planning-fields">
                <div className="ww-planning-pair">{(['name','role'] as const).map(field=><div className="ww-planning-field" key={field}><label htmlFor={`${prefix}-${field}`}>{field==='name'?'Name':'Role'} <small>{draft[field].length}/50</small></label><input id={`${prefix}-${field}`} autoFocus={field==='name'} maxLength={50} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/></div>)}</div>
                <div className="ww-planning-field"><label htmlFor={`${prefix}-aliases`}>Aliases <small>(optional)</small></label><input id={`${prefix}-aliases`} maxLength={500} value={draft.aliases} placeholder="Pen name, nickname, secret identity" onChange={event=>update({...draft,aliases:event.target.value})}/><small>Separate up to 20 names with commas (100 characters each). Aliases are private planning names; use public background for names readers should see.</small></div>
                {(['description','goal'] as const).map(field=><div className="ww-planning-field" key={field}><label htmlFor={`${prefix}-${field}`}>{field==='description'?'Background':'Goal / motivation'} <small>{draft[field].length}/{field==='description'?500:200}</small></label><textarea id={`${prefix}-${field}`} maxLength={field==='description'?500:200} value={draft[field]} onChange={event=>update({...draft,[field]:event.target.value})}/><label htmlFor={`${prefix}-${field}-visibility`}>{field==='description'?'Background':'Goal'} visibility</label><select id={`${prefix}-${field}-visibility`} value={draft[field==='description'?'descriptionVisibility':'goalVisibility']} onChange={event=>update({...draft,[field==='description'?'descriptionVisibility':'goalVisibility']:event.target.value as Visibility})}><option value="PRIVATE">Private · only you</option><option value="PUBLIC">Public · shown to readers</option></select></div>)}
                <div className="ww-planning-field"><label htmlFor={`${prefix}-spoilers`}>Spoiler details <small>(optional · {draft.spoilerDetails.length}/2000)</small></label><textarea id={`${prefix}-spoilers`} maxLength={2000} value={draft.spoilerDetails} onChange={event=>update({...draft,spoilerDetails:event.target.value})}/><label htmlFor={`${prefix}-reveal`}>Reveal spoiler details</label><select id={`${prefix}-reveal`} value={draft.spoilerChapterId} onChange={event=>update({...draft,spoilerChapterId:event.target.value})}><option value="">Reader can choose to reveal from the start</option>{chapters.map(ch=><option value={ch.id} key={ch.id}>From {ch.title}{ch.status!=='published'?' · draft':''}</option>)}{draft.spoilerChapterId&&!chapters.some(ch=>ch.id===draft.spoilerChapterId)&&<option value={draft.spoilerChapterId}>Previously selected chapter · currently unavailable</option>}</select><small>Draft chapter reveals stay hidden until that chapter is published. Private fields stay hidden; spoiler details require the reader to choose Reveal.</small></div>
                {chapterError&&<div className="ww-studio-alert" role="alert">{chapterError}<button onClick={()=>setChapterAttempt(value=>value+1)}>Retry chapter choices</button></div>}
                <ImageUpload value={draft.imageUrl} onChange={(url,fileId)=>update({...draft,imageUrl:url,imageFileId:fileId||''})} label="Portrait (optional)" aspectRatio={1} cropShape="circle" disabled={!!busyAction} onBusyChange={setIsImageUploading}/>
                <details className="ww-planning-preview"><summary>Public reader preview</summary><div className="ww-planning-field mt-3"><label htmlFor={`${prefix}-preview-chapter`}>Preview reading context</label><select id={`${prefix}-preview-chapter`} value={previewChapterId} onChange={event=>setPreviewChapterId(event.target.value)}><option value="">Before a chapter reveal</option>{chapters.filter(ch=>ch.status==='published').map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></div><h5>{draft.name||'Character name'}</h5><p>{draft.role}</p>{draft.descriptionVisibility==='PUBLIC'&&draft.description&&<><h5>Background</h5><p>{draft.description}</p></>}{draft.goalVisibility==='PUBLIC'&&draft.goal&&<><h5>Current goal</h5><p>{draft.goal}</p></>}{draft.spoilerDetails&&(spoilerAvailable?<details><summary>Reveal spoiler details</summary><p>{draft.spoilerDetails}</p></details>:<p>Spoiler details are hidden in this chapter context.</p>)}{draft.descriptionVisibility==='PRIVATE'&&draft.goalVisibility==='PRIVATE'&&<p>Background and goal are private.</p>}</details>
            </div><div className="ww-planning-actions"><button disabled={!!busyAction||isImageUploading} onClick={()=>setEditing(null)}>Cancel</button><button className="primary" disabled={!draft.name.trim()||!!busyAction||isImageUploading} onClick={()=>save(draft,clear)}>{busyAction==='save'?'Saving…':isImageUploading?'Uploading portrait…':'Save character'}</button></div></>;
        }}</PlanningDraftForm>}
        {!editing&&!loading&&!loadError&&!characters.length&&<div className="ww-tool-empty"><span>Cast</span><h4>Who carries this story?</h4><p>Start with the person whose choices move the plot. Their details can evolve as you write.</p>{!readOnly&&ownerId&&<button onClick={()=>setEditing('new')}>Create the first character →</button>}</div>}
        {!!characters.length&&<div className="ww-planning-controls"><label htmlFor={`${prefix}-search`}>Search characters<input id={`${prefix}-search`} type="search" value={query} placeholder="Name, alias, role, or detail" onChange={event=>setQuery(event.target.value)}/></label>{!readOnly&&<label htmlFor={`${prefix}-filter`}>Field visibility<select id={`${prefix}-filter`} value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="all">All characters</option><option value="public">Has public details</option><option value="private">Has private details</option></select></label>}</div>}
        {!loading&&!loadError&&!!characters.length&&!visibleCharacters.length&&<p className="ww-planning-no-results" role="status">No characters match your search. <button onClick={()=>{setQuery('');setVisibility('all');}}>Clear filters</button></p>}
        <div className="ww-story-tool-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{visibleCharacters.map(char=><article key={char.id} className="ww-arrive-quiet p-4 bg-card-bg dark:bg-dark-card-bg border border-border dark:border-dark-border rounded-2xl shadow-sm"><div className="flex items-start gap-4"><CharacterAvatar name={char.name} imageUrl={char.imageUrl} size="md"/><div><h4 className="font-bold text-lg">{char.name}</h4><p className="text-sm text-primary font-medium">{char.role}</p></div></div>{char.aliases?.length>0&&<p className="ww-planning-aliases">Also known as {char.aliases.join(', ')}</p>}{!readOnly&&<div className="ww-planning-badges"><span>Background · {char.descriptionVisibility==='PRIVATE'?'Private':'Public'}</span><span>Goal · {char.goalVisibility==='PUBLIC'?'Public':'Private'}</span>{char.spoilerDetails&&<span>Spoiler · {chapters.find(ch=>ch.id===char.spoilerChapterId)?.title||'Reader reveal'}</span>}</div>}<p className="mt-3 text-sm whitespace-pre-wrap line-clamp-3">{char.description}</p>{!readOnly&&char.goal&&<p className="mt-2 text-xs"><strong>Goal:</strong> {char.goal}</p>}<div className="ww-planning-card-actions"><button onClick={()=>setSelectedCharacter(publicCharacter(char))}>{readOnly?'View character':'Public preview'}</button>{!readOnly&&ownerId&&<><button disabled={!!editing||!!busyAction} onClick={()=>{setEditing(char);setSuccess('');}}>Edit</button><button disabled={!!busyAction} onClick={()=>setDeleteTarget(char)}>Delete</button></>}</div></article>)}</div>
        <Preview character={selectedCharacter} isOpen={!!selectedCharacter} onClose={()=>setSelectedCharacter(null)} previewChapterId={previewChapterId||undefined} chapters={chapters}/>
        <ConfirmDialog isOpen={!!deleteTarget} title="Delete character?" message={`“${deleteTarget?.name||'This character'}” will be permanently removed from this story.`} confirmLabel="Delete character" processingLabel="Deleting…" isProcessing={busyAction==='delete'} onCancel={()=>setDeleteTarget(null)} onConfirm={remove}/>
    </div>;
};
