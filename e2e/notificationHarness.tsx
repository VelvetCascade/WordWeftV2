// Browser regression harness, served only by the local Vite test route.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useNotifications} from '../hooks/useNotifications';
function Harness() {
 const [owner,setOwner]=useState('one');
 const state=useNotifications(true,owner);
 return <main><h1>{owner}</h1><p data-testid="unread">{state.unreadCount}</p><p role="alert">{state.error}</p>{state.notifications.map(n=><p key={n.id} data-testid="notice">{n.message} {n.read?'read':'unread'} <button onClick={()=>state.markAsRead(n.id)}>Mark {n.id}</button></p>)}<button onClick={state.markAllAsRead}>Mark all</button><button onClick={()=>{localStorage.setItem('wordweft_jwt','two');setOwner('two');}}>Switch account</button></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
