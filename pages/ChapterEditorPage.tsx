import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, Character } from '../types';
import { ArrowLeftIcon, EyeIcon, XMarkIcon, SwatchIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { WorldBuildingSidebar } from '../components/WorldBuildingSidebar';
import { CharacterPreview } from '../components/CharacterPreview';
import { RichTextEditor } from '../components/RichTextEditor';

interface ChapterEditorPageProps {
    currentUser: User;
    bookId: string;
    chapterId: string | 'new';
    onUserUpdate: (user: User) => void;
}

const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string; characters: Character[]; onCharacterClick: (char: Character) => void }> = ({ isOpen, onClose, title, content, characters, onCharacterClick }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-dark-surface-alt hover:bg-gray-200 transition-colors z-10">
                    <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="overflow-y-auto p-8 md:p-12">
                    <div className="max-w-prose mx-auto">
                        <h1 className="text-4xl font-serif font-bold mb-8 leading-snug text-text-rich dark:text-dark-text-rich">{title || 'Untitled Chapter'}</h1>
                        <div className="prose prose-lg lg:prose-xl dark:prose-invert font-serif text-text-body dark:text-dark-text-body whitespace-pre-wrap">
                            {content.split('\n').map((paragraph, index) => {
                                const parts = paragraph.split(/(@\[.*?\]\(.*?\))/g);
                                return (
                                    <p key={index} className="mb-4">
                                        {parts.map((part, i) => {
                                            const match = part.match(/@\[(.*?)\]\((.*?)\)/);
                                            if (match) {
                                                const [_, name, id] = match;
                                                const character = characters.find(c => c.id === id);
                                                return (
                                                    <span
                                                        key={i}
                                                        onClick={() => character && onCharacterClick(character)}
                                                        className={`font-semibold cursor-pointer border-b-2 border-accent/30 hover:bg-accent/10 hover:border-accent transition-colors ${!character ? 'text-gray-500 line-through decoration-2' : 'text-accent'}`}
                                                        title={character ? "View Character" : "Character not found"}
                                                    >
                                                        {name}
                                                    </span>
                                                );
                                            }
                                            return part;
                                        })}
                                    </p>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ChapterEditorPage: React.FC<ChapterEditorPageProps> = ({ currentUser, bookId, chapterId: initialChapterId, onUserUpdate }) => {
    const [chapterId, setChapterId] = useState(initialChapterId);
    const isNewChapter = chapterId === 'new';

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);
    const chapter = isNewChapter ? null : book?.chapters.find(c => c.id === chapterId);

    const [title, setTitle] = useState(chapter?.title || '');
    const [content, setContent] = useState(chapter?.content || '');
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Mention System State
    const [characters, setCharacters] = useState<Character[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);
    const [mentionQuery, setMentionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const saveTimeoutRef = useRef<number | null>(null);

    const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);

    useEffect(() => {
        api.getCharactersByBookId(bookId).then(setCharacters);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [bookId]);

    const handleSave = async (status: 'draft' | 'published', currentContent: string, currentTitle: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (!currentTitle && !currentContent) return; // Don't save empty chapters

        setSaveState('saving');

        try {
            const updatedUser = await api.saveChapter(currentUser.id, bookId, chapterId, { title: currentTitle, content: currentContent }, status);
            onUserUpdate(updatedUser);

            // If it was a new chapter, find its newly created ID and update state
            if (chapterId === 'new') {
                const newChapter = updatedUser.writtenBooks?.find(b => b.id === bookId)?.chapters.find(c => c.title === currentTitle);
                if (newChapter) {
                    setChapterId(newChapter.id);
                }
            }

            setSaveState('saved');

            if (status === 'published') {
                window.location.hash = `/write/book/${bookId}/manage`;
            }
        } catch (error) {
            console.error("Failed to save chapter:", error);
            setSaveState('unsaved');
        }
    };

    const debouncedSave = (status: 'draft' | 'published', newContent: string, newTitle: string) => {
        setSaveState('unsaved');
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            handleSave(status, newContent, newTitle);
        }, 2000);
    }

    const insertMention = (char: Character) => {
        // RTE specific insertion logic
        const mention = `@[${char.name}](${char.id}) `;
        const queryToReplace = `@${mentionQuery}`;
        const lastIndex = content.lastIndexOf(queryToReplace);

        if (lastIndex !== -1) {
            const newContent = content.substring(0, lastIndex) + mention + content.substring(lastIndex + queryToReplace.length);
            setContent(newContent);
            debouncedSave('draft', newContent, title);
        }

        setShowMentions(false);
        setMentionQuery('');
    };

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        debouncedSave('draft', content, newTitle);
    };

    const getSaveText = () => {
        switch (saveState) {
            case 'saving': return 'Saving...';
            case 'saved': return '✓ Saved';
            case 'unsaved': return '...';
        }
    };

    if (!book) return <div className="p-8">Book not found.</div>;

    return (
        <div className="flex bg-white dark:bg-dark-surface h-screen overflow-hidden">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'mr-0' : ''}`}>
                <header className="flex-shrink-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b dark:border-dark-border z-10">
                    <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={() => window.location.hash = `/write/book/${bookId}/manage`}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors flex-shrink-0"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <div className="min-w-0">
                                <p className="text-xs text-text-body dark:text-dark-text-body truncate">{book.title}</p>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                    placeholder="Chapter Title"
                                    className="font-sans font-bold text-md bg-transparent border-none focus:ring-0 p-0 w-full dark:text-dark-text-rich"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-opacity font-sans w-16 sm:w-24 text-right">{getSaveText()}</p>
                            <button
                                onClick={() => setIsPreviewOpen(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors"
                                title="Preview"
                            >
                                <EyeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt text-gray-600 dark:text-gray-400'}`}
                                title="World Building"
                            >
                                <SwatchIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleSave('draft', content, title)}
                                className="hidden sm:inline-block bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border transition-colors text-sm"
                            >
                                Save Draft
                            </button>
                            <button
                                onClick={() => handleSave('published', content, title)}
                                className="bg-accent text-white font-sans font-semibold px-3 sm:px-4 py-2 rounded-lg hover:bg-primary transition-colors text-sm"
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="container mx-auto px-4 sm:px-6 py-8 h-full relative">

                        <RichTextEditor
                            value={content}
                            onChange={(newContent) => {
                                setContent(newContent);
                                debouncedSave('draft', newContent, title);
                                setSaveState('saving');
                            }}
                            placeholder="Start writing your chapter..."
                            characters={characters}
                            onMentionQuery={(query, rect) => {
                                setMentionQuery(query);
                                setShowMentions(true);
                            }}
                            onMentionClose={() => setShowMentions(false)}
                        />

                        {/* Mention Suggestions */}
                        {showMentions && (
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-dark-surface shadow-xl rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden z-50 animate-fade-in-up">
                                <div className="p-2 bg-gray-50 dark:bg-dark-surface-alt text-xs font-bold text-gray-500 uppercase tracking-wider border-b dark:border-dark-border">
                                    Mention Character
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {characters.filter(c => c.name.toLowerCase().includes(mentionQuery)).map(char => (
                                        <button
                                            key={char.id}
                                            onClick={() => insertMention(char)}
                                            className="w-full text-left p-3 hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-dark-border/50 last:border-0"
                                        >
                                            <img src={char.imageUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover" />
                                            <div>
                                                <div className="font-bold text-sm dark:text-dark-text-rich">{char.name}</div>
                                                <div className="text-[10px] text-gray-500">{char.role}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {characters.filter(c => c.name.toLowerCase().includes(mentionQuery)).length === 0 && (
                                        <div className="p-4 text-center text-sm text-gray-400 italic">No matching characters</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="flex-shrink-0 container mx-auto px-4 sm:px-6 h-8 flex items-center justify-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-sans">{wordCount.toLocaleString()} words</p>
                </footer>
            </div>

            {/* Sidebar */}
            {isSidebarOpen && (
                <WorldBuildingSidebar
                    bookId={bookId}
                    chapterId={chapterId !== 'new' ? chapterId : undefined}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            )}

            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title={title}
                content={content}
                characters={characters}
                onCharacterClick={setViewingCharacter}
            />

            <CharacterPreview
                character={viewingCharacter}
                isOpen={!!viewingCharacter}
                onClose={() => setViewingCharacter(null)}
            />
        </div>
    );
};
