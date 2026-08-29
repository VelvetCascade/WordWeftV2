import React, { useEffect, useState } from 'react';
import { Character } from '../types';
import { XMarkIcon } from './icons/Icons';
import { CharacterHeroPlaceholder } from './CharacterAvatar';

interface CharacterPreviewProps {
    character: Character | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({ character, isOpen, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setIsRendered(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered || !character) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
            
            {/* Modal */}
            <div
                className={`relative w-full max-w-lg bg-white dark:bg-[#1C1A19] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all duration-200 z-20 hover:scale-110"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {/* Hero Section */}
                <div className="h-72 sm:h-80 overflow-hidden relative group">
                    <CharacterHeroPlaceholder 
                        name={character.name} 
                        imageUrl={character.imageUrl} 
                    />
                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
                    
                    {/* Character Info Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-8 text-white transform transition-transform duration-500 translate-y-0 group-hover:-translate-y-2">
                        <div className="flex flex-col gap-2">
                            {character.role && (
                                <span className="w-max bg-accent/90 backdrop-blur-md text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg border border-white/20">
                                    {character.role}
                                </span>
                            )}
                            <h2 className="text-4xl sm:text-5xl font-serif font-black tracking-tight leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] mt-1">{character.name}</h2>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8 bg-gradient-to-b from-white to-gray-50 dark:from-[#1C1A19] dark:to-[#161413]">
                    {character.description && (
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest">
                                <span className="w-8 h-[2px] bg-accent/50 rounded-full"></span>
                                Background
                            </h4>
                            <p className="text-text-body dark:text-dark-text-body leading-relaxed text-[15px] max-h-48 overflow-y-auto custom-scrollbar pr-2 whitespace-pre-wrap">
                                {character.description}
                            </p>
                        </div>
                    )}

                    {character.goal && (
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-900/30 shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iI2Q0YjM3ZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-50 transition-opacity group-hover:opacity-100"></div>
                            
                            <h4 className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-3 relative z-10">
                                Current Goal
                            </h4>
                            <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed italic text-[15px] relative z-10 font-serif">
                                "{character.goal}"
                            </p>
                        </div>
                    )}
                    
                    {(!character.description && !character.goal) && (
                        <div className="text-center py-8 text-gray-500 italic">
                            No additional details available for this character.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
