import React from 'react';
import { Character } from '../types';
import { XMarkIcon } from './icons/Icons';
import { CharacterAvatar, CharacterHeroPlaceholder } from './CharacterAvatar';

interface CharacterPreviewProps {
    character: Character | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({ character, isOpen, onClose }) => {
    if (!isOpen || !character) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div
                className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors z-10"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <div className="h-64 overflow-hidden relative">
                    <CharacterHeroPlaceholder 
                        name={character.name} 
                        imageUrl={character.imageUrl} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 text-white">
                        <h2 className="text-3xl font-serif font-bold mb-2">{character.name}</h2>
                        {character.role && (
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-white/20">
                                {character.role}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {character.description && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</h4>
                            <p className="text-text-body dark:text-dark-text-body leading-relaxed">
                                {character.description}
                            </p>
                        </div>
                    )}

                    {character.goal && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Current Goal</h4>
                            <p className="text-text-body dark:text-dark-text-body leading-relaxed italic">
                                "{character.goal}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
