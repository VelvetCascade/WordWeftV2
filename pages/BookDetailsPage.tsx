
import React, { useState } from 'react';
import type { Book, NavigateTo } from '../types';
import { sampleBooks, sampleUser } from '../constants';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { ArrowLeftIcon, BookmarkIcon, CheckCircleIcon, LockClosedIcon, StarIcon, PlusIcon } from '../components/icons/Icons';

const sampleReviews = [
  { id: 1, user: { name: 'Alex', avatarUrl: 'https://picsum.photos/seed/user1/50/50' }, rating: 5, comment: 'An absolute masterpiece! The world-building is second to none. I was hooked from the very first chapter and couldn\'t put it down.', sentiment: 'positive' },
  { id: 2, user: { name: 'Brianna', avatarUrl: 'https://picsum.photos/seed/user2/50/50' }, rating: 4, comment: 'A great read, though the ending felt a bit rushed. Still highly recommend!', sentiment: 'positive' },
  { id: 3, user: { name: 'Carlos', avatarUrl: 'https://picsum.photos/seed/user3/50/50' }, rating: 3, comment: 'It was okay. The main character was a bit bland for my taste, but the plot had some interesting twists.', sentiment: 'neutral' },
];

const ChapterItem: React.FC<{ chapter: Book['chapters'][0]; index: number; onRead: () => void; isCompleted: boolean }> = ({ chapter, index, onRead, isCompleted }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border last:border-b-0 group">
            <div className="flex items-center gap-4">
                {isCompleted ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-5 text-center">{index + 1}</span>}
                <div>
                    <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{chapter.wordCount.toLocaleString()} words</p>
                </div>
            </div>
            {chapter.isReleased ? (
                <button onClick={onRead} className="font-sans font-semibold text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCompleted ? 'Continue' : 'Start Reading'}
                </button>
            ) : (
                <LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
        </div>
    );
};


export const BookDetailsPage: React.FC<{ navigateTo: NavigateTo; book: Book }> = ({ navigateTo, book }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const authorBooks = sampleBooks.filter(b => b.author.id === book.author.id && b.id !== book.id);
  
  const isBookInLibrary = sampleUser.library.some(shelf => shelf.books.some(b => b.id === book.id));
  const [inLibrary, setInLibrary] = useState(isBookInLibrary);

  return (
    <div className="bg-white dark:bg-dark-surface">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
          <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
              <button onClick={() => navigateTo({ name: 'category', genre: null })} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent transition-colors">
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
            <p className="text-lg text-text-body dark:text-dark-text-body mb-4">by <span className="font-semibold text-accent cursor-pointer hover:underline">{book.author.name}</span></p>
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(book.rating) ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`} />)}
                </div>
                <span className="font-sans font-semibold dark:text-dark-text-body">{book.rating}</span>
                <span className="text-gray-500 dark:text-gray-400">({book.reviewsCount.toLocaleString()} reviews)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {book.genres.map(g => <span key={g} className="text-sm font-sans font-medium bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body px-3 py-1 rounded-full">{g}</span>)}
            </div>
            <p className="text-base text-text-body dark:text-dark-text-body max-w-3xl leading-relaxed mb-8">{book.summary}</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => navigateTo({ name: 'reader', book: book, chapterIndex: 0 })} className="w-full sm:w-auto bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-opacity-80 transition-all hover:scale-105 duration-300 shadow-lg">Read from Start</button>
                <button 
                  onClick={() => setInLibrary(!inLibrary)}
                  className={`w-full sm:w-auto font-sans font-semibold px-8 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      inLibrary
                      ? 'bg-success/10 text-success'
                      : 'bg-gray-100 dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich hover:bg-gray-200 dark:hover:bg-dark-border'
                  }`}
                >
                    {inLibrary ? <CheckCircleIcon className="w-5 h-5"/> : <PlusIcon className="w-5 h-5" />}
                    {inLibrary ? 'In Your Library' : 'Add to Library'}
                </button>
            </div>
          </div>
        </section>

        {/* Chapter List */}
        <section className="max-w-4xl mx-auto mb-16">
          <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Chapters</h3>
          <div className="bg-surface dark:bg-dark-surface rounded-2xl border border-gray-200/80 dark:border-dark-border overflow-hidden">
            {book.chapters.map((chapter, i) => (
                <ChapterItem key={chapter.id} chapter={chapter} index={i} isCompleted={i < 2} onRead={() => navigateTo({ name: 'reader', book: book, chapterIndex: i })} />
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="max-w-4xl mx-auto mb-16">
          <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Reviews</h3>
          <div className="space-y-6">
            {sampleReviews.map(review => (
                <div key={review.id} className="bg-surface dark:bg-dark-surface p-6 rounded-2xl border border-gray-200/80 dark:border-dark-border">
                    <div className="flex items-start gap-4">
                        <img src={review.user.avatarUrl} alt={review.user.name} className="w-12 h-12 rounded-full"/>
                        <div>
                            <div className="flex items-center gap-4 mb-1">
                                <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{review.user.name}</h4>
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`} />)}
                                </div>
                            </div>
                             <p className="text-text-body dark:text-dark-text-body">{review.comment}</p>
                        </div>
                    </div>
                </div>
            ))}
            <button className="w-full text-center font-sans font-semibold text-accent py-3 rounded-xl hover:bg-accent/10 transition-colors">Show all reviews</button>
          </div>
        </section>

        {/* Author Bio */}
        {authorBooks.length > 0 && (
        <section className="max-w-6xl mx-auto">
            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">More from {book.author.name}</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {authorBooks.map(b => (
                    <BookCard key={b.id} book={b} onClick={() => navigateTo({ name: 'book-details', book: b })} />
                ))}
            </div>
        </section>
        )}
      </div>

      <Footer />
    </div>
  );
};