import React, { useState, useId } from 'react';
import type { ReaderComment } from '../utils/writerComments';
import type { Comment } from '../types';
import * as api from '../api/client';
import { useRecoverableForm } from '../hooks/useRecoverableForm';
import { FormDraftNotice } from './FormDraftNotice';
import { ArrowRight } from 'lucide-react';
const initialReply = { text: '' };
const validReply = (value:unknown):value is typeof initialReply => !!value && typeof value==='object' && typeof (value as typeof initialReply).text==='string';
export const WriterReplyForm:React.FC<{ownerId:string;thread:ReaderComment;onCancel:()=>void;onSent:(reply:Comment)=>void}>=({ownerId,thread,onCancel,onSent})=>{
    const recovery=useRecoverableForm(ownerId,`writer-reply:${thread.bookId}:${thread.chapterId}:${thread.id}`,initialReply,validReply);
    const [sending,setSending]=useState(false);
    const [error,setError]=useState('');
    const id=useId();
    const send=async(event:React.FormEvent)=>{
        event.preventDefault();if(!recovery.value.text.trim()||sending)return;
        setSending(true);setError('');
        try{const reply=await api.addChapterComment(thread.bookId,thread.chapterId,thread.paragraphIndex,recovery.value.text.trim(),thread.id);recovery.clear();onSent(reply);}
        catch(failure){setError(failure instanceof Error?failure.message:'Your reply could not be sent. Your draft is kept here.');}
        finally{setSending(false);}
    };
    return <form onSubmit={send}><fieldset className="ww-planning-edit-fields" disabled={sending} aria-busy={sending}><label htmlFor={id}>Your reply</label><textarea id={id} value={recovery.value.text} onChange={event=>recovery.setValue({text:event.target.value})} rows={3} maxLength={2000} autoFocus required/>{error&&<p role="alert" className="ww-studio-alert">{error}</p>}<FormDraftNotice {...recovery} onDiscard={recovery.discard}/></fieldset><div><button type="button" onClick={onCancel} disabled={sending}>Cancel</button><button className="ww-studio-primary" disabled={sending||!recovery.value.text.trim()}>{sending?'Sending…':'Post reply'}<ArrowRight size={16}/></button></div></form>;
};
