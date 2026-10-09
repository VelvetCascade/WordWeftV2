import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import type { User, Character, ContentWarning, Chapter } from '../types';
import { ArrowLeftIcon, EyeIcon, XMarkIcon, ShareIcon, CheckCircleIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WorldBuildingSidebar } from '../components/WorldBuildingSidebar';
import { CharacterPreview } from '../components/CharacterPreview';
import { RichTextEditor } from '../components/RichTextEditor';
import { SpoilerReveal } from '../components/SpoilerReveal';
import { FootnoteTooltip } from '../components/FootnoteTooltip';
import parse, { attributesToProps, domToReact } from 'html-react-parser';
import { useFeedback } from '../contexts/FeedbackContext';
import { WritingDemoModal, type WritingTourTool } from '../components/WritingDemoModal';
import { MoodAtmosphere } from '../components/MoodAtmosphere';
import { SmartPasteAssistant } from '../components/SmartPasteAssistant';
import { PublishCharacterReviewModal } from '../components/PublishCharacterReviewModal';
import { ChapterScannerModal } from '../components/ChapterScannerModal';
import { SparklesIcon } from '../components/icons/Icons';
import { ShareModal } from '../components/ShareModal';
import { ScheduleChapterDialog } from '../components/ScheduleChapterDialog';
import { ChapterVersionHistoryDialog } from '../components/ChapterVersionHistoryDialog';
import { goBackOrReplace, replaceHash } from '../utils/navigation';
import { navigatePath, lockNavigation } from '../utils/navigation';
import { AlertTriangle, ArrowRight, BookOpenText, Check, ChevronDown, Cloud, History, List, LockKeyhole, Maximize2, Minimize2, NotebookPen, Plus, Search, Settings2, UsersRound, X } from 'lucide-react';
import { NoteList } from '../components/NoteList';
import { useDialog } from '../hooks/useDialog';
import { publicationStatusLabel } from '../utils/publishing';
import { manuscriptSessionId, verifyDeviceDraft } from '../utils/manuscriptSession';
import { manuscriptPlainText, manuscriptWordCount } from '../utils/manuscriptText';
import { usePresence } from '../hooks/usePresence';
import { useDelayedFlag } from '../hooks/usePresence';
import '../styles/reader-v2.css';
import '../styles/publishing-editor.css';

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

const warningLabels: Record<ContentWarning, string> = {
    VIOLENCE: 'Violence', GORE: 'Gore', STRONG_LANGUAGE: 'Strong language', SEXUAL_CONTENT: 'Sexual content', ABUSE: 'Abuse', SELF_HARM: 'Self harm', SUBSTANCE_USE: 'Substance use', GRIEF: 'Grief', DISCRIMINATION: 'Discrimination', FLASHING_IMAGES: 'Flashing images', OTHER: 'Other',
};
const matureWarnings: ContentWarning[] = ['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'];

