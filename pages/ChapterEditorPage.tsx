import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, Character } from '../types';
import { ArrowLeftIcon, EyeIcon, XMarkIcon, SwatchIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { WorldBuildingSidebar } from '../components/WorldBuildingSidebar';
import { CharacterPreview } from '../components/CharacterPreview';
import { RichTextEditor } from '../components/RichTextEditor';
import { SpoilerReveal } from '../components/SpoilerReveal';
import { FootnoteTooltip } from '../components/FootnoteTooltip';
import parse, { domToReact } from 'html-react-parser';
import { useFeedback } from '../contexts/FeedbackContext';
import { WritingDemoModal } from '../components/WritingDemoModal';
import { MoodAtmosphere } from '../components/MoodAtmosphere';
import { SmartPasteAssistant } from '../components/SmartPasteAssistant';
import { PublishCharacterReviewModal } from '../components/PublishCharacterReviewModal';
import { SparklesIcon } from '../components/icons/Icons';

interface ChapterEditorPageProps {
    currentUser: User;
    bookId: string;
    chapterId: string | 'new';
    onUserUpdate: (user: User) => void;
}

const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string; characters: Character[]; onCharacterClick: (char: Character) => void }> = ({ isOpen, onClose, title, content, characters, onCharacterClick }) => {
    const previewProseRef = React.useRef<HTMLDivElement>(null);
    if (!isOpen) return null;

    const options = {
        replace: (domNode: any) => {
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs['data-type'] === 'mention') {
                const id = domNode.attribs['data-id'];
                const label = domNode.attribs['data-label'];
                const character = characters.find(c => c.id === id);
                return (
                    <span
                        onClick={() => character && onCharacterClick(character)}
                        className={`font-semibold cursor-pointer transition-all duration-200 ${!character ? 'text-gray-400 line-through decoration-1' : 'text-accent hover:text-primary hover:underline underline-offset-2 decoration-accent/40'}`}
                        title={character ? `View ${label || character.name}` : "Character not found"}
                    >
                        {label || (character ? character.name : 'Unknown')}
                    </span>
                );
            }
            // Fallback for older format or other mentions
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs.class === 'mention') {
                const id = domNode.attribs['data-id'];
                // Try to get label from children
                // Often text is inside
                // This handles TipTap output: <span class="mention" data-id="...">@Name</span>
                // But TipTap renderLabel I set creates text node inside.
                // So we can let default render handle children, or wrap it.
                // Actually, if we just want click handler:
                const character = characters.find(c => c.id === id);
                return (
                    <span
                        onClick={() => character && onCharacterClick(character)}
                        className={`font-semibold cursor-pointer text-accent hover:text-primary hover:underline underline-offset-2 decoration-accent/40 transition-all duration-200`}
                    >
                        {domToReact(domNode.children, options)}
                    </span>
                )
            }
            // Handle Spoiler / Hidden Text
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs['data-spoiler']) {
                return (
                    <SpoilerReveal>{domToReact(domNode.children, options)}</SpoilerReveal>
                );
            }
            // Handle Footnotes
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs['data-footnote']) {
                return (
                    <FootnoteTooltip
                        index={parseInt(domNode.attribs['data-footnote-index'] || '1')}
                        note={domNode.attribs['data-footnote']}
                    />
                );
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Mood Atmosphere in preview */}
                <MoodAtmosphere contentRef={previewProseRef} active={true} />
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-dark-surface-alt hover:bg-gray-200 transition-colors z-10">
                    <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="overflow-y-auto p-8 md:p-12">
                    <div className="max-w-prose mx-auto">
                        <h1 className="text-4xl font-serif font-bold mb-8 leading-snug text-text-rich dark:text-dark-text-rich">{title || 'Untitled Chapter'}</h1>
                        <div ref={previewProseRef} className="ww-prose font-serif text-text-body dark:text-dark-text-body">
                            {parse(content, options)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ChapterEditorPage: React.FC<ChapterEditorPageProps> = ({ currentUser, bookId, chapterId: initialChapterId, onUserUpdate }) => {
    const { triggerFeedback } = useFeedback();
    const [chapterId, setChapterId] = useState(initialChapterId);
    const isNewChapter = chapterId === 'new';

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);
    const chapter = isNewChapter ? null : book?.chapters.find(c => c.id === chapterId);

    const [title, setTitle] = useState(chapter?.title || '');
    const [content, setContent] = useState(chapter?.content || '');
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [smartPasteContent, setSmartPasteContent] = useState<string | null>(null);
    const [showSmartPasteToast, setShowSmartPasteToast] = useState(false);
    const [smartPastedCharacters, setSmartPastedCharacters] = useState<Character[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [pendingPublish, setPendingPublish] = useState<{content: string, title: string} | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Show Demo Modal on first visit if not seen
    useEffect(() => {
        if (currentUser && currentUser.hasSeenWritingDemo === false) {
            setShowDemoModal(true);
        }
    }, [currentUser]);

    const handleCloseDemo = async () => {
        setShowDemoModal(false);
        if (currentUser && currentUser.hasSeenWritingDemo === false) {
            try {
                const updatedUser = await api.markWritingDemoSeen();
                onUserUpdate(updatedUser);
            } catch (error) {
                console.error("Failed to mark writing demo as seen:", error);
            }
        }
    };

    // Mention System State
    const [characters, setCharacters] = useState<Character[]>([]);
    const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

    const saveTimeoutRef = useRef<number | null>(null);

    const wordCount = useMemo(() => {
        // Strip HTML tags for word count
        const text = content.replace(/<[^>]*>/g, ' ');
        return text.split(/\s+/).filter(Boolean).length;
    }, [content]);

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
        if (!currentTitle.trim() && !currentContent.trim()) return; // Don't save completely empty chapters

        let finalTitle = currentTitle.trim();
        if (status === 'published' && !finalTitle) {
             const chapterIndex = isNewChapter
                ? (book?.chapters.length || 0) + 1
                : ((book?.chapters.findIndex(c => c.id === chapterId) ?? -1) + 1);
             finalTitle = `Chapter ${chapterIndex > 0 ? chapterIndex : 1}`;
             setTitle(finalTitle); // Instantly update input to show the auto-generated title
        }

        if (status === 'published' && smartPastedCharacters.length > 0 && !isReviewOpen) {
            setPendingPublish({ content: currentContent, title: finalTitle });
            setIsReviewOpen(true);
            return;
        }

        setSaveState('saving');

        try {
            const updatedUser = await api.saveChapter(currentUser.id, bookId, chapterId, { title: finalTitle, content: currentContent }, status);
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
                triggerFeedback('PUBLISH_FLOW');
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

       const handleContentChange = (newContent: string) => {
            setContent(newContent);
            debouncedSave('draft', newContent, title);
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

    const handleLargePaste = (pastedText: string) => {
        setSmartPasteContent(pastedText);
        setShowSmartPasteToast(true);
    };

    const handleAddCharacters = async (names: string[]) => {
        const newlyAdded: Character[] = [];
        for (const name of names) {
            try {
                const char = await api.createCharacter({ bookId, name, role: 'Secondary' });
                newlyAdded.push(char);
            } catch (e) {
                console.error("Failed to create character", name, e);
            }
        }
        setSmartPastedCharacters(prev => [...prev, ...newlyAdded]);
        const updated = await api.getCharactersByBookId(bookId);
        setCharacters(updated);
    };

    const executeDeferredPublish = () => {
        setIsReviewOpen(false);
        setSmartPastedCharacters([]); // clear out to avoid infinite loop
        if (pendingPublish) {
            handleSave('published', pendingPublish.content, pendingPublish.title);
            setPendingPublish(null);
        }
    };

    const cancelDeferredPublish = () => {
        setIsReviewOpen(false);
        setPendingPublish(null);
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
                            <div className="min-w-0 relative">
                                <p className="text-xs text-text-body dark:text-dark-text-body truncate">{book.title}</p>
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                    placeholder="Chapter Title"
                                    className="font-sans font-bold text-md bg-transparent border-none focus:ring-0 p-0 w-full dark:text-dark-text-rich"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button
                                onClick={() => setShowDemoModal(true)}
                                className="px-2 sm:px-3 py-1.5 rounded-lg text-sm font-sans font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                                title="View Demo"
                            >
                                <SparklesIcon className="w-5 h-5 sm:hidden" />
                                <span className="hidden sm:inline-block">View Demo</span>
                            </button>
                            <p className="hidden sm:block text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-opacity font-sans w-16 sm:w-24 text-right">{getSaveText()}</p>
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
                            characters={characters}
                            onLargePaste={handleLargePaste}
                        />
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
            <WritingDemoModal 
                isOpen={showDemoModal} 
                onClose={handleCloseDemo} 
            />

            {/* Smart Paste Toast */}
            {showSmartPasteToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg animate-in slide-in-from-top-10 fade-in duration-300">
                    <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border-2 border-accent/40 flex items-center justify-between gap-4">
                        <div 
                            className="flex items-center gap-4 cursor-pointer flex-1 group" 
                            onClick={() => setShowSmartPasteToast(false)}
                        >
                            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <SparklesIcon className="w-7 h-7 text-accent animate-pulse" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-base">✨ Story Paste Detected!</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium group-hover:text-accent transition-colors">Click here to auto-detect characters.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setSmartPasteContent(null); setShowSmartPasteToast(false); }} 
                            className="p-2 bg-gray-100 dark:bg-dark-border rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            title="Dismiss"
                        >
                            <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Paste Assistant Modal */}
            {smartPasteContent && !showSmartPasteToast && (
                <SmartPasteAssistant 
                    isOpen={true}
                    text={smartPasteContent}
                    existingCharacters={characters}
                    onClose={() => setSmartPasteContent(null)}
                    onAddCharacters={handleAddCharacters}
                    onShowDemo={() => setShowDemoModal(true)}
                />
            )}

            <PublishCharacterReviewModal
                isOpen={isReviewOpen}
                characters={smartPastedCharacters}
                onClose={cancelDeferredPublish}
                onPublish={executeDeferredPublish}
            />
        </div>
    );
};
