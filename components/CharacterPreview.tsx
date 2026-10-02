import React from 'react';
import type { Character } from '../types';
import { XMarkIcon } from './icons/Icons';
import { ResilientImage } from './ResilientImage';
import { useDialog } from '../hooks/useDialog';

interface CharacterPreviewProps {
    character: Character | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({ character, isOpen, onClose }) => {
    const dialogRef = useDialog(isOpen, onClose);
    if (!isOpen || !character) return null;
    return (
        <div className="ww-character-preview-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="ww-character-preview-panel" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="character-preview-name">
                <header><span>Story guide</span><button type="button" onClick={onClose} aria-label="Close character guide"><XMarkIcon className="w-5 h-5" /></button></header>
                <div className="ww-character-preview-identity"><ResilientImage src={character.imageUrl} alt={character.name} fallbackLabel={character.name} className="ww-character-preview-avatar" /><div>{character.role && <span>{character.role}</span>}<h2 id="character-preview-name">{character.name}</h2></div></div>
                {character.description && <section><h3>Background</h3><p>{character.description}</p></section>}
                {character.goal && <section className="ww-character-preview-goal"><h3>Current goal</h3><p>{character.goal}</p></section>}
                {!character.description && !character.goal && <p className="ww-character-preview-empty">The writer hasn’t added more details about this character yet.</p>}
            </div>
        </div>
    );
};
