import React, { useEffect, useState } from 'react';
import { browserTimezoneLabel, localScheduleInputValue, toUtcSchedule } from '../utils/publishing';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import { X } from 'lucide-react';

interface ScheduleChapterDialogProps {
    isOpen: boolean;
    chapterTitle: string;
    initialScheduledAt?: string | null;
    releaseSummary?: { bookTitle: string; chapterNumber: number; wordCount: number; contentWarnings: string[]; authorNote: string; blockedReason?: string };
    onConfirm: (scheduledAt: string) => Promise<void>;
    onClose: () => void;
}

function toLocalInput(instant?: string | null): string {
    if (!instant) return localScheduleInputValue();
    const date = new Date(instant);
    return Number.isNaN(date.getTime()) ? localScheduleInputValue() : localScheduleInputValue(date);
}

export const ScheduleChapterDialog: React.FC<ScheduleChapterDialogProps> = ({
    isOpen,
    chapterTitle,
    initialScheduledAt,
    releaseSummary,
    onConfirm,
    onClose,
}) => {
    const [localValue, setLocalValue] = useState(() => toLocalInput(initialScheduledAt));
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const dialogRef = useDialog(isOpen, onClose, !isSubmitting);
    const present = usePresence(isOpen);

    useEffect(() => {
        if (isOpen) {
            setLocalValue(toLocalInput(initialScheduledAt));
            setError('');
            setConfirmed(false);
        }
    }, [isOpen, initialScheduledAt]);

    if (!present) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting || (releaseSummary && (!confirmed || releaseSummary.blockedReason))) return;
        setError('');
        setIsSubmitting(true);
        try {
            await onConfirm(toUtcSchedule(localValue));
            onClose();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not schedule this chapter.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div ref={dialogRef} tabIndex={-1} className="ww-presence ww-schedule-backdrop" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} aria-hidden={!isOpen || undefined} role="dialog" aria-modal="true" aria-labelledby="schedule-title" onMouseDown={event => event.target === event.currentTarget && !isSubmitting && onClose()}>
            <form className="ww-schedule-dialog" onSubmit={handleSubmit}>
                <button type="button" className="ww-studio-dialog-close" onClick={onClose} disabled={isSubmitting} aria-label="Close scheduling"><X size={20} /></button>
                <span className="ww-schedule-eyebrow">Release planning</span>
                <h2 id="schedule-title">Schedule {chapterTitle.trim() || 'this chapter'}</h2>
                <p>WordWeft will publish it automatically and notify your followers once.</p>
                {releaseSummary && <section className="ww-schedule-summary" aria-label="Scheduled release summary"><strong>{releaseSummary.bookTitle}</strong><span>Chapter {releaseSummary.chapterNumber} · {releaseSummary.wordCount.toLocaleString()} words</span><span>Content warnings: {releaseSummary.contentWarnings.join(', ') || 'None'}</span>{releaseSummary.authorNote && <span>Reader-visible author note: {releaseSummary.authorNote}</span>}<small>This chapter becomes public at the release time. Saved edits are included until it publishes. Later private chapters stay private.</small>{releaseSummary.blockedReason && <p role="alert">{releaseSummary.blockedReason}</p>}</section>}

                <label htmlFor="chapter-release-time">Release date and time</label>
                <input
                    id="chapter-release-time"
                    type="datetime-local"
                    value={localValue}
                    onChange={event => setLocalValue(event.target.value)}
                    required
                    autoFocus
                />
                <small>Shown in {browserTimezoneLabel()}. Readers see the time in their own timezone.</small>
                {error && <div className="ww-schedule-error" role="alert">{error}</div>}
                {releaseSummary && <label className="ww-schedule-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={isSubmitting || !!releaseSummary.blockedReason} />I approve this release, its content warnings, and confirm the artwork is mine or used with permission.</label>}

                <div className="ww-schedule-actions">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Keep editing</button>
                    <button type="submit" disabled={isSubmitting || !!releaseSummary && (!confirmed || !!releaseSummary.blockedReason)}>{isSubmitting ? 'Scheduling…' : 'Schedule chapter'}</button>
                </div>
            </form>
        </div>
    );
};
