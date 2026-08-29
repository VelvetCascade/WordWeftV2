import React, { useEffect, useState } from 'react';
import { browserTimezoneLabel, localScheduleInputValue, toUtcSchedule } from '../utils/publishing';

interface ScheduleChapterDialogProps {
    isOpen: boolean;
    chapterTitle: string;
    initialScheduledAt?: string | null;
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
    onConfirm,
    onClose,
}) => {
    const [localValue, setLocalValue] = useState(() => toLocalInput(initialScheduledAt));
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalValue(toLocalInput(initialScheduledAt));
            setError('');
        }
    }, [isOpen, initialScheduledAt]);

    if (!isOpen) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
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
        <div className="ww-schedule-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <form className="ww-schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-title" onSubmit={handleSubmit}>
                <span className="ww-schedule-eyebrow">Release planning</span>
                <h2 id="schedule-title">Schedule {chapterTitle.trim() || 'this chapter'}</h2>
                <p>WordWeft will publish it automatically and notify your followers once.</p>

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

                <div className="ww-schedule-actions">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Keep editing</button>
                    <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Scheduling…' : 'Schedule chapter'}</button>
                </div>
            </form>
        </div>
    );
};
