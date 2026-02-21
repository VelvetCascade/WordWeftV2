
import React, { useState } from 'react';

export type ModalMode = 'detail' | 'exit' | 'power_user';

export interface ModalConfig {
    mode: ModalMode;
    feedbackType: string;
    title: string;
    subtitle?: string;
}

interface Props {
    config: ModalConfig | null;
    onSubmit: (feedbackType: string, data: { shortResponse?: string; longResponse?: string }) => void;
    onDismiss: () => void;
    onOpenFullForm: () => void;
}

export const FeedbackModal: React.FC<Props> = ({ config, onSubmit, onDismiss, onOpenFullForm }) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!config) return null;

    const handleSubmit = async () => {
        if (!text.trim() && config.mode !== 'power_user') return;
        setIsSubmitting(true);

        const data = config.mode === 'exit'
            ? { shortResponse: text }
            : { longResponse: text };

        onSubmit(config.feedbackType, data);
        setIsSubmitting(false);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setText('');
            onDismiss();
        }, 1500);
    };

    const handleOpenFull = () => {
        onDismiss();
        onOpenFullForm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDismiss} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-2 flex items-start justify-between">
                    <div>
                        <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich">
                            {config.title}
                        </h3>
                        {config.subtitle && (
                            <p className="text-sm text-text-body dark:text-dark-text-body mt-1">{config.subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 12 12" fill="none">
                            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-6">
                    {submitted ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="text-sm text-text-body dark:text-dark-text-body">Thank you for your feedback.</p>
                        </div>
                    ) : config.mode === 'power_user' ? (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-text-body dark:text-dark-text-body leading-relaxed">
                                You've been using WordWeft for a while now. Your perspective is especially valuable to us.
                            </p>
                            <button
                                onClick={handleOpenFull}
                                className="w-full bg-accent text-white font-sans font-semibold py-3 rounded-xl hover:bg-primary transition-all text-sm"
                            >
                                Share detailed feedback
                            </button>
                            <button
                                onClick={onDismiss}
                                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-2"
                            >
                                Maybe later
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                rows={config.mode === 'exit' ? 3 : 5}
                                placeholder={
                                    config.mode === 'exit'
                                        ? 'Anything frustrating or confusing today?'
                                        : 'Tell us more about your experience...'
                                }
                                className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none leading-relaxed"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={onDismiss}
                                    className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-dark-border hover:border-gray-300 transition-all"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !text.trim()}
                                    className="flex-1 bg-accent text-white font-semibold py-2.5 rounded-xl hover:bg-primary transition-all text-sm disabled:bg-gray-300 disabled:text-gray-500"
                                >
                                    {isSubmitting ? 'Sending...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
