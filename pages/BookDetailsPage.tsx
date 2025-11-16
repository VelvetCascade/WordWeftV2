
import React, { useState, useMemo, useEffect } from 'react';
import type { Book, User, Shelf, LibraryBook, BookProgress, Review } from '../types';
import { sampleBooks } from '../constants';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { ArrowLeftIcon, BookmarkIcon, CheckCircleIcon, LockClosedIcon, StarIcon, PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import * as api from '../api/client';


const ChapterItem: React.FC<{ chapter: Book['chapters'][0]; index: number; onRead: () => void; progress: number }> = ({ chapter, index, onRead, progress }) => {
    const isCompleted = progress >= 100;
    const isInProgress = progress > 0 && progress < 100;

    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border last:border-b-0 group">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {isCompleted ? <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0" /> : <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center flex-shrink-0">{index + 1}</span>}
                <div className="flex-1 min-w-0">
                    <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich truncate">{chapter.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 bg-gray-200 dark:bg-dark-border rounded-full h-1.5">
                            <div 
                                className={`h-1.5 rounded-full ${isCompleted ? 'bg-success' : 'bg-amber-500'}`} 
                                style={{ width: `${progress}%`}}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(progress)}%</p>
                    </div>
                </div>
            </div>
            {chapter.status === 'published' ? (
                <button onClick={onRead} className="font-sans font-semibold text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">
                    {isInProgress ? 'Continue' : isCompleted ? 'Read Again' : 'Start Reading'}
                </button>
            ) : (
                <LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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


interface BookDetailsPageProps {
  book: Book;
  currentUser: User | null;
  onUserUpdate: (user: User) => void;
}

export const BookDetailsPage: React.FC<BookDetailsPageProps> = ({ book, currentUser, onUserUpdate }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState<BookProgress | null>(null);
  
  // Review State
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);

  const authorBooks = sampleBooks.filter(b => b.author.id === book.author.id && b.id !== book.id);
  
  const currentUserReview = useMemo(() => {
    if (!currentUser) return null;
    return allReviews.find(r => r.userId === currentUser.id);
  }, [allReviews, currentUser]);


  useEffect(() => {
    // Fetch reviews
    api.getBookReviews(book.id).then(setAllReviews);

    // Fetch progress
    if(currentUser) {
        api.getReadingProgressForBook(currentUser.id, book.id).then(setReadingProgress);
    }
  }, [currentUser, book.id]);

   useEffect(() => {
    if (currentUserReview) {
      setUserRating(currentUserReview.rating);
      setUserComment(currentUserReview.comment);
      setIsEditingReview(false);
    } else {
      // Reset form if user has no review
      setUserRating(0);
      setUserComment('');
    }
  }, [currentUserReview]);
  
  const isBookInLibrary = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.library.some(shelf => shelf.books.some(b => b.id === book.id));
  }, [currentUser, book.id]);
  
  const handleBack = () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.hash = '/category';
    }
  };

  const handleToggleLibrary = async () => {
    if (!currentUser) {
      window.location.hash = '/auth';
      return;
    };
    const updatedUser = await api.toggleBookInLibrary(currentUser.id, book);
    onUserUpdate(updatedUser);
  };
  
  const handleAuthorClick = () => {
    window.location.hash = `/author/${book.author.id}`;
  };
  
  const handleReadClick = () => {
    const startChapter = readingProgress ? readingProgress.lastReadChapterIndex : 0;
    window.location.hash = `/read/book/${book.id}/chapter/${startChapter}`;
  };

  const handleReadChapterClick = (chapterIndex: number) => {
    window.location.hash = `/read/book/${book.id}/chapter/${chapterIndex}`;
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || userRating === 0 || !userComment) return;

    const updatedReviews = await api.submitReview(currentUser.id, book.id, userRating, userComment);
    setAllReviews(updatedReviews);
    setIsEditingReview(false);
  };

  const handleDeleteReview = async () => {
    if (!currentUser || !currentUserReview) return;
    if (window.confirm('Are you sure you want to delete your review?')) {
        const updatedReviews = await api.deleteReview(currentUser.id, book.id);
        setAllReviews(updatedReviews);
        setUserRating(0);
        setUserComment('');
    }
  };


  return (
    <div className="bg-white dark:bg-dark-surface">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
          <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent transition-colors">
                  <ArrowLeftIcon className="w-5 h-5" /> Back
              </button>
              <div className="flex-1 min-w-0 text-center px-4">
                  <h2 className="font-sans font-bold text-lg truncate dark:text-dark-text-rich">{book.title}</h2>
              </div>
              <button onClick={() => setIsBookmarked(!isBookmarked)}>
                  <BookmarkIcon className={`w-6 h-6 transition-colors ${isBookmarked ? 'text-accent fill-accent/20' : 'text-gray-400 dark:text-gray-500'}`} />
              </button>
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
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(book.rating) ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`} />)}
                </div>
                <span className="font-sans font-semibold dark:text-dark-text-body">{book.rating}</span>
                <span className="text-gray-500 dark:text-gray-400">({allReviews.length} reviews)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {book.genres.map(g => <span key={g} className="text-sm font-sans font-medium bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body px-3 py-1 rounded-full">{g}</span>)}
            </div>
            <p className="text-base text-text-body dark:text-dark-text-body max-w-3xl leading-relaxed mb-8">{book.summary}</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleReadClick} className="w-full sm:w-auto bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-opacity-80 transition-all hover:scale-105 duration-300 shadow-lg">
                    {readingProgress && readingProgress.overallProgress > 0 ? 'Continue Reading' : 'Read from Start'}
                </button>
                <button 
                  onClick={handleToggleLibrary}
                  className={`w-full sm:w-auto font-sans font-semibold px-8 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      isBookInLibrary
                      ? 'bg-success/10 text-success'
                      : 'bg-gray-100 dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich hover:bg-gray-200 dark:hover:bg-dark-border'
                  }`}
                >
                    {isBookInLibrary ? <CheckCircleIcon className="w-5 h-5"/> : <PlusIcon className="w-5 h-5" />}
                    {isBookInLibrary ? 'In Your Library' : 'Add to Library'}
                </button>
            </div>
          </div>
        </section>

        {/* Chapter List */}
        <section className="max-w-4xl mx-auto mb-16">
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
                    />
                )
            })}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="max-w-4xl mx-auto mb-16">
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
                          <button onClick={() => setIsEditingReview(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><PencilIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/></button>
                          <button onClick={handleDeleteReview} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/></button>
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
                    <div key={review.id} className="bg-surface dark:bg-dark-surface p-6 rounded-2xl border border-gray-200/80 dark:border-dark-border">
                        <div className="flex items-start gap-4">
                            <img src={review.user.avatarUrl} alt={review.user.name} className="w-12 h-12 rounded-full"/>
                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                                    <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{review.user.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                                      Posted on {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                 <div className="flex items-center mb-2">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />)}
                                </div>
                                <p className="text-text-body dark:text-dark-text-body whitespace-pre-wrap">{review.comment}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>


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

      <Footer />
    </div>
  );
};
