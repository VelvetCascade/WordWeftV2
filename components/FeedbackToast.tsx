
import React, { useEffect, useState } from 'react';

export interface ToastConfig {
    message: string;
    feedbackType: string;
    buttons: { label: string; value: number }[];
}

interface Props {
    config: ToastConfig | null;
    onRespond: (feedbackType: string, rating: number) => void;
    onDismiss: () => void;
}

export const FeedbackToast: React.FC<Props> = ({ config, onRespond, onDismiss }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (config) {
            const showTimer = setTimeout(() => setVisible(true), 100);
            const autoHide = setTimeout(() => handleDismiss(), 8000);
            return () => { clearTimeout(showTimer); clearTimeout(autoHide); };
        } else {
            setVisible(false);
        }
    }, [config]);

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => {
            setExiting(false);
            setVisible(false);
            onDismiss();
        }, 300);
    };

    const handleRespond = (value: number) => {
        if (config) {
            onRespond(config.feedbackType, value);
            handleDismiss();
        }
    };

    if (!config || (!visible && !exiting)) return null;

    return (
        <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out
                ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl px-6 py-4 flex items-center gap-5 max-w-lg">
                <p className="text-sm text-text-rich dark:text-dark-text-rich font-medium whitespace-nowrap">
                    {config.message}
                </p>
                <div className="flex gap-2 flex-shrink-0">
                    {config.buttons.map(btn => (
                        <button
                            key={btn.value}
                            onClick={() => handleRespond(btn.value)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-dark-border text-text-body dark:text-dark-text-body hover:border-accent hover:text-accent hover:bg-accent/5 transition-all"
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-1"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
