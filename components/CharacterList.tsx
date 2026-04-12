import React, { useState, useEffect } from 'react';
import type { Character } from '../types';
import * as api from '../api/client';
import { ImageUpload } from './ImageUpload';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterPreview } from './CharacterPreview';

interface CharacterListProps {

    bookId: string;
    readOnly?: boolean;
}

export const CharacterList: React.FC<CharacterListProps> = ({ bookId, readOnly = false }) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newCharacter, setNewCharacter] = useState<Partial<Character>>({ name: '', role: '', description: '', goal: '', imageUrl: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

    useEffect(() => {
        loadCharacters();
    }, [bookId]);

    const loadCharacters = async () => {
        const data = await api.getCharactersByBookId(bookId);
        setCharacters(data);
    };

    const handleCreate = async () => {
        if (!newCharacter.name) return;
        await api.createCharacter({ ...newCharacter, bookId });
        setIsCreating(false);
        setNewCharacter({ name: '', role: '', description: '', goal: '', imageUrl: '' });
        loadCharacters();
    };

    const handleUpdate = async (id: string, updates: Partial<Character>) => {
        await api.updateCharacter(id, updates);
        setEditingId(null);
        loadCharacters();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this character?')) {
            await api.deleteCharacter(id);
            loadCharacters();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-text-header dark:text-dark-text-header">Characters</h3>
                {!readOnly && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Add Character
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="p-4 bg-card-bg dark:bg-dark-card-bg rounded-lg border border-border dark:border-dark-border space-y-4">
                    <input
                        type="text"
                        placeholder="Name"
                        value={newCharacter.name}
                        onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <input
                        type="text"
                        placeholder="Role (e.g. Protagonist)"
                        value={newCharacter.role}
                        onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <textarea
                        placeholder="Description"
                        value={newCharacter.description}
                        onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <textarea
                        placeholder="Goal"
                        value={newCharacter.goal}
                        onChange={(e) => setNewCharacter({ ...newCharacter, goal: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <ImageUpload 
                        value={newCharacter.imageUrl}
                        onChange={(url, fileId) => setNewCharacter({ ...newCharacter, imageUrl: url, imageFileId: fileId || undefined })}
                        label="Character Image"
                        aspectRatio={1}
                        cropShape="circle"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-text-body dark:text-dark-text-body hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((char) => (
                    <div 
                        key={char.id} 
                        className={`p-4 bg-card-bg dark:bg-dark-card-bg border border-border dark:border-dark-border shadow-sm transition-all duration-300 ${!editingId ? 'cursor-pointer hover:border-accent/50 dark:hover:border-accent/50 hover:shadow-md group rounded-2xl' : 'rounded-lg'}`}
                        onClick={() => {
                            if (!editingId && !isCreating) {
                                setSelectedCharacter(char);
                            }
                        }}
                    >
                        {editingId === char.id ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    defaultValue={char.name}
                                    onChange={(e) => char.name = e.target.value} // Direct mutation for temp state, ideally use local state
                                    className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                />
                                <input
                                    type="text"
                                    defaultValue={char.role}
                                    onChange={(e) => char.role = e.target.value}
                                    className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                />
                                <textarea
                                    defaultValue={char.description}
                                    onChange={(e) => char.description = e.target.value}
                                    className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                />
                                <ImageUpload 
                                    value={char.imageUrl}
                                    onChange={(url, fileId) => {
                                        char.imageUrl = url;
                                        char.imageFileId = fileId || undefined;
                                    }}
                                    label="Character Image"
                                    aspectRatio={1}
                                    cropShape="circle"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(char.id, { name: char.name, role: char.role, description: char.description, imageUrl: char.imageUrl, imageFileId: char.imageFileId })}
                                        className="px-3 py-1 bg-primary text-white rounded-md text-sm"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start gap-4">
                                    <CharacterAvatar name={char.name} imageUrl={char.imageUrl} size="md" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-text-header dark:text-dark-text-header">{char.name}</h4>
                                        <p className="text-sm text-primary font-medium">{char.role}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-text-body dark:text-dark-text-body line-clamp-3">{char.description}</p>
                                {char.goal && (
                                    <p className="mt-2 text-xs text-text-muted dark:text-dark-text-muted"><strong>Goal:</strong> {char.goal}</p>
                                )}
                                {!readOnly && (
                                    <div className="mt-4 flex justify-end gap-2 relative z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingId(char.id); }}
                                            className="p-2 text-text-muted hover:text-primary transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(char.id); }}
                                            className="p-2 text-text-muted hover:text-red-500 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            <CharacterPreview 
                character={selectedCharacter}
                isOpen={!!selectedCharacter}
                onClose={() => setSelectedCharacter(null)}
            />
        </div>
    );
};
