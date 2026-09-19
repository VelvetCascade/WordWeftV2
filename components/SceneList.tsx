import React, { useState, useEffect } from 'react';
import type { Scene, Character, Chapter } from '../types';
import * as api from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';

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
    const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadScenes();
        loadCharacters();
    }, [bookId]);

    const loadScenes = async () => {
        try {
            const data = await api.getScenesByBookId(bookId);
            setScenes(data);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Scenes could not be loaded.');
        }
    };

    const loadCharacters = async () => {
        try {
            setCharacters(await api.getCharactersByBookId(bookId));
        } catch {
            // Scene editing remains usable when optional character metadata is unavailable.
            setCharacters([]);
        }
    };

    const handleCreate = async () => {
        if (!newScene.title?.trim() || busyAction) return;
        setBusyAction('create');
        setError(null);
        try {
            const created = await api.createScene({ ...newScene, title: newScene.title.trim(), bookId });
            setScenes(current => [...current, created]);
            setIsCreating(false);
            setNewScene({ title: '', description: '', setting: '', time: '', characterIds: [] });
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'The scene could not be saved.');
        } finally {
            setBusyAction(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || busyAction) return;
        const target = deleteTarget;
        setBusyAction(`delete:${target.id}`);
        setError(null);
        try {
            await api.deleteScene(target.id);
            setScenes(current => current.filter(scene => scene.id !== target.id));
            setDeleteTarget(null);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'The scene could not be deleted.');
        } finally {
            setBusyAction(null);
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
        <div className="ww-story-tool ww-scenes-tool">
            <div className="ww-story-tool-heading">
                <div><span>Story map</span><h3>Scenes</h3><p>Plan where each turning point happens, who is present, and what changes.</p></div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="ww-story-tool-add"
                >
                    <span>+</span> Add scene
                </button>
            </div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

            {isCreating && (
                <div className="ww-story-tool-form p-4 bg-card-bg dark:bg-dark-card-bg rounded-lg border border-border dark:border-dark-border space-y-4">
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
                            disabled={!newScene.title?.trim() || busyAction !== null}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                        >
                            {busyAction === 'create' ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {!isCreating && scenes.length === 0 && (
                <div className="ww-tool-empty">
                    <span>Sequence</span>
                    <h4>Map the moments that matter.</h4>
                    <p>Capture a setting, a conflict, or a reveal before it slips away. Link it to a chapter whenever you’re ready.</p>
                    <button onClick={() => setIsCreating(true)}>Plan the first scene <span>→</span></button>
                </div>
            )}

            <div className="ww-story-tool-list space-y-4">
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
                                onClick={() => setDeleteTarget(scene)}
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
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete scene?"
                message={`“${deleteTarget?.title || 'This scene'}” will be permanently removed from your story plan.`}
                confirmLabel="Delete scene"
                processingLabel="Deleting…"
                isProcessing={!!deleteTarget && busyAction === `delete:${deleteTarget.id}`}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
};
