import React, { useState, useEffect } from 'react';
import type { Character, Scene, Note } from '../types';
import * as api from '../api/client';
import { CharacterAvatar } from './CharacterAvatar';

interface WorldBuildingSidebarProps {
    bookId: string;
    chapterId?: string;
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'characters' | 'scenes' | 'notes';

export const WorldBuildingSidebar: React.FC<WorldBuildingSidebarProps> = ({ bookId, chapterId, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('characters');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, activeTab, bookId]);

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'characters' && characters.length === 0) {
            const data = await api.getCharactersByBookId(bookId);
            setCharacters(data);
        } else if (activeTab === 'scenes' && scenes.length === 0) {
            const data = await api.getScenesByBookId(bookId);
            setScenes(data);
        } else if (activeTab === 'notes' && notes.length === 0) {
            const bookNotes = await api.getNotesByBookId(bookId);
            let chapterNotes: Note[] = [];
            if (chapterId && chapterId !== 'new') {
                chapterNotes = await api.getNotesByChapterId(chapterId);
            }
            // Merge and dedup if needed, or just show all. For now simple concat
            setNotes([...bookNotes, ...chapterNotes]); // Logic might need refinement to avoid dupes if API overlaps
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-dark-surface border-l dark:border-dark-border shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-surface-alt">
                <h3 className="font-bold text-text-header dark:text-dark-text-header">World Building</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    ✕
                </button>
            </div>

            <div className="flex border-b dark:border-dark-border">
                {(['characters', 'scenes', 'notes'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab === tab
                                ? 'text-primary border-b-2 border-primary bg-primary/5'
                                : 'text-text-muted hover:text-text-body hover:bg-gray-50 dark:hover:bg-dark-surface-alt'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
                ) : (
                    <div className="space-y-4">
                        {activeTab === 'characters' && (
                            characters.length > 0 ? (
                                characters.map(char => (
                                    <div key={char.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded border border-border dark:border-dark-border">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CharacterAvatar name={char.name} imageUrl={char.imageUrl} size="sm" />
                                            <div>
                                                <h4 className="font-bold text-sm text-text-header dark:text-dark-text-header">{char.name}</h4>
                                                <p className="text-xs text-primary">{char.role}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-text-body dark:text-dark-text-body line-clamp-3">{char.description}</p>
                                    </div>
                                ))
                            ) : <p className="text-sm text-gray-500 text-center">No characters found.</p>
                        )}

                        {activeTab === 'scenes' && (
                            scenes.length > 0 ? (
                                scenes.map(scene => (
                                    <div key={scene.id} className="p-3 bg-card-bg dark:bg-dark-card-bg rounded border border-border dark:border-dark-border">
                                        <h4 className="font-bold text-sm text-text-header dark:text-dark-text-header mb-1">{scene.title}</h4>
                                        <p className="text-xs text-gray-500 mb-2">{scene.setting} • {scene.time}</p>
                                        <p className="text-xs text-text-body dark:text-dark-text-body line-clamp-3">{scene.description}</p>
                                    </div>
                                ))
                            ) : <p className="text-sm text-gray-500 text-center">No scenes found.</p>
                        )}

                        {activeTab === 'notes' && (
                            notes.length > 0 ? (
                                notes.map(note => (
                                    <div key={note.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-900/30">
                                        {note.title && <h4 className="font-bold text-sm text-text-header dark:text-dark-text-header mb-1">{note.title}</h4>}
                                        <p className="text-xs text-text-body dark:text-dark-text-body whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                ))
                            ) : <p className="text-sm text-gray-500 text-center">No notes found.</p>
                        )}
                    </div>
                )}
            </div>
            <div className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt text-center">
                <p className="text-xs text-gray-500">Manage these in Book Settings</p>
            </div>
        </div>
    );
};
