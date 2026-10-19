// Exercises parent-driven target changes independently of modal dismissal.
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ReportModal} from '../components/ReportModal';
import '../index.css';
function Harness(){
 const [open,setOpen]=useState(true),[target,setTarget]=useState('first');
 useEffect(()=>{const change=(event:MessageEvent)=>{if(event.origin!==location.origin)return;if(event.data==='replace')setTarget('second');if(event.data==='close')setOpen(false);if(event.data==='open')setOpen(true);};window.addEventListener('message',change);return()=>window.removeEventListener('message',change);},[]);
 return <ReportModal isOpen={open} onClose={()=>setOpen(false)} targetType="BOOK" targetId={target} targetTitle={target}/>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
