import React from 'react';
import type { AgeRating, ContentWarning } from '../types';
import { AgeRatingBadge } from './AgeRatingBadge';

const WARNING_LABELS: Record<ContentWarning, string> = {
    VIOLENCE: 'Violence', GORE: 'Graphic injury or gore', STRONG_LANGUAGE: 'Strong language',
    SEXUAL_CONTENT: 'Sexual content', ABUSE: 'Abuse or coercion', SELF_HARM: 'Self-harm',
    SUBSTANCE_USE: 'Substance use', GRIEF: 'Grief or bereavement', DISCRIMINATION: 'Discrimination or hate',
    FLASHING_IMAGES: 'Flashing images', OTHER: 'Other sensitive material',
};

export const warningLabel = (warning: string) => WARNING_LABELS[warning as ContentWarning] || warning.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());

export const ChapterDisclaimerModal: React.FC<{
    isOpen: boolean;
    storyTitle: string;
    chapterTitle: string;
    rating: AgeRating;
    warnings: ContentWarning[];
    note?: string;
    onContinue: () => void;
    onLeave: () => void;
}> = ({ isOpen, storyTitle, chapterTitle, rating, warnings, note, onContinue, onLeave }) => {
    if (!isOpen) return null;
    return (
        <div className="content-disclaimer-backdrop" role="presentation">
            <section className="content-disclaimer-card" role="dialog" aria-modal="true" aria-labelledby="content-disclaimer-title">
                <div className="content-disclaimer-icon" aria-hidden="true">!</div>
                <AgeRatingBadge rating={rating} />
                <p className="content-disclaimer-kicker">Before you continue</p>
                <h2 id="content-disclaimer-title">This chapter contains sensitive material.</h2>
                <p className="content-disclaimer-context"><strong>{storyTitle}</strong> · {chapterTitle}</p>
                {warnings.length > 0 && <div className="content-warning-list">{warnings.map(w => <span key={w}>{warningLabel(w)}</span>)}</div>}
                {note && <blockquote>{note}</blockquote>}
                <p className="content-disclaimer-help">These labels are supplied by the author to help you make an informed reading choice.</p>
                <div className="content-disclaimer-actions">
                    <button type="button" onClick={onLeave}>Leave this chapter</button>
                    <button type="button" className="primary" onClick={onContinue}>I understand, continue</button>
                </div>
            </section>
        </div>
    );
};
