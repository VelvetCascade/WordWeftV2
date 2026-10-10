import React, { useEffect, useState } from 'react';
import * as api from '../api/client';
import type { ChapterRevision } from '../types';
import { revisionReasonLabel } from '../utils/chapterRevisions';
import type { ChapterSnapshot } from '../utils/chapterComparison';
import { ChapterDiff } from './ChapterDiff';
import { ConfirmDialog } from './ConfirmDialog';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import { X } from 'lucide-react';

interface ChapterVersionHistoryDialogProps {
    isOpen: boolean; bookId: string; chapterId: string; onClose: () => void;
    expectedRevision?: number; affectedChapters?: string[]; currentTitle?: string; currentContent?: string;
    currentContentWarnings?: string[]; currentDisclaimerNote?: string;
    onRestored: (user: api.ManuscriptWriteResult, revision: ChapterRevision) => void;
}

export const ChapterVersionHistoryDialog: React.FC<ChapterVersionHistoryDialogProps> = ({
    isOpen, bookId, chapterId, onClose, onRestored, expectedRevision, affectedChapters = [], currentTitle = '', currentContent = '', currentContentWarnings = [], currentDisclaimerNote = '',
}) => {
    const [revisions, setRevisions] = useState<ChapterRevision[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [label, setLabel] = useState('');
    const [compareTo, setCompareTo] = useState('draft');
    const [destination, setDestination] = useState<ChapterSnapshot | null>(null);
    const [destinationLoading, setDestinationLoading] = useState(false);
    const [destinationError, setDestinationError] = useState('');
    const [destinationAttempt, setDestinationAttempt] = useState(0);
    const [comparison, setComparison] = useState<ChapterRevision | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<{ revision: ChapterRevision; mode: 'working-draft' | 'withdraw' } | null>(null);
    const dialogRef = useDialog(isOpen, onClose, !busy && !restoreTarget);
    const present = usePresence(isOpen);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        setIsLoading(true); setError(''); setNotice(''); setComparison(null); setCompareTo('draft'); setDestination(null); setLabel(''); setRestoreTarget(null);
        api.getChapterRevisions(bookId, chapterId)
            .then(result => active && setRevisions(result))
            .catch(failure => active && setError(failure instanceof Error ? failure.message : 'Could not load version history.'))
            .finally(() => active && setIsLoading(false));
        return () => { active = false; };
    }, [isOpen, bookId, chapterId]);

    useEffect(() => {
        if (!isOpen || !comparison || compareTo === 'draft') { setDestinationLoading(false); setDestinationError(''); return; }
        let active = true;
        setDestination(null); setDestinationLoading(true); setDestinationError('');
        const request = compareTo === 'published'
            ? api.getChapterComparison(bookId, chapterId).then(result => {
                if (!result.baseline) throw new Error('This chapter has not been published yet. Choose a saved version or the current draft.');
                return result.baseline;
            })
            : api.getChapterRevision(bookId, chapterId, compareTo);
        request.then(value => { if (active) setDestination(value); })
            .catch(failure => { if (active) setDestinationError(failure instanceof Error ? failure.message : 'Could not open the comparison version.'); })
            .finally(() => { if (active) setDestinationLoading(false); });
        return () => { active = false; };
    }, [isOpen, comparison?.id, compareTo, bookId, chapterId, destinationAttempt]);
    const inspect = async (revision: ChapterRevision) => {
        if (busy) return;
        setBusy(revision.id); setError('');
        try { setComparison(await api.getChapterRevision(bookId, chapterId, revision.id)); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not open this version.'); }
        finally { setBusy(''); }
    };
    const checkpoint = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy || !label.trim()) return;
        setBusy('checkpoint'); setError('');
        try {
            const revision = await api.createChapterCheckpoint(bookId, chapterId, label.trim(), expectedRevision);
            setRevisions(previous => [revision, ...previous.filter(item => item.id !== revision.id)].slice(0, 50));
            setLabel(''); setNotice('Checkpoint saved. Your chapter and live release are unchanged.');
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this checkpoint.'); }
        finally { setBusy(''); }
    };
    const restore = async () => {
        if (!restoreTarget || busy) return;
        const { revision, mode } = restoreTarget;
        setBusy(revision.id); setError('');
        try {
            const fullRevision = await api.getChapterRevision(bookId, chapterId, revision.id);
            const user = await api.restoreChapterRevision(bookId, chapterId, revision.id, expectedRevision, mode);
            onRestored(user, fullRevision);
            setRestoreTarget(null); onClose();
        } catch (failure) { setRestoreTarget(null); setError(failure instanceof Error ? failure.message : 'Could not restore this version.'); }
        finally { setBusy(''); }
    };
    if (!present) return null;
    const withdrawing = restoreTarget?.mode === 'withdraw';
    return (
        <div className="ww-presence ww-version-backdrop" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} aria-hidden={!isOpen || undefined} onMouseDown={event => event.target === event.currentTarget && !busy && !restoreTarget && onClose()}>
            <div ref={dialogRef} tabIndex={-1} className="ww-version-dialog" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
                <header><div><span>Recovery</span><h2 id="version-history-title">Version history</h2></div><button onClick={onClose} disabled={Boolean(busy)} aria-label="Close version history"><X size={20} /></button></header>
                <p>Up to 50 recent recovery points. Restore a working draft while keeping the published version live.</p>
                {error && <div className="ww-version-error" role="alert">{error}</div>}
                <form className="ww-version-checkpoint" onSubmit={checkpoint}><label htmlFor="checkpoint-name">Name a checkpoint</label><div><input id="checkpoint-name" maxLength={100} value={label} onChange={event => setLabel(event.target.value)} placeholder="Before revising the ending" disabled={!!busy || isLoading} /><button disabled={!!busy || isLoading || !label.trim()}>{busy === 'checkpoint' ? 'Saving…' : 'Save checkpoint'}</button></div></form>
                <small role="status">{notice}</small>
                {comparison ? <section className="ww-version-comparison" aria-label="Compare chapter versions"><header><h3>{comparison.label || revisionReasonLabel(comparison.reason)}</h3><button type="button" onClick={() => setComparison(null)}>Back to versions</button></header><div className="ww-version-comparison-selectors">
                    <label>Compare from<select aria-label="Compare from" disabled={!!busy} value={comparison.id} onChange={event => { const revision = revisions.find(item => item.id === event.target.value); if (revision) void inspect(revision); }}>{revisions.map(revision => <option key={revision.id} value={revision.id}>{revision.label || revisionReasonLabel(revision.reason)} · {new Date(revision.createdAt).toLocaleString()}</option>)}</select></label>
                    <label>Compare to<select aria-label="Compare to" disabled={!!busy} value={compareTo} onChange={event => setCompareTo(event.target.value)}><option value="draft">Current draft (including unsaved changes)</option><option value="published">Published version</option>{revisions.map(revision => <option key={revision.id} value={revision.id}>{revision.label || revisionReasonLabel(revision.reason)} · {new Date(revision.createdAt).toLocaleString()}</option>)}</select></label>
                </div>
                {destinationLoading && <p role="status">Opening comparison version…</p>}
                {destinationError && <><p role="alert">{destinationError}</p><button onClick={() => setDestinationAttempt(value => value + 1)}>Retry comparison</button></>}
                {!destinationLoading && !destinationError && (compareTo === 'draft' || destination) && <ChapterDiff before={{ ...comparison, contentWarnings: comparison.contentWarnings ?? currentContentWarnings, disclaimerNote: comparison.contentWarnings ? comparison.disclaimerNote : currentDisclaimerNote }} after={compareTo === 'draft' ? { title: currentTitle, content: currentContent, contentWarnings: currentContentWarnings, disclaimerNote: currentDisclaimerNote } : destination!} beforeLabel="Selected version" afterLabel={compareTo === 'draft' ? 'Current draft' : compareTo === 'published' ? 'Published version' : 'Comparison version'} />}
                <div className="ww-version-restore-actions"><p>Restore replaces your working draft with the selected “Compare from” version.</p><button type="button" disabled={!!busy} onClick={() => setRestoreTarget({ revision: comparison, mode: 'working-draft' })}>Restore working draft</button><details><summary>Publication changes</summary><p>Withdrawing also makes later released chapters private and cancels their schedules.</p><button type="button" disabled={!!busy} onClick={() => setRestoreTarget({ revision: comparison, mode: 'withdraw' })}>Restore and withdraw release</button></details></div></section> : isLoading ? <div className="ww-version-empty" role="status">Loading recovery points…</div> : revisions.length ? <div className="ww-version-list">{revisions.map(revision => <article key={revision.id}><div><strong>{revision.label || revisionReasonLabel(revision.reason)}</strong><time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString()}</time></div><h3>{revision.title || 'Untitled chapter'}</h3><p>{revision.plainTextPreview || 'No text in this version.'}</p><footer><span>{revision.wordCount.toLocaleString()} words</span><button type="button" onClick={() => void inspect(revision)} disabled={!!busy}>{busy === revision.id ? 'Opening…' : 'Compare and restore'}</button></footer></article>)}</div> : <div className="ww-version-empty">Recovery points appear as you continue editing and publishing.</div>}
            </div>
            <ConfirmDialog isOpen={!!restoreTarget} title={withdrawing ? 'Restore and withdraw release?' : 'Restore this working draft?'} message={`Your current draft will be saved as a recovery point before the selected version replaces it.${withdrawing ? ` The chapter becomes private.${affectedChapters.length ? ` These released or scheduled chapters also become private and their releases are cancelled: ${affectedChapters.join(', ')}.` : ''}` : ' The version readers see, later chapters, and release schedules stay unchanged. Publish updates when you are ready.'}`} confirmLabel={withdrawing ? 'Restore and withdraw' : 'Restore working draft'} processingLabel="Restoring…" isProcessing={!!busy} tone="warning" onCancel={() => setRestoreTarget(null)} onConfirm={() => void restore()} />
        </div>
    );
};
