import React, { useState, useEffect } from 'react';
import type { Scene, Character, Chapter } from '../types';
import * as api from '../api/client';

interface SceneListProps {
    bookId: string;
    chapters?: Chapter[];
}

export const SceneList: React.FC<SceneListProps> = ({ bookId, chapters = [] }) => {
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newScene, setNewScene] = useState<Partial<Scene>>({ title: '', description: '', setting: '', time: '', characterIds: [] });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadScenes();
        loadCharacters();
    }, [bookId]);

    const loadScenes = async () => {
        const data = await api.getScenesByBookId(bookId);
        setScenes(data);
    };

    const loadCharacters = async () => {
        const data = await api.getCharactersByBookId(bookId);
        setCharacters(data);
    };

    const handleCreate = async () => {
        if (!newScene.title) return;
        await api.createScene({ ...newScene, bookId });
        setIsCreating(false);
        setNewScene({ title: '', description: '', setting: '', time: '', characterIds: [] });
        loadScenes();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this scene?')) {
            await api.deleteScene(id);
            loadScenes();
        }
    };

    const toggleCharacterSelection = (charId: string) => {
        setNewScene(prev => {
            const ids = prev.characterIds || [];
            if (ids.includes(charId)) {
                return { ...prev, characterIds: ids.filter(id => id !== charId) };
            } else {
                return { ...prev, characterIds: [...ids, charId] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-text-header dark:text-dark-text-header">Scenes</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    Add Scene
                </button>
            </div>

            {isCreating && (
                <div className="p-4 bg-card-bg dark:bg-dark-card-bg rounded-lg border border-border dark:border-dark-border space-y-4">
                    <input
                        type="text"
                        placeholder="Title"
                        value={newScene.title}
                        onChange={(e) => setNewScene({ ...newScene, title: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Setting"
                            value={newScene.setting}
                            onChange={(e) => setNewScene({ ...newScene, setting: e.target.value })}
                            className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                        />
                        <input
                            type="text"
                            placeholder="Time"
                            value={newScene.time}
                            onChange={(e) => setNewScene({ ...newScene, time: e.target.value })}
                            className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                        />
                    </div>
                    <textarea
                        placeholder="Description"
                        value={newScene.description}
                        onChange={(e) => setNewScene({ ...newScene, description: e.target.value })}
                        className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                    />

                    <div>
                        <label className="text-sm font-medium mb-1 block">Link to Chapter (Optional)</label>
                        <select
                            value={newScene.chapterId || ''}
                            onChange={(e) => setNewScene({ ...newScene, chapterId: e.target.value || undefined })}
                            className="w-full p-2 rounded-md bg-background dark:bg-dark-background border border-input-border dark:border-dark-input-border"
                        >
                            <option value="">-- No Chapter --</option>
                            {chapters.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-2">Characters in this scene:</p>
                        <div className="flex flex-wrap gap-2">
                            {characters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => toggleCharacterSelection(char.id)}
                                    className={`px-3 py-1 rounded-full text-xs border ${newScene.characterIds?.includes(char.id)
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-transparent text-text-body border-input-border'
                                        }`}
                                >
                                    {char.name}
                                </button>
                            ))}
                        </div>
                    </div>

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

            <div className="space-y-4">
                {scenes.map((scene) => (
                    <div key={scene.id} className="p-4 bg-card-bg dark:bg-dark-card-bg rounded-lg border border-border dark:border-dark-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-text-header dark:text-dark-text-header">{scene.title}</h4>
                                <div className="flex gap-4 text-xs text-text-muted dark:text-dark-text-muted mt-1">
                                    {scene.setting && <span>📍 {scene.setting}</span>}
                                    {scene.time && <span>⏰ {scene.time}</span>}
                                    {scene.chapterId && chapters.find(c => c.id === scene.chapterId) && (
                                        <span className="text-accent font-medium">
                                            📖 Linked to: {chapters.find(c => c.id === scene.chapterId)?.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(scene.id)}
                                className="text-text-muted hover:text-red-500"
                            >
                                Delete
                            </button>
                        </div>
                        <p className="mt-3 text-sm text-text-body dark:text-dark-text-body">{scene.description}</p>
                        {scene.characterIds && scene.characterIds.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {scene.characterIds.map(charId => {
                                    const char = characters.find(c => c.id === charId);
                                    return char ? (
                                        <span key={charId} className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                                            {char.name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
