import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, PassageBookmark } from '../types';
import * as api from '../api/client';
import { useDialog } from '../hooks/useDialog';
import { XMarkIcon } from './icons/Icons';

const unsavedNotes = new Map<string, string>();

export const ReaderPassageTools: React.FC<{
    open: boolean; onClose: () => void; bookId: string; chapterId: string; chapters: Chapter[];
    userId?: string; paragraphIndex: number | null; onNavigate: (bookmark: PassageBookmark) => void;
    onFind: (index: number) => void; getParagraphs: () => string[]; onSignIn: () => void;
}> = ({ open, onClose, bookId, chapterId, chapters, userId, paragraphIndex, onNavigate, onFind, getParagraphs, onSignIn }) => {
    const [bookmarks, setBookmarks] = useState<PassageBookmark[]>([]);
    const [note, setNote] = useState('');
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const ref = useDialog(open, onClose, !busy);
    const draftKey = JSON.stringify([userId ?? 'guest', bookId, chapterId, paragraphIndex]);
    const draftVersion = useRef({ key: draftKey, version: 0 });
    if (draftVersion.current.key !== draftKey) draftVersion.current = { key: draftKey, version: draftVersion.current.version + 1 };
    useEffect(() => { setBookmarks([]); setNote(''); setStatus(''); setError(''); }, [bookId, userId]);
    useEffect(() => {
        if (!open || !userId) return;
        let active = true; setLoading(true);
        api.getPassageBookmarks(bookId).then(items => { if (active) setBookmarks(items); })
            .catch(() => { if (active) setError('Saved passages could not be loaded. Your unsaved note stays here.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [bookId, userId, open, attempt]);
    const existing = bookmarks.find(item => item.chapterId === chapterId && item.paragraphIndex === paragraphIndex);
    useEffect(() => { setNote(unsavedNotes.get(draftKey) ?? existing?.note ?? ''); }, [draftKey, existing?.id]);
    useEffect(() => { setStatus(unsavedNotes.has(draftKey) ? 'Unsaved note retained in this tab' : ''); }, [draftKey]);
    const blocks = open ? getParagraphs() : [];
    const matches = useMemo(() => query.trim() ? blocks.map((text, index) => ({ text, index })).filter(block => block.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : [], [query, blocks.join('\n')]);
    if (!open) return null;
    const save = async () => {
        if (paragraphIndex === null || busy) return;
        if (!userId) { onSignIn(); return; }
        const submittedNote = note, submittedVersion = draftVersion.current.version;
        setBusy(true); setError(''); setStatus('Saving online…');
        try {
            const saved = await api.savePassageBookmark(bookId, chapterId, paragraphIndex, submittedNote);
            const unchanged = draftVersion.current.key === draftKey && draftVersion.current.version === submittedVersion;
            if (unchanged) unsavedNotes.delete(draftKey);
            setBookmarks(items => [saved, ...items.filter(item => item.id !== saved.id)]);
            setStatus(unchanged ? 'Saved online · Only you can see this passage and note.' : 'Earlier note saved online. Newer changes are unsaved and retained in this tab.');
        } catch { setError('This passage could not be saved. Your note remains here; try again.'); setStatus('Not saved online'); }
        finally { setBusy(false); }
    };
    const remove = async (bookmark: PassageBookmark) => {
        if (busy) return; setBusy(true); setError('');
        try { await api.deletePassageBookmark(bookmark.id); setBookmarks(items => items.filter(item => item.id !== bookmark.id)); setStatus('Passage removed.'); }
        catch { setError('The passage could not be removed. Try again.'); }
        finally { setBusy(false); }
    };
    return <div className="reader-tools-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
        <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="passage-tools-title" className="reader-tools-panel">
            <header><div><span className="ww-page-eyebrow">Your reading space</span><h2 id="passage-tools-title">Passages & find</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close passage tools"><XMarkIcon className="w-5 h-5" /></button></header>
            <label htmlFor="reader-find">Find in this chapter</label><input id="reader-find" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="A name, phrase, or word" />
            {query.trim() && <><p role="status">{matches.length} {matches.length === 1 ? 'passage matches' : 'passages match'}</p><div className="reader-find-results">{matches.slice(0, 50).map(match => <button type="button" key={match.index} onClick={() => { onClose(); onFind(match.index); }}><strong>Passage {match.index + 1}</strong><span>{match.text.length > 180 ? `${match.text.slice(Math.max(0, match.text.toLowerCase().indexOf(query.toLowerCase()) - 40), Math.max(0, match.text.toLowerCase().indexOf(query.toLowerCase()) - 40) + 180)}…` : match.text}</span></button>)}</div></>}
            {paragraphIndex !== null && <section className="reader-private-note"><h3>Keep passage {paragraphIndex + 1}</h3><blockquote>{blocks[paragraphIndex]}</blockquote><label htmlFor="reader-private-note">Private note (optional)</label><textarea id="reader-private-note" maxLength={4000} rows={4} value={note} onChange={event => { draftVersion.current.version += 1; setNote(event.target.value); unsavedNotes.set(draftKey, event.target.value); setStatus('Unsaved note retained in this tab'); }} /><p>Private to your account. Notes are never posted as comments. Unsaved notes stay in this tab; save online before closing the browser.</p><button type="button" className="reader-tools-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : userId ? existing ? 'Update saved passage' : 'Save passage online' : 'Sign in to save passage'}</button></section>}
            {status && <p role="status">{status}</p>}{error && <p role="alert">{error}<button type="button" onClick={() => setAttempt(value => value + 1)}>Reload saved passages</button></p>}
            <section><h3>Your saved passages</h3>{!userId ? <p><button type="button" onClick={onSignIn}>Sign in</button> to keep passages and private notes across devices.</p> : loading ? <p role="status">Loading your private passages…</p> : !bookmarks.length ? <p>Use the bookmark beside a passage to keep it here.</p> : bookmarks.map(bookmark => <article key={bookmark.id} className="reader-saved-passage"><button type="button" onClick={() => { onClose(); onNavigate(bookmark); }}><strong>{chapters.find(chapter => chapter.id === bookmark.chapterId)?.title ?? 'Chapter'} · Passage {bookmark.paragraphIndex + 1}</strong><span>{bookmark.quote.slice(0, 180)}</span>{bookmark.note && <small>{bookmark.note}</small>}</button><button type="button" disabled={busy} aria-label={`Remove saved passage ${bookmark.paragraphIndex + 1}`} onClick={() => remove(bookmark)}>Remove</button></article>)}</section>
        </section>
    </div>;
};
