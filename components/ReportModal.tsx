import React, { useEffect, useState } from 'react';
import type { ReportCategory, ReportTargetType } from '../types';
import { XMarkIcon, CheckCircleIcon } from './icons/Icons';
import * as api from '../api/client';

const CATEGORIES: { value: ReportCategory; label: string; help: string }[] = [
    { value: 'SPAM', label: 'Spam or scam', help: 'Repeated promotion, fraud, or deceptive links.' },
    { value: 'HARASSMENT', label: 'Harassment', help: 'Targeted abuse, threats, or unwanted contact.' },
    { value: 'PLAGIARISM', label: 'Plagiarism', help: 'Copied writing presented as original.' },
    { value: 'COPYRIGHT', label: 'Copyright violation', help: 'Unauthorized use of protected work.' },
    { value: 'SEXUAL_CONTENT', label: 'Undisclosed sexual content', help: 'Sexual material without appropriate rating or warnings.' },
    { value: 'VIOLENCE', label: 'Graphic violence', help: 'Graphic harm without appropriate rating or warnings.' },
    { value: 'HATE_SPEECH', label: 'Hate speech', help: 'Attacks based on a protected characteristic.' },
    { value: 'MISINFORMATION', label: 'Dangerous misinformation', help: 'Material likely to cause real-world harm.' },
    { value: 'OTHER', label: 'Something else', help: 'A policy concern not covered above.' },
];

export const ReportModal: React.FC<{ isOpen: boolean; onClose: () => void; targetType: ReportTargetType; targetId: string; targetTitle: string }> = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
    const [category, setCategory] = useState<ReportCategory | ''>('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [ticket, setTicket] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { if (isOpen) { setCategory(''); setDescription(''); setError(''); setTicket(''); } }, [isOpen, targetId]);
    if (!isOpen) return null;

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!category) return;
        setSubmitting(true); setError('');
        try {
            const report = await api.submitReport({ targetType, targetId, category, description: description.trim() });
            setTicket(report.ticketNumber);
        } catch (err: any) {
            setError(err.message || 'Could not submit this report.');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="report-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
                <button type="button" className="report-modal-close" onClick={onClose} aria-label="Close report form"><XMarkIcon className="w-5 h-5" /></button>
                {ticket ? <div className="report-success">
                    <CheckCircleIcon className="w-12 h-12" />
                    <p className="report-eyebrow">Report received</p><h2 id="report-title">Thank you for speaking up.</h2>
                    <p>Our moderation queue now has your report. Keep this reference in case you need to follow up.</p>
                    <strong>{ticket}</strong><button type="button" onClick={onClose}>Done</button>
                </div> : <form onSubmit={submit}>
                    <p className="report-eyebrow">Private report</p><h2 id="report-title">Tell us what’s wrong.</h2>
                    <p className="report-target">Reporting: <strong>{targetTitle}</strong></p>
                    <fieldset><legend>Choose the closest reason</legend><div className="report-reasons">
                        {CATEGORIES.map(item => <label key={item.value} className={category === item.value ? 'selected' : ''}>
                            <input type="radio" name="report-category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} />
                            <span><strong>{item.label}</strong><small>{item.help}</small></span>
                        </label>)}
                    </div></fieldset>
                    <label className="report-notes"><span>Additional context <small>Optional</small></span><textarea maxLength={1500} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Share links, chapter details, or context that will help a moderator review this." /><small>{description.length}/1500</small></label>
                    <p className="report-privacy">Your identity is not shared with the reported user. Deliberately false or abusive reports may lead to account action.</p>
                    {error && <p className="report-error">{error}</p>}
                    <div className="report-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={!category || submitting}>{submitting ? 'Sending…' : 'Submit report'}</button></div>
                </form>}
            </section>
        </div>
    );
};
