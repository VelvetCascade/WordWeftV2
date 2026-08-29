import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User, Book, BookProgress, Comment, Character  } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, Bars3Icon, BookmarkIcon, XMarkIcon, PlusIcon, ArrowUturnLeftIcon, HeartIcon, HeartIconSolid, ShareIcon, EyeIcon, ChatBubbleLeftIcon } from '../components/icons/Icons';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../api/client';
import { discussLink } from '../utils/community';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { CharacterPreview } from '../components/CharacterPreview';
import { SpoilerReveal } from '../components/SpoilerReveal';
import { MoodAtmosphere } from '../components/MoodAtmosphere';
import { ReaderDiscoveryCoach } from '../components/ReaderDiscoveryCoach';
import { FootnoteTooltip } from '../components/FootnoteTooltip';
import { ShareModal } from '../components/ShareModal';
import { ChapterDisclaimerModal } from '../components/ChapterDisclaimerModal';
import { ReportModal } from '../components/ReportModal';
import parse, { domToReact } from 'html-react-parser';
import { replaceReaderChapter, returnToStory } from '../utils/navigation';

type ContentTheme = 'light' | 'dark' | 'sepia';
type ReaderFont = 'literary' | 'modern';
type ReaderWidth = 'narrow' | 'standard' | 'wide';

interface ReaderPageProps {
    bookId: string;
    chapterIndex: number;
    currentUser: User | null;
}

const CommentItem: React.FC<{
    comment: Comment;
    allComments: Comment[];
    onReply: (parentId: string, content: string) => Promise<void>;
    onReport: (comment: Comment) => void;
    depth: number
}> = ({ comment, allComments, onReply, onReport, depth }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const replies = allComments.filter(c => c.parentId === comment.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        setIsSubmitting(true);
        await onReply(comment.id, replyContent);
        setReplyContent('');
        setIsReplying(false);
        setIsSubmitting(false);
    };

    return (
        <div className={`relative ${depth > 0 ? 'ml-6 mt-3' : 'mt-4'}`}>
            {depth > 0 && (
                <div className="absolute -left-4 top-4 w-4 h-[1px] bg-gray-300 dark:bg-dark-border"></div>
            )}

            <div className={`bg-gray-50 dark:bg-dark-surface-alt p-3 rounded-xl border border-transparent ${isReplying ? 'border-accent/50' : ''}`}>
                <div className="flex items-start gap-2 mb-1">
                    <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.name}
                        className="w-6 h-6 rounded-full flex-shrink-0 cursor-pointer"
                        onClick={() => window.location.hash = `/author/${comment.user.id}`}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span
                                className="font-sans font-bold text-xs text-text-rich dark:text-dark-text-rich truncate cursor-pointer hover:text-accent"
                                onClick={() => window.location.hash = `/author/${comment.user.id}`}
                            >
                                {comment.user.name}
                            </span>
                            <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-text-body dark:text-dark-text-body mt-1 break-words">{comment.content}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={() => onReport(comment)} className="text-xs font-semibold text-gray-400 hover:text-danger">Report</button>
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent flex items-center gap-1"
                    >
                        <ArrowUturnLeftIcon className="w-3 h-3" /> Reply
                    </button>
                </div>

                {isReplying && (
                    <form onSubmit={handleSubmitReply} className="mt-3 animate-slide-in-bottom">
                        <textarea
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder={`Replying to ${comment.user.name}...`}
                            className="w-full p-2 text-xs rounded-lg border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-body focus:ring-accent focus:border-accent resize-none mb-2"
                            rows={2}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsReplying(false)} className="text-xs px-3 py-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-border rounded">Cancel</button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !replyContent.trim()}
                                className="text-xs bg-accent text-white px-3 py-1 rounded font-semibold hover:bg-primary transition-colors disabled:opacity-50"
                            >
                                Reply
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="border-l-2 border-gray-100 dark:border-dark-border/50 ml-2 pl-0">
                {replies.map(reply => (
                    <CommentItem
                        key={reply.id}
                        comment={reply}
                        allComments={allComments}
                        onReply={onReply}
                        onReport={onReport}
                        depth={depth + 1}
                    />
                ))}
            </div>
        </div>
    );
};

const CommentDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    comments: Comment[];
    paragraphIndex: number | null;
    paragraphText?: string;
    onAddComment: (content: string, parentId?: string | null) => Promise<void>;
    onReportComment: (comment: Comment) => void;
}> = ({ isOpen, onClose, comments, paragraphIndex, paragraphText, onAddComment, onReportComment }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const topLevelComments = comments.filter(c => !c.parentId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        await onAddComment(newComment, null);
        setNewComment('');
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
            <div
                className="relative w-full max-w-md bg-white dark:bg-dark-surface h-full shadow-2xl flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-surface-alt">
                    <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">
                        {paragraphIndex !== null ? `Paragraph #${paragraphIndex + 1}` : 'Chapter Comments'}
                    </h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {paragraphText && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border-l-4 border-amber-400 text-sm text-gray-700 dark:text-gray-300 italic mb-6">
                            "{paragraphText.substring(0, 150)}{paragraphText.length > 150 ? '...' : ''}"
                        </div>
                    )}

                    {topLevelComments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No comments yet. Be the first!</div>
                    ) : (
                        topLevelComments.map(c => (
                            <CommentItem
                                key={c.id}
                                comment={c}
                                allComments={comments}
                                onReply={async (parentId, content) => await onAddComment(content, parentId)}
                                onReport={onReportComment}
                                depth={0}
                            />
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt">
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Start a new discussion..."
                            className="w-full p-3 rounded-lg border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-body text-sm focus:ring-accent focus:border-accent resize-none mb-2"
                            rows={3}
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="w-full bg-accent text-white font-sans font-semibold py-2 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId, chapterIndex, currentUser }) => {
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterIndex);
    const [fontSize, setFontSize] = useState(18);
    const [contentTheme, setContentTheme] = useState<ContentTheme>('light');
    const [readerFont, setReaderFont] = useState<ReaderFont>('literary');
    const [readerWidth, setReaderWidth] = useState<ReaderWidth>('standard');
    const [lineHeight, setLineHeight] = useState(1.85);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isTocVisible, setIsTocVisible] = useState(false);
    const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'CHAPTER' | 'COMMENT'; id: string; title: string } | null>(null);

    const [comments, setComments] = useState<Comment[]>([]);
    const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
    const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);

    // Quote sharing state
    const [selectedQuote, setSelectedQuote] = useState('');
    const [quoteTooltipPos, setQuoteTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const [shareInitialTab, setShareInitialTab] = useState<'quick' | 'story' | 'quote'>('quick');

    // Character Mention State
    const [characters, setCharacters] = useState<Character[]>([]);
    const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

    const lastScrollY = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const moodContentRef = useRef<HTMLDivElement>(null);
    const saveProgressTimeoutRef = useRef<number | null>(null);
    const hasRecordedView = useRef<string | null>(null);
    const lastSaveTimeRef = useRef<number>(0);
    const maxPercentageRef = useRef<number>(0);

    const { theme: globalTheme } = useTheme();
    const { triggerFeedback, startReadingTimer, checkReadingDuration } = useFeedback();
    const { trackEvent } = useAnalytics();

    const chapter = book?.chapters[currentChapterIndex];
    const disclaimerRequired = !!(book && chapter && ((book.ageRating === 'MATURE_18' || book.ageRating === 'ADULT_21') || book.contentWarnings?.length || chapter.contentWarnings?.length || book.customDisclaimer || chapter.disclaimerNote));
    const disclaimerKey = chapter ? `ww_disclaimer_${bookId}_${chapter.id}` : '';

    const contentThemeClasses: Record<ContentTheme, string> = {
        light: 'reader-theme-light',
        dark: 'reader-theme-dark',
        sepia: 'reader-theme-sepia',
    };

    useEffect(() => {
        setIsLoading(true);
        startReadingTimer();
        api.getBookById(bookId).then(fetchedBook => {
            setBook(fetchedBook);
            setIsLoading(false);
        });
        api.getCharactersByBookId(bookId).then(setCharacters);
        return () => { checkReadingDuration(); };
    }, [bookId]);

    useEffect(() => {
        if (chapter) setIsDisclaimerOpen(disclaimerRequired && sessionStorage.getItem(disclaimerKey) !== 'accepted');
    }, [chapter?.id, disclaimerRequired, disclaimerKey]);

    useEffect(() => {
        if (book && chapter) {
            api.getChapterComments(bookId, chapter.id).then(setComments);

            if ((!disclaimerRequired || sessionStorage.getItem(disclaimerKey) === 'accepted') && hasRecordedView.current !== chapter.id) {
                api.recordChapterView(bookId, chapter.id);
                trackEvent('reading', 'chapter_read_start', chapter.title, undefined, { bookId, chapterId: chapter.id, chapterIndex: currentChapterIndex });
                hasRecordedView.current = chapter.id;
            }
        }
    }, [bookId, chapter, isDisclaimerOpen, disclaimerRequired, disclaimerKey]);

    // Default reading mode on load based on user's site theme
    useEffect(() => {
        if (globalTheme === 'dark') {
            setContentTheme('dark');
        } else {
            setContentTheme('light');
        }
    }, []);

    // Device-local reader preferences: no server or account changes required.
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('ww_reader_preferences') || '{}');
            if (typeof saved.fontSize === 'number') setFontSize(Math.min(32, Math.max(12, saved.fontSize)));
            if (['light', 'sepia', 'dark'].includes(saved.contentTheme)) setContentTheme(saved.contentTheme);
            if (['literary', 'modern'].includes(saved.readerFont)) setReaderFont(saved.readerFont);
            if (['narrow', 'standard', 'wide'].includes(saved.readerWidth)) setReaderWidth(saved.readerWidth);
            if ([1.65, 1.85, 2.05].includes(saved.lineHeight)) setLineHeight(saved.lineHeight);
        } catch {
            // Ignore malformed local preferences and use the comfortable defaults.
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('ww_reader_preferences', JSON.stringify({ fontSize, contentTheme, readerFont, readerWidth, lineHeight }));
    }, [fontSize, contentTheme, readerFont, readerWidth, lineHeight]);

    const saveProgress = useCallback(() => {
        if (!currentUser || !book || !chapter) return;

        const now = Date.now();
        if (now - lastSaveTimeRef.current < 500) {
            return;
        }
        lastSaveTimeRef.current = now;

        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const fullHeight = document.documentElement.scrollHeight;
        const maxScroll = fullHeight - windowHeight;

        let percentage = 0;
        if (maxScroll > 0) {
            percentage = (scrollTop / maxScroll) * 100;
        } else {
            percentage = 100;
        }

        percentage = Math.min(100, Math.max(0, percentage));

        if (percentage > maxPercentageRef.current) {
            maxPercentageRef.current = percentage;
        }

        api.saveReadingProgress(
            currentUser.id,
            book,
            currentChapterIndex,
            scrollTop,
            maxPercentageRef.current
        );
    }, [currentUser, book, currentChapterIndex, chapter]);

    useEffect(() => {
        if (!currentUser || !chapter) return;

        const restorePosition = async () => {
            const savedProgress = await api.getReadingProgressForBook(currentUser.id, bookId);
            if (savedProgress && savedProgress.chapters[chapter.id]) {
                const savedScroll = savedProgress.chapters[chapter.id].scrollPosition;
                if (savedProgress.chapters[chapter.id].progress) {
                    maxPercentageRef.current = savedProgress.chapters[chapter.id].progress;
                }
                if (savedScroll > 0) {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' });
                } else {
                    window.scrollTo(0, 0);
                }
            } else {
                window.scrollTo(0, 0);
            }
        };

        setTimeout(restorePosition, 100);
    }, [bookId, chapter, currentUser]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            setScrollProgress(Math.min(100, Math.max(0, (currentScrollY / maxScroll) * 100)));

            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsToolbarVisible(false);
            } else {
                setIsToolbarVisible(true);
            }
            lastScrollY.current = currentScrollY;

            if (saveProgressTimeoutRef.current === null) {
                saveProgressTimeoutRef.current = window.setTimeout(() => {
                    saveProgress();
                    saveProgressTimeoutRef.current = null;
                }, 2000);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (saveProgressTimeoutRef.current) {
                clearTimeout(saveProgressTimeoutRef.current);
            }
            saveProgress();
        };
    }, [saveProgress]);

    useEffect(() => {
        const handleReaderShortcuts = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

            if (event.key.toLowerCase() === 'f') {
                setIsFocusMode(mode => !mode);
            } else if (event.key === 'Escape') {
                setIsFocusMode(false);
                setIsSettingsPanelVisible(false);
                setIsTocVisible(false);
            } else if (event.key === '[') {
                setFontSize(size => Math.max(12, size - 1));
            } else if (event.key === ']') {
                setFontSize(size => Math.min(32, size + 1));
            }
        };

        window.addEventListener('keydown', handleReaderShortcuts);
        return () => window.removeEventListener('keydown', handleReaderShortcuts);
    }, []);


    const goToChapter = (index: number) => {
        if (!book || (index < 0 || index >= book.chapters.length)) return;
        saveProgress();
        trackEvent('reading', 'chapter_navigate', index > currentChapterIndex ? 'next' : 'prev', undefined, { bookId: book.id, fromChapter: currentChapterIndex, toChapter: index });
        setCurrentChapterIndex(index);
        replaceReaderChapter(book.id, index);
    };

    const handleReturnToStory = () => {
        if (!book) return;
        saveProgress();
        returnToStory(book.id);
    };

    const openCommentDrawer = (index: number | null) => {
        setActiveParagraphIndex(index);
        setIsCommentDrawerOpen(true);
    };

    const handleAddComment = async (content: string, parentId: string | null = null) => {
        if (!book || !chapter) return;
        const newComment = await api.addChapterComment(bookId, chapter.id, activeParagraphIndex, content, parentId);
        setComments(prev => [newComment, ...prev]);
        triggerFeedback('COMMENT_SYSTEM', 3000);
    };

    const scrollToParagraph = (index: number) => {
        const el = document.getElementById(`paragraph-${index}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('highlight-animation');
            void el.offsetWidth;
            el.classList.add('highlight-animation');
        }
    };

    const handleToggleLike = async () => {
        if (!currentUser || !book || !chapter) {
            if (!currentUser) window.location.hash = '/auth';
            return;
        }

        const prevIsLiked = chapter.isLiked;
        const prevLikes = chapter.likesCount;

        const updatedChapters = book.chapters.map(c =>
            c.id === chapter.id
                ? { ...c, isLiked: !prevIsLiked, likesCount: prevIsLiked ? prevLikes - 1 : prevLikes + 1 }
                : c
        );

        const likeDiff = prevIsLiked ? -1 : 1;

        setBook({
            ...book,
            chapters: updatedChapters,
            likesCount: book.likesCount + likeDiff
        });

        try {
            await api.toggleChapterLike(book.id, chapter.id);
        } catch (e) {
            console.error(e);
            setBook({
                ...book,
                chapters: book.chapters,
                likesCount: book.likesCount
            });
        }
    };

    const TableOfContents: React.FC = () => {
        if (!book) return null;
        return (
            <div
                className={`reader-toc-overlay fixed inset-0 z-40 transition-opacity duration-300 ${isTocVisible ? 'reader-toc-overlay-open' : 'pointer-events-none opacity-0'}`}
                onClick={() => setIsTocVisible(false)}
            >
                <div
                    className={`reader-toc-panel absolute top-0 left-0 bottom-0 transform transition-transform duration-300 ${isTocVisible ? 'translate-x-0' : '-translate-x-full'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="reader-toc-header">
                        <div>
                            <span>Contents</span>
                            <h3>{book.title}</h3>
                            <p>{book.chapters.length} chapters · Chapter {currentChapterIndex + 1} now</p>
                        </div>
                        <button onClick={() => setIsTocVisible(false)} aria-label="Close contents"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="reader-toc-overall"><span style={{ width: `${((currentChapterIndex + scrollProgress / 100) / Math.max(1, book.chapters.length)) * 100}%` }} /></div>
                    <ul className="reader-toc-list">
                        {book.chapters.map((chap, index) => (
                            <li key={chap.id}>
                                <button
                                    onClick={() => {
                                        goToChapter(index);
                                        setIsTocVisible(false);
                                    }}
                                    className={`reader-toc-item ${index === currentChapterIndex ? 'reader-toc-item-active' : ''} ${chap.status !== 'published' ? 'reader-toc-item-locked' : ''}`}
                                    disabled={chap.status !== 'published'}
                                >
                                    <span className="reader-toc-number">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="reader-toc-title"><strong>{chap.title}</strong><small>{index === currentChapterIndex ? `${Math.round(scrollProgress)}% read` : chap.status !== 'published' ? 'Not released' : index < currentChapterIndex ? 'Completed' : 'Ready to read'}</small></span>
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading chapter...</div>;
    if (!book || !chapter) return <div className="min-h-screen flex items-center justify-center">Could not load content.</div>;

    const paragraphComments = (index: number) => comments.filter(c => c.paragraphIndex === index);
    const paragraphCommentCount = (index: number) => comments.filter(c => c.paragraphIndex === index && !c.parentId).length;

    let blockIndex = 0;

    const parseOptions = {
        replace: (domNode: any) => {
            // Handle Mentions
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs['data-type'] === 'mention') {
                const id = domNode.attribs['data-id'];
                const label = domNode.attribs['data-label'];
                const character = characters.find(c => c.id === id);
                return (
                    <span
                        onClick={() => character && setViewingCharacter(character)}
                        className={`font-semibold cursor-pointer transition-all duration-200 ${!character ? 'text-gray-400 line-through decoration-1' : 'text-accent hover:text-primary hover:underline underline-offset-2 decoration-accent/40'}`}
                        title={character ? `View ${label || character.name}` : "Character not found"}
                    >
                        {label || (character ? character.name : 'Unknown')}
                    </span>
                );
            }
            if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs && domNode.attribs.class === 'mention') {
                const id = domNode.attribs['data-id'];
                const character = characters.find(c => c.id === id);
                return (
                    <span
                        onClick={() => character && setViewingCharacter(character)}
                        className={`font-semibold cursor-pointer text-accent hover:text-primary hover:underline underline-offset-2 decoration-accent/40 transition-all duration-200`}
                    >
                        {domToReact(domNode.children, parseOptions)}
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
                    <SpoilerReveal>{domToReact(domNode.children, parseOptions)}</SpoilerReveal>
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

            // Handle Block Elements for Comments
            if (domNode.type === 'tag' && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'pre'].includes(domNode.name)) {
                const index = blockIndex++;
                const count = paragraphCommentCount(index);

                return (
                    <div key={index} id={`paragraph-${index}`} className="group relative mb-6 rounded-lg transition-colors">
                        {React.createElement(
                            domNode.name,
                            { ...domNode.attribs, className: `${domNode.attribs.className || ''} relative z-10` },
                            domToReact(domNode.children, parseOptions)
                        )}
                        <button
                            onClick={() => openCommentDrawer(index)}
                            className={`absolute -right-4 md:-right-12 top-0 p-2 rounded-full transition-all duration-200 z-20 ${count > 0 ? 'opacity-100 text-accent bg-accent/10' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
                            title="Add comment"
                        >
                            <div className="relative">
                                <PlusIcon className="w-5 h-5" />
                                {count > 0 && <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold px-1.5 rounded-full min-w-[16px] text-center">{count}</span>}
                            </div>
                        </button>
                    </div>
                );
            }
        }
    };

    const plainChapterText = chapter.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    const wordCount = plainChapterText ? plainChapterText.split(/\s+/).length : 0;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 230));

    // Reset block index
    blockIndex = 0;

    return (
        <div className={`reader-experience transition-colors duration-300 min-h-screen flex flex-col ${contentThemeClasses[contentTheme]} ${isFocusMode ? 'reader-focus-mode' : ''}`}>
            {/* Contextual Reader Onboarding */}
            <ReaderDiscoveryCoach 
                hasMentions={chapter?.content?.includes('href="/author/') || chapter?.content?.includes('mention')} 
                hasSpoilers={chapter?.content?.includes('data-spoiler') || chapter?.content?.includes('spoiler-text')}
            />

            {/* Mood Atmosphere — page-level immersive overlay */}
            <MoodAtmosphere contentRef={moodContentRef} active={true} />

            <TableOfContents />

            <div className="reader-progress-track" aria-hidden="true"><span style={{ width: `${scrollProgress}%` }} /></div>

            {/* Header */}
            <header className={`reader-header fixed top-0 left-0 right-0 z-20 ${isToolbarVisible ? 'reader-header-visible' : 'reader-header-hidden'}`}>
                <div className="reader-header-inner">
                    <button onClick={handleReturnToStory} className="reader-back-button" aria-label={`Back to ${book.title}`}>
                        <ChevronLeftIcon className="w-5 h-5" />
                        <span><small>Back to story</small><strong>{book.title}</strong></span>
                    </button>
                    <div className="reader-header-chapter">
                        <span>{String(currentChapterIndex + 1).padStart(2, '0')} / {String(book.chapters.length).padStart(2, '0')}</span>
                        <strong>{chapter.title}</strong>
                    </div>
                    <div className="reader-header-actions">
                        <button onClick={() => setIsBookmarked(!isBookmarked)} className={isBookmarked ? 'reader-action-active' : ''} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark chapter'}>
                            <BookmarkIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsShareModalOpen(true)} aria-label="Share chapter"><ShareIcon className="w-5 h-5" /></button>
                        <button onClick={() => currentUser ? setReportTarget({ type: 'CHAPTER', id: `${book.id}:${chapter.id}`, title: `${book.title} — ${chapter.title}` }) : window.location.hash = '/auth'} aria-label="Report chapter" className="reader-report-button">!</button>
                        <button onClick={() => setIsTocVisible(true)} aria-label="Open table of contents"><Bars3Icon className="w-5 h-5" /></button>
                    </div>
                </div>
            </header>

            {isFocusMode && (
                <button className="reader-focus-exit" onClick={() => setIsFocusMode(false)}>
                    Exit focus <kbd>F</kbd>
                </button>
            )}

            {/* Content */}
            <main 
                ref={contentRef} 
                className={`reader-manuscript reader-width-${readerWidth} mx-auto flex-1 relative z-10`}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onMouseUp={() => {
                    const selection = window.getSelection();
                    const text = selection?.toString().trim() || '';
                    if (text.length >= 10 && text.length <= 280) {
                        const range = selection!.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        setSelectedQuote(text);
                        setQuoteTooltipPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 44 });
                    } else {
                        setQuoteTooltipPos(null);
                    }
                }}
            >
                <div className="reader-chapter-intro">
                    <span>Chapter {String(currentChapterIndex + 1).padStart(2, '0')}</span>
                    <h1>{chapter.title}</h1>
                    <div className="reader-chapter-meta"><span>{readingMinutes} min read</span><i /><span>{wordCount.toLocaleString()} words</span><i /><span>{Math.round(scrollProgress)}% complete</span></div>
                </div>
                <div
                    ref={moodContentRef}
                    className={`ww-prose reader-copy reader-font-${readerFont}`}
                    style={{ fontSize: `${fontSize}px`, lineHeight }}
                >
                    {parse(chapter.content, parseOptions)}
                </div>

                {/* A calm chapter ending: react, continue, or return to the story. */}
                <section className="reader-chapter-end">
                    <span className="reader-end-kicker">{currentChapterIndex < book.chapters.length - 1 ? 'End of chapter' : 'Story complete'}</span>
                    <h2>{currentChapterIndex < book.chapters.length - 1 ? book.chapters[currentChapterIndex + 1].title : `You finished ${book.title}`}</h2>
                    <p>{currentChapterIndex < book.chapters.length - 1 ? 'Ready when you are. Your place in this chapter has been saved.' : `You reached the final page of ${book.author.name}'s story.`}</p>
                    <div className="reader-end-primary-actions">
                        {currentChapterIndex < book.chapters.length - 1 ? (
                            <button onClick={() => goToChapter(currentChapterIndex + 1)}>Read next chapter <ChevronRightIcon className="w-5 h-5" /></button>
                        ) : (
                            <button onClick={handleReturnToStory}>Return to story <ChevronRightIcon className="w-5 h-5" /></button>
                        )}
                    </div>
                    <div className="reader-end-secondary-actions">
                        <button onClick={handleToggleLike} className={chapter.isLiked ? 'active' : ''}>
                            {chapter.isLiked ? <HeartIconSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
                            <span>{chapter.isLiked ? 'Liked' : 'Like chapter'}</span><small>{chapter.likesCount}</small>
                        </button>
                        <button onClick={() => { setShareInitialTab('quick'); setIsShareModalOpen(true); }}><ShareIcon className="w-5 h-5" /><span>Share</span></button>
                        <button onClick={() => openCommentDrawer(null)}><ChatBubbleLeftIcon className="w-5 h-5" /><span>Discuss</span><small>{comments.length}</small></button>
                    </div>
                    <p className="reader-copyright">&copy; {new Date().getFullYear()} {book.author.name}. All rights reserved. Protected from unauthorized distribution and model training.</p>
                    <a href={discussLink(book.id, chapter.id, currentUser?.id === book.author.id)} className="inline-flex items-center gap-2 text-sm font-semibold text-accent mt-4 hover:underline"><ChatBubbleLeftIcon className="w-4 h-4" />Discuss in Community</a>
                </section>
            </main>

            {/* Discussion Section (Bottom) */}
            <section className="max-w-4xl mx-auto w-full px-6 py-12 border-t border-gray-200 dark:border-dark-border bg-black/5 dark:bg-white/5 rounded-t-3xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="font-sans text-2xl font-bold dark:text-dark-text-rich">
                        Chapter Discussion <span className="text-base font-normal text-gray-500">({comments.length})</span>
                    </h2>
                    <button
                        onClick={() => openCommentDrawer(null)}
                        className="bg-accent text-white font-sans font-semibold px-4 py-2 rounded-lg hover:bg-primary transition-colors text-sm"
                    >
                        Add General Comment
                    </button>
                </div>

                <div className="space-y-6">
                    {comments.filter(c => !c.parentId && c.paragraphIndex === null).length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No general comments yet.</p>
                    ) : (
                        comments.filter(c => !c.parentId).slice(0, 3).map(comment => {
                            return (
                                <div key={comment.id} className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border cursor-pointer hover:border-accent/30 transition-colors" onClick={() => openCommentDrawer(comment.paragraphIndex)}>
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={comment.user.avatarUrl}
                                            alt={comment.user.name}
                                            className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); window.location.hash = `/author/${comment.user.id}`; }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-baseline justify-between">
                                                <h4
                                                    className="font-sans font-bold text-text-rich dark:text-dark-text-rich hover:text-accent cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); window.location.hash = `/author/${comment.user.id}`; }}
                                                >
                                                    {comment.user.name}
                                                </h4>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                            </div>

                                            {comment.paragraphIndex !== null && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); scrollToParagraph(comment.paragraphIndex!); }}
                                                    className="w-full text-left mt-2 mb-3 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-3 rounded-r-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group"
                                                >
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1 flex items-center gap-2">
                                                        In response to paragraph #{comment.paragraphIndex + 1}
                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">Jump to paragraph ↗</span>
                                                    </p>
                                                </button>
                                            )}

                                            <p className="text-text-body dark:text-dark-text-body mt-2 leading-relaxed">{comment.content}</p>

                                            {comments.filter(r => r.parentId === comment.id).length > 0 && (
                                                <div className="mt-3 text-xs text-accent font-semibold flex items-center gap-1">
                                                    <ArrowUturnLeftIcon className="w-3 h-3" />
                                                    {comments.filter(r => r.parentId === comment.id).length} Replies
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {comments.filter(c => !c.parentId).length > 3 && (
                        <button onClick={() => openCommentDrawer(null)} className="w-full py-3 text-center text-accent font-sans font-semibold hover:underline">View All Discussions</button>
                    )}
                </div>
            </section>

            {/* Reader Settings Sheet */}
            <div className={`reader-settings-backdrop ${isSettingsPanelVisible ? 'reader-settings-backdrop-open' : ''}`} onClick={() => setIsSettingsPanelVisible(false)} />
            <section className={`reader-settings-panel ${isSettingsPanelVisible ? 'reader-settings-panel-open' : ''}`} aria-label="Reading preferences">
                <div className="reader-settings-heading">
                    <div><span>Reading preferences</span><p>Saved automatically on this device</p></div>
                    <button onClick={() => setIsSettingsPanelVisible(false)} aria-label="Close preferences"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="reader-setting-grid">
                    <div className="reader-setting-group">
                        <label>Theme</label>
                        <div className="reader-theme-options">
                            <button onClick={() => setContentTheme('light')} className={contentTheme === 'light' ? 'active' : ''}><i className="reader-swatch-light" /><span>Paper</span></button>
                            <button onClick={() => setContentTheme('sepia')} className={contentTheme === 'sepia' ? 'active' : ''}><i className="reader-swatch-sepia" /><span>Sepia</span></button>
                            <button onClick={() => setContentTheme('dark')} className={contentTheme === 'dark' ? 'active' : ''}><i className="reader-swatch-dark" /><span>Night</span></button>
                        </div>
                    </div>
                    <div className="reader-setting-group">
                        <label>Type size</label>
                        <div className="reader-stepper"><button onClick={() => setFontSize(size => Math.max(12, size - 1))}>A−</button><strong>{fontSize}px</strong><button onClick={() => setFontSize(size => Math.min(32, size + 1))}>A+</button></div>
                    </div>
                    <div className="reader-setting-group">
                        <label>Typeface</label>
                        <div className="reader-segmented"><button onClick={() => setReaderFont('literary')} className={readerFont === 'literary' ? 'active' : ''}>Literary</button><button onClick={() => setReaderFont('modern')} className={readerFont === 'modern' ? 'active' : ''}>Modern</button></div>
                    </div>
                    <div className="reader-setting-group">
                        <label>Page width</label>
                        <div className="reader-segmented reader-width-options"><button onClick={() => setReaderWidth('narrow')} className={readerWidth === 'narrow' ? 'active' : ''}>Narrow</button><button onClick={() => setReaderWidth('standard')} className={readerWidth === 'standard' ? 'active' : ''}>Standard</button><button onClick={() => setReaderWidth('wide')} className={readerWidth === 'wide' ? 'active' : ''}>Wide</button></div>
                    </div>
                    <div className="reader-setting-group reader-setting-group-wide">
                        <label>Line spacing</label>
                        <div className="reader-segmented"><button onClick={() => setLineHeight(1.65)} className={lineHeight === 1.65 ? 'active' : ''}>Compact</button><button onClick={() => setLineHeight(1.85)} className={lineHeight === 1.85 ? 'active' : ''}>Comfortable</button><button onClick={() => setLineHeight(2.05)} className={lineHeight === 2.05 ? 'active' : ''}>Airy</button></div>
                    </div>
                </div>
                <div className="reader-shortcuts"><span><kbd>F</kbd> Focus</span><span><kbd>[</kbd><kbd>]</kbd> Text size</span><span><kbd>Esc</kbd> Close panels</span></div>
            </section>

            {/* Unified Reader Dock */}
            <nav className={`reader-dock ${isToolbarVisible ? 'reader-dock-visible' : 'reader-dock-hidden'}`} aria-label="Reader controls">
                <button onClick={() => setIsTocVisible(true)} data-label="Contents"><Bars3Icon className="w-5 h-5" /></button>
                <span className="reader-dock-divider" />
                <button onClick={() => goToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex === 0} data-label="Previous"><ChevronLeftIcon className="w-5 h-5" /></button>
                <span className="reader-dock-progress"><strong>{currentChapterIndex + 1}</strong><i><span style={{ width: `${scrollProgress}%` }} /></i><small>{book.chapters.length}</small></span>
                <button onClick={() => goToChapter(currentChapterIndex + 1)} disabled={currentChapterIndex === book.chapters.length - 1} data-label="Next"><ChevronRightIcon className="w-5 h-5" /></button>
                <span className="reader-dock-divider" />
                <button onClick={() => setIsSettingsPanelVisible(true)} className={isSettingsPanelVisible ? 'active' : ''} data-label="Appearance"><span className="reader-aa">Aa</span></button>
                <button onClick={() => openCommentDrawer(null)} data-label="Discuss"><ChatBubbleLeftIcon className="w-5 h-5" /></button>
                <button onClick={() => setIsFocusMode(true)} data-label="Focus"><EyeIcon className="w-5 h-5" /></button>
            </nav>

            <CommentDrawer
                isOpen={isCommentDrawerOpen}
                onClose={() => setIsCommentDrawerOpen(false)}
                comments={activeParagraphIndex !== null ? paragraphComments(activeParagraphIndex) : comments.filter(c => c.paragraphIndex === null)}
                paragraphIndex={activeParagraphIndex}
                paragraphText={activeParagraphIndex !== null && chapter.content ? 'Paragraph ' + (activeParagraphIndex + 1) : undefined}
                onAddComment={handleAddComment}
                onReportComment={(comment) => currentUser ? setReportTarget({ type: 'COMMENT', id: comment.id, title: `Comment by ${comment.user.name}` }) : window.location.hash = '/auth'}
            />

            <CharacterPreview
                character={viewingCharacter}
                isOpen={!!viewingCharacter}
                onClose={() => setViewingCharacter(null)}
            />

            <ShareModal 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
                book={book} 
                chapter={chapter}
                initialTab={shareInitialTab}
                quoteText={selectedQuote || undefined}
            />
            <ChapterDisclaimerModal
                isOpen={isDisclaimerOpen}
                storyTitle={book.title}
                chapterTitle={chapter.title}
                rating={book.ageRating}
                warnings={[...(book.contentWarnings || []), ...(chapter.contentWarnings || [])].filter((warning, index, all) => all.indexOf(warning) === index)}
                note={chapter.disclaimerNote || book.customDisclaimer}
                onContinue={() => { sessionStorage.setItem(disclaimerKey, 'accepted'); setIsDisclaimerOpen(false); }}
                onLeave={handleReturnToStory}
            />
            {reportTarget && <ReportModal isOpen onClose={() => setReportTarget(null)} targetType={reportTarget.type} targetId={reportTarget.id} targetTitle={reportTarget.title} />}

            {/* Floating Quote Share Tooltip */}
            {quoteTooltipPos && selectedQuote && (
                <button
                    style={{ position: 'absolute', left: quoteTooltipPos.x, top: quoteTooltipPos.y, transform: 'translateX(-50%)' }}
                    className="z-50 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-primary transition-colors whitespace-nowrap"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShareInitialTab('quote');
                        setIsShareModalOpen(true);
                        setQuoteTooltipPos(null);
                    }}
                >
                    Share as Quote
                </button>
            )}
        </div>
    );
};
