
import React, { useState } from 'react';

interface Props {
    visible: boolean;
    onDismiss: () => void;
}

export const FeedbackBanner: React.FC<Props> = ({ visible, onDismiss }) => {
    const [exiting, setExiting] = useState(false);

    if (!visible && !exiting) return null;

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => {
            setExiting(false);
            onDismiss();
        }, 300);
    };

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out
                ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        >
            <div className="bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border shadow-lg">
                <div className="container mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
                    <p className="text-sm text-text-body dark:text-dark-text-body">
                        You're using an early version of WordWeft
                        <span className="hidden sm:inline"> — help us improve</span>
                    </p>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <a
                            href="#/feedback"
                            onClick={handleDismiss}
                            className="text-accent font-semibold text-sm hover:underline"
                        >
                            Share feedback
                        </a>
                        <button
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Dismiss"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                                <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
