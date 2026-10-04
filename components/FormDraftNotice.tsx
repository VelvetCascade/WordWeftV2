import React, { useState } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import '../styles/quality.css';

export const FormDraftNotice: React.FC<{ restored: boolean; location: 'browser' | 'tab' | 'none'; dirty: boolean; onDiscard: () => void; guest?: boolean; conflict?: boolean; useStored?: () => void; keepCurrent?: () => void; notice?: string }> = ({ restored, location, dirty, onDiscard, guest, conflict, useStored, keepCurrent, notice }) => {
    const [confirm, setConfirm] = useState(false);
    if (!dirty && !conflict) return notice ? <p className="ww-draft-notice" role="status">{notice}</p> : null;
    return <><div className="ww-draft-notice"><span>{restored ? <RotateCcw size={17} /> : <Check size={17} />}<span role="status">{conflict ? 'Another tab changed this draft. Your version is kept separately.' : restored ? 'Your unsent draft is restored.' : 'Your draft is kept here.'}<small>{location === 'tab' ? 'Browser storage is unavailable. Keep this tab open or copy your work before closing it.' : guest ? 'Kept in this browser tab. Nothing is submitted until you choose to send it.' : 'Saved on this browser, separate from your published work.'}</small>{conflict && useStored && keepCurrent && <span className="ww-draft-conflict-actions"><button type="button" onClick={useStored}>Use the other tab’s version</button><button type="button" onClick={keepCurrent}>Keep this version</button></span>}</span></span><button type="button" onClick={() => setConfirm(true)}><Trash2 size={15} />Discard draft</button></div>{confirm && <ConfirmDialog isOpen title="Discard this draft?" message="This removes the unsent form draft from this browser. Published work is unchanged." confirmLabel="Discard draft" onConfirm={() => { onDiscard(); setConfirm(false); }} onCancel={() => setConfirm(false)} />}</>;
};