const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string; chapterNumber: number; wordCount: number; characters: Character[]; passageIndex?: number; onCharacterClick: (char: Character) => void }> = ({ isOpen, onClose, title, content, chapterNumber, wordCount, characters, passageIndex, onCharacterClick }) => {
    const previewProseRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = useDialog(isOpen, onClose);
    const [viewport, setViewport] = useState<'desktop' | 'phone'>('desktop');
    const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const present = usePresence(isOpen);
    useEffect(() => {
        if (!isOpen || passageIndex === undefined) return;
        const frame = requestAnimationFrame(() => {
            const prose = previewProseRef.current;
            const passage = prose?.querySelectorAll('p,h1,h2,h3,h4,h5,h6,hr')[passageIndex];
            const canvas = prose?.closest('.ww-reading-preview-canvas');
            if (canvas && passage) canvas.scrollTop += passage.getBoundingClientRect().top - canvas.getBoundingClientRect().top - canvas.clientHeight * .25;
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen, passageIndex]);
    if (!present) return null;

    const options = {
        replace: (domNode: any) => {
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs['data-type'] === 'mention') {
                const id = domNode.attribs['data-id'];
                const label = domNode.attribs['data-label'];
                const character = characters.find(c => c.id === id);
                return (
                    <span
                        role={character ? 'button' : undefined}
                        tabIndex={character ? 0 : undefined}
                        onKeyDown={event => { if (character && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onCharacterClick(character); } }}
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
                        role={character ? 'button' : undefined}
                        tabIndex={character ? 0 : undefined}
                        onKeyDown={event => { if (character && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onCharacterClick(character); } }}
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
            // Use the live reader's paragraph rhythm and drop cap, preserving
            // manuscript formatting without exposing paragraph comment actions.
            if (domNode.type === 'tag' && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'pre'].includes(domNode.name)) {
                return <div className="reader-comment-block mb-6">{React.createElement(domNode.name, attributesToProps(domNode.attribs), domToReact(domNode.children, options))}</div>;
            }
        }
    };

    return (
        <div className="ww-presence ww-editor-preview-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} aria-hidden={!isOpen || undefined}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Reader preview" tabIndex={-1} className={`ww-editor-reader-preview ww-reading-preview-controls ${viewport === 'phone' ? 'is-phone-preview' : ''}`}>
                <header className="ww-reading-preview-toolbar">
                    <div className="ww-reading-preview-heading"><BookOpenText size={22} aria-hidden="true" /><div><strong>Reader preview</strong><p>See your chapter as readers will.</p></div></div>
                    <div className="ww-reading-preview-options">
                        <label>Viewport<select value={viewport} onChange={event => setViewport(event.target.value as 'desktop' | 'phone')}><option value="desktop">Desktop</option><option value="phone">Phone</option></select></label>
                        <label>Appearance<select value={theme} onChange={event => setTheme(event.target.value as 'light' | 'sepia' | 'dark')}><option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option></select></label>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close reader preview" className="ww-reading-preview-close"><X size={20} aria-hidden="true" /></button>
                </header>
                <div className="ww-reading-preview-stage">
                    <div role="region" aria-label="Chapter preview" tabIndex={0} className={`ww-reading-preview-canvas reader-experience reader-v2 reader-theme-${theme} ww-reading-preview-${viewport}`} data-preview-viewport={viewport} data-preview-theme={theme}>
                        <MoodAtmosphere contentRef={previewProseRef} active={true} />
                        <main className="reader-manuscript reader-width-standard"><div className="reader-chapter-intro">
                            <span>Chapter {chapterNumber} · {Math.max(1, Math.ceil(wordCount / 220))} min read</span>
                            <h1>{title || 'Untitled Chapter'}</h1>
                            <div className="reader-chapter-meta"><span>{wordCount.toLocaleString()} words</span></div>
                            </div><div ref={previewProseRef} className="ww-prose reader-copy reader-font-literary">
                                {parse(content, options)}
                            </div>
                        </main>
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
    const showChapterSkeleton = useDelayedFlag(isLoadingContent);
    const [contentLoadError, setContentLoadError] = useState('');
    const [contentLoadAttempt, setContentLoadAttempt] = useState(0);
    const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>(chapter?.contentWarnings || []);
    const [disclaimerNote, setDisclaimerNote] = useState(chapter?.disclaimerNote || '');
    const contentWarningsRef = useRef<ContentWarning[]>(chapter?.contentWarnings || []);
    const disclaimerNoteRef = useRef(chapter?.disclaimerNote || '');
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [publishState, setPublishState] = useState<'idle' | 'publishing'>('idle');
    const [saveError, setSaveError] = useState('');
    const expectedRevisionRef = useRef(chapter?.editRevision ?? 0);
    const conflictRef = useRef(false);
    const [serverDraft, setServerDraft] = useState<Chapter | null>(null);
    const [sessionNotice, setSessionNotice] = useState('');
    const [pendingExit, setPendingExit] = useState<string | null>(null);
    const [exitError, setExitError] = useState('');
    const [discardConfirmed, setDiscardConfirmed] = useState(false);
    const exitDialogRef = useDialog(pendingExit !== null, () => setPendingExit(null));
    const [publicationImpact, setPublicationImpact] = useState<api.PublicationImpact | null>(null);
    const impactVersionRef = useRef(-1);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [releaseConfirmed, setReleaseConfirmed] = useState(false);
    const isSavingRef = useRef(false);
    const queuedSaveRef = useRef<{ status: 'draft' | 'published' | 'preserve'; content: string; title: string } | null>(null);
    const editVersionRef = useRef(0);
    const saveSucceededRef = useRef(true);
    const releaseNavigationRef = useRef<(() => void) | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [sideTab, setSideTab] = useState<'details' | 'notes'>('details');
    const [chapterSearch, setChapterSearch] = useState('');
    const [manuscriptNotice, setManuscriptNotice] = useState('');
    const [mobilePanel, setMobilePanel] = useState<'chapters' | 'details' | 'notes' | null>(null);
    const [isPublishReviewOpen, setIsPublishReviewOpen] = useState(false);
    const [artworkConfirmed, setArtworkConfirmed] = useState(false);
    const publishDialogRef = useDialog(isPublishReviewOpen, () => setIsPublishReviewOpen(false), publishState !== 'publishing');
    const mobileDialogRef = useDialog(mobilePanel !== null, () => setMobilePanel(null));
    const [localRecovery, setLocalRecovery] = useState<{ key: string; title: string; content: string; contentWarnings: ContentWarning[]; disclaimerNote: string; baseRevision?: number } | null>(null);
    const [localDraftSaved, setLocalDraftSaved] = useState(false);
    const recoveredDraftKeyRef = useRef<string | null>(null);
    const draftPrefix = `ww:writer-draft:${currentUser.id}:${bookId}:${initialChapterId}`;
    const [draftSessionId] = useState(() => manuscriptSessionId());
    const localDraftKey = `${draftPrefix}:${draftSessionId}`;
    const broadcastRef = useRef<BroadcastChannel | null>(null);
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const channel = new BroadcastChannel(`ww:chapter:${currentUser.id}:${bookId}:${chapterId}`);
        broadcastRef.current = channel;
        channel.onmessage = event => {
            if (event.data?.sessionId !== draftSessionId && Number(event.data?.revision) > expectedRevisionRef.current) {
                setSessionNotice('Another session saved this chapter. Compare its draft before replacing it.');
            }
        };
        return () => { channel.close(); broadcastRef.current = null; };
    }, [currentUser.id, bookId, chapterId, draftSessionId]);
    useEffect(() => {
        const blocked = () => { setExitError('Save online, keep a verified device draft, or explicitly discard your changes before leaving.'); setPendingExit(`/write/book/${bookId}/manage`); };
        window.addEventListener('wordweft:navigation-blocked', blocked);
        return () => window.removeEventListener('wordweft:navigation-blocked', blocked);
    }, [bookId]);

    useEffect(() => {
        const shortcuts = (event: KeyboardEvent) => {
            if (event.defaultPrevented || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
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
            const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((key): key is string => !!key && (key === draftPrefix || key.startsWith(draftPrefix + ':')));
            const candidates = keys.map(key => ({ ...JSON.parse(localStorage.getItem(key) || 'null'), key })).filter(item => typeof item.title === 'string' && typeof item.content === 'string');
            candidates.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
            if (candidates[0]) setLocalRecovery(candidates[0]);
        } catch { /* Recovery is offered only after a draft copy can be read. */ }
        return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
    }, [localDraftKey]);

    useEffect(() => {
        let isMounted = true;
        if (!isNewChapter && chapterId && chapterId !== 'new') {
            setIsLoadingContent(true);
            setContentLoadError('');
            api.getChapterEditSession(bookId, chapterId)
                .then(result => {
                    if (!isMounted) return;
                    if (result && typeof result.content === 'string') {
                        setContent(result.content);
                        setTitle(result.title || '');
                        expectedRevisionRef.current = result.editRevision ?? 0;
                        contentWarningsRef.current = result.contentWarnings || [];
                        disclaimerNoteRef.current = result.disclaimerNote || '';
                        setContentWarnings(contentWarningsRef.current);
                        setDisclaimerNote(disclaimerNoteRef.current);
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
    const [previewPassageIndex, setPreviewPassageIndex] = useState<number | undefined>();
    const previewPlaceRef = useRef<{ range: Range | null; x: number; y: number; stageTop: number } | null>(null);
    const openPreview = () => {
        const selection = window.getSelection();
        const prose = document.querySelector('.rte-content');
        const anchor = selection?.anchorNode;
        const current = anchor instanceof Element ? anchor.closest('p,h1,h2,h3,h4,h5,h6,hr') : anchor?.parentElement?.closest('p,h1,h2,h3,h4,h5,h6,hr');
        const passages = Array.from(prose?.querySelectorAll('p,h1,h2,h3,h4,h5,h6,hr') || []);
        const visible = passages.findIndex(element => element.getBoundingClientRect().bottom > 160);
        setPreviewPassageIndex(current && prose?.contains(current) ? passages.indexOf(current) : visible >= 0 ? visible : undefined);
        previewPlaceRef.current = { range: selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null, x: window.scrollX, y: window.scrollY, stageTop: document.querySelector('.ww-editor-stage')?.scrollTop || 0 };
        setIsPreviewOpen(true);
    };
    const closePreview = () => {
        setIsPreviewOpen(false);
        requestAnimationFrame(() => {
            const place = previewPlaceRef.current; if (!place) return;
            window.scrollTo(place.x, place.y); const stage = document.querySelector('.ww-editor-stage'); if (stage) stage.scrollTop = place.stageTop;
            try { if (place.range?.startContainer.isConnected) { const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(place.range); } } catch {}
        });
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const demoDismissedRef = useRef(false);
    const [smartPasteContent, setSmartPasteContent] = useState<string | null>(null);
    const [showSmartPasteToast, setShowSmartPasteToast] = useState(false);
    const [smartPastedCharacters, setSmartPastedCharacters] = useState<Character[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [pendingPublish, setPendingPublish] = useState<{content: string, title: string} | null>(null);
    const [showPublishSuccess, setShowPublishSuccess] = useState(false);
    const publishSuccessRef = useDialog(showPublishSuccess, () => setShowPublishSuccess(false));
    const publishSuccessPresent = usePresence(showPublishSuccess);
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
        if (currentUser && currentUser.hasSeenWritingDemo === false && !demoDismissedRef.current) {
            setShowDemoModal(true);
        }
    }, [currentUser]);

    const handleCloseDemo = async () => {
        demoDismissedRef.current = true;
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

    const wordCount = useMemo(() => manuscriptWordCount(content), [content]);
    const chapterNumber = isNewChapter
        ? (book?.chapters.length || 0) + 1
        : Math.max(1, (book?.chapters.findIndex(c => c.id === chapterId) ?? 0) + 1);

    useEffect(() => {
        let active = true;
        const refresh = () => { api.getCharactersByBookId(bookId).then(items => { if (active) setCharacters(items); }).catch(() => {}); };
        const planningUpdated = (event: Event) => { if ((event as CustomEvent<{ bookId: string }>).detail?.bookId === bookId) refresh(); };
        refresh(); window.addEventListener('wordweft:planning-updated', planningUpdated);
        return () => {
            active = false; window.removeEventListener('wordweft:planning-updated', planningUpdated);
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
        if (conflictRef.current) { saveSucceededRef.current = false; setSaveError('A newer server draft needs comparison. Your version is still here.'); return; }
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
            if (status === 'published' && (!publicationImpact || impactVersionRef.current !== editVersionRef.current)) {
                throw new Error('Your draft changed. Review the complete release again before publishing.');
            }
            const updatedUser = status === 'published'
                ? await api.publishReviewed(bookId, chapterId, publicationImpact!.reviewToken)
                : await api.saveChapter(currentUser.id, bookId, chapterId, {
                title: finalTitle,
                content: currentContent,
                contentWarnings: contentWarningsRef.current,
                disclaimerNote: disclaimerNoteRef.current,
            }, status === 'draft' ? 'preserve' : status, expectedRevisionRef.current, status === 'draft');
            expectedRevisionRef.current = updatedUser.savedChapterRevision ?? expectedRevisionRef.current + 1;
            broadcastRef.current?.postMessage({ sessionId: draftSessionId, revision: expectedRevisionRef.current });
            onUserUpdate(updatedUser);

            saveSucceededRef.current = editVersionRef.current === saveVersion;
            setSaveState(saveSucceededRef.current ? 'saved' : 'unsaved');
            if (saveSucceededRef.current) {
                releaseNavigationRef.current?.();
                releaseNavigationRef.current = null;
                try { localStorage.removeItem(localDraftKey); if (recoveredDraftKeyRef.current) localStorage.removeItem(recoveredDraftKeyRef.current); recoveredDraftKeyRef.current = null; setLocalDraftSaved(false); } catch { /* A server save remains successful if local cleanup fails. */ }
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
                setIsPublishReviewOpen(false);
                setPublicationImpact(null);
                setShowPublishSuccess(true);
            }
        } catch (error) {
            console.error("Failed to save chapter:", error);
            setSaveState('unsaved');
            if ((error as { status?: number }).status === 409) {
                setPublicationImpact(null);
                if (status !== 'published') { conflictRef.current = true; setSessionNotice('A newer server draft needs comparison. Your version is still in the editor.'); }
            }
            setSaveError(error instanceof Error && error.message ? error.message : 'The chapter could not be saved. Your text is still here—please retry.');
        } finally {
            isSavingRef.current = false;
            const queued = queuedSaveRef.current;
            queuedSaveRef.current = null;
            if (queued && !conflictRef.current) {
                void handleSave(queued.status, queued.content, queued.title);
            } else if (status === 'published') {
                setPublishState('idle');
            }
        }
    };

    const debouncedSave = (status: 'draft' | 'published' | 'preserve', newContent: string, newTitle: string) => {
        editVersionRef.current += 1;
        setPublicationImpact(null);
        setReleaseConfirmed(false);
        saveSucceededRef.current = false;
        setSaveState('unsaved');
        try {
            const verified = verifyDeviceDraft(localStorage, localDraftKey, { title: newTitle, content: newContent, contentWarnings: contentWarningsRef.current, disclaimerNote: disclaimerNoteRef.current, baseRevision: expectedRevisionRef.current, savedAt: new Date().toISOString() });
            localStorage.setItem(`ww:last-writing:${currentUser.id}`, JSON.stringify({ bookId, chapterId }));
            setLocalDraftSaved(verified);
        } catch { setLocalDraftSaved(false); }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            if (!conflictRef.current) void handleSave(status, newContent, newTitle);
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
            if (!saveSucceededRef.current) { setPendingExit(path); setExitError('The chapter was not saved online. Choose how to keep your changes before leaving.'); return; }
        }
        navigatePath(path);
    };

    const handleLargePaste = (pastedText: string) => {
        setSmartPasteContent(pastedText);
        setShowSmartPasteToast(true);
    };

    const handleAddCharacters = async (names: string[]) => {
        const newlyAdded: Character[] = [];
        const failedNames: string[] = [];
        for (const name of names) {
            try {
                const char = await api.createCharacter({ bookId, name, role: 'Secondary' });
                newlyAdded.push(char);
            } catch (e) {
                console.error("Failed to create character", name, e);
                failedNames.push(name);
            }
        }
        setSmartPastedCharacters(prev => [...prev, ...newlyAdded]);
        setCharacters(previous => Array.from(new Map([...previous, ...newlyAdded].map(character => [character.id, character])).values()));
        const updated = await api.getCharactersByBookId(bookId);
        setCharacters(updated);
        if (failedNames.length) throw new Error(`Could not add ${failedNames.join(', ')}. Your other characters were added; retry the remaining names.`);
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
        if (conflictRef.current) throw new Error('Compare the newer server draft before scheduling.');
        const readableContent = manuscriptPlainText(content);
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
                'preserve',
                expectedRevisionRef.current,
            );
            expectedRevisionRef.current = savedUser.savedChapterRevision ?? expectedRevisionRef.current + 1;
            onUserUpdate(savedUser);
            const targetId = chapterId;
            if (!targetId) {
                throw new Error('The chapter was saved, but WordWeft could not identify it for scheduling.');
            }

            const updatedUser = await api.scheduleChapter(bookId, targetId, scheduledAt, expectedRevisionRef.current);
            expectedRevisionRef.current = updatedUser.savedChapterRevision ?? expectedRevisionRef.current + 1;
            broadcastRef.current?.postMessage({ sessionId: draftSessionId, revision: expectedRevisionRef.current });
            onUserUpdate(updatedUser);
            setChapterId(targetId);
            saveSucceededRef.current = scheduleVersion === editVersionRef.current;
            setSaveState(saveSucceededRef.current ? 'saved' : 'unsaved');
            if (saveSucceededRef.current) { releaseNavigationRef.current?.(); releaseNavigationRef.current = null; try { localStorage.removeItem(localDraftKey); } catch {} }
            if (isNewChapter) replaceHash(`/write/book/${bookId}/chapter/${targetId}/edit`);
        } catch (failure) {
            setSaveState('unsaved');
            if ((failure as { status?: number }).status === 409) { conflictRef.current = true; setSessionNotice('A newer server draft needs comparison. Your version is still here.'); }
            throw failure;
        } finally {
            isSavingRef.current = false;
            const queued = queuedSaveRef.current;
            queuedSaveRef.current = null;
            if (queued) void handleSave('preserve', queued.content, queued.title);
        }
    };


    const openPublicationReview = async () => {
        setIsPublishReviewOpen(true); setArtworkConfirmed(false); setReleaseConfirmed(false); setPublicationImpact(null); setReviewLoading(true);
        try {
            if (isSavingRef.current) throw new Error('Wait for the current save to finish, then refresh the release review.');
            await handleSave('preserve', content, title.trim() || `Chapter ${chapterNumber}`);
            if (!saveSucceededRef.current) throw new Error('Save this draft online before reviewing its release.');
            const version = editVersionRef.current;
            const impact = await api.getPublicationImpact(bookId, chapterId);
            if (version !== editVersionRef.current) throw new Error('Your draft changed. Refresh the review before publishing.');
            impactVersionRef.current = version; setPublicationImpact(impact); setSaveError('');
        } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not review this release.'); }
        finally { setReviewLoading(false); }
    };
    const compareServerDraft = async () => {
        try { setServerDraft(await api.getChapterEditSession(bookId, chapterId)); }
        catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not load the server draft. Your draft is still here.'); }
    };
    const keepDeviceDraft = () => {
        let verified = false;
        try { verified = verifyDeviceDraft(localStorage, localDraftKey, { title, content, contentWarnings, disclaimerNote, baseRevision: expectedRevisionRef.current, savedAt: new Date().toISOString() }); } catch {}
        setLocalDraftSaved(verified);
        return verified;
    };
    const finishExit = (discard = false) => {
        if (!pendingExit) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        queuedSaveRef.current = null;
        if (discard) { try { localStorage.removeItem(localDraftKey); } catch {} }
        releaseNavigationRef.current?.(); releaseNavigationRef.current = null;
        navigatePath(pendingExit);
    };
    const exportDraft = (format: 'html' | 'text' = 'html') => {
        const html = `<!doctype html><meta charset="utf-8"><title>Manuscript draft</title><h1>${title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</h1>${content}`;
        const url = URL.createObjectURL(new Blob([format === 'text' ? `${title}\n\n${manuscriptPlainText(content)}` : html], { type: format === 'text' ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = `${title.trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').slice(0, 70) || 'wordweft-draft'}.${format === 'text' ? 'txt' : 'html'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const copyManuscript = async () => navigator.clipboard.writeText(`${title}\n\n${manuscriptPlainText(content)}`);
    const sidebarKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'details' : event.key === 'End' ? 'notes' : sideTab === 'details' ? 'notes' : 'details';
        setSideTab(next);
        event.currentTarget.closest('[role=tablist]')?.querySelector<HTMLButtonElement>(`[data-sidebar-tab="${next}"]`)?.focus();
    };
    const cancelSchedule = async () => {
        if (isSavingRef.current) return;
        setSaveError(''); setSaveState('saving'); isSavingRef.current = true;
        try {
            const updated = await api.cancelChapterSchedule(bookId, chapterId, expectedRevisionRef.current);
            expectedRevisionRef.current = updated.savedChapterRevision ?? expectedRevisionRef.current + 1;
            onUserUpdate(updated); setSaveState(saveSucceededRef.current ? 'saved' : 'unsaved');
        } catch (error) { setSaveState('unsaved'); setSaveError(error instanceof Error ? error.message : 'Could not cancel the schedule.'); }
        finally { isSavingRef.current = false; const queued = queuedSaveRef.current; queuedSaveRef.current = null; if (queued && !conflictRef.current) void handleSave('preserve', queued.content, queued.title); }
    };


    if (!book) return <div className="p-8">Book not found.</div>;

    const titleBlock = <div className="ww-editor-title-block">
        <span>Chapter {chapterNumber} · {chapter?.status === 'published' ? 'Published' : chapter?.status === 'scheduled' ? 'Scheduled' : 'Private draft'}</span>
        <textarea ref={attachTitleField} rows={1} value={title} onChange={event => handleTitleChange(event.target.value.replace(/[\r\n]+/g, ' '))} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); document.querySelector<HTMLElement>('.ProseMirror')?.focus(); } }} placeholder="Untitled chapter" aria-label="Chapter title" disabled={isLoadingContent || !!contentLoadError} />
    </div>;
    const manuscriptFooter = <footer className="ww-editor-manuscript-footer"><span>{wordCount.toLocaleString()} words · {Math.max(1, Math.ceil(wordCount / 220))} min read</span><span><LockKeyhole size={14} />{chapter?.status === 'published' ? 'Edits stay private until published' : 'Only you can see this draft'}</span></footer>;
    const chapterNavigation = <><span className="ww-studio-eyebrow">{book.title}</span><h2>Manuscript</h2><label className="ww-editor-chapter-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search manuscript chapters" placeholder="Find a chapter" value={chapterSearch} onChange={event => setChapterSearch(event.target.value)} /></label><nav aria-label="Chapters">{book.chapters.map((item, index) => <button type="button" key={item.id} hidden={!!chapterSearch.trim() && !(item.title || `Chapter ${index + 1}`).toLocaleLowerCase().includes(chapterSearch.trim().toLocaleLowerCase())} disabled={saveState === 'saving' || isLoadingContent} className={item.id === chapterId ? 'active' : ''} aria-current={item.id === chapterId ? 'page' : undefined} onClick={() => { setMobilePanel(null); void leaveEditor(`/write/book/${bookId}/chapter/${item.id}/edit`); }}><span className={`ww-editor-chapter-number ${item.status}`}>{item.status === 'published' ? <Check size={15} /> : index + 1}</span><span>{item.title || `Chapter ${index + 1}`}<small>{item.status === 'published' ? 'Published' : item.status === 'scheduled' ? 'Scheduled' : 'Private draft'}{item.hasUnpublishedChanges ? ' · New edits' : ''}</small></span></button>)}{isNewChapter && <button className="active" type="button"><span className="ww-editor-chapter-number">{chapterNumber}</span><span>{title || 'Untitled chapter'}<small>Private draft</small></span></button>}</nav>{chapterSearch.trim() && !book.chapters.some(item => (item.title || '').toLocaleLowerCase().includes(chapterSearch.trim().toLocaleLowerCase())) && <p className="ww-editor-chapter-empty" role="status">No matching chapters.</p>}<button className="ww-editor-new-chapter" disabled={saveState === 'saving' || isLoadingContent} onClick={() => { setMobilePanel(null); void leaveEditor(`/write/book/${bookId}/chapter/new/edit`); }}><Plus size={17} />New chapter</button><div className="ww-editor-rail-tools"><button type="button" title="Explore the writing studio and find its tools" onClick={() => setShowDemoModal(true)}><BookOpenText size={17} aria-hidden="true" />Writing tools tour</button><button type="button" title="Find repeated character names and link them to your cast" disabled={isLoadingContent || !!contentLoadError} onClick={() => setIsScannerOpen(true)}><Search size={17} aria-hidden="true" />Scan for characters</button><button type="button" title="Reference your characters, scenes, and private notes" onClick={() => setIsSidebarOpen(true)}><UsersRound size={17} aria-hidden="true" />Story guide</button></div></>;
    const hasMatureWarnings = contentWarnings.some(warning => matureWarnings.includes(warning));
    const detailsPanel = <div className="ww-editor-details-content">
        <h3>Chapter details</h3>
        <label>Author note <small>Visible to readers</small><textarea rows={4} maxLength={1000} value={disclaimerNote} onChange={event => { disclaimerNoteRef.current = event.target.value; setDisclaimerNote(event.target.value); debouncedSave('preserve', content, title); }} placeholder="Add context without spoiling the chapter." /></label>
        <details className={`chapter-disclosure-editor ${contentWarnings.length ? hasMatureWarnings ? 'has-warnings has-mature-warnings' : 'has-warnings' : ''}`}>
            <summary><span className="ww-editor-warning-label">{contentWarnings.length ? <AlertTriangle size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}Content warnings</span><span className="ww-editor-warning-count">{contentWarnings.length ? `${contentWarnings.length} selected` : 'None'}<ChevronDown size={15} aria-hidden="true" /></span></summary>
            <p className="ww-editor-warning-guidance">Optional: select what applies. Readers see these before opening this chapter. Violence, strong language, substance use and discrimination require Teen (13+) or higher; gore, sexual content, abuse and self harm require Mature (18+).</p>
            <div className="chapter-warning-options">{(Object.keys(warningLabels) as ContentWarning[]).map(warning => <button type="button" key={warning} aria-pressed={contentWarnings.includes(warning)} className={contentWarnings.includes(warning) ? 'selected' : ''} onClick={() => { const next = contentWarnings.includes(warning) ? contentWarnings.filter(item => item !== warning) : [...contentWarnings, warning]; contentWarningsRef.current = next; setContentWarnings(next); debouncedSave('preserve', content, title); }}>{contentWarnings.includes(warning) && <Check size={13} aria-hidden="true" />}{warningLabels[warning]}</button>)}</div>
            {hasMatureWarnings && <p className="ww-editor-mature-note"><AlertTriangle size={18} aria-hidden="true" /><span><strong>Mature rating</strong>These warnings require Mature (18+) or higher.{!currentUser.dateOfBirth && <> Add your date of birth in <a href="/edit-profile" onClick={event => { event.preventDefault(); void leaveEditor('/edit-profile'); }}>Profile Settings</a> before publishing.</>}</span></p>}
        </details>
        <div className="ww-editor-detail-section"><h3>Publication</h3>{chapter?.status === 'published' && <small className="ww-editor-release-date">{publicationStatusLabel(chapter)}</small>}<p>{chapter?.status === 'published' ? 'The published version stays live while you work on changes.' : chapter?.status === 'scheduled' ? `${publicationStatusLabel(chapter)}. Saved changes will be included in the scheduled release. Publishing now replaces this schedule.` : 'Your chapter stays private until you publish it.'}</p><button className="ww-editor-save-button" disabled={saveState === 'saving' || isLoadingContent || !!contentLoadError} onClick={() => handleSave('preserve', content, title)}><Cloud size={16} />{chapter?.status === 'published' ? 'Save changes' : 'Save draft'}</button><button className="ww-editor-schedule-button" onClick={() => setIsScheduleOpen(true)} disabled={saveState === 'saving' || isLoadingContent || !!contentLoadError || book.publicationStatus !== 'published' || chapter?.status === 'published'}>{chapter?.status === 'scheduled' ? 'Reschedule chapter' : 'Schedule chapter'}</button>{chapter?.status === 'scheduled' && <button className="ww-editor-schedule-button" disabled={saveState === 'saving'} onClick={() => void cancelSchedule()}>Cancel schedule</button>}{book.publicationStatus !== 'published' && <small>Publish the story before scheduling a chapter.</small>}</div>
        <div className="ww-editor-detail-section"><h3>Manuscript copy</h3><p>Take a copy of the current chapter, including unsaved changes.</p><div className="ww-editor-export-actions"><button type="button" disabled={isLoadingContent || !!contentLoadError} onClick={() => exportDraft()}>Download formatted copy</button><button type="button" disabled={isLoadingContent || !!contentLoadError} onClick={() => exportDraft('text')}>Download plain text</button><button type="button" disabled={isLoadingContent || !!contentLoadError} onClick={async () => { try { await copyManuscript(); setManuscriptNotice('Chapter copied with paragraph breaks.'); } catch { setManuscriptNotice('Copy is unavailable in this browser. Download a copy instead.'); } }}>Copy chapter</button></div><small role="status">{manuscriptNotice}</small></div><div className="ww-editor-detail-section"><h3>Revision history</h3><p>Return to a saved recovery point whenever you need to.</p><button className="ww-editor-history" onClick={() => setIsVersionHistoryOpen(true)} disabled={isNewChapter || saveState !== 'saved'}><History size={16} />View revisions</button>{isNewChapter && <small>Available after your first save.</small>}</div>
    </div>;
    const notesPanel = <div className="ww-editor-notes-content"><div className="ww-editor-note-privacy"><LockKeyhole size={16} /><span>Only visible to you. Private notes never appear in the reader preview.</span></div><NoteList bookId={bookId} ownerId={currentUser.id} chapterId={!isNewChapter ? chapterId : undefined} chapterTitle={title || `Chapter ${chapterNumber}`} compact /></div>;

    return (
        <>
        <div className={`ww-editor-shell ${isFocusMode ? 'is-focus-mode' : ''}`}>
            <header className="ww-editor-topbar">
                <div className="ww-editor-context"><button onClick={() => void leaveEditor(`/write/book/${bookId}/manage`)} aria-label="Back to story studio" disabled={saveState === 'saving'}><ArrowLeftIcon className="w-5 h-5" /></button><div><strong>{book.title}</strong><span>Chapter {chapterNumber} · {chapter?.status === 'published' ? 'Published' : chapter?.status === 'scheduled' ? 'Scheduled' : 'Private draft'}</span><small className={`ww-editor-mobile-save ${saveState}`} aria-live="polite">{getSaveText()}</small></div></div>
                <div className="ww-editor-actions"><div className={`ww-editor-save-state ${saveState}`} role="status" aria-live="polite"><Cloud size={17} />{getSaveText()}</div><button className="ww-editor-focus" onClick={() => setIsFocusMode(!isFocusMode)} title={isFocusMode ? 'Exit focus mode' : 'Focus mode'} aria-label={isFocusMode ? 'Exit focus mode' : 'Focus mode'}>{isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><button className="ww-editor-preview" onClick={openPreview} disabled={isLoadingContent || !!contentLoadError}><EyeIcon className="w-4 h-4" /><span>Preview</span></button><button className="ww-editor-publish-button" disabled={publishState === 'publishing' || saveState === 'saving' || isLoadingContent || !!contentLoadError || wordCount === 0} onClick={() => void openPublicationReview()}>{publishState === 'publishing' ? 'Publishing…' : chapter?.status === 'published' ? 'Publish updates' : 'Publish'}<ArrowRight size={18} /></button></div>
            </header>
            {saveError && <div className="ww-editor-save-error" role="alert"><span>{saveError}</span>{saveError.includes('date of birth') ? <button onClick={() => void leaveEditor('/edit-profile')}>Open Profile Settings</button> : <button onClick={() => handleSave('preserve', content, title)} disabled={saveState === 'saving'}>Retry save</button>}</div>}
            {sessionNotice && <div className="ww-editor-session-notice" role="status"><span>{sessionNotice}</span><button onClick={() => void compareServerDraft()}>Compare server draft</button><button onClick={() => exportDraft()}>Export my draft</button></div>}
            {serverDraft && <section className="ww-editor-conflict-comparison" aria-label="Compare manuscript versions"><header><h2>Compare both drafts</h2><button onClick={() => setServerDraft(null)} aria-label="Close comparison"><X size={18} /></button></header><p>Your version remains in the editor. The latest server draft is shown here; saving your version will retain the server draft in revision history.</p><strong>Server revision {serverDraft.editRevision ?? 0}: {serverDraft.title}</strong><div className="ww-server-draft-copy">{manuscriptPlainText(serverDraft.content || '')}</div><p>Server warnings: {serverDraft.contentWarnings?.map(w => warningLabels[w] || w).join(', ') || 'None'} · Author note: {serverDraft.disclaimerNote || 'None'}</p><div className="ww-session-actions"><button onClick={() => { if (!keepDeviceDraft()) { setSaveError('Your device draft could not be verified. Export your version before using the server draft.'); return; } expectedRevisionRef.current = serverDraft.editRevision ?? 0; conflictRef.current = false; setTitle(serverDraft.title); setContent(serverDraft.content); contentWarningsRef.current = serverDraft.contentWarnings || []; disclaimerNoteRef.current = serverDraft.disclaimerNote || ''; setContentWarnings(contentWarningsRef.current); setDisclaimerNote(disclaimerNoteRef.current); setServerDraft(null); setSessionNotice('Your previous version is kept on this device.'); setSaveError(''); setSaveState('saved'); saveSucceededRef.current = true; if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }}>Use server draft; keep my device copy</button><button onClick={async () => { keepDeviceDraft(); expectedRevisionRef.current = serverDraft.editRevision ?? 0; conflictRef.current = false; await handleSave('draft', content, title); if (saveSucceededRef.current) { setServerDraft(null); setSessionNotice(''); } }}>Save my version over this server draft</button><button onClick={() => exportDraft()}>Export my draft</button></div></section>}
            {localRecovery && <div className="ww-editor-recovery" role="status"><span>A draft copy from this device is available.</span><button disabled={isLoadingContent} onClick={() => { recoveredDraftKeyRef.current = localRecovery.key; setTitle(localRecovery.title); setContent(localRecovery.content); contentWarningsRef.current = localRecovery.contentWarnings || []; disclaimerNoteRef.current = localRecovery.disclaimerNote || ''; setContentWarnings(contentWarningsRef.current); setDisclaimerNote(disclaimerNoteRef.current); if (localRecovery.baseRevision !== undefined && localRecovery.baseRevision !== expectedRevisionRef.current) { conflictRef.current = true; setSessionNotice('This device draft started from an older server revision. Compare both versions before saving.'); } debouncedSave('preserve', localRecovery.content, localRecovery.title); setLocalRecovery(null); }}>Recover draft</button><button onClick={() => { try { localStorage.removeItem(localRecovery.key); } catch {} setLocalRecovery(null); }}>Discard device copy</button></div>}
            <div className="ww-editor-workspace">
                <aside className="ww-editor-chapter-rail">{chapterNavigation}</aside>
                <main className="ww-editor-stage" aria-label="Chapter manuscript"><article className="ww-editor-paper">{isLoadingContent ? <div className="ww-editor-loading ww-editor-loading-manuscript" role="status" aria-label="Loading chapter content"><span className="sr-only">Loading chapter content…</span>{showChapterSkeleton && <div aria-hidden="true"><div className="ww-editor-skeleton-title" />{[0, 1, 2].map(group => <div className="ww-editor-skeleton-paragraph" key={group}>{[0, 1, 2, 3].map(line => <span key={line} />)}</div>)}</div>}</div> : contentLoadError ? <div className="ww-editor-load-error" role="alert"><strong>We couldn’t load this chapter safely.</strong><p>{contentLoadError}</p><button onClick={() => setContentLoadAttempt(attempt => attempt + 1)}>Retry loading</button></div> : <RichTextEditor value={content} onChange={handleContentChange} characters={characters} onLargePaste={handleLargePaste} bookId={bookId} manuscriptHeader={titleBlock} manuscriptFooter={manuscriptFooter} />}</article></main>
                <aside className="ww-editor-details-rail"><div className="ww-editor-rail-tabs" role="tablist" aria-label="Chapter sidebar"><button role="tab" onKeyDown={sidebarKeyDown} data-sidebar-tab="details" id="editor-details-tab" aria-controls="editor-sidebar-panel" tabIndex={sideTab === 'details' ? 0 : -1} aria-selected={sideTab === 'details'} className={sideTab === 'details' ? 'active' : ''} onClick={() => setSideTab('details')}>Details</button><button role="tab" onKeyDown={sidebarKeyDown} data-sidebar-tab="notes" id="editor-notes-tab" aria-controls="editor-sidebar-panel" tabIndex={sideTab === 'notes' ? 0 : -1} aria-selected={sideTab === 'notes'} className={sideTab === 'notes' ? 'active' : ''} onClick={() => setSideTab('notes')}>Notes</button></div><div role="tabpanel" id="editor-sidebar-panel" aria-labelledby={`editor-${sideTab}-tab`}>{sideTab === 'details' ? detailsPanel : notesPanel}</div></aside>
            </div>
            <nav className="ww-editor-mobile-tools" aria-label="Writing tools"><button onClick={() => setMobilePanel('chapters')}><List size={18} />Chapters</button><button onClick={() => setMobilePanel('notes')}><NotebookPen size={18} />Notes</button><button onClick={() => setMobilePanel('details')}><Settings2 size={18} />Details</button></nav>
            {mobilePanel && <div className="ww-editor-sheet-backdrop" onClick={event => event.target === event.currentTarget && setMobilePanel(null)}><div className="ww-editor-mobile-sheet" ref={mobileDialogRef} role="dialog" aria-modal="true" aria-label={mobilePanel === 'chapters' ? 'Chapter navigation' : mobilePanel === 'notes' ? 'Private writing notes' : 'Chapter details'} tabIndex={-1}><header><strong>{mobilePanel === 'chapters' ? 'Your manuscript' : mobilePanel === 'notes' ? 'Private notes' : 'Chapter details'}</strong><button onClick={() => setMobilePanel(null)} aria-label="Close writing tools"><X size={20} /></button></header>{mobilePanel === 'chapters' ? chapterNavigation : mobilePanel === 'notes' ? notesPanel : detailsPanel}</div></div>}
            {isPublishReviewOpen && <div className="ww-editor-sheet-backdrop" onClick={event => event.target === event.currentTarget && publishState !== 'publishing' && setIsPublishReviewOpen(false)}>
                <div className="ww-editor-publish-review" ref={publishDialogRef} role="dialog" aria-modal="true" aria-labelledby="chapter-publish-review-title" tabIndex={-1}>
                    <header><div><span className="ww-studio-eyebrow">{book.title}</span><h2 id="chapter-publish-review-title">Review the complete release</h2></div><button disabled={publishState === 'publishing'} onClick={() => setIsPublishReviewOpen(false)} aria-label="Close publishing review"><X size={21} /></button></header>
                    <div className="ww-editor-publish-review-grid"><section>
                        {reviewLoading && <p role="status">Saving your draft and checking every affected chapter…</p>}
                        {publicationImpact && <>
                            <h3>{publicationImpact.chapters.length} {publicationImpact.chapters.length === 1 ? 'chapter goes' : 'chapters go'} live now</h3>
                            <p>{publicationImpact.storyBecomesPublic ? 'Your private story becomes public and can appear in discovery.' : 'Your story stays public. Readers will see these released versions immediately.'}</p>
                            <p>Story age rating after release: <strong>{publicationImpact.resultingAgeRating.replaceAll('_', ' ').toLowerCase()}</strong>{publicationImpact.resultingAgeRating !== book.ageRating && ' · This raises the story’s rating.'}</p>
                            <ol className="ww-release-impact-list">{publicationImpact.chapters.map(item => <li key={item.id} className={item.contentWarnings.some(w => matureWarnings.includes(w as ContentWarning)) ? 'is-mature' : item.contentWarnings.length ? 'has-warnings' : ''}>
                                <strong>Chapter {item.number}: {item.title || 'Untitled chapter'}</strong>
                                <span>{item.status === 'published' ? 'Publish updated version' : 'Publish draft'} · {item.wordCount.toLocaleString()} words</span>
                                {item.scheduledAt && <span className="ww-release-schedule-change">{publicationStatusLabel(item)}. This schedule will be replaced by publication now.</span>}
                                <span>Content warnings: {item.contentWarnings.length ? item.contentWarnings.map(w => warningLabels[w as ContentWarning] || w).join(', ') : 'None'}</span>
                                {item.disclaimerNote && <span>Reader-visible author note: {item.disclaimerNote}</span>}
                                {!item.complete && <span role="alert">Add a title and content to this chapter before publishing.</span>}
                            </li>)}</ol>
                            <label className="ww-editor-artwork-check"><input type="checkbox" checked={releaseConfirmed} onChange={event => setReleaseConfirmed(event.target.checked)} />I approve every chapter, visibility change, rating and schedule change listed above.</label>
                            <label className="ww-editor-artwork-check"><input type="checkbox" checked={artworkConfirmed} onChange={event => setArtworkConfirmed(event.target.checked)} />Artwork in this story is mine or used with permission.</label>
                            <p className="ww-editor-publication-note">A new story or chapter release notifies followers. Publishing updates to an already published chapter does not send another notification. Sharing a community release is a separate action.</p>
                        </>}
                        {saveError && <p className="ww-studio-alert" role="alert">{saveError}</p>}
                        <div className="ww-editor-review-actions"><button className="ww-editor-publish-button" disabled={!artworkConfirmed || !releaseConfirmed || !publicationImpact || publicationImpact.chapters.some(item => !item.complete) || publishState === 'publishing' || reviewLoading} onClick={() => void handleSave('published', content, title)}>{publishState === 'publishing' ? 'Publishing…' : 'Publish this release'}<ArrowRight size={18} /></button>{!publicationImpact && <button disabled={reviewLoading} onClick={() => void openPublicationReview()}>Refresh release review</button>}<button disabled={publishState === 'publishing'} onClick={() => setIsPublishReviewOpen(false)}>Back to draft</button></div>
                    </section><aside><span className="ww-studio-eyebrow">Reader preview</span><img src={book.coverUrl} alt="" /><h3>{title.trim() || `Chapter ${chapterNumber}`}</h3><p>Chapter {chapterNumber} · {Math.max(1, Math.ceil(wordCount / 220))} min read</p><button className="ww-studio-text-link" onClick={() => { setIsPublishReviewOpen(false); openPreview(); }}><EyeIcon className="w-4 h-4" />Read the preview</button></aside></div>
                </div>
            </div>}
            {pendingExit && <div className="ww-editor-sheet-backdrop"><div className="ww-session-dialog" ref={exitDialogRef} role="dialog" aria-modal="true" aria-labelledby="manuscript-exit-title" tabIndex={-1}>
                <header><h2 id="manuscript-exit-title">Keep your draft before leaving</h2><button onClick={() => setPendingExit(null)} aria-label="Keep editing"><X size={20} /></button></header>
                <p role="alert">{exitError}</p><p>Your changes are not saved online. A device draft is private to this browser and may be lost if its storage is cleared.</p>
                <div className="ww-session-actions"><button disabled={saveState === 'saving'} onClick={async () => { await handleSave('preserve', content, title); if (saveSucceededRef.current) finishExit(); else setExitError('Saving online failed. Keep a verified device draft or export your manuscript.'); }}>Retry save and leave</button><button onClick={() => { if (keepDeviceDraft()) finishExit(); else setExitError('Device storage could not be verified. Export or copy your manuscript before leaving.'); }}>Keep device draft and leave</button><button onClick={() => exportDraft()}>Export manuscript</button><button onClick={async () => { try { await copyManuscript(); setExitError('Your manuscript was copied. It is still not saved online.'); } catch { setExitError('Copy is unavailable. Export your manuscript instead.'); } }}>Copy manuscript</button></div>
                <label className="ww-editor-artwork-check"><input type="checkbox" checked={discardConfirmed} onChange={event => setDiscardConfirmed(event.target.checked)} />Discard my unsaved changes in this session.</label><div className="ww-session-actions"><button disabled={!discardConfirmed} onClick={() => finishExit(true)}>Discard changes and leave</button><button onClick={() => setPendingExit(null)}>Keep editing</button></div>
            </div></div>}


            {/* Sidebar */}
            {isSidebarOpen && (
                <WorldBuildingSidebar
                    ownerId={currentUser.id}
                    bookId={bookId}
                    chapterId={!isNewChapter ? chapterId : undefined}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            )}

            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={closePreview}
                title={title}
                content={content}
                chapterNumber={chapterNumber}
                wordCount={wordCount}
                passageIndex={previewPassageIndex}
                characters={characters}
                onCharacterClick={setViewingCharacter}
            />
            <ScheduleChapterDialog
                isOpen={isScheduleOpen}
                chapterTitle={title}
                initialScheduledAt={chapter?.scheduledAt}
                releaseSummary={{ bookTitle: book.title, chapterNumber, wordCount, contentWarnings: contentWarnings.map(warning => warningLabels[warning]), authorNote: disclaimerNote, blockedReason: wordCount === 0 ? 'Add chapter content before scheduling.' : book.chapters.slice(0, chapterNumber - 1).some(item => item.status !== 'published') ? 'Publish the preceding chapters before scheduling this chapter.' : undefined }}
                onConfirm={handleSchedule}
                onClose={() => setIsScheduleOpen(false)}
            />
            {!isNewChapter && (
                <ChapterVersionHistoryDialog
                    isOpen={isVersionHistoryOpen}
                    bookId={bookId}
                    chapterId={chapterId}
                    expectedRevision={expectedRevisionRef.current}
                    currentTitle={title}
                    currentContent={content}
                    affectedChapters={book.chapters.slice(chapterNumber - 1).filter(item => item.status === 'published' || item.status === 'scheduled').map(item => item.title || 'Untitled chapter')}
                    onClose={() => setIsVersionHistoryOpen(false)}
                    onRestored={(updatedUser, revision) => {
                        expectedRevisionRef.current = updatedUser.savedChapterRevision ?? expectedRevisionRef.current + 1;
                        conflictRef.current = false; setServerDraft(null); setSessionNotice('');
                        onUserUpdate(updatedUser);
                        setTitle(revision.title);
                        setContent(revision.content);
                        if (revision.contentWarnings) { contentWarningsRef.current = revision.contentWarnings; disclaimerNoteRef.current = revision.disclaimerNote || ''; setContentWarnings(contentWarningsRef.current); setDisclaimerNote(disclaimerNoteRef.current); }
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
                onOpenTool={(tool: WritingTourTool) => {
                    if (tool === 'guide') setIsSidebarOpen(true);
                    if (tool === 'scanner') setIsScannerOpen(true);
                    if (tool === 'preview') openPreview();
                    if (tool === 'details') {
                        setSideTab('details');
                        if (window.matchMedia('(max-width: 980px)').matches) setMobilePanel('details');
                        requestAnimationFrame(() => {
                            const panel = window.matchMedia('(max-width: 980px)').matches ? mobileDialogRef.current : document.querySelector('.ww-editor-details-rail');
                            panel?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
                        });
                    }
                }}
            />

            {/* Smart Paste Toast */}
            {showSmartPasteToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg animate-in slide-in-from-top-10 fade-in duration-300">
                    <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border-2 border-accent/40 flex items-center justify-between gap-4">
                        <button type="button" aria-label="Review pasted characters"
                            className="flex items-center gap-4 cursor-pointer flex-1 group" 
                            onClick={() => setShowSmartPasteToast(false)}
                        >
                            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <SparklesIcon className="w-7 h-7 text-accent animate-pulse" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-base">Characters in your pasted text</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium group-hover:text-accent transition-colors">Review suggested names before adding them.</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => { setSmartPasteContent(null); setShowSmartPasteToast(false); }} 
                            className="p-2 bg-gray-100 dark:bg-dark-border rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            title="Dismiss" aria-label="Dismiss pasted character suggestions"
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
                    onClose={() => { setSmartPasteContent(null); requestAnimationFrame(() => document.querySelector<HTMLElement>('.rte-content[contenteditable=true]')?.focus()); }}
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
        {publishSuccessPresent && book && (
            <div className="ww-presence ww-editor-celebration-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-state={showPublishSuccess ? 'open' : 'closed'} inert={!showPublishSuccess} aria-hidden={!showPublishSuccess || undefined}>
                <div ref={publishSuccessRef} role="dialog" aria-modal="true" aria-labelledby="chapter-published-title" tabIndex={-1} className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 id="chapter-published-title" className="text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-2">Chapter published</h3>
                    <p className="font-semibold text-text-body dark:text-dark-text-body mb-1">'{publishedChapterTitle}' is now live.</p>
                    <p className="text-sm text-text-body dark:text-dark-text-body mb-6">Your chapter is ready for readers. Choose what comes next.</p>
                    <div className="flex flex-col gap-3">
                        <button data-dialog-focus className="ww-writer-success-primary" onClick={() => { setShowPublishSuccess(false); void leaveEditor(`/book/${bookId}/chapter/${publishedChapterId || chapterId}`); }}><BookOpenText size={18} />View live chapter</button><button className="ww-writer-success-secondary" onClick={() => { setShowPublishSuccess(false); void leaveEditor(`/write/book/${bookId}/chapter/new/edit`); }}><Plus size={18} />Write next chapter</button><button className="ww-writer-success-secondary" onClick={() => setShowPublishSuccess(false)}>Continue editing</button>
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
                    onClose={() => setIsChapterShareOpen(false)}
                    book={book}
                    chapter={sharedChapter}
                    shareTextOverride={`I just published a new chapter: '${publishedChapterTitle}' in ${book.title}. Read it on WordWeft!`}
                />
            );
        })()}
        </>
    );
};
