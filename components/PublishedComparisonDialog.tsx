import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as api from '../api/client';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import type { ChapterSnapshot } from '../utils/chapterComparison';
import { ChapterDiff } from './ChapterDiff';

export function PublishedComparisonDialog({ open, bookId, chapterId, draft, onClose }: {
    open: boolean; bookId: string; chapterId: string; draft: ChapterSnapshot; onClose: () => void;
}) {
    const [comparison, setComparison] = useState<api.ChapterComparisonResult | null>(null);
    const [loading, setLoading] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
    const dialog = useDialog(open, onClose), present = usePresence(open);
    useEffect(() => {
        if (!open) return;
        let active = true;
        setComparison(null); setLoading(true); setError('');
        api.getChapterComparison(bookId, chapterId).then(result => { if (active) setComparison(result); })
            .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load the published version.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, bookId, chapterId, attempt]);
    if (!present) return null;
    return <div className="ww-presence ww-version-backdrop" data-state={open ? 'open' : 'closed'} inert={!open} aria-hidden={!open || undefined} onMouseDown={event => event.target === event.currentTarget && onClose()}>
        <div ref={dialog} className="ww-version-dialog" role="dialog" aria-modal="true" aria-labelledby="published-comparison-title" tabIndex={-1}>
            <header><div><span>Publication</span><h2 id="published-comparison-title">Changes since publication</h2></div><button aria-label="Close published comparison" onClick={onClose}><X size={20} /></button></header>
            <p>Compare the reader-visible version with your draft, including unsaved changes. Reviewing does not save or publish.</p>
            {loading && <p role="status">Loading the published version…</p>}{error && <><p role="alert">{error}</p><button className="ww-release-comparison-button" onClick={() => setAttempt(value => value + 1)}>Retry comparison</button></>}
            {comparison && <div className="ww-version-comparison"><ChapterDiff before={comparison.baseline} after={draft} beforeLabel={comparison.baseline ? comparison.live ? 'Published version' : 'Previous release' : 'New chapter'} afterLabel="Current draft" /></div>}
        </div>
    </div>;
}
