import React, { useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import * as api from '../api/client';
import { useDialog } from '../hooks/useDialog';
import { ReleaseChangesList } from './ReleaseChangesList';
import { X } from 'lucide-react';
import '../styles/publishing-editor.css';

export function ReleaseImpactDialog({ bookId, chapterId, bookTitle, includePublishedUpdates = false, onClose, onPublished }: {
    bookId: string; chapterId: string; bookTitle: string; onClose: () => void;
    includePublishedUpdates?: boolean;
    onPublished: (user: User, storyBecomesPublic: boolean) => void;
}) {
    const [impact, setImpact] = useState<api.PublicationImpact | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');
    const [approved, setApproved] = useState(false);
    const [artworkApproved, setArtworkApproved] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const busy = useRef(false);
    const dialog = useDialog(true, onClose, !publishing);
    useEffect(() => {
        let active = true;
        setLoading(true); setImpact(null); setApproved(false); setArtworkApproved(false); setError('');
        api.getPublicationImpact(bookId, chapterId, includePublishedUpdates).then(result => { if (active) setImpact(result); })
            .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not review the release.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [bookId, chapterId, attempt, includePublishedUpdates]);
    const publish = async () => {
        if (!impact || !approved || !artworkApproved || busy.current) return;
        busy.current = true;
        setPublishing(true); setError('');
        try { onPublished(await api.publishReviewed(bookId, chapterId, impact.reviewToken, includePublishedUpdates), impact.storyBecomesPublic); onClose(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not publish the release.'); setImpact(null); setApproved(false); setArtworkApproved(false); }
        finally { busy.current = false; setPublishing(false); }
    };
    return <div className="ww-editor-sheet-backdrop" onMouseDown={event => event.target === event.currentTarget && !publishing && onClose()}>
        <div ref={dialog} className="ww-session-dialog ww-release-dialog" role="dialog" aria-modal="true" aria-labelledby="story-release-review-title" tabIndex={-1}>
            <header><div><small>{bookTitle}</small><h2 id="story-release-review-title">Review the complete release</h2></div><button aria-label="Close release review" disabled={publishing} onClick={onClose}><X size={20} /></button></header>
            {loading && <p role="status">Checking every affected chapter…</p>}
            {error && <p role="alert">{error}</p>}
            {impact && <><p>{impact.storyBecomesPublic ? 'This private story becomes public and can appear in discovery.' : 'The story stays public. Readers can open these released versions immediately.'}</p><p>Story rating after release: <strong>{impact.resultingAgeRating.replaceAll('_', ' ').toLowerCase()}</strong></p>
                {includePublishedUpdates && <p>This release includes saved updates to published chapters through Chapter {impact.chapters.at(-1)?.number}. Later drafts and updates stay private.</p>}
                <ReleaseChangesList {...{ bookId, impact, includePublishedUpdates }} releaseChapterId={chapterId} disabled={publishing} onStale={message => { setError(message); setImpact(null); setApproved(false); setArtworkApproved(false); }} />
                <p>A new story or chapter release notifies followers. Updates to an already published chapter do not send another notification.</p>
                <label className="ww-editor-artwork-check"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} disabled={publishing} />I approve every chapter, visibility change, rating and schedule change listed above.</label>
                <label className="ww-editor-artwork-check"><input type="checkbox" checked={artworkApproved} onChange={event => setArtworkApproved(event.target.checked)} disabled={publishing} />Artwork in this story is mine or used with permission.</label></>}
            <div className="ww-session-actions">{!impact && !loading && <button onClick={() => setAttempt(value => value + 1)}>Refresh release review</button>}<button disabled={!impact || !approved || !artworkApproved || impact.chapters.some(chapter => !chapter.complete) || (!impact.storyBecomesPublic && impact.chapters.every(chapter => chapter.changeType === 'UNCHANGED')) || publishing} onClick={() => void publish()}>{publishing ? 'Publishing…' : 'Publish this release'}</button><button disabled={publishing} onClick={onClose}>Keep drafts private</button></div>
        </div>
    </div>;
}
