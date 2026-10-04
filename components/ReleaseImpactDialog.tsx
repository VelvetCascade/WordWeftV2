import React, { useEffect, useState } from 'react';
import type { User } from '../types';
import * as api from '../api/client';
import { useDialog } from '../hooks/useDialog';
import { publicationStatusLabel } from '../utils/publishing';
import { X } from 'lucide-react';
import '../styles/publishing-editor.css';

export function ReleaseImpactDialog({ bookId, chapterId, bookTitle, onClose, onPublished }: {
    bookId: string; chapterId: string; bookTitle: string; onClose: () => void;
    onPublished: (user: User, storyBecomesPublic: boolean) => void;
}) {
    const [impact, setImpact] = useState<api.PublicationImpact | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');
    const [approved, setApproved] = useState(false);
    const [artworkApproved, setArtworkApproved] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const dialog = useDialog(true, onClose, !publishing);
    useEffect(() => {
        let active = true;
        setLoading(true); setImpact(null); setApproved(false); setArtworkApproved(false); setError('');
        api.getPublicationImpact(bookId, chapterId).then(result => { if (active) setImpact(result); })
            .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not review the release.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [bookId, chapterId, attempt]);
    const publish = async () => {
        if (!impact || !approved || !artworkApproved) return;
        setPublishing(true); setError('');
        try { onPublished(await api.publishReviewed(bookId, chapterId, impact.reviewToken), impact.storyBecomesPublic); onClose(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not publish the release.'); setImpact(null); setApproved(false); setArtworkApproved(false); }
        finally { setPublishing(false); }
    };
    return <div className="ww-editor-sheet-backdrop" onMouseDown={event => event.target === event.currentTarget && !publishing && onClose()}>
        <div ref={dialog} className="ww-session-dialog ww-release-dialog" role="dialog" aria-modal="true" aria-labelledby="story-release-review-title" tabIndex={-1}>
            <header><div><small>{bookTitle}</small><h2 id="story-release-review-title">Review the complete release</h2></div><button aria-label="Close release review" disabled={publishing} onClick={onClose}><X size={20} /></button></header>
            {loading && <p role="status">Checking every affected chapter…</p>}
            {error && <p role="alert">{error}</p>}
            {impact && <><p>{impact.storyBecomesPublic ? 'This private story becomes public and can appear in discovery.' : 'The story stays public. Readers can open these released versions immediately.'}</p><p>Story rating after release: <strong>{impact.resultingAgeRating.replaceAll('_', ' ').toLowerCase()}</strong></p>
                <ol className="ww-release-impact-list">{impact.chapters.map(chapter => <li key={chapter.id} className={chapter.contentWarnings.some(warning => ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(warning)) ? 'is-mature' : chapter.contentWarnings.length ? 'has-warnings' : ''}><strong>Chapter {chapter.number}: {chapter.title || 'Untitled chapter'}</strong><span>{chapter.status === 'published' ? 'Publish updated version' : 'Publish draft'} · {chapter.wordCount.toLocaleString()} words</span><span>Warnings: {chapter.contentWarnings.length ? chapter.contentWarnings.map(warning => warning.replaceAll('_', ' ').toLowerCase()).join(', ') : 'None'}</span>{chapter.disclaimerNote && <span>Reader-visible author note: {chapter.disclaimerNote}</span>}{chapter.scheduledAt && <span>{publicationStatusLabel(chapter)}. This schedule is replaced by publication now.</span>}{!chapter.complete && <span role="alert">Add a title and content before publishing this chapter.</span>}</li>)}</ol>
                <p>A new story or chapter release notifies followers. Updates to an already published chapter do not send another notification.</p>
                <label className="ww-editor-artwork-check"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} disabled={publishing} />I approve every chapter, visibility change, rating and schedule change listed above.</label>
                <label className="ww-editor-artwork-check"><input type="checkbox" checked={artworkApproved} onChange={event => setArtworkApproved(event.target.checked)} disabled={publishing} />Artwork in this story is mine or used with permission.</label></>}
            <div className="ww-session-actions">{!impact && !loading && <button onClick={() => setAttempt(value => value + 1)}>Refresh release review</button>}<button disabled={!impact || !approved || !artworkApproved || impact.chapters.some(chapter => !chapter.complete) || publishing} onClick={() => void publish()}>{publishing ? 'Publishing…' : 'Publish this release'}</button><button disabled={publishing} onClick={onClose}>Keep drafts private</button></div>
        </div>
    </div>;
}
