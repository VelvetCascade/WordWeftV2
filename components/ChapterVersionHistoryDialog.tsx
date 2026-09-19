import React, { useEffect, useState } from 'react';
import * as api from '../api/client';
import type { ChapterRevision, User } from '../types';
import { revisionReasonLabel } from '../utils/chapterRevisions';
import { ConfirmDialog } from './ConfirmDialog';

interface ChapterVersionHistoryDialogProps {
    isOpen: boolean;
    bookId: string;
    chapterId: string;
    onClose: () => void;
    onRestored: (user: User, revision: ChapterRevision) => void;
}

export const ChapterVersionHistoryDialog: React.FC<ChapterVersionHistoryDialogProps> = ({
    isOpen,
    bookId,
    chapterId,
    onClose,
    onRestored,
}) => {
    const [revisions, setRevisions] = useState<ChapterRevision[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [restoringId, setRestoringId] = useState('');
    const [error, setError] = useState('');
    const [restoreTarget, setRestoreTarget] = useState<ChapterRevision | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        setIsLoading(true);
        setError('');
        api.getChapterRevisions(bookId, chapterId)
            .then(result => active && setRevisions(result))
            .catch(failure => active && setError(failure instanceof Error ? failure.message : 'Could not load version history.'))
            .finally(() => active && setIsLoading(false));
        return () => { active = false; };
    }, [isOpen, bookId, chapterId]);

    if (!isOpen) return null;

    const restore = async (revision: ChapterRevision) => {
        setRestoringId(revision.id);
        setError('');
        try {
            const user = await api.restoreChapterRevision(bookId, chapterId, revision.id);
            onRestored(user, revision);
            setRestoreTarget(null);
            onClose();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not restore this version.');
        } finally {
            setRestoringId('');
        }
    };

    return (
        <div className="ww-version-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !restoringId && onClose()}>
            <section className="ww-version-dialog" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
                <header><div><span>Recovery</span><h2 id="version-history-title">Version history</h2></div><button onClick={onClose} aria-label="Close version history">×</button></header>
                <p>WordWeft keeps up to 50 recent recovery points. Restoring always returns the chapter to draft.</p>
                {error && <div className="ww-version-error" role="alert">{error}</div>}
                {isLoading ? <div className="ww-version-empty">Loading recovery points…</div> : revisions.length ? (
                    <div className="ww-version-list">
                        {revisions.map(revision => (
                            <article key={revision.id}>
                                <div><strong>{revisionReasonLabel(revision.reason)}</strong><time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString()}</time></div>
                                <h3>{revision.title || 'Untitled chapter'}</h3>
                                <p>{revision.plainTextPreview || 'No preview available.'}</p>
                                <footer><span>{revision.wordCount.toLocaleString()} words</span><button onClick={() => setRestoreTarget(revision)} disabled={Boolean(restoringId)}>{restoringId === revision.id ? 'Restoring…' : 'Restore'}</button></footer>
                            </article>
                        ))}
                    </div>
                ) : <div className="ww-version-empty">Recovery points appear as you continue editing and publishing.</div>}
            </section>
            <ConfirmDialog
                isOpen={!!restoreTarget}
                title="Restore this version?"
                message="Your current draft will be saved as a recovery point first, then replaced by the selected version. The restored chapter stays in draft."
                confirmLabel="Restore version"
                processingLabel="Restoring…"
                isProcessing={!!restoringId}
                tone="warning"
                onCancel={() => setRestoreTarget(null)}
                onConfirm={() => restoreTarget && restore(restoreTarget)}
            />
        </div>
    );
};
