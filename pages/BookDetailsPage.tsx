
import React, { useState, useMemo, useEffect } from 'react';
import type { Book, User, Shelf, LibraryBook, BookProgress, Review } from '../types';
import { discussLink } from '../utils/community';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { ArrowLeftIcon, BookmarkIcon, BookmarkIconSolid, CheckCircleIcon, LockClosedIcon, StarIcon, PlusIcon, PencilIcon, TrashIcon, ArrowUturnLeftIcon, ChatBubbleLeftIcon, EyeIcon, HeartIcon, HeartIconSolid, XMarkIcon, ShareIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { CharacterList } from '../components/CharacterList';
import { AIBadge } from '../components/AIBadge';
import { ShareModal } from '../components/ShareModal';
import AdUnit from '../components/AdUnit';
import { FeatureSparkle } from '../components/FeatureSparkle';
import { AgeRatingBadge } from '../components/AgeRatingBadge';
import { warningLabel } from '../components/ChapterDisclaimerModal';
import { ReportModal } from '../components/ReportModal';
import { goBackOrReplace, openReaderFromStory } from '../utils/navigation';
import { applyBookMetadata } from '../utils/entityMetadata';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResilientImage } from '../components/ResilientImage';
import { completedChapterCount, isReadingFinished, resumeChapterIndex } from '../utils/readingJourney';
import '../styles/reader-v2.css';
import { useDialog } from '../hooks/useDialog';
import { ReturnNavigation } from '../components/ReturnNavigation';


const ChapterItem: React.FC<{ bookId: string; chapter: Book['chapters'][0]; index: number; onRead: () => void; progress: number; current?: boolean; onToggleLike: (chapterId: string) => void; isLikePending: boolean }> = ({ bookId, chapter, index, onRead, progress, current = false, onToggleLike, isLikePending }) => {
    const isCompleted = progress >= 90;
    const accessLabel = chapter.accessLabel ?? 'FULL';
    const actionLabel = chapter.status !== 'published' ? 'Not released' : accessLabel === 'PREVIEW' ? 'Preview' : accessLabel === 'SIGN_IN' ? 'Sign in to read' : isCompleted ? 'Finished' : current ? 'Continue' : index === 0 ? 'Start here' : 'Unread';
    return (
        <article className={`ww-chapter-timeline-row ${isCompleted ? 'is-finished' : ''} ${current ? 'is-current' : ''} ${chapter.status !== 'published' ? 'is-unreleased' : ''}`}>
            <span className="ww-chapter-timeline-marker" aria-hidden="true">{isCompleted ? '✓' : current ? '•' : index + 1}</span>
            <div className="ww-chapter-timeline-content">
                <div className="ww-chapter-timeline-meta"><span>Chapter {String(index + 1).padStart(2, '0')}</span><span>{actionLabel}</span></div>
                <h4>{chapter.status === 'published' ? <a href={`/book/${encodeURIComponent(bookId)}/chapter/${encodeURIComponent(chapter.id)}`} aria-label={`${chapter.title} — ${actionLabel}`} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onRead(); } }}>{chapter.title}</a> : chapter.title}</h4>
                <div className="ww-chapter-timeline-stats">
                    <button type="button" onClick={() => onToggleLike(chapter.id)} disabled={isLikePending} aria-busy={isLikePending} aria-label={`${chapter.isLiked ? 'Unlike' : 'Like'} ${chapter.title}`} aria-pressed={chapter.isLiked} className={chapter.isLiked ? 'is-liked' : ''}>{chapter.isLiked ? <HeartIconSolid className="w-3.5 h-3.5" /> : <HeartIcon className="w-3.5 h-3.5" />}{chapter.likesCount.toLocaleString()}</button>
                    <span><EyeIcon className="w-3.5 h-3.5" />{chapter.viewCount.toLocaleString()}</span>
                    <span><ChatBubbleLeftIcon className="w-3.5 h-3.5" />{chapter.commentCount.toLocaleString()}</span>
                    {!!chapter.wordCount && <span>· {Math.max(1, Math.ceil(chapter.wordCount / 230))} min</span>}
                </div>
                {progress > 0 && !isCompleted && <div className="ww-chapter-timeline-progress" role="progressbar" aria-label="Chapter reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, progress))}><span style={{ width: `${Math.min(100, progress)}%` }} /></div>}
            </div>
            {chapter.status !== 'published' || accessLabel === 'SIGN_IN' ? <LockClosedIcon className="ww-chapter-access-icon w-4 h-4" /> : null}
        </article>
    );
};

