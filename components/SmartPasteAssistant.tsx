import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, SparklesIcon, PlusIcon, BookOpenIcon, CheckIcon } from './icons/Icons';
import { Character } from '../types';
import { CharacterSuggestionList } from './CharacterSuggestionList';
import { useCharacterSuggestions } from '../hooks/useCharacterSuggestions';
import type { CharacterNameDraft } from '../utils/characterRecognition';
import { useDialog } from '../hooks/useDialog';

interface SmartPasteAssistantProps {
    isOpen: boolean;
    text: string;
    onClose: () => void;
    onAddCharacters: (names: CharacterNameDraft[]) => Promise<void>;
    onShowDemo: () => void;
    existingCharacters: Character[];
}

export const SmartPasteAssistant: React.FC<SmartPasteAssistantProps> = ({
    isOpen, text, onClose, onAddCharacters, onShowDemo, existingCharacters
}) => {
    const { candidates, selected, selectedNames, toggle, status, retry } = useCharacterSuggestions(isOpen, text, existingCharacters);
    const submissionRef = useRef(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dialogRef = useDialog(isOpen, onClose, !isProcessing);
    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

        setSuccessMessage(null);
        setError('');

    }, [isOpen, text]);

    if (!isOpen) return null;

    const handleApplyAll = async () => {
        if (submissionRef.current || status !== 'ready' || !selected.length) return;
        submissionRef.current = true;
        setIsProcessing(true);
        setError('');
        try {
            await onAddCharacters(selected.map(({ name, aliases }) => ({ name, aliases })));
            setSuccessMessage("Characters added to your story guide.");
            closeTimerRef.current = setTimeout(() => {
                onClose();
                setSuccessMessage(null);
            }, 2000);
        } catch (e) {
            console.error("Failed to apply elements", e);
            setError(e instanceof Error ? e.message : 'The characters could not be added. Please try again.');
        } finally {
            submissionRef.current = false;
            setIsProcessing(false);
        }
    };

    return (
        <div className="ww-editor-smart-paste-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Smart Paste Assistant" tabIndex={-1} className="ww-editor-smart-paste bg-white dark:bg-dark-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-6 flex flex-col items-center border-b border-gray-100 dark:border-dark-border text-center relative">
                    <button onClick={onClose} disabled={isProcessing} aria-label="Close smart paste assistant" className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-dark-surface-alt shadow-sm flex items-center justify-center mb-3">
                        <SparklesIcon className="w-8 h-8 text-accent animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Smart Paste Assistant</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">We noticed you pasted a story! Let's bring it to life.</p>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[50vh] flex flex-col gap-6">
                    {error && <p className="ww-editor-scanner-error" role="alert">{error}</p>}
                    
                    {successMessage ? (
                         <div className="flex flex-col items-center justify-center py-8 text-accent text-center gap-3">
                             <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                                <CheckIcon className="w-8 h-8 text-accent" />
                             </div>
                             <p className="font-semibold">{successMessage}</p>
                         </div>
                    ) : (
                        <>
                            {/* Characters Section */}
                            {candidates.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <PlusIcon className="w-4 h-4 text-primary" />
                                        Suggested characters
                                    </h3>
                                    <CharacterSuggestionList candidates={candidates} selectedNames={selectedNames} disabled={isProcessing} onToggle={toggle} />
                                    <p className="text-xs text-gray-400">Review the passage before adding names. Uncertain matches start unselected.</p>
                                </div>
                            )}



                            {/* Help / Demo Section */}
                            <button type="button" className="mt-2 bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4 items-center cursor-pointer hover:bg-primary/10 transition-colors text-left" disabled={isProcessing} onClick={onShowDemo}>
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <BookOpenIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Make it Interactive</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Learn how to tag characters with @ and more.</p>
                                </div>
                                <span className="text-primary text-xs font-semibold">Tour &rarr;</span>
                            </button>

                            {/* State: No data found */}
                            {status === 'scanning' && <p role="status">Looking for character names…</p>}
                            {status === 'failed' && <div role="alert">The scan could not finish. Your pasted text is safe. <button type="button" onClick={retry}>Try scanning again</button></div>}
                            {status === 'ready' && candidates.length === 0 && (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">No new character names found with enough context. You can add them in the story guide.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!successMessage && candidates.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt flex justify-end gap-3">
                        <button 
                            onClick={onClose} 
                            disabled={isProcessing}
                            className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors rounded-lg text-sm"
                        >
                            Skip
                        </button>
                        <button 
                            onClick={handleApplyAll}
                            disabled={isProcessing || status !== 'ready' || selected.length === 0}
                            className="px-6 py-2 bg-accent hover:bg-accent-light text-white font-semibold rounded-lg text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Adding…' : 'Add characters'}
                            {!isProcessing && <SparklesIcon className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
