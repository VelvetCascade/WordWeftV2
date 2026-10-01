import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import type { User, Character, ContentWarning } from '../types';
import { ArrowLeftIcon, EyeIcon, XMarkIcon, SwatchIcon, ShareIcon, CheckCircleIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
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
import { ChapterScannerModal } from '../components/ChapterScannerModal';
import { SparklesIcon, BookOpenIcon } from '../components/icons/Icons';
import { ShareModal } from '../components/ShareModal';
import { ScheduleChapterDialog } from '../components/ScheduleChapterDialog';
import { ChapterVersionHistoryDialog } from '../components/ChapterVersionHistoryDialog';
import { goBackOrReplace, replaceHash } from '../utils/navigation';
import { navigatePath, lockNavigation } from '../utils/navigation';
import { ArrowRight, Check, Cloud, History, List, LockKeyhole, Maximize2, Minimize2, NotebookPen, PanelRight, Plus, Settings2, X } from 'lucide-react';
import { NoteList } from '../components/NoteList';
import { useDialog } from '../hooks/useDialog';

interface ChapterEditorPageProps {
    currentUser: User;
    bookId: string;
    chapterId: string | 'new';
    onUserUpdate: (user: User) => void;
}

const fitChapterTitle = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${element.scrollHeight}px`;
};

const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string; characters: Character[]; onCharacterClick: (char: Character) => void }> = ({ isOpen, onClose, title, content, characters, onCharacterClick }) => {
    const previewProseRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = useDialog(isOpen, onClose);
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
            if (
                domNode.type === 'tag' &&
                domNode.name === 'span' &&
                domNode.attribs &&
                (Object.prototype.hasOwnProperty.call(domNode.attribs, 'data-spoiler') ||
                    (domNode.attribs.class || '').split(/\s+/).includes('spoiler-text'))
            ) {
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
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Reader preview" tabIndex={-1} className="ww-editor-reader-preview bg-white dark:bg-dark-surface w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Mood Atmosphere in preview */}
                <MoodAtmosphere contentRef={previewProseRef} active={true} />
                <button onClick={onClose} aria-label="Close reader preview" className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-dark-surface-alt hover:bg-gray-200 transition-colors z-10">
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
    const { trackEvent } = useAnalytics();
    const { triggerFeedback } = useFeedback();
    const [chapterId, setChapterId] = useState(() =>
        initialChapterId === 'new'
            ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ch_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36))
            : initialChapterId
    );
    const isNewChapter = initialChapterId === 'new' && (!currentUser.writtenBooks?.find(b => b.id === bookId)?.chapters.some(c => c.id === chapterId));

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);
    const chapter = isNewChapter ? null : book?.chapters.find(c => c.id === chapterId);

    const [title, setTitle] = useState(chapter?.title || '');
    const [content, setContent] = useState(chapter?.content || '');
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [contentLoadError, setContentLoadError] = useState('');
    const [contentLoadAttempt, setContentLoadAttempt] = useState(0);
    const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>(chapter?.contentWarnings || []);
    const [disclaimerNote, setDisclaimerNote] = useState(chapter?.disclaimerNote || '');
    const contentWarningsRef = useRef<ContentWarning[]>(chapter?.contentWarnings || []);
    const disclaimerNoteRef = useRef(chapter?.disclaimerNote || '');
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [publishState, setPublishState] = useState<'idle' | 'publishing'>('idle');
    const [saveError, setSaveError] = useState('');
    const isSavingRef = useRef(false);
    const queuedSaveRef = useRef<{ status: 'draft' | 'published' | 'preserve'; content: string; title: string } | null>(null);
    const editVersionRef = useRef(0);
    const saveSucceededRef = useRef(true);
    const releaseNavigationRef = useRef<(() => void) | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [sideTab, setSideTab] = useState<'details' | 'notes'>('details');
    const [mobilePanel, setMobilePanel] = useState<'chapters' | 'details' | 'notes' | null>(null);
    const [isPublishReviewOpen, setIsPublishReviewOpen] = useState(false);
    const [artworkConfirmed, setArtworkConfirmed] = useState(false);
    const publishDialogRef = useDialog(isPublishReviewOpen, () => setIsPublishReviewOpen(false), publishState !== 'publishing');
    const mobileDialogRef = useDialog(mobilePanel !== null, () => setMobilePanel(null));
    const [localRecovery, setLocalRecovery] = useState<{ title: string; content: string; contentWarnings: ContentWarning[]; disclaimerNote: string } | null>(null);
    const [localDraftSaved, setLocalDraftSaved] = useState(false);
    const localDraftKey = `ww:writer-draft:${currentUser.id}:${bookId}:${initialChapterId}`;

    useEffect(() => {
        const shortcuts = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey)) return;
            if (event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); setIsFocusMode(value => !value); }
            if (!event.shiftKey && event.key.toLowerCase() === 'j') { event.preventDefault(); setMobilePanel('chapters'); }
        };
        window.addEventListener('keydown', shortcuts);
        return () => window.removeEventListener('keydown', shortcuts);
    }, []);

    useEffect(() => {
        if (saveState !== 'saved' && !releaseNavigationRef.current) {
            releaseNavigationRef.current = lockNavigation('This chapter has unsaved changes. Save or retry before leaving the editor.');
        } else if (saveState === 'saved' && releaseNavigationRef.current) {
            releaseNavigationRef.current();
            releaseNavigationRef.current = null;
        }
    }, [saveState]);
    useEffect(() => () => releaseNavigationRef.current?.(), []);

    useEffect(() => {
        const sync = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', sync);
        window.addEventListener('offline', sync);
        try {
            const stored = JSON.parse(localStorage.getItem(localDraftKey) || 'null');
            if (stored && typeof stored.title === 'string' && typeof stored.content === 'string') setLocalRecovery(stored);
        } catch { /* Recovery is offered only after a draft copy can be read. */ }
        return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
    }, [localDraftKey]);

    useEffect(() => {
        let isMounted = true;
        if (!isNewChapter && chapterId && chapterId !== 'new') {
            setIsLoadingContent(true);
            setContentLoadError('');
            api.getChapterContent(bookId, chapterId, 'edit')
                .then(result => {
                    if (!isMounted) return;
                    if (result && typeof result.content === 'string') {
                        setContent(result.content);
                        if (result.chapterTitle) {
                            setTitle(result.chapterTitle);
                        }
                    }
                })
                .catch(err => {
                    console.error("Failed to load chapter content:", err);
                    if (isMounted) setContentLoadError(err instanceof Error ? err.message : 'The chapter could not be loaded.');
                })
                .finally(() => {
                    if (isMounted) setIsLoadingContent(false);
                });
        }
        return () => {
            isMounted = false;
        };
    }, [bookId, chapterId, contentLoadAttempt]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [smartPasteContent, setSmartPasteContent] = useState<string | null>(null);
    const [showSmartPasteToast, setShowSmartPasteToast] = useState(false);
    const [smartPastedCharacters, setSmartPastedCharacters] = useState<Character[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [pendingPublish, setPendingPublish] = useState<{content: string, title: string} | null>(null);
    const [showPublishSuccess, setShowPublishSuccess] = useState(false);
    const [publishedChapterTitle, setPublishedChapterTitle] = useState('');
    const [publishedChapterId, setPublishedChapterId] = useState<string | null>(null);
    const [isChapterShareOpen, setIsChapterShareOpen] = useState(false);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
    const titleInputRef = useRef<HTMLTextAreaElement>(null);
    const attachTitleField = useCallback((element: HTMLTextAreaElement | null) => {
        titleInputRef.current = element;
        fitChapterTitle(element);
    }, []);

    useLayoutEffect(() => {
        const resize = () => fitChapterTitle(titleInputRef.current);
        resize();
        window.addEventListener('resize', resize);
        let active = true;
        document.fonts.ready.then(() => { if (active) resize(); });
        return () => { active = false; window.removeEventListener('resize', resize); };
    }, [title, isLoadingContent, isFocusMode]);

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
    const chapterNumber = isNewChapter
        ? (book?.chapters.length || 0) + 1
        : Math.max(1, (book?.chapters.findIndex(c => c.id === chapterId) ?? 0) + 1);

    useEffect(() => {
        api.getCharactersByBookId(bookId).then(setCharacters);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [bookId]);

    useEffect(() => {
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            if (saveState === 'saved') return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [saveState]);

    const handleSave = async (status: 'draft' | 'published' | 'preserve', currentContent: string, currentTitle: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (isLoadingContent) return; // Never save while loading initial chapter content
        if (contentLoadError) return;
        saveSucceededRef.current = false;
        if (!currentTitle.trim() && !currentContent.trim()) {
            if (status === 'published') setSaveError('Add a title or chapter content before publishing.');
            return;
        }

        if (isSavingRef.current) {
            const queued = queuedSaveRef.current;
            const priority = { preserve: 1, draft: 2, published: 3 } as const;
            queuedSaveRef.current = {
                status: queued && priority[queued.status] > priority[status] ? queued.status : status,
                content: currentContent,
                title: currentTitle,
            };
            setSaveState('unsaved');
            if (status === 'published') setPublishState('publishing');
            return;
        }

        const hasMatureWarnings = contentWarningsRef.current.some(w => ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(w));
        if (status === 'published' && (hasMatureWarnings || book?.isMature || book?.ageRating === 'MATURE_18' || book?.ageRating === 'ADULT_21')) {
            if (!currentUser.dateOfBirth) {
                setSaveError('Add your date of birth in Profile Settings before publishing mature (18+/21+) content.');
                return;
            }
        }

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

        isSavingRef.current = true;
        const saveVersion = editVersionRef.current;
        if (status === 'published') setPublishState('publishing');
        setSaveState('saving');
        setSaveError('');

        try {
            const updatedUser = await api.saveChapter(currentUser.id, bookId, chapterId, {
                title: finalTitle,
                content: currentContent,
                contentWarnings: contentWarningsRef.current,
                disclaimerNote: disclaimerNoteRef.current,
            }, status);
            onUserUpdate(updatedUser);

            saveSucceededRef.current = editVersionRef.current === saveVersion;
            setSaveState(saveSucceededRef.current ? 'saved' : 'unsaved');
            if (saveSucceededRef.current) {
                releaseNavigationRef.current?.();
                releaseNavigationRef.current = null;
                try { localStorage.removeItem(localDraftKey); setLocalDraftSaved(false); } catch { /* A server save remains successful if local cleanup fails. */ }
                setLocalRecovery(null);
            }
            if (isNewChapter && saveSucceededRef.current && status !== 'published') {
                replaceHash(`/write/book/${bookId}/chapter/${chapterId}/edit`);
            }

            if (status === 'published') {
                triggerFeedback('PUBLISH_FLOW');
                const savedChapterId = chapterId;
                setPublishedChapterTitle(finalTitle);
                setPublishedChapterId(savedChapterId);
                setShowPublishSuccess(true);
            }
        } catch (error) {
            console.error("Failed to save chapter:", error);
            setSaveState('unsaved');
            setSaveError(error instanceof Error && error.message ? error.message : 'The chapter could not be saved. Your text is still here—please retry.');
        } finally {
            isSavingRef.current = false;
            const queued = queuedSaveRef.current;
            queuedSaveRef.current = null;
            if (queued) {
                void handleSave(queued.status, queued.content, queued.title);
            } else if (status === 'published') {
                setPublishState('idle');
            }
        }
    };

    const debouncedSave = (status: 'draft' | 'published' | 'preserve', newContent: string, newTitle: string) => {
        editVersionRef.current += 1;
        saveSucceededRef.current = false;
        setSaveState('unsaved');
        try {
            localStorage.setItem(localDraftKey, JSON.stringify({ title: newTitle, content: newContent, contentWarnings: contentWarningsRef.current, disclaimerNote: disclaimerNoteRef.current }));
            localStorage.setItem(`ww:last-writing:${currentUser.id}`, JSON.stringify({ bookId, chapterId }));
            setLocalDraftSaved(true);
        } catch { setLocalDraftSaved(false); }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            handleSave(status, newContent, newTitle);
        }, 2000);
    }

       const handleContentChange = (newContent: string) => {
            setContent(newContent);
            debouncedSave('preserve', newContent, title);
        };


    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        debouncedSave('preserve', content, newTitle);
    };

    const getSaveText = () => {
        if (isLoadingContent) return 'Loading chapter…';
        if (contentLoadError) return 'Chapter not loaded';
        if (!isOnline && saveState !== 'saved') return localDraftSaved ? 'Offline · saved on this device' : 'Offline · changes unsaved';
        switch (saveState) {
            case 'saving': return 'Saving…';
            case 'saved': return isNewChapter ? 'New private draft' : 'All changes saved';
            case 'unsaved': return saveError ? 'Save needs attention' : 'Unsaved changes';
        }
    };

    const leaveEditor = async (path: string) => {
        if (isSavingRef.current || isLoadingContent) return;
        if (saveState !== 'saved') {
            await handleSave('preserve', content, title);
            if (!saveSucceededRef.current) return;
        }
        navigatePath(path);
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

    const handleApplyReplacedHtml = (newHtml: string) => {
        setContent(newHtml);
        debouncedSave('preserve', newHtml, title);
    };

    const handleSchedule = async (scheduledAt: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (isSavingRef.current) throw new Error('Wait for the current save to finish, then schedule again.');
        const readableContent = content.replace(/<[^>]*>/g, ' ').trim();
        if (!readableContent) throw new Error('Add chapter content before scheduling it.');

        const finalTitle = title.trim() || `Chapter ${chapterNumber}`;
        if (!title.trim()) setTitle(finalTitle);
        const hasMatureWarnings = contentWarningsRef.current.some(w => ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(w));
        if (hasMatureWarnings || book?.isMature || book?.ageRating === 'MATURE_18' || book?.ageRating === 'ADULT_21') {
            if (!currentUser.dateOfBirth) {
                throw new Error('Add your date of birth in Profile Settings before scheduling mature (18+/21+) content.');
            }
        }

        setSaveState('saving');
        setSaveError('');
        isSavingRef.current = true;
        const scheduleVersion = editVersionRef.current;
        try {
            const savedUser = await api.saveChapter(
                currentUser.id,
                bookId,
                chapterId,
                { title: finalTitle, content, contentWarnings: contentWarningsRef.current, disclaimerNote: disclaimerNoteRef.current },
                'draft',
            );
            const targetId = chapterId;
            if (!targetId) {
                throw new Error('The chapter was saved, but WordWeft could not identify it for scheduling.');
            }

            const updatedUser = await api.scheduleChapter(bookId, targetId, scheduledAt);
            onUserUpdate(updatedUser);
            setChapterId(targetId);
            saveSucceededRef.current = scheduleVersion === editVersionRef.current;
            setSaveState(saveSucceededRef.current ? 'saved' : 'unsaved');
            if (saveSucceededRef.current) { releaseNavigationRef.current?.(); releaseNavigationRef.current = null; try { localStorage.removeItem(localDraftKey); } catch {} }
            if (isNewChapter) replaceHash(`/write/book/${bookId}/chapter/${targetId}/edit`);
        } catch (failure) {
            setSaveState('unsaved');
            throw failure;
        } finally {
            isSavingRef.current = false;
            const queued = queuedSaveRef.current;
            queuedSaveRef.current = null;
            if (queued) void handleSave('preserve', queued.content, queued.title);
        }
    };



    if (!book) return <div className="p-8">Book not found.</div>;

    const titleBlock = <div className="ww-editor-title-block">
        <span>Chapter {chapterNumber} · {chapter?.status === 'published' ? 'Published chapter' : chapter?.status === 'scheduled' ? 'Scheduled draft' : 'Private draft'}</span>
        <textarea ref={attachTitleField} rows={1} value={title} onChange={event => handleTitleChange(event.target.value.replace(/[\r\n]+/g, ' '))} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); document.querySelector<HTMLElement>('.ProseMirror')?.focus(); } }} placeholder="Untitled chapter" aria-label="Chapter title" disabled={isLoadingContent || !!contentLoadError} />
    </div>;
    const manuscriptFooter = <footer className="ww-editor-manuscript-footer"><span>{wordCount.toLocaleString()} words · {Math.max(1, Math.ceil(wordCount / 220))} min read</span><span><LockKeyhole size={14} />{chapter?.status === 'published' ? 'Edits stay private until published' : 'Only you can see this draft'}</span></footer>;
    const chapterNavigation = <><span className="ww-studio-eyebrow">{book.title}</span><h2>Manuscript</h2><nav aria-label="Chapters">{book.chapters.map((item, index) => <button type="button" key={item.id} disabled={saveState === 'saving' || isLoadingContent} className={item.id === chapterId ? 'active' : ''} aria-current={item.id === chapterId ? 'page' : undefined} onClick={() => { setMobilePanel(null); void leaveEditor(`/write/book/${bookId}/chapter/${item.id}/edit`); }}><span className={`ww-editor-chapter-number ${item.status}`}>{item.status === 'published' ? <Check size={15} /> : index + 1}</span><span>{item.title || `Chapter ${index + 1}`}<small>{item.status === 'published' ? 'Published' : item.status === 'scheduled' ? 'Scheduled' : 'Private draft'}{item.hasUnpublishedChanges ? ' · New edits' : ''}</small></span></button>)}{isNewChapter && <button className="active" type="button"><span className="ww-editor-chapter-number">{chapterNumber}</span><span>{title || 'Untitled chapter'}<small>Private draft</small></span></button>}</nav><button className="ww-editor-new-chapter" disabled={saveState === 'saving' || isLoadingContent} onClick={() => { setMobilePanel(null); void leaveEditor(`/write/book/${bookId}/chapter/new/edit`); }}><Plus size={17} />New chapter</button><div className="ww-editor-rail-tools"><button onClick={() => setShowDemoModal(true)}><BookOpenIcon className="w-4 h-4" />Writing tools tour</button><button onClick={() => setIsScannerOpen(true)}><SparklesIcon className="w-4 h-4" />Scan for characters</button><button onClick={() => setIsSidebarOpen(true)}><SwatchIcon className="w-4 h-4" />Story guide</button></div></>;
    const detailsPanel = <div className="ww-editor-details-content"><h3>Chapter details</h3><label>Author note <small>Visible to readers</small><textarea rows={4} maxLength={1000} value={disclaimerNote} onChange={event => { disclaimerNoteRef.current = event.target.value; setDisclaimerNote(event.target.value); debouncedSave('preserve', content, title); }} placeholder="Add context without spoiling the chapter." /></label><details className="chapter-disclosure-editor"><summary>Content warnings <span>{contentWarnings.length ? `${contentWarnings.length} selected` : 'None'}</span></summary><p>Shown before this chapter opens.</p><div className="chapter-warning-options">{(['VIOLENCE','GORE','STRONG_LANGUAGE','SEXUAL_CONTENT','ABUSE','SELF_HARM','SUBSTANCE_USE','GRIEF','DISCRIMINATION','OTHER'] as ContentWarning[]).map(warning => <button type="button" key={warning} aria-pressed={contentWarnings.includes(warning)} className={contentWarnings.includes(warning) ? 'selected' : ''} onClick={() => { const next = contentWarnings.includes(warning) ? contentWarnings.filter(item => item !== warning) : [...contentWarnings, warning]; contentWarningsRef.current = next; setContentWarnings(next); debouncedSave('preserve', content, title); }}>{warning.replaceAll('_', ' ').toLowerCase()}</button>)}</div>{contentWarnings.some(warning => ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(warning)) && <p className="ww-editor-mature-note">These warnings raise the story’s rating to Mature (18+).{!currentUser.dateOfBirth && <> Add your date of birth in <a href="/edit-profile">Profile Settings</a> before publishing.</>}</p>}</details><div className="ww-editor-detail-section"><h3>Publication</h3><p>{chapter?.status === 'published' ? 'The published version stays live while you work on changes.' : chapter?.status === 'scheduled' && chapter.scheduledAt ? `Scheduled for ${new Date(chapter.scheduledAt).toLocaleString()}.` : 'Your chapter stays private until you publish it.'}</p><button className="ww-editor-save-button" disabled={saveState === 'saving' || isLoadingContent || !!contentLoadError} onClick={() => handleSave('preserve', content, title)}><Cloud size={16} />{chapter?.status === 'published' ? 'Save changes' : 'Save draft'}</button><button className="ww-editor-schedule-button" onClick={() => setIsScheduleOpen(true)} disabled={saveState === 'saving' || isLoadingContent || !!contentLoadError || book.publicationStatus !== 'published' || chapter?.status === 'published'}>{chapter?.status === 'scheduled' ? 'Reschedule chapter' : 'Schedule chapter'}</button>{book.publicationStatus !== 'published' && <small>Publish the story before scheduling a chapter.</small>}</div><div className="ww-editor-detail-section"><h3>Revision history</h3><p>Return to a saved recovery point whenever you need to.</p><button className="ww-editor-history" onClick={() => setIsVersionHistoryOpen(true)} disabled={isNewChapter || saveState === 'saving'}><History size={16} />View revisions</button>{isNewChapter && <small>Available after your first save.</small>}</div></div>;
    const notesPanel = <div className="ww-editor-notes-content"><div className="ww-editor-note-privacy"><LockKeyhole size={16} /><span>Only visible to you. Private notes never appear in the reader preview.</span></div><NoteList bookId={bookId} /></div>;

    return (
        <>
        <div className={`ww-editor-shell ${isFocusMode ? 'is-focus-mode' : ''}`}>
            <header className="ww-editor-topbar">
                <div className="ww-editor-context"><button onClick={() => void leaveEditor(`/write/book/${bookId}/manage`)} aria-label="Back to story studio" disabled={saveState === 'saving'}><ArrowLeftIcon className="w-5 h-5" /></button><div><strong>{book.title}</strong><span>Chapter {chapterNumber} · {chapter?.status === 'published' ? 'Published' : 'Private draft'}</span><small className={`ww-editor-mobile-save ${saveState}`} aria-live="polite">{getSaveText()}</small></div></div>
                <div className="ww-editor-actions"><div className={`ww-editor-save-state ${saveState}`} role="status" aria-live="polite"><Cloud size={17} />{getSaveText()}</div><button className="ww-editor-focus" onClick={() => setIsFocusMode(!isFocusMode)} title={isFocusMode ? 'Exit focus mode' : 'Focus mode'} aria-label={isFocusMode ? 'Exit focus mode' : 'Focus mode'}>{isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><button className="ww-editor-preview" onClick={() => setIsPreviewOpen(true)} disabled={isLoadingContent || !!contentLoadError}><EyeIcon className="w-4 h-4" /><span>Preview</span></button><button className="ww-editor-publish-button" disabled={publishState === 'publishing' || isLoadingContent || !!contentLoadError || wordCount === 0} onClick={() => { setArtworkConfirmed(false); setIsPublishReviewOpen(true); }}>{publishState === 'publishing' ? 'Publishing…' : chapter?.status === 'published' ? 'Publish updates' : 'Publish'}<ArrowRight size={18} /></button></div>
            </header>
            {saveError && <div className="ww-editor-save-error" role="alert"><span>{saveError}</span>{saveError.includes('date of birth') ? <button onClick={() => void leaveEditor('/edit-profile')}>Open Profile Settings</button> : <button onClick={() => handleSave('preserve', content, title)} disabled={saveState === 'saving'}>Retry save</button>}</div>}
            {localRecovery && <div className="ww-editor-recovery" role="status"><span>A draft copy from this device is available.</span><button disabled={isLoadingContent} onClick={() => { setTitle(localRecovery.title); setContent(localRecovery.content); contentWarningsRef.current = localRecovery.contentWarnings || []; disclaimerNoteRef.current = localRecovery.disclaimerNote || ''; setContentWarnings(contentWarningsRef.current); setDisclaimerNote(disclaimerNoteRef.current); debouncedSave('preserve', localRecovery.content, localRecovery.title); setLocalRecovery(null); }}>Recover draft</button><button onClick={() => { try { localStorage.removeItem(localDraftKey); } catch {} setLocalRecovery(null); }}>Dismiss</button></div>}
            <div className="ww-editor-workspace">
                <aside className="ww-editor-chapter-rail">{chapterNavigation}</aside>
                <main className="ww-editor-stage" aria-label="Chapter manuscript"><article className="ww-editor-paper">{isLoadingContent ? <div className="ww-editor-loading" role="status">Loading chapter content…</div> : contentLoadError ? <div className="ww-editor-load-error" role="alert"><strong>We couldn’t load this chapter safely.</strong><p>{contentLoadError}</p><button onClick={() => setContentLoadAttempt(attempt => attempt + 1)}>Retry loading</button></div> : <RichTextEditor value={content} onChange={handleContentChange} characters={characters} onLargePaste={handleLargePaste} bookId={bookId} manuscriptHeader={titleBlock} manuscriptFooter={manuscriptFooter} />}</article></main>
                <aside className="ww-editor-details-rail"><div className="ww-editor-rail-tabs" role="tablist" aria-label="Chapter sidebar"><button role="tab" aria-selected={sideTab === 'details'} className={sideTab === 'details' ? 'active' : ''} onClick={() => setSideTab('details')}>Details</button><button role="tab" aria-selected={sideTab === 'notes'} className={sideTab === 'notes' ? 'active' : ''} onClick={() => setSideTab('notes')}>Notes</button></div>{sideTab === 'details' ? detailsPanel : notesPanel}</aside>
            </div>
            <nav className="ww-editor-mobile-tools" aria-label="Writing tools"><button onClick={() => setMobilePanel('chapters')}><List size={18} />Chapters</button><button onClick={() => setMobilePanel('notes')}><NotebookPen size={18} />Notes</button><button onClick={() => setMobilePanel('details')}><Settings2 size={18} />Details</button></nav>
            {mobilePanel && <div className="ww-editor-sheet-backdrop" onClick={event => event.target === event.currentTarget && setMobilePanel(null)}><div className="ww-editor-mobile-sheet" ref={mobileDialogRef} role="dialog" aria-modal="true" aria-label={mobilePanel === 'chapters' ? 'Chapter navigation' : mobilePanel === 'notes' ? 'Private writing notes' : 'Chapter details'} tabIndex={-1}><header><strong>{mobilePanel === 'chapters' ? 'Your manuscript' : mobilePanel === 'notes' ? 'Private notes' : 'Chapter details'}</strong><button onClick={() => setMobilePanel(null)} aria-label="Close writing tools"><X size={20} /></button></header>{mobilePanel === 'chapters' ? chapterNavigation : mobilePanel === 'notes' ? notesPanel : detailsPanel}</div></div>}
            {isPublishReviewOpen && <div className="ww-editor-sheet-backdrop" onClick={event => event.target === event.currentTarget && publishState !== 'publishing' && setIsPublishReviewOpen(false)}><div className="ww-editor-publish-review" ref={publishDialogRef} role="dialog" aria-modal="true" aria-labelledby="chapter-publish-review-title" tabIndex={-1}><header><div><span className="ww-studio-eyebrow">{book.title}</span><h2 id="chapter-publish-review-title">Review & publish</h2></div><button onClick={() => setIsPublishReviewOpen(false)} aria-label="Close publishing review"><X size={21} /></button></header><div className="ww-editor-publish-review-grid"><section><h3>Ready for your readers?</h3><p>You’re publishing Chapter {chapterNumber} of {book.title}.</p><ul className="ww-editor-publish-checks"><li><Check size={18} />{title.trim() || `Chapter ${chapterNumber}`}</li><li><Check size={18} />{wordCount.toLocaleString()} words · {Math.max(1, Math.ceil(wordCount / 220))} min read</li><li><Check size={18} />Rating: {book.ageRating?.replaceAll('_', ' ').toLowerCase()}</li><li><Check size={18} />{contentWarnings.length ? contentWarnings.map(warning => warning.replaceAll('_', ' ').toLowerCase()).join(', ') : 'No chapter content warnings'}</li></ul><label className="ww-editor-artwork-check"><input type="checkbox" checked={artworkConfirmed} onChange={event => setArtworkConfirmed(event.target.checked)} />Artwork in this story is mine or used with permission.</label><p className="ww-editor-publication-note">Readers can open this chapter immediately after publication. Your followers receive a chapter notification. Sharing a community release is a separate action.</p>{saveError && <p className="ww-studio-alert" role="alert">{saveError}</p>}<div className="ww-editor-review-actions"><button className="ww-editor-publish-button" disabled={!artworkConfirmed || publishState === 'publishing'} onClick={() => { setIsPublishReviewOpen(false); void handleSave('published', content, title); }}>Publish chapter <ArrowRight size={18} /></button><button onClick={() => setIsPublishReviewOpen(false)}>Back to draft</button></div></section><aside><span className="ww-studio-eyebrow">Reader preview</span><img src={book.coverUrl} alt="" /><h3>{title.trim() || `Chapter ${chapterNumber}`}</h3><p>Chapter {chapterNumber} · {Math.max(1, Math.ceil(wordCount / 220))} min read</p><button className="ww-studio-text-link" onClick={() => { setIsPublishReviewOpen(false); setIsPreviewOpen(true); }}><EyeIcon className="w-4 h-4" />Read the preview</button></aside></div></div></div>}

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
            <ScheduleChapterDialog
                isOpen={isScheduleOpen}
                chapterTitle={title}
                initialScheduledAt={chapter?.scheduledAt}
                onConfirm={handleSchedule}
                onClose={() => setIsScheduleOpen(false)}
            />
            {!isNewChapter && (
                <ChapterVersionHistoryDialog
                    isOpen={isVersionHistoryOpen}
                    bookId={bookId}
                    chapterId={chapterId}
                    onClose={() => setIsVersionHistoryOpen(false)}
                    onRestored={(updatedUser, revision) => {
                        onUserUpdate(updatedUser);
                        setTitle(revision.title);
                        setContent(revision.content);
                        saveSucceededRef.current = true;
                        releaseNavigationRef.current?.();
                        releaseNavigationRef.current = null;
                        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                        try { localStorage.removeItem(localDraftKey); } catch {}
                        setLocalRecovery(null);
                        setLocalDraftSaved(false);
                        setSaveState('saved');
                    }}
                />
            )}

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

            <ChapterScannerModal
                isOpen={isScannerOpen}
                htmlContent={content}
                existingCharacters={characters}
                onClose={() => setIsScannerOpen(false)}
                onAddCharacters={handleAddCharacters}
                onApplyReplacedHtml={handleApplyReplacedHtml}
            />
        </div>

        {/* W1: Post-publish chapter celebration modal */}
        {showPublishSuccess && book && (
            <div className="ww-editor-celebration-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-2">Chapter Published!</h3>
                    <p className="font-semibold text-text-body dark:text-dark-text-body mb-1">'{publishedChapterTitle}' is now live.</p>
                    <p className="text-sm text-text-body dark:text-dark-text-body mb-6">Let your readers know there's a new chapter to read.</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { setShowPublishSuccess(false); setIsChapterShareOpen(true); }}
                            className="w-full py-3 rounded-xl font-bold text-white bg-accent hover:bg-primary transition-colors flex items-center justify-center gap-2"
                        >
                            <ShareIcon className="w-5 h-5" /> Share this Chapter
                        </button>
                        <button
                            onClick={() => { setShowPublishSuccess(false); replaceHash(`/write/book/${bookId}/manage`); }}
                            className="w-full py-2.5 rounded-xl font-semibold text-gray-500 dark:text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich transition-colors"
                        >
                            Back to studio
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isChapterShareOpen && book && (() => {
            const sharedChapter = publishedChapterId
                ? book.chapters.find(c => c.id === publishedChapterId)
                : book.chapters.find(c => c.title === publishedChapterTitle);
            return (
                <ShareModal
                    isOpen={isChapterShareOpen}
                    onClose={() => { setIsChapterShareOpen(false); replaceHash(`/write/book/${bookId}/manage`); }}
                    book={book}
                    chapter={sharedChapter}
                    shareTextOverride={`I just published a new chapter: '${publishedChapterTitle}' in ${book.title}. Read it on WordWeft!`}
                />
            );
        })()}
        </>
    );
};
