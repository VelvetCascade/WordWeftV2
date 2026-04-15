import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, PlusIcon, CheckIcon, BookOpenIcon, BoltIcon } from './icons/Icons';
import { Character } from '../types';
import { analyzeMentions } from '../utils/autoLinker';

interface ChapterScannerModalProps {
    isOpen: boolean;
    htmlContent: string;
    existingCharacters: Character[];
    onClose: () => void;
    onAddCharacters: (names: string[]) => Promise<void>;
    onApplyReplacedHtml: (newHtml: string) => void;
}

export const ChapterScannerModal: React.FC<ChapterScannerModalProps> = ({
    isOpen, htmlContent, existingCharacters, onClose, onAddCharacters, onApplyReplacedHtml
}) => {
    // Stepper State
    const [step, setStep] = useState<1 | 2>(1);

    // Extraction State
    const [potentialNames, setPotentialNames] = useState<string[]>([]);
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
    
    // Auto-Link State
    const [linkCount, setLinkCount] = useState(0);
    const [replacedHtml, setReplacedHtml] = useState<string | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Run analysis when opened
    useEffect(() => {
        if (!isOpen) return;

        // Reset state
        setStep(1);
        setSuccessMessage(null);

        // 1. Text Extraction (Strip HTML)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.textContent || '';

        // Same simple heuristic as Smart Paste
        const commonWords = new Set(['The', 'A', 'An', 'He', 'She', 'It', 'They', 'We', 'I', 'You', 'But', 'And', 'Or', 'So', 'Because', 'At', 'In', 'On', 'For', 'With', 'To', 'From']);
        const existingNames = new Set(existingCharacters.map(c => c.name.toLowerCase()));
        
        const wordRegex = /\b[A-Z][a-z]+\b/g;
        const matches = text.match(wordRegex) || [];
        
        const counts: Record<string, number> = {};
        for (const word of matches) {
            if (!commonWords.has(word) && !existingNames.has(word.toLowerCase())) {
                counts[word] = (counts[word] || 0) + 1;
            }
        }

        const extracted = Object.entries(counts)
            .filter(([, c]) => c > 1) // appear at least twice
            .sort((a, b) => b[1] - a[1])
            .map(([w]) => w)
            .slice(0, 8); // Top 8 suggestions

        setPotentialNames(extracted);
        setSelectedNames(new Set(extracted));

        // 2. Pre-compute Auto-Link matches based on currently existing characters
        const linkResult = analyzeMentions(htmlContent, existingCharacters);
        setLinkCount(linkResult.count);
        setReplacedHtml(linkResult.newHtml);

    }, [isOpen, htmlContent, existingCharacters]);

    if (!isOpen) return null;

    const toggleName = (name: string) => {
        const next = new Set(selectedNames);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedNames(next);
    };

    const handleSkipStep1 = () => {
        setStep(2);
    };

    const handleApplyExtraction = async () => {
        setIsProcessing(true);
        try {
            if (selectedNames.size > 0) {
                await onAddCharacters(Array.from(selectedNames));
            }
            
            // Re-run the linker to include the newly added ones
            // Note: we can't do it instantly here because characters list needs to propagate from parent, 
            // but this is mostly fine for the base existing characters. 
            // If they want to auto-link the newly added ones, they can run scanner again or we just update link count visually.
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
            setStep(2);
        }
    };

    const handleApplyLinks = () => {
        if (replacedHtml && linkCount > 0) {
            onApplyReplacedHtml(replacedHtml);
        }
        setSuccessMessage("Chapter upgraded successfully!");
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleFinishSkip = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                
                {/* Header Sequence */}
                <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 border-b border-gray-100 dark:border-dark-border text-center relative flex flex-col items-center">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-dark-surface-alt shadow-sm flex items-center justify-center mb-3">
                        <SparklesIcon className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Smart Chapter Scanner</h2>
                    
                    {/* Stepper Dots */}
                    {!successMessage && (
                        <div className="flex gap-2 mt-4 items-center">
                            <div className={`h-2 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-accent' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`h-2 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-accent' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}></div>
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 overflow-y-auto max-h-[55vh] flex flex-col gap-6">
                    {successMessage ? (
                         <div className="flex flex-col items-center justify-center py-8 text-accent text-center gap-3 animate-in zoom-in">
                             <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                                <CheckIcon className="w-8 h-8 text-accent" />
                             </div>
                             <p className="font-semibold text-lg">{successMessage}</p>
                         </div>
                    ) : step === 1 ? (
                        <>
                            <div className="text-center mb-2">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Step 1: Extract Characters</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We found these unregistered names in the text.</p>
                            </div>

                            {potentialNames.length > 0 ? (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {potentialNames.map((name) => {
                                        const isSelected = selectedNames.has(name);
                                        return (
                                            <button
                                                key={name}
                                                onClick={() => toggleName(name)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 flex items-center gap-1.5
                                                    ${isSelected 
                                                        ? 'border-accent bg-accent/10 text-accent dark:border-accent dark:bg-accent/20' 
                                                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-dark-border dark:bg-dark-surface-alt dark:text-gray-400'}`}
                                            >
                                                {isSelected && <CheckIcon className="w-4 h-4" />}
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 px-4 bg-gray-50 dark:bg-dark-surface-alt rounded-2xl border border-dashed border-gray-300 dark:border-dark-border">
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No new characters found! Your cast is fully populated.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-2 animate-in slide-in-from-right-4 fade-in">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Step 2: Auto-Link Mentions</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Make your previous chapters interactive.</p>
                            </div>

                            <div className={`p-6 rounded-2xl border flex flex-col items-center gap-4 text-center transition-all ${linkCount > 0 ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 dark:bg-dark-surface-alt border-gray-200 dark:border-dark-border'}`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${linkCount > 0 ? 'bg-primary/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <BoltIcon className={`w-7 h-7 ${linkCount > 0 ? 'text-primary' : 'text-gray-400'}`} />
                                </div>
                                {linkCount > 0 ? (
                                    <>
                                        <div className="text-3xl font-black text-gray-900 dark:text-white">{linkCount}</div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-balance">
                                            Plain-text character names found. Click below to magically convert them into interactive <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-semibold text-xs inline-block">@mentions</span>.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-balance">
                                        No plain-text matches found for your existing characters.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!successMessage && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt flex justify-between items-center">
                        <button 
                            onClick={step === 1 ? handleSkipStep1 : handleFinishSkip} 
                            disabled={isProcessing}
                            className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                        >
                            {step === 1 ? 'Skip to Linking' : 'Done for now'}
                        </button>
                        
                        {step === 1 ? (
                            <button 
                                onClick={handleApplyExtraction}
                                disabled={isProcessing || (potentialNames.length > 0 && selectedNames.size === 0)}
                                className="px-6 py-2 bg-accent hover:bg-primary text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
                            >
                                {isProcessing ? 'Processing...' : (potentialNames.length === 0 ? 'Next Step' : `Add ${selectedNames.size} Characters`)}
                            </button>
                        ) : (
                            <button 
                                onClick={handleApplyLinks}
                                disabled={linkCount === 0}
                                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Auto-Link Now!
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
