import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, PlusIcon, BookOpenIcon, CheckIcon } from './icons/Icons';
import { Character } from '../types';

interface SmartPasteAssistantProps {
    isOpen: boolean;
    text: string;
    onClose: () => void;
    onAddCharacters: (names: string[]) => Promise<void>;
    onShowDemo: () => void;
    existingCharacters: Character[];
}

export const SmartPasteAssistant: React.FC<SmartPasteAssistantProps> = ({
    isOpen, text, onClose, onAddCharacters, onShowDemo, existingCharacters
}) => {
    const [potentialNames, setPotentialNames] = useState<string[]>([]);
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !text) return;

        // 1. Extract Names
        const commonWords = new Set(['The', 'A', 'An', 'He', 'She', 'It', 'They', 'We', 'I', 'You', 'But', 'And', 'Or', 'So', 'Because', 'At', 'In', 'On', 'For', 'With', 'To', 'From']);
        const existingNames = new Set(existingCharacters.map(c => c.name.toLowerCase()));
        
        // Find Title Case words (not at start of a sentence if possible, but basic regex is fine for heuristic)
        const wordRegex = /\b[A-Z][a-z]+\b/g;
        const matches = text.match(wordRegex) || [];
        
        const counts: Record<string, number> = {};
        for (const word of matches) {
            if (!commonWords.has(word) && !existingNames.has(word.toLowerCase())) {
                counts[word] = (counts[word] || 0) + 1;
            }
        }

        // Keep words appearing > 1 times, sort by frequency
        const extracted = Object.entries(counts)
            .filter(([, c]) => c > 1)
            .sort((a, b) => b[1] - a[1])
            .map(([w]) => w)
            .slice(0, 8); // Top 8

        setPotentialNames(extracted);
        setSelectedNames(new Set(extracted));

        setSuccessMessage(null);

    }, [isOpen, text, existingCharacters]);

    if (!isOpen) return null;

    const toggleName = (name: string) => {
        const next = new Set(selectedNames);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedNames(next);
    };

    const handleApplyAll = async () => {
        setIsProcessing(true);
        try {
            if (selectedNames.size > 0) {
                await onAddCharacters(Array.from(selectedNames));
            }
            setSuccessMessage("Successfully supercharged your story!");
            setTimeout(() => {
                onClose();
                setSuccessMessage(null);
            }, 2000);
        } catch (e) {
            console.error("Failed to apply elements", e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-6 flex flex-col items-center border-b border-gray-100 dark:border-dark-border text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition-colors">
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
                            {potentialNames.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <PlusIcon className="w-4 h-4 text-primary" />
                                        Found Characters
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {potentialNames.map((name) => {
                                            const isSelected = selectedNames.has(name);
                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => toggleName(name)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 flex items-center gap-1.5
                                                        ${isSelected 
                                                            ? 'border-accent bg-accent/10 text-accent dark:border-accent dark:bg-accent/20' 
                                                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-dark-border dark:bg-dark-surface-alt dark:text-gray-400'}`}
                                                >
                                                    {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                                                    {name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400">Select characters to automatically add them to your World.</p>
                                </div>
                            )}



                            {/* Help / Demo Section */}
                            <div className="mt-2 bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4 items-center cursor-pointer hover:bg-primary/10 transition-colors" onClick={onShowDemo}>
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <BookOpenIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Make it Interactive</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Learn how to tag characters with @ and more.</p>
                                </div>
                                <span className="text-primary text-xs font-semibold">Demo &rarr;</span>
                            </div>

                            {/* State: No data found */}
                            {potentialNames.length === 0 && (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">We couldn't detect any specific characters from this text just yet.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!successMessage && potentialNames.length > 0 && (
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
                            disabled={isProcessing || selectedNames.size === 0}
                            className="px-6 py-2 bg-accent hover:bg-accent-light text-white font-semibold rounded-lg text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Applying...' : 'Supercharge!'}
                            {!isProcessing && <SparklesIcon className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
