
import React, { useState, useMemo, useEffect } from 'react';
import type { Book, User, Shelf, LibraryBook, BookProgress, Review } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { ArrowLeftIcon, BookmarkIcon, CheckCircleIcon, LockClosedIcon, StarIcon, PlusIcon, PencilIcon, TrashIcon, ArrowUturnLeftIcon, ChatBubbleLeftIcon, EyeIcon, HeartIcon, HeartIconSolid, XMarkIcon, ShareIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { CharacterList } from '../components/CharacterList';
import { AIBadge } from '../components/AIBadge';
import { ShareModal } from '../components/ShareModal';
import { FeatureSparkle } from '../components/FeatureSparkle';

const ChapterItem: React.FC<{ chapter: Book['chapters'][0]; index: number; onRead: () => void; progress: number; onToggleLike: (chapterId: string) => void }> = ({ chapter, index, onRead, progress, onToggleLike }) => {
    const isCompleted = progress >= 90;
    const isInProgress = progress > 0 && progress < 90;

    return (
        <div 
            onClick={() => { if (chapter.status === 'published') onRead(); }}
            className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border last:border-b-0 group ${chapter.status === 'published' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors' : ''}`}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {isCompleted ? <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0" /> : <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center flex-shrink-0">{index + 1}</span>}
                <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich line-clamp-2 leading-tight">{chapter.title}</h4>
                    <div className="flex items-center gap-4 mt-2">
                        {/* Progress Bar */}
                        <div className="w-24 bg-gray-200 dark:bg-dark-border rounded-full h-1.5 overflow-hidden flex-shrink-0">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-success' : 'bg-amber-500'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        {/* Chapter Stats */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1" title="Views">
                                <EyeIcon className="w-3.5 h-3.5" /> {chapter.viewCount}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleLike(chapter.id); }}
                                className={`flex items-center gap-1 hover:text-danger transition-colors ${chapter.isLiked ? 'text-danger' : ''}`}
                                title={chapter.isLiked ? "Unlike Chapter" : "Like Chapter"}
                            >
                                {chapter.isLiked ? <HeartIconSolid className="w-3.5 h-3.5" /> : <HeartIcon className="w-3.5 h-3.5" />}
                                {chapter.likesCount}
                            </button>
                            <span className="flex items-center gap-1" title="Comments">
                                <ChatBubbleLeftIcon className="w-3.5 h-3.5" /> {chapter.commentCount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {chapter.status === 'published' ? (
                <div className="flex items-center gap-2">
                    <span className="hidden sm:block font-sans font-semibold text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">
                        {isInProgress ? 'Continue' : isCompleted ? 'Read Again' : 'Read'}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 sm:hidden transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            ) : (
                <LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
        </div>
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
                        className="p-1"
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
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [readingProgress, setReadingProgress] = useState<BookProgress | null>(null);

    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [activeTab, setActiveTab] = useState<'Chapters' | 'Characters' | 'Reviews'>('Chapters');
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [userComment, setUserComment] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);

    const currentUserReview = useMemo(() => {
        if (!currentUser) return null;
        return allReviews.find(r => r.userId === currentUser.id);
    }, [allReviews, currentUser]);

    // Manage Shelves State
    const [isManageShelvesModalOpen, setIsManageShelvesModalOpen] = useState(false);
    const [selectedShelfIds, setSelectedShelfIds] = useState<Set<string>>(new Set());
    const [initialShelfIds, setInitialShelfIds] = useState<Set<string>>(new Set()); // Track existing shelves that are hidden
    const [isSavingShelves, setIsSavingShelves] = useState(false);

    const openManageShelvesModal = () => {
        if (!currentUser) return;
        const currentShelfIds = new Set<string>();
        currentUser.library.forEach(shelf => {
            if (shelf.books.some(b => b.id === bookId)) {
                currentShelfIds.add(shelf.id);
            }
        });
        setSelectedShelfIds(currentShelfIds);
        setInitialShelfIds(currentShelfIds);
        setIsManageShelvesModalOpen(true);
    };

    const handleSaveShelves = async () => {
        if (!currentUser) return;
        setIsSavingShelves(true);
        try {
            // Merge hidden (initial) shelves with selected shelves
            const mergedShelves = new Set<string>([...initialShelfIds, ...selectedShelfIds]);
            const updatedUser = await api.updateBookShelves(currentUser.id, bookId, Array.from(mergedShelves));
            onUserUpdate(updatedUser);
            setIsManageShelvesModalOpen(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingShelves(false);
        }
    };

    const handleRemoveFromLibrary = async () => {
        if (!currentUser || !book) return;
        if (confirm("Remove this book from your library?")) {
            const updatedUser = await api.removeBookFromLibrary(currentUser.id, book.id);
            onUserUpdate(updatedUser);
            setIsManageShelvesModalOpen(false);
        }
    };


    useEffect(() => {
        setIsLoading(true);
        api.getBookById(bookId).then(fetchedBook => {
            setBook(fetchedBook);
            if (fetchedBook) {
                api.getBooksByAuthor(fetchedBook.author.id, fetchedBook.id).then(setAuthorBooks);
            }
            setIsLoading(false);
        });

        api.getBookReviews(bookId).then(setAllReviews);

        if (currentUser) {
            api.getReadingProgressForBook(currentUser.id, bookId).then(setReadingProgress);
        }
    }, [currentUser, bookId]);

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

    const isBookInLibrary = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.library.some(shelf => shelf.books.some(b => b.id === bookId));
    }, [currentUser, bookId]);

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = '/category';
        }
    };

    const handleToggleLibrary = async () => {
        if (!currentUser || !book) {
            window.location.hash = '/auth';
            return;
        };

        // Check if customized shelves exist
        const customShelves = currentUser.library.filter(s => s.id !== 'all' && s.id !== '1' && s.name !== 'My List');

        if (customShelves.length > 0) {
            openManageShelvesModal();
        } else {
            const updatedUser = await api.toggleBookInLibrary(currentUser.id, book);
            onUserUpdate(updatedUser);
            triggerFeedback('FIRST_EXPERIENCE');
        }
    };

    const handleAuthorClick = () => {
        if (!book) return;
        window.location.hash = `/author/${book.author.id}`;
    };

    const handleReadClick = () => {
        if (!book) return;
        const startChapter = readingProgress ? readingProgress.lastReadChapterIndex : 0;
        window.location.hash = `/read/book/${book.id}/chapter/${startChapter}`;
    };

    const handleReadChapterClick = (chapterIndex: number) => {
        if (!book) return;
        window.location.hash = `/read/book/${book.id}/chapter/${chapterIndex}`;
    }

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || userRating === 0 || !userComment) return;

        const updatedReviews = await api.submitReview(currentUser.id, bookId, userRating, userComment);
        setAllReviews(updatedReviews);
        setIsEditingReview(false);
    };

    const handleDeleteReview = async () => {
        if (!currentUser || !currentUserReview) return;
        if (window.confirm('Are you sure you want to delete your review?')) {
            const updatedReviews = await api.deleteReview(currentUser.id, bookId);
            setAllReviews(updatedReviews);
            setUserRating(0);
            setUserComment('');
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
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading book details...</div>;
    }

    if (!book) {
        return <div className="min-h-screen flex items-center justify-center">Book not found.</div>;
    }

    const hasStartedReading = readingProgress && readingProgress.overallProgress > 0 || (readingProgress && Object.keys(readingProgress.chapters).length > 0);
    const mainButtonText = hasStartedReading
        ? `Continue Reading (Ch. ${readingProgress.lastReadChapterIndex + 1})`
        : 'Read from Start';

    return (
        <div className="bg-white dark:bg-dark-surface">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <button onClick={handleBack} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" /> Back
                    </button>
                    <div className="flex-1 min-w-0 text-center px-4 flex items-center justify-center">
                        <h2 className="font-sans font-bold text-lg line-clamp-2 leading-tight dark:text-dark-text-rich">{book.title}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsShareModalOpen(true)}>
                            <ShareIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 hover:text-accent dark:hover:text-accent transition-colors" />
                        </button>
                        <button onClick={() => setIsBookmarked(!isBookmarked)}>
                            <BookmarkIcon className={`w-6 h-6 transition-colors ${isBookmarked ? 'text-accent fill-accent/20' : 'text-gray-400 dark:text-gray-500'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-12">
                {/* Book Summary Section */}
                <section className="grid md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12 mb-16">
                    <div className="md:col-span-1 lg:col-span-1">
                        <img src={book.coverUrl} alt={book.title} className="w-full h-auto rounded-2xl shadow-lifted" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                        <h1 className="font-sans text-4xl lg:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich leading-tight mb-2">{book.title}</h1>
                        <p className="text-lg text-text-body dark:text-dark-text-body mb-4">by <button onClick={handleAuthorClick} className="font-semibold text-accent cursor-pointer hover:underline">{book.author.name}</button></p>

                        {/* Book Stats */}
                        <div className="flex flex-wrap items-center gap-6 mb-6 text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2" title="Rating">
                                <div className="flex items-center text-amber-500">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(book.rating) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />)}
                                </div>
                                <span className="font-sans font-semibold dark:text-dark-text-body text-lg">{book.rating}</span>
                            </div>

                            <div className="h-6 w-px bg-gray-300 dark:bg-dark-border"></div>

                            <div className="flex items-center gap-2" title="Total Views">
                                <EyeIcon className="w-5 h-5" />
                                <span className="font-sans font-medium">{book.viewCount.toLocaleString()}</span>
                            </div>

                            <div className="h-6 w-px bg-gray-300 dark:bg-dark-border"></div>

                            {/* Aggregated Likes Display (Non-interactive at book level) */}
                            <div className="flex items-center gap-2" title="Total Likes (across all chapters)">
                                <HeartIcon className="w-5 h-5" />
                                <span className="font-sans font-medium">{book.likesCount.toLocaleString()}</span>
                            </div>

                            <div className="h-6 w-px bg-gray-300 dark:bg-dark-border"></div>

                            <div className="flex items-center gap-2" title="Total Comments (across all chapters)">
                                <ChatBubbleLeftIcon className="w-5 h-5" />
                                <span className="font-sans font-medium">{book.commentCount.toLocaleString()}</span>
                            </div>

                            <div className="h-6 w-px bg-gray-300 dark:bg-dark-border"></div>

                            <div className="flex items-center gap-2" title="Reviews">
                                <PencilIcon className="w-5 h-5" />
                                <span className="font-sans font-medium">{book.reviewsCount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            {book.isAIGenerated && <AIBadge />}
                            {book.genres.map(g => <span key={g} className="text-sm font-sans font-medium bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body px-3 py-1 rounded-full">{g}</span>)}
                        </div>

                        <p className="text-base text-text-body dark:text-dark-text-body max-w-3xl leading-relaxed mb-8">{book.summary}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleReadClick} className="w-full sm:w-auto bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-opacity-80 transition-all hover:scale-105 duration-300 shadow-lg">
                                {mainButtonText}
                            </button>
                            <button
                                onClick={handleToggleLibrary}
                                className={`w-full sm:w-auto font-sans font-semibold px-8 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${isBookInLibrary
                                    ? 'bg-success/10 text-success'
                                    : 'bg-gray-100 dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich hover:bg-gray-200 dark:hover:bg-dark-border'
                                    }`}
                            >
                                {isBookInLibrary ? <CheckCircleIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                {isBookInLibrary ? 'In Your Library' : 'Add to Library'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 dark:border-dark-border mb-8 max-w-4xl mx-auto">
                    {(['Chapters', 'Characters', 'Reviews'] as const).map((tab) => {
                        const btn = (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
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

                <div className="max-w-4xl mx-auto mb-16 min-h-[400px]">
                    {activeTab === 'Chapters' && (
                        <section className="animate-fade-in">
                            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Chapters</h3>
                            <div className="bg-surface dark:bg-dark-surface rounded-2xl border border-gray-200/80 dark:border-dark-border overflow-hidden">
                                {book.chapters.map((chapter, i) => {
                                    const chapterProgress = readingProgress?.chapters[chapter.id]?.progress || 0;
                                    return (
                                        <ChapterItem
                                            key={chapter.id}
                                            chapter={chapter}
                                            index={i}
                                            progress={chapterProgress}
                                            onRead={() => handleReadChapterClick(i)}
                                            onToggleLike={handleToggleChapterLike}
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
                        <section className="animate-fade-in">
                            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-6">Community Reviews</h3>

                            {/* Review Form / User's Review */}
                            <div className="bg-surface dark:bg-dark-surface p-6 rounded-2xl border border-gray-200/80 dark:border-dark-border mb-8">
                                {!currentUser ? (
                                    <div className="text-center">
                                        <p className="mb-4">You must be logged in to leave a review.</p>
                                        <button onClick={() => window.location.hash = '/auth'} className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors">
                                            Log in to leave a review
                                        </button>
                                    </div>
                                ) : currentUserReview && !isEditingReview ? (
                                    // Display user's existing review
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-sans font-semibold text-lg text-text-rich dark:text-dark-text-rich mb-4">Your Review</h4>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setIsEditingReview(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><PencilIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                                <button onClick={handleDeleteReview} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < currentUserReview.rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />)}
                                        </div>
                                        <p className="text-text-body dark:text-dark-text-body mt-2">{currentUserReview.comment}</p>
                                    </div>
                                ) : (
                                    // Display review form
                                    <form onSubmit={handleSubmitReview}>
                                        <h4 className="font-sans font-semibold text-lg text-text-rich dark:text-dark-text-rich mb-2">{currentUserReview ? 'Edit Your Review' : 'Write a Review'}</h4>
                                        <StarRatingInput rating={userRating} setRating={setUserRating} hoverRating={hoverRating} setHoverRating={setHoverRating} />
                                        <textarea
                                            value={userComment}
                                            onChange={(e) => setUserComment(e.target.value)}
                                            placeholder="Share your thoughts..."
                                            className="w-full mt-4 p-3 rounded-lg border-gray-300 focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-body"
                                            rows={4}
                                            required
                                        ></textarea>
                                        <div className="flex justify-end items-center gap-4 mt-4">
                                            {isEditingReview && <button type="button" onClick={() => setIsEditingReview(false)} className="font-sans font-semibold text-sm">Cancel</button>}
                                            <button type="submit" disabled={!userRating || !userComment} className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                                                {currentUserReview ? 'Update Review' : 'Submit Review'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

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

            {/* Manage Shelves Modal */}
            {isManageShelvesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-sans text-text-rich dark:text-dark-text-rich">Manage Shelves</h3>
                            <button onClick={() => setIsManageShelvesModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
                            {currentUser?.library.filter(s => s.id !== 'all' && s.type !== 'default' && s.id !== 'reading' && s.id !== 'toread' && s.id !== 'completed' && !s.books.some(b => b.id === bookId)).map(shelf => (
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
                                    <span className="font-sans font-medium text-text-rich dark:text-dark-text-rich flex-1">{shelf.name}</span>
                                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded-full">{shelf.books.length} books</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSaveShelves}
                                disabled={isSavingShelves}
                                className="w-full py-3 font-bold text-white bg-accent hover:bg-primary disabled:opacity-70 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-accent/20"
                            >
                                {isSavingShelves ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleRemoveFromLibrary}
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

            <Footer />
        </div>
    );
};
