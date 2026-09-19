import React, { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    processingLabel?: string;
    isProcessing?: boolean;
    tone?: 'danger' | 'warning';
    onCancel: () => void;
    onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    processingLabel = 'Working…',
    isProcessing = false,
    tone = 'danger',
    onCancel,
    onConfirm,
}) => {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        cancelRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isProcessing) onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isProcessing, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onMouseDown={(event) => { if (event.target === event.currentTarget && !isProcessing) onCancel(); }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-dark-border dark:bg-dark-surface"
            >
                <h2 id="confirm-dialog-title" className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">{title}</h2>
                <p id="confirm-dialog-message" className="mt-3 leading-relaxed text-text-body dark:text-dark-text-body">{message}</p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="rounded-xl px-5 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-dark-surface-alt"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        aria-busy={isProcessing}
                        className={`rounded-xl px-5 py-2.5 font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-70 ${tone === 'danger' ? 'bg-danger hover:bg-danger/85' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                        {isProcessing ? processingLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
