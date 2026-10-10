import React, { useEffect, useState } from 'react';
import * as api from '../api/client';
import { ChapterDiff } from './ChapterDiff';
import { publicationStatusLabel } from '../utils/publishing';

function ReleaseChapterReview({ bookId, releaseChapterId, reviewToken, includePublishedUpdates, chapter, disabled, initiallyOpen, onStale }: {
    bookId: string; releaseChapterId: string; reviewToken: string; includePublishedUpdates: boolean;
    chapter: api.PublicationImpact['chapters'][number]; disabled: boolean; initiallyOpen: boolean; onStale: (message: string) => void;
}) {
    const [open, setOpen] = useState(initiallyOpen);
    const [comparison, setComparison] = useState<api.ChapterComparisonResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!open || comparison) return;
        let active = true;
        setLoading(true); setError('');
        api.getChapterComparison(bookId, chapter.id, { releaseChapterId, reviewToken, includePublishedUpdates })
            .then(result => { if (active) setComparison(result); })
            .catch(failure => {
                if (!active) return;
                const message = failure instanceof Error ? failure.message : 'Could not load chapter differences.';
                if ((failure as { status?: number }).status === 409) onStale(message);
                else setError(message);
            }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, comparison, attempt, bookId, chapter.id, releaseChapterId, reviewToken, includePublishedUpdates]);
    const changeType = chapter.changeType || (chapter.status === 'published' ? 'UPDATE' : 'NEW');
    return <li className={chapter.contentWarnings.some(warning => ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(warning)) ? 'is-mature' : chapter.contentWarnings.length ? 'has-warnings' : ''}>
        <strong>Chapter {chapter.number}: {chapter.title || 'Untitled chapter'}</strong>
        <span>{changeType === 'NEW' ? 'New release' : changeType === 'UPDATE' ? 'Publish updated version' : 'Published · No changes'} · {chapter.wordCount.toLocaleString()} words</span>
        <span>Content warnings: {chapter.contentWarnings.length ? chapter.contentWarnings.map(warning => warning.replaceAll('_', ' ').toLowerCase().replace(/^./, first => first.toUpperCase())).join(', ') : 'None'}</span>
        {chapter.disclaimerNote && <span>Reader-visible author note: {chapter.disclaimerNote}</span>}
        {chapter.scheduledAt && <span>{publicationStatusLabel(chapter)}. This schedule will be replaced by publication now.</span>}
        {!chapter.complete && <span role="alert">Add a title and content before publishing this chapter.</span>}
        <button type="button" className="ww-release-comparison-button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Hide differences' : changeType === 'NEW' ? 'Review chapter content' : 'Review differences'}</button>
        {open && <div>{loading && <p role="status">Loading chapter differences…</p>}{error && <><p role="alert">{error}</p><button type="button" className="ww-release-comparison-button" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Retry comparison</button></>}
            {comparison && <ChapterDiff before={comparison.baseline} after={comparison.draft} beforeLabel={comparison.baseline ? comparison.live ? 'Published version' : 'Previous release' : 'New chapter'} afterLabel="Release draft" />}
        </div>}
    </li>;
}

export function ReleaseChangesList({ bookId, releaseChapterId, impact, includePublishedUpdates = false, disabled = false, onStale }: {
    bookId: string; releaseChapterId: string; impact: api.PublicationImpact; includePublishedUpdates?: boolean; disabled?: boolean; onStale: (message: string) => void;
}) {
    return <>
        {!!impact.privateUpdatesRemaining && <p>{impact.privateUpdatesRemaining} {impact.privateUpdatesRemaining === 1 ? 'other chapter has' : 'other chapters have'} edits that stay private. {includePublishedUpdates ? 'Choose a later chapter in the release selection to include those updates.' : 'Use “Review story release” in the story studio to include them.'}</p>}
        <ol className="ww-release-impact-list">{impact.chapters.map(chapter => <ReleaseChapterReview key={`${impact.reviewToken}:${chapter.id}`} {...{ bookId, releaseChapterId, includePublishedUpdates, chapter, disabled, onStale }} reviewToken={impact.reviewToken} initiallyOpen={impact.chapters.length === 1 && chapter.changeType === 'UPDATE'} />)}</ol>
    </>;
}