const StarRatingInput: React.FC<{ rating: number; setRating: (r: number) => void; hoverRating: number; setHoverRating: (r: number) => void; }> = ({ rating, setRating, hoverRating, setHoverRating }) => {
    return (
        <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
            {[...Array(5)].map((_, i) => {
                const starValue = i + 1;
                return (
                    <button
                        type="button"
                        key={starValue}
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        className="ww-review-star-button"
                        aria-label={`Rate ${starValue} out of 5 stars`}
                        aria-pressed={rating === starValue}
                    >
                        <StarIcon className={`w-6 h-6 transition-colors ${starValue <= (hoverRating || rating) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />
                    </button>
                );
            })}
        </div>
    );
};

const ReviewItem: React.FC<{ review: Review, currentUser: User | null, onReply: (reviewId: string, content: string) => Promise<void> }> = ({ review, currentUser, onReply }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [areRepliesExpanded, setAreRepliesExpanded] = useState(false);

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        await onReply(review.id, replyContent);
        setReplyContent('');
        setIsReplying(false);
        setAreRepliesExpanded(true);
    };

    return (
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-2xl border border-gray-200/80 dark:border-dark-border">
            <div className="flex items-start gap-4">
                <img
                    src={review.user.avatarUrl}
                    alt={review.user.name}
                    className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.location.hash = `/author/${review.user.id}`}
                />
                <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                        <h4
                            className="font-sans font-semibold text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent transition-colors"
                            onClick={() => window.location.hash = `/author/${review.user.id}`}
                        >
                            {review.user.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                            Posted on {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />)}
                    </div>
                    <p className="text-text-body dark:text-dark-text-body whitespace-pre-wrap">{review.comment}</p>

                    <div className="flex items-center gap-4 mt-4">
                        {currentUser && (
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="text-sm font-semibold text-gray-500 hover:text-accent dark:text-gray-400 dark:hover:text-accent flex items-center gap-1 transition-colors"
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" /> Reply
                            </button>
                        )}

                        {review.replies && review.replies.length > 0 && (
                            <button
                                onClick={() => setAreRepliesExpanded(!areRepliesExpanded)}
                                className="text-sm font-semibold text-accent hover:underline transition-colors"
                            >
                                {areRepliesExpanded ? 'Hide Replies' : `View ${review.replies.length} Replies`}
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <form onSubmit={handleSubmitReply} className="mt-4 animate-slide-in-bottom">
                            <div className="flex gap-3">
                                <img src={currentUser!.avatarUrl} alt={currentUser!.name} className="w-8 h-8 rounded-full hidden sm:block" />
                                <div className="flex-1">
                                    <textarea
                                        value={replyContent}
                                        onChange={e => setReplyContent(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-text-body focus:ring-2 focus:ring-accent text-sm resize-none"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button type="button" onClick={() => setIsReplying(false)} className="px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-lg">Cancel</button>
                                        <button type="submit" disabled={!replyContent.trim()} className="px-3 py-1.5 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-primary disabled:opacity-50">Post Reply</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {areRepliesExpanded && review.replies && (
                        <div className="mt-4 space-y-4 pl-4 sm:pl-8 border-l-2 border-gray-100 dark:border-dark-border/50">
                            {review.replies.map(reply => (
                                <div key={reply.id} className="bg-gray-50 dark:bg-dark-surface-alt p-4 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <img
                                            src={reply.user.avatarUrl}
                                            alt={reply.user.name}
                                            className="w-6 h-6 rounded-full cursor-pointer hover:opacity-80"
                                            onClick={() => window.location.hash = `/author/${reply.user.id}`}
                                        />
                                        <span
                                            className="font-sans font-bold text-xs text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent"
                                            onClick={() => window.location.hash = `/author/${reply.user.id}`}
                                        >
                                            {reply.user.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(reply.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-text-body dark:text-dark-text-body">{reply.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

interface BookDetailsPageProps {
    bookId: string;
    currentUser: User | null;
    onUserUpdate: (user: User) => void;
}

export const BookDetailsPage: React.FC<BookDetailsPageProps> = ({ bookId, currentUser, onUserUpdate }) => {
    const { triggerFeedback } = useFeedback();
    const { trackEvent } = useAnalytics();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    // Library and profile mutations replace the user object. Only changes to
    // the viewer's access should reload the story's account-specific data.
    const bookAccessKey = JSON.stringify([bookId, currentUser?.id ?? null, currentUser?.dateOfBirth ?? null, currentUser?.allowMatureContent ?? false]);
    const [loadedBookAccessKey, setLoadedBookAccessKey] = useState<string | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);

    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [readingProgress, setReadingProgress] = useState<BookProgress | null>(null);

    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState('');
    const [reviewsAttempt, setReviewsAttempt] = useState(0);
    const [activeTab, setActiveTab] = useState<'Chapters' | 'Characters' | 'Reviews'>('Chapters');
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [userComment, setUserComment] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [isReviewComposeOpen, setIsReviewComposeOpen] = useState(false);
    // Share nudge state
    const [showLibraryNudge, setShowLibraryNudge] = useState(false);
    const [showReviewShareNudge, setShowReviewShareNudge] = useState(false);

    const currentUserReview = useMemo(() => {
        if (!currentUser) return null;
        return allReviews.find(r => r.userId === currentUser.id);
    }, [allReviews, currentUser]);

    // Manage Shelves State
    const [isManageShelvesModalOpen, setIsManageShelvesModalOpen] = useState(false);
    const [selectedShelfIds, setSelectedShelfIds] = useState<Set<string>>(new Set());
    const [isSavingShelves, setIsSavingShelves] = useState(false);
    const [shelfQuery, setShelfQuery] = useState('');
    const [shelfSort, setShelfSort] = useState<'name'|'recent'>('name');
    const [newShelfName, setNewShelfName] = useState('');
    const [newShelfVisibility, setNewShelfVisibility] = useState<'PRIVATE'|'PUBLIC'>('PRIVATE');
    const [shelfError, setShelfError] = useState('');
    const [shelfStatus, setShelfStatus] = useState('');
    const customShelves = (currentUser?.library ?? []).filter(shelf => !['all','reading','toread','completed','1'].includes(shelf.id) && shelf.name !== 'My List');
    const pickerShelves = customShelves.filter(shelf => shelf.name.toLocaleLowerCase().includes(shelfQuery.trim().toLocaleLowerCase())).sort((a,b) => shelfSort === 'name' ? a.name.localeCompare(b.name) : 0);
    const createShelfInline = async () => {
        if (!currentUser || !newShelfName.trim() || isSavingShelves) return;
        setIsSavingShelves(true); setShelfError('');
        try {
            const updated = await api.createShelf(currentUser.id, newShelfName.trim(), newShelfVisibility);
            const created = updated.library.find(shelf => !currentUser.library.some(existing => existing.id === shelf.id));
            onUserUpdate(updated);
            if (created) setSelectedShelfIds(ids => new Set(ids).add(created.id));
            setNewShelfName(''); setNewShelfVisibility('PRIVATE'); setShelfStatus('Shelf created and selected. Save changes to organize this story.');
        } catch { setShelfError('The shelf could not be created. Your name and selections are still here.'); }
        finally { setIsSavingShelves(false); }
    };
    const [confirmation, setConfirmation] = useState<'library' | 'review' | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingChapterLikes, setPendingChapterLikes] = useState<Set<string>>(new Set());
    const reviewDialogRef = useDialog(isReviewComposeOpen, () => setIsReviewComposeOpen(false), pendingAction !== 'save-review');
    const shelvesDialogRef = useDialog(isManageShelvesModalOpen, () => setIsManageShelvesModalOpen(false), !isSavingShelves);

    const openManageShelvesModal = () => {
        if (!currentUser) return;
        const currentCustomShelfIds = new Set<string>();
        currentUser.library.forEach(shelf => {
            if (shelf.id !== 'all' && shelf.id !== 'reading' && shelf.id !== 'toread' && shelf.id !== 'completed' && shelf.id !== '1' && shelf.name !== 'My List') {
                if (shelf.books.some(b => b.id === bookId)) {
                    currentCustomShelfIds.add(shelf.id);
                }
            }
        });
        setSelectedShelfIds(currentCustomShelfIds);
        setIsManageShelvesModalOpen(true);
    };

    const handleSaveShelves = async () => {
        if (!currentUser) return;
        setIsSavingShelves(true);
        try {
            setShelfError('');
            const updatedUser = await api.updateBookShelves(currentUser.id, bookId, Array.from(selectedShelfIds));
            onUserUpdate(updatedUser);
            setIsManageShelvesModalOpen(false);
            setShelfStatus('Shelves saved online.');
        } catch (e) {
            setShelfError('Your shelf choices could not be saved. Your selections are still here; try again.');
        } finally {
            setIsSavingShelves(false);
        }
    };

    const handleRemoveFromLibrary = async () => {
        if (!currentUser || !book) return;
        setPendingAction('remove-library');
        setActionError(null);
        try {
            const updatedUser = await api.removeBookFromLibrary(currentUser.id, book.id);
            onUserUpdate(updatedUser);
            setIsManageShelvesModalOpen(false);
            setConfirmation(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'The story could not be removed from your library.');
        } finally {
            setPendingAction(null);
        }
    };


    useEffect(() => {
        let active = true;
        setBook(null);
        setAuthorBooks([]);
        setIsLoading(true);
        setLoadError(null);
        api.getBookById(bookId).then(fetchedBook => {
            if (!active) return;
            setBook(fetchedBook);
            setLoadedBookAccessKey(bookAccessKey);
            if (fetchedBook) {
                trackEvent('content', 'book_view', fetchedBook.title, undefined, { bookId, authorId: fetchedBook.author.id, genre: fetchedBook.genres[0] });
                api.getBooksByAuthor(fetchedBook.author.id, fetchedBook.id).then(result => { if (active) setAuthorBooks(result); }).catch(() => {});
            }
            setIsLoading(false);
        }).catch((error) => { if (active) { setBook(null); setLoadedBookAccessKey(bookAccessKey); setLoadError(error instanceof Error ? error.message : 'This story could not be loaded.'); setIsLoading(false); } });
        return () => { active = false; };
    }, [bookAccessKey, loadAttempt]);

    useEffect(() => {
        let active = true;
        setAllReviews([]);
        setReviewsLoading(true);
        setReviewsError('');
        api.getBookReviews(bookId).then(result => { if (active) setAllReviews(result); })
            .catch(error => { if (active) setReviewsError(error instanceof Error ? error.message : 'Reviews could not be loaded.'); })
            .finally(() => { if (active) setReviewsLoading(false); });
        return () => { active = false; };
    }, [bookId, loadAttempt, reviewsAttempt]);

    useEffect(() => {
        let active = true;
        setReadingProgress(null);
        if (currentUser) {
            api.getReadingProgressForBook(currentUser.id, bookId).then(result => { if (active) setReadingProgress(result); }).catch(() => {});
        }
        return () => { active = false; };
    }, [currentUser?.id, bookId, loadAttempt]);

    useEffect(() => book ? applyBookMetadata(book) : undefined, [book]);

    useEffect(() => {
        if (!currentUser) return;
        let active = true;
        const refresh = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.userId === currentUser.id && detail?.bookId === bookId) {
                if (active) setReadingProgress(detail.progress);
            }
        };
        window.addEventListener(api.READING_PROGRESS_UPDATED_EVENT, refresh);
        return () => { active = false; window.removeEventListener(api.READING_PROGRESS_UPDATED_EVENT, refresh); };
    }, [currentUser?.id, bookId]);

    useEffect(() => {
        if (currentUserReview) {
            setUserRating(currentUserReview.rating);
            setUserComment(currentUserReview.comment);
            setIsEditingReview(false);
        } else {
            setUserRating(0);
            setUserComment('');
        }
    }, [currentUserReview]);

    const [optimisticInLibrary, setOptimisticInLibrary] = useState<boolean | null>(null);

    const isBookInLibrary = useMemo(() => {
        if (optimisticInLibrary !== null) return optimisticInLibrary;
        if (!currentUser) return false;
        return currentUser.library.some(shelf => shelf.books.some(b => b.id === bookId));
    }, [currentUser, bookId, optimisticInLibrary]);

    const hasCustomShelves = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.library.some(s => s.id !== 'all' && s.id !== 'reading' && s.id !== 'toread' && s.id !== 'completed' && s.id !== '1' && s.name !== 'My List');
    }, [currentUser]);

    const handleBack = () => {
        goBackOrReplace('/category');
    };

    const handleToggleLibrary = async () => {
        if (!currentUser || !book) {
            window.location.hash = '/auth';
            return;
        }

        if (pendingAction === 'toggle-library') return;
        const nextState = !isBookInLibrary;
        setOptimisticInLibrary(nextState);
        setPendingAction('toggle-library');
        setActionError(null);

        try {
            const updatedUser = await api.toggleBookInLibrary(currentUser.id, book);
            onUserUpdate(updatedUser);
            setOptimisticInLibrary(null);
            triggerFeedback('FIRST_EXPERIENCE');
            // R5: Show share nudge when adding (not removing)
            if (nextState) {
                setShowLibraryNudge(true);
                setTimeout(() => setShowLibraryNudge(false), 6000);
            }
        } catch (err) {
            setOptimisticInLibrary(null);
            setActionError(err instanceof Error ? err.message : 'Your library could not be updated.');
        } finally {
            setPendingAction(null);
        }
    };

    const handleAuthorClick = () => {
        if (!book) return;
        window.location.hash = `/author/${book.author.id}`;
    };

    const handleReadClick = () => {
        if (!book) return;
        const startChapter = resumeChapterIndex(book.chapters, readingProgress);
        if (startChapter === null) return;
        trackEvent('reading', 'start_reading', book.title, undefined, { bookId: book.id, chapterIndex: startChapter });
        openReaderFromStory(book.id, startChapter, book.chapters[startChapter]?.id);
    };

    const handleReadChapterClick = (chapterIndex: number) => {
        if (!book) return;
        openReaderFromStory(book.id, chapterIndex, book.chapters[chapterIndex]?.id);
    }

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || userRating === 0 || !userComment.trim() || pendingAction) return;
        setPendingAction('save-review');
        setActionError(null);
        try {
            const updatedReviews = await api.submitReview(currentUser.id, bookId, userRating, userComment.trim());
            trackEvent('social', 'write_review', book?.title, userRating, { bookId, reviewLength: userComment.trim().length });
            setAllReviews(updatedReviews);
            setIsEditingReview(false);
            setIsReviewComposeOpen(false);
            setShowReviewShareNudge(true);
            setTimeout(() => setShowReviewShareNudge(false), 10000);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Your review could not be saved.');
        } finally {
            setPendingAction(null);
        }
    };

    const handleDeleteReview = async () => {
        if (!currentUser || !currentUserReview || pendingAction) return;
        setPendingAction('delete-review');
        setActionError(null);
        try {
            const updatedReviews = await api.deleteReview(currentUser.id, bookId);
            setAllReviews(updatedReviews);
            setUserRating(0);
            setUserComment('');
            setConfirmation(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Your review could not be deleted.');
        } finally {
            setPendingAction(null);
        }
    };

    const handleReplyToReview = async (reviewId: string, content: string) => {
        if (!currentUser) return;
        const updatedReviews = await api.replyToReview(currentUser.id, bookId, reviewId, content);
        setAllReviews(updatedReviews);
    };

    const handleToggleChapterLike = async (chapterId: string) => {
        if (!currentUser || !book) {
            window.location.hash = '/auth';
            return;
        }

        if (pendingChapterLikes.has(chapterId)) return;
        const chapterIndex = book.chapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;

        const chapter = book.chapters[chapterIndex];
        const prevIsLiked = chapter.isLiked;
        const prevCount = chapter.likesCount;

        const newChapters = [...book.chapters];
        newChapters[chapterIndex] = {
            ...chapter,
            isLiked: !prevIsLiked,
            likesCount: prevIsLiked ? prevCount - 1 : prevCount + 1
        };

        // Update book level likes count locally
        const bookLikesAdjustment = prevIsLiked ? -1 : 1;
        const previousBook = book;
        setPendingChapterLikes(previous => new Set(previous).add(chapterId));
        setActionError(null);
        setBook({
            ...book,
            chapters: newChapters,
            likesCount: book.likesCount + bookLikesAdjustment
        });

        try {
            const updatedBook = await api.toggleChapterLike(book.id, chapterId);
            setBook(updatedBook);
        } catch (e) {
            // Revert on error
            console.error("Failed to like chapter", e);
            setBook(previousBook);
            setActionError(e instanceof Error ? e.message : 'The chapter like could not be updated.');
        } finally {
            setPendingChapterLikes(previous => {
                const next = new Set(previous);
                next.delete(chapterId);
                return next;
            });
        }
    };

    if (isLoading || loadedBookAccessKey !== bookAccessKey) {
        return <div className="min-h-screen flex items-center justify-center" role="status">Loading story details…</div>;
    }

    if (loadError) {
        return <section className="v2-load-state ww-error-recovery" role="alert"><ReturnNavigation fallbackPath="/category" fallbackLabel="Back to stories" /><h1>This story couldn’t be loaded.</h1><p>{loadError}</p><div className="v2-hero-actions"><button onClick={() => setLoadAttempt(value => value + 1)} className="v2-button">Try again</button><a href="/category" className="v2-button secondary">Browse stories</a></div></section>;
    }

    if (!book) {
        return <section className="v2-load-state ww-error-recovery"><ReturnNavigation fallbackPath="/category" fallbackLabel="Back to stories" /><h1>This story is unavailable</h1><p>It may have been removed or made private. Your other stories are still waiting for you.</p><div className="v2-hero-actions"><a href="/category" className="v2-button">Browse stories</a><button className="v2-button secondary" onClick={() => setLoadAttempt(value => value + 1)}>Check again</button></div></section>;
    }

    const hasStartedReading = Boolean(
        readingProgress
        && book.chapters.some(chapter => (readingProgress.chapters?.[chapter.id]?.progress ?? 0) > 0),
    );
    const isFinished = isReadingFinished(book.chapters, readingProgress);
    const resumeIndex = resumeChapterIndex(book.chapters, readingProgress);
    const mainButtonText = resumeIndex === null ? 'Chapters coming soon' : isFinished ? 'Read again' : hasStartedReading ? 'Continue reading' : 'Read from beginning';
    const storySummary = book.description?.trim() || book.summary;

    return (
        <div className="ww-story-page ww-story-v2">
            {actionError && <div role="alert" className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-danger/30 bg-white px-4 py-3 text-sm text-danger shadow-xl dark:bg-dark-surface">{actionError}</div>}
            {/* Sticky Header */}
            <div className="ww-story-header sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                <div className="ww-story-header-inner container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <button onClick={handleBack} className="ww-story-back flex items-center gap-2 text-sm font-sans font-medium hover:text-accent transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" /> Back
                    </button>
                    <div className="flex-1 min-w-0 text-center px-4 flex items-center justify-center">
                        <h2 className="ww-story-header-title font-sans font-bold text-lg line-clamp-2 leading-tight dark:text-dark-text-rich">{book.title}</h2>
                    </div>
                    <div className="ww-story-header-actions flex items-center gap-4">
                        {currentUser?.id !== book.author.id && <button aria-label="Report this book" onClick={() => currentUser ? setIsReportModalOpen(true) : window.location.hash = '/auth'} className="ww-story-report text-xs font-semibold text-gray-500 hover:text-danger">Report</button>}
                        <button className="ww-story-header-icon" aria-label="Share this book" onClick={() => setIsShareModalOpen(true)}>
                            <ShareIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 hover:text-accent dark:hover:text-accent transition-colors" />
                        </button>
                        <button className="ww-story-header-icon disabled:cursor-wait disabled:opacity-60" disabled={pendingAction === 'toggle-library'} aria-label={isBookInLibrary ? 'Remove bookmark' : 'Bookmark this book'} aria-pressed={isBookInLibrary} onClick={handleToggleLibrary}>
                            {isBookInLibrary ? (
                                <BookmarkIconSolid className="w-6 h-6 text-accent transition-colors" />
                            ) : (
                                <BookmarkIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 hover:text-accent dark:hover:text-accent transition-colors" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-12">
                <nav className="ww-story-breadcrumb" aria-label="Breadcrumb"><a href="/category">Read</a><span>›</span>{book.genres[0] && <><a href={`/genre/${encodeURIComponent(book.genres[0])}`}>{book.genres[0]}</a><span>›</span></>}<span>{book.title}</span></nav>
                <section className="ww-story-hero-v2">
                    <div className="ww-story-art-column">
                        <ResilientImage src={book.coverUrl} alt={book.title} fallbackLabel={book.title} variant="cover" className="ww-story-art" />
                        <div className="ww-story-art-caption"><span className="ww-page-eyebrow">The story at a glance</span></div>
                        <div className="ww-story-genre-tags"><AgeRatingBadge rating={book.ageRating} />{book.isAIGenerated && <AIBadge />}{book.genres.map(genre => <a key={genre} href={`/genre/${encodeURIComponent(genre)}`}>{genre}</a>)}<span>{book.readingStatus}</span></div>
                    </div>
                    <div className="ww-story-copy-column">
                        <span className="ww-page-eyebrow">A WordWeft story</span>
                        <h1>{book.title}</h1>
                        <a className="ww-story-author-v2" href={`/author/${encodeURIComponent(book.author.id)}`}><ResilientImage src={book.author.avatarUrl} alt="" fallbackLabel={book.author.name} className="w-11 h-11 rounded-full" /><span><strong>{book.author.name}</strong><small>Writer</small></span></a>
                        <div className="ww-story-actions-v2"><button className={`ww-story-read-action ${hasStartedReading ? 'is-resume' : ''}`} onClick={handleReadClick} disabled={resumeIndex === null}>{mainButtonText}<ArrowLeftIcon className="w-4 h-4 rotate-180" /></button><button className="ww-story-save-action" onClick={handleToggleLibrary} disabled={pendingAction === 'toggle-library'} aria-pressed={isBookInLibrary}>{pendingAction === 'toggle-library' ? 'Updating…' : isBookInLibrary ? 'In your library' : 'Add to library'}{isBookInLibrary ? <CheckCircleIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}</button><button className="ww-story-share-action" onClick={() => setIsShareModalOpen(true)}>Share<ShareIcon className="w-4 h-4" /></button>{isBookInLibrary && <button className="ww-story-share-action" onClick={openManageShelvesModal}>Organize shelves</button>}</div>
                        {shelfStatus && !isManageShelvesModalOpen && <p role="status" className="ww-shelf-status">{shelfStatus}</p>}
                        <div className={`ww-story-summary ${isSummaryExpanded ? 'is-expanded' : ''}`}><p>{storySummary}</p>{storySummary.length > 240 && <button type="button" aria-expanded={isSummaryExpanded} onClick={() => setIsSummaryExpanded(value => !value)}>{isSummaryExpanded ? 'Show less' : 'Read full synopsis'}</button>}</div>
                        {book.tags?.filter(tag => !book.genres.includes(tag)).length > 0 && <div className="ww-story-tag-list">{book.tags.filter(tag => !book.genres.includes(tag)).map(tag => <a key={tag} href={`/tag/${encodeURIComponent(tag)}`}>#{tag}</a>)}</div>}
                        {hasStartedReading && <div className="ww-saved-reading-progress"><div><span>Your reading progress</span><strong>{Math.round(readingProgress.overallProgress)}%</strong></div><div className="ww-reading-progress-track"><span style={{ width: `${Math.min(100, readingProgress.overallProgress)}%` }} /></div><p>{completedChapterCount(book.chapters, readingProgress)} {completedChapterCount(book.chapters, readingProgress) === 1 ? 'chapter' : 'chapters'} finished{isFinished ? ' · All released chapters read' : resumeIndex !== null ? ` · Continue with chapter ${resumeIndex + 1}` : ''}{readingProgress.pendingSync ? ' · Sync pending on this device' : ''}</p></div>}

                        <dl className="ww-story-stats-v2"><div><dt>Reader rating</dt><dd><StarIcon className="w-4 h-4" />{book.rating.toFixed(1)}<small>{book.reviewsCount.toLocaleString()} {book.reviewsCount === 1 ? 'review' : 'reviews'}</small></dd></div><div><dt>Reads</dt><dd>{book.viewCount.toLocaleString()}</dd></div><div><dt>Likes</dt><dd>{book.likesCount.toLocaleString()}</dd></div><div><dt>Comments</dt><dd>{book.commentCount.toLocaleString()}</dd></div></dl>
                        <p className="ww-story-publication-meta">{book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'} · {book.readingStatus}</p>
                        {book.nextScheduledReleaseAt && <div className="ww-next-release"><span>Next chapter</span><strong>{new Date(book.nextScheduledReleaseAt).toLocaleString()}</strong><small>Scheduled by {book.author.name}</small></div>}
                        {(book.contentWarnings?.length > 0 || book.customDisclaimer) && <div className="book-content-guidance"><strong>Content guidance</strong>{book.contentWarnings?.length > 0 && <div className="content-warning-list">{book.contentWarnings.map(warning => <span key={warning}>{warningLabel(warning)}</span>)}</div>}{book.customDisclaimer && <p>{book.customDisclaimer}</p>}</div>}
                        <a href={discussLink(book.id, null, currentUser?.id === book.author.id)} className="ww-story-community-link"><ChatBubbleLeftIcon className="w-4 h-4" />Discuss in Community</a>
                        {showLibraryNudge && <div className="ww-library-saved-nudge"><span>Saved to your library. Share this story?</span><button onClick={() => { setShowLibraryNudge(false); setIsShareModalOpen(true); }}>Share</button></div>}
                    </div>
                    <aside className="ww-story-contents-rail" aria-label="Table of contents"><span className="ww-page-eyebrow">Table of contents</span><h2>{book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'}</h2><p>Read in chapter order</p><div className="ww-story-contents-scroll">{book.chapters.slice(0, 8).map((chapter, index) => <ChapterItem key={chapter.id} bookId={book.id} chapter={chapter} index={index} progress={readingProgress?.chapters?.[chapter.id]?.progress || 0} current={hasStartedReading && !isFinished && resumeIndex === index} onRead={() => handleReadChapterClick(index)} onToggleLike={handleToggleChapterLike} isLikePending={pendingChapterLikes.has(chapter.id)} />)}</div><button className="ww-story-view-contents" onClick={() => { setActiveTab('Chapters'); requestAnimationFrame(() => document.getElementById('story-guide-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>View all chapters<ArrowLeftIcon className="w-4 h-4 rotate-180" /></button></aside>
                </section>

                {/* Tab Navigation */}
                <div id="story-guide-tabs" className="ww-story-tabs flex border-b border-gray-200 dark:border-dark-border mb-8 max-w-4xl mx-auto">
                    {(['Chapters', 'Characters', 'Reviews'] as const).map((tab) => {
                        const btn = (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                aria-pressed={activeTab === tab}
                                className={`px-6 py-3 font-sans font-medium text-sm transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'
                                    }`}
                            >
                                {tab}
                            </button>
                        );
                        if (tab === 'Characters') {
                            return (
                                <FeatureSparkle key={tab} featureId="character-tab" tooltip="Meet the characters in this story" position="bottom" delay={3000}>
                                    {btn}
                                </FeatureSparkle>
                            );
                        }
                        return btn;
                    })}
                </div>

                <div className="ww-story-tab-content max-w-4xl mx-auto mb-16 min-h-[400px]">
                    {activeTab === 'Chapters' && (
                        <section className="animate-fade-in">
                            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Chapters</h3>
                            <div className="ww-story-full-contents">
                                {book.chapters.map((chapter, i) => {
                                    const chapterProgress = readingProgress?.chapters?.[chapter.id]?.progress || 0;
                                    return (
                                        <ChapterItem
                                            bookId={book.id}
                                            key={chapter.id}
                                            chapter={chapter}
                                            index={i}
                                            progress={chapterProgress}
                                            current={hasStartedReading && !isFinished && resumeIndex === i}
                                            onRead={() => handleReadChapterClick(i)}
                                            onToggleLike={handleToggleChapterLike}
                                            isLikePending={pendingChapterLikes.has(chapter.id)}
                                        />
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {activeTab === 'Characters' && (
                        <section className="animate-fade-in">
                            <CharacterList bookId={bookId} readOnly={true} />
                        </section>
                    )}

                    {activeTab === 'Reviews' && (
                        <section className="animate-fade-in" aria-busy={reviewsLoading}>
                            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-6">Community Reviews</h3>
                            {reviewsLoading && <p role="status">Loading reviews…</p>}
                            {reviewsError && <div className="ww-section-retry" role="alert"><p>{reviewsError}</p><button type="button" className="v2-button secondary" onClick={() => setReviewsAttempt(value => value + 1)}>Retry reviews</button></div>}
                            {!reviewsLoading && !reviewsError && <div className="ww-story-review-entry">
                                {!currentUser ? <div><p>Sign in to share your thoughts on this story.</p><button onClick={() => window.location.hash = '/auth'}>Sign in to review</button></div> : currentUserReview ? <div><div className="ww-story-own-review-heading"><h4>Your review</h4><div><button onClick={() => { setIsEditingReview(true); setIsReviewComposeOpen(true); }} aria-label="Edit your review"><PencilIcon className="w-4 h-4" /></button><button onClick={() => setConfirmation('review')} aria-label="Delete your review"><TrashIcon className="w-4 h-4" /></button></div></div><div className="flex items-center">{[...Array(5)].map((_, index) => <StarIcon key={index} className={`w-4 h-4 ${index < currentUserReview.rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />)}</div><p>{currentUserReview.comment}</p></div> : <div><p>What stayed with you?</p><button onClick={() => { setIsEditingReview(false); setIsReviewComposeOpen(true); }}>Write a review<PencilIcon className="w-4 h-4" /></button></div>}
                            </div>}

                            {/* Other Reviews */}
                            <div className="space-y-6">
                                {allReviews.filter(review => review.userId !== currentUser?.id).map(review => (
                                    <ReviewItem
                                        key={review.id}
                                        review={review}
                                        currentUser={currentUser}
                                        onReply={handleReplyToReview}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <AdUnit format="article" />

                {/* More from author */}
                {authorBooks.length > 0 && (
                    <section className="max-w-6xl mx-auto">
                        <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">More from {book.author.name}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {authorBooks.map(b => (
                                <BookCard key={b.id} book={b} onClick={() => window.location.hash = `/book/${b.id}`} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {isReviewComposeOpen && currentUser && <div className="ww-review-compose-overlay" onClick={event => { if (event.target === event.currentTarget && pendingAction !== 'save-review') setIsReviewComposeOpen(false); }}><div ref={reviewDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-compose-title" className="ww-review-compose-panel"><div className="ww-review-compose-heading"><h2 id="review-compose-title">{isEditingReview ? 'Edit your review' : 'Rate & review'}</h2><button type="button" onClick={() => setIsReviewComposeOpen(false)} disabled={pendingAction === 'save-review'} aria-label="Close review"><XMarkIcon className="w-5 h-5" /></button></div><p>{book.title} by {book.author.name}</p><form onSubmit={handleSubmitReview}><label>Your rating</label><StarRatingInput rating={userRating} setRating={setUserRating} hoverRating={hoverRating} setHoverRating={setHoverRating} /><label htmlFor="story-review-content">Your review</label><textarea id="story-review-content" value={userComment} onChange={event => setUserComment(event.target.value)} placeholder="What stayed with you?" rows={6} required data-dialog-focus />{actionError && <p className="ww-review-compose-error" role="alert">{actionError}</p>}<div className="ww-review-compose-actions"><button type="button" disabled={pendingAction === 'save-review'} onClick={() => setIsReviewComposeOpen(false)}>Cancel</button><button type="submit" disabled={!userRating || !userComment.trim() || pendingAction === 'save-review'}>{pendingAction === 'save-review' ? 'Saving…' : currentUserReview ? 'Update review' : 'Post review'}</button></div></form></div></div>}

            {/* Manage Shelves Modal */}
            {isManageShelvesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div ref={shelvesDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="manage-shelves-title" className="ww-story-shelves-panel bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="manage-shelves-title" className="text-xl font-bold font-sans text-text-rich dark:text-dark-text-rich">Manage shelves</h3>
                            <button aria-label="Close manage shelves" disabled={isSavingShelves} onClick={() => setIsManageShelvesModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="ww-shelf-help">Private shelves are visible only to you. Public shelves appear on your public profile.</p>
                        <div className="ww-shelf-picker-tools"><label>Find a shelf<input type="search" value={shelfQuery} onChange={event => setShelfQuery(event.target.value)} /></label><label>Sort shelves<select value={shelfSort} onChange={event => setShelfSort(event.target.value as 'name'|'recent')}><option value="name">Name A–Z</option><option value="recent">Created order</option></select></label></div>
                        <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
                            {!pickerShelves.length && <p>{shelfQuery ? 'No matching shelves.' : 'Create your first shelf below.'}</p>}
                            {pickerShelves.map(shelf => (
                                <label key={shelf.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-surface-alt cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-dark-border">
                                    <input
                                        type="checkbox"
                                        checked={selectedShelfIds.has(shelf.id)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedShelfIds);
                                            if (e.target.checked) newSet.add(shelf.id);
                                            else newSet.delete(shelf.id);
                                            setSelectedShelfIds(newSet);
                                        }}
                                        className="w-5 h-5 text-accent rounded border-gray-300 focus:ring-accent"
                                    />
                                    <span className="font-sans font-medium text-text-rich dark:text-dark-text-rich flex-1">{shelf.name}<small className="block text-xs">{shelf.visibility === 'PUBLIC' ? 'Public · On your profile' : 'Private · Only you'}</small></span>
                                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded-full">{shelf.books.length} {shelf.books.length === 1 ? 'book' : 'books'}</span>
                                </label>
                            ))}
                        </div>

                        <details className="ww-shelf-inline-create"><summary>New shelf</summary><label>Shelf name<input maxLength={100} value={newShelfName} onChange={event => setNewShelfName(event.target.value)} placeholder="For example, Weekend reads" /></label><fieldset><legend>Who can see this shelf?</legend><label><input type="radio" name="inline-shelf-visibility" checked={newShelfVisibility === 'PRIVATE'} onChange={() => setNewShelfVisibility('PRIVATE')} />Private · Only you</label><label><input type="radio" name="inline-shelf-visibility" checked={newShelfVisibility === 'PUBLIC'} onChange={() => setNewShelfVisibility('PUBLIC')} />Public · On your profile</label></fieldset><button type="button" disabled={!newShelfName.trim() || isSavingShelves} onClick={createShelfInline}>{isSavingShelves ? 'Creating…' : 'Create and select shelf'}</button></details>
                        {shelfError && <p role="alert" className="ww-shelf-error">{shelfError}</p>}{shelfStatus && <p role="status">{shelfStatus}</p>}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSaveShelves}
                                disabled={isSavingShelves}
                                className="w-full py-3 font-bold text-white bg-accent hover:bg-primary disabled:opacity-70 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-accent/20"
                            >
                                {isSavingShelves ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => { setIsManageShelvesModalOpen(false); setConfirmation('library'); }}
                                disabled={pendingAction === 'remove-library'}
                                className="w-full py-2.5 font-bold text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors text-sm"
                            >
                                Remove from Library
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ShareModal 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
                book={book} 
            />
            <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} targetType="BOOK" targetId={book.id} targetTitle={book.title} />
            <ConfirmDialog
                isOpen={confirmation !== null}
                title={confirmation === 'review' ? 'Delete your review?' : 'Remove from library?'}
                message={confirmation === 'review'
                    ? 'Your rating and review text will be permanently removed.'
                    : `“${book.title}” will be removed from every shelf. Your reading progress will remain available if you add it again.`}
                confirmLabel={confirmation === 'review' ? 'Delete review' : 'Remove story'}
                processingLabel={confirmation === 'review' ? 'Deleting…' : 'Removing…'}
                isProcessing={pendingAction === 'delete-review' || pendingAction === 'remove-library'}
                onCancel={() => setConfirmation(null)}
                onConfirm={confirmation === 'review' ? handleDeleteReview : handleRemoveFromLibrary}
            />

            {/* R2: Post-review share nudge */}
            {showReviewShareNudge && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border shadow-lifted rounded-2xl px-5 py-4 flex items-start gap-4 animate-fade-in">
                    <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-text-rich dark:text-dark-text-rich">Your review is live!</p>
                        <p className="text-xs text-text-body dark:text-dark-text-body mt-0.5">Help {book.title} reach more readers.</p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setShowReviewShareNudge(false); setIsShareModalOpen(true); }}
                                className="text-sm font-bold text-accent hover:underline"
                            >
                                Share this Book
                            </button>
                            <button
                                onClick={() => setShowReviewShareNudge(false)}
                                className="text-sm text-gray-400 hover:text-text-body dark:hover:text-dark-text-body"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setShowReviewShareNudge(false)} className="text-gray-400 hover:text-text-body flex-shrink-0">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <Footer />
        </div>
    );
};
