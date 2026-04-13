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
                <div className="p-6 md:p-8 bg-white dark:bg-dark-surface rounded-3xl shadow-xl shadow-accent/5 lg:shadow-2xl lg:shadow-accent/5 border border-gray-100 dark:border-dark-border mb-8 animate-in slide-in-from-top-4 fade-in duration-300 relative overflow-hidden">
                    {/* Decorative Background Blob */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col gap-8 w-full max-w-2xl mx-auto">
                        <div className="text-center">
                            <h4 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100">New Character</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Flesh out their core identity and motivations.</p>
                        </div>

                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-3 w-full bg-gray-50/50 dark:bg-dark-surface-alt/30 p-6 rounded-2xl border border-gray-100/80 dark:border-dark-border/80">
                            <div className="w-full max-w-xs mx-auto">
                                <ImageUpload 
                                    value={newCharacter.imageUrl}
                                    onChange={(url, fileId) => setNewCharacter({ ...newCharacter, imageUrl: url, imageFileId: fileId || undefined })}
                                    label="Portrait (Optional)"
                                    aspectRatio={1}
                                    cropShape="circle"
                                />
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Name */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name <span className="text-red-400">*</span></label>
                                        <span className="text-xs text-gray-400">{(newCharacter.name || '').length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        placeholder="e.g. Lyra Belacqua"
                                        value={newCharacter.name}
                                        onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border focus:ring-2 focus:ring-accent focus:border-accent transition-all outline-none"
                                    />
                                </div>

                                {/* Role */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role</label>
                                        <span className="text-xs text-gray-400">{(newCharacter.role || '').length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        placeholder="e.g. Protagonist, Mentor..."
                                        value={newCharacter.role}
                                        onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border focus:ring-2 focus:ring-accent focus:border-accent transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Goal */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goal / Motivation</label>
                                    <span className="text-xs text-gray-400">{(newCharacter.goal || '').length}/200</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={200}
                                    placeholder="What drives this character?"
                                    value={newCharacter.goal}
                                    onChange={(e) => setNewCharacter({ ...newCharacter, goal: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border focus:ring-2 focus:ring-accent focus:border-accent transition-all outline-none"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Short Bio</label>
                                    <span className="text-xs text-gray-400">{(newCharacter.description || '').length}/500</span>
                                </div>
                                <textarea
                                    maxLength={500}
                                    placeholder="A brief history or description of their personality..."
                                    value={newCharacter.description}
                                    onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border focus:ring-2 focus:ring-accent focus:border-accent transition-all outline-none min-h-[120px] resize-y leading-relaxed"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-gray-100 dark:border-dark-border">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newCharacter.name}
                                    className="px-8 py-2.5 bg-accent text-white font-medium text-sm rounded-xl hover:bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    Save Character
                                </button>
                            </div>
                        </div>
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
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs font-semibold text-text-body dark:text-dark-text-body">Name</label>
                                        <span className="text-xs text-text-muted">{(char.name || '').length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        defaultValue={char.name}
                                        onChange={(e) => char.name = e.target.value}
                                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs font-semibold text-text-body dark:text-dark-text-body">Role</label>
                                        <span className="text-xs text-text-muted">{(char.role || '').length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        defaultValue={char.role}
                                        onChange={(e) => char.role = e.target.value}
                                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs font-semibold text-text-body dark:text-dark-text-body">Description</label>
                                        <span className="text-xs text-text-muted">{(char.description || '').length}/500</span>
                                    </div>
                                    <textarea
                                        maxLength={500}
                                        defaultValue={char.description}
                                        onChange={(e) => char.description = e.target.value}
                                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs font-semibold text-text-body dark:text-dark-text-body">Goal</label>
                                        <span className="text-xs text-text-muted">{(char.goal || '').length}/200</span>
                                    </div>
                                    <textarea
                                        maxLength={200}
                                        defaultValue={char.goal}
                                        onChange={(e) => char.goal = e.target.value}
                                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                                    />
                                </div>
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
                                        onClick={() => handleUpdate(char.id, { name: char.name, role: char.role, description: char.description, goal: char.goal, imageUrl: char.imageUrl, imageFileId: char.imageFileId })}
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
