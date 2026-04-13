import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from './icons/Icons';
import * as api from '../api/client';
import { ImageUpload } from './ImageUpload';

interface PublishCharacterReviewModalProps {
    isOpen: boolean;
    characters: Character[];
    onClose: () => void;
    onPublish: () => void;
}

export const PublishCharacterReviewModal: React.FC<PublishCharacterReviewModalProps> = ({
    isOpen, characters, onClose, onPublish
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [drafts, setDrafts] = useState<Record<string, Partial<Character>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize drafts when characters change
    useEffect(() => {
        if (isOpen && characters.length > 0) {
            setCurrentIndex(0);
            const initialDrafts: Record<string, Partial<Character>> = {};
            characters.forEach(char => {
                initialDrafts[char.id] = {
                    role: char.role || 'Secondary',
                    description: char.description || '',
                    goal: char.goal || '',
                    imageUrl: char.imageUrl || '',
                    imageFileId: char.imageFileId || ''
                };
            });
            setDrafts(initialDrafts);
        }
    }, [isOpen, characters]);

    if (!isOpen || characters.length === 0) return null;

    const currentCharacter = characters[currentIndex];
    const currentDraft = drafts[currentCharacter.id] || {};

    const handleUpdateField = (field: keyof Character, value: any) => {
        setDrafts(prev => ({
            ...prev,
            [currentCharacter.id]: {
                ...prev[currentCharacter.id],
                [field]: value
            }
        }));
    };

    const handleNext = () => {
        if (currentIndex < characters.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSkip = () => {
        // Just call publish without saving drafts
        onPublish();
    };

    const handleSaveAndPublish = async () => {
        setIsSaving(true);
        try {
            // Update all characters that have draft changes
            for (const char of characters) {
                const draft = drafts[char.id];
                if (draft) {
                    await api.updateCharacter(char.id, {
                        ...char, // keep existing fields just in case
                        ...draft
                    });
                }
            }
            onPublish();
        } catch (error) {
            console.error("Failed to update characters before publish:", error);
            // Optionally could still publish on error, or abort. Let's still publish as fallback.
            onPublish();
        } finally {
            setIsSaving(false);
        }
    };

    const progressPercentage = ((currentIndex + 1) / characters.length) * 100;
    const isLast = currentIndex === characters.length - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-gray-50 dark:bg-dark-surface-alt p-6 border-b border-gray-100 dark:border-dark-border relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-gray-500"
                        title="Cancel Publish"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100">Wait! Tell us about your new characters.</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Before publishing, add a few quick details for the characters you just introduced.</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-dark-border h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-accent h-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <div className="text-xs text-right mt-1 text-gray-500 font-medium">Character {currentIndex + 1} of {characters.length}</div>
                </div>

                {/* Body - Carousel Item */}
                <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[60vh]">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar Column */}
                        <div className="flex flex-col items-center gap-2">
                            <ImageUpload
                                value={currentDraft.imageUrl}
                                onChange={(url, fileId) => {
                                    handleUpdateField('imageUrl', url);
                                    handleUpdateField('imageFileId', fileId);
                                }}
                                aspectRatio={1}
                                cropShape="circle"
                                label="Portrait (Optional)"
                                fallbackUrl="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                            />
                        </div>

                        {/* Details Column */}
                        <div className="flex-1 flex flex-col gap-5">
                            <div>
                                <h3 className="text-3xl font-serif font-bold text-gray-900 dark:text-white capitalize">{currentCharacter.name}</h3>
                            </div>

                            {/* Role Input */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role</label>
                                    <span className="text-xs text-gray-400">{(currentDraft.role || '').length}/50</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={currentDraft.role || ''}
                                    onChange={(e) => handleUpdateField('role', e.target.value)}
                                    placeholder="e.g. Antagonist, Primary, Mentor..."
                                    className="w-full bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                />
                            </div>

                            {/* Bio */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Short Bio</label>
                                    <span className="text-xs text-gray-400">{(currentDraft.description || '').length}/500</span>
                                </div>
                                <textarea
                                    maxLength={500}
                                    value={currentDraft.description || ''}
                                    onChange={(e) => handleUpdateField('description', e.target.value)}
                                    placeholder="Who are they? e.g. A rogue wizard from the eastern mountains..."
                                    className="w-full bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none min-h-[80px]"
                                />
                            </div>

                            {/* Goal */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goal / Motivation</label>
                                    <span className="text-xs text-gray-400">{(currentDraft.goal || '').length}/200</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={200}
                                    value={currentDraft.goal || ''}
                                    onChange={(e) => handleUpdateField('goal', e.target.value)}
                                    placeholder="What do they want?"
                                    className="w-full bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 md:p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center justify-between">
                    <button 
                        onClick={handleSkip} 
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                    >
                        Skip & Publish
                    </button>

                    <div className="flex gap-3 items-center">
                        {characters.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-2 border border-gray-200 dark:border-dark-border disabled:opacity-50 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </button>
                                
                                {!isLast ? (
                                    <button
                                        onClick={handleNext}
                                        className="px-5 py-2 bg-accent text-white font-medium rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                                    >
                                        Next Character <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </>
                        )}
                        
                        {isLast && (
                            <button
                                onClick={handleSaveAndPublish}
                                disabled={isSaving}
                                className="px-6 py-2 bg-accent text-white font-medium rounded-lg hover:bg-primary transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                            >
                                {isSaving ? 'Processing...' : 'Finish & Publish'}
                                {!isSaving && <CheckCircleIcon className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
