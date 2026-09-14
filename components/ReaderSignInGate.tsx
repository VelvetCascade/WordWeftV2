import React, { useId } from 'react';
import { LockClosedIcon } from './icons/Icons';
import type { ReaderAuthView } from '../utils/readerAuthIntent';

interface ReaderSignInGateProps {
    locked: boolean;
    bookTitle: string;
    onAuthenticate: (view: ReaderAuthView) => void;
    onReadPreview?: () => void;
}

export const ReaderSignInGate: React.FC<ReaderSignInGateProps> = ({
    locked,
    bookTitle,
    onAuthenticate,
    onReadPreview,
}) => {
    const headingId = useId();

    return (
        <section className="reader-sign-in-gate" aria-labelledby={headingId}>
            <div className="reader-sign-in-gate-icon" aria-hidden="true">
                <LockClosedIcon className="w-6 h-6" />
            </div>
            <p className="reader-sign-in-gate-kicker">Continue reading on WordWeft</p>
            <h2 id={headingId}>
                {locked ? 'Sign in to read this chapter' : 'Sign in to keep reading'}
            </h2>
            <p>
                {locked
                    ? `Continue ${bookTitle} by signing in. Your place in the story will be kept for you.`
                    : 'Sign in to finish this chapter and continue through the story. Your place will be kept for you.'}
            </p>
            <div className="reader-sign-in-gate-actions">
                <button type="button" className="reader-sign-in-primary" onClick={() => onAuthenticate('login')}>Sign in</button>
                <button type="button" className="reader-sign-in-secondary" onClick={() => onAuthenticate('signup')}>Create account</button>
            </div>
            {locked && onReadPreview ? (
                <button type="button" className="reader-sign-in-preview-link" onClick={onReadPreview}>Read the preview</button>
            ) : null}
        </section>
    );
};
