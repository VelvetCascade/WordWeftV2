
import React, { useEffect, useState } from 'react';
import type { User, Book } from '../types';
import { PlusIcon, CloudArrowUpIcon, CloudArrowDownIcon, ChartBarIcon, PencilSquareIcon, ShareIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WriterQuickStart } from '../components/WriterQuickStart';
import { ShareModal } from '../components/ShareModal';

interface WriterDashboardProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const DraftBookListItem: React.FC<{ book: Book }> = ({ book }) => {
    const totalChapters = book.chapters.length;
    const handleContinueWriting = () => {
        window.location.hash = `/write/book/${book.id}/manage`;
    };

    return (
        <article className="ww-draft-book-card bg-white dark:bg-dark-surface p-4 rounded-xl border dark:border-dark-border flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 group transition-shadow hover:shadow-md">
            <div className="flex gap-4 flex-1 min-w-0 w-full" onClick={handleContinueWriting}>
                <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-16 h-24 object-cover rounded-md flex-shrink-0 cursor-pointer shadow-sm transition-transform group-hover:scale-105"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent truncate">
                        {book.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Draft</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{totalChapters} Chapter{totalChapters !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>
            <button onClick={handleContinueWriting} className="w-full sm:w-auto justify-center text-sm font-sans font-semibold text-white bg-accent px-4 py-2 rounded-lg hover:bg-primary transition-colors flex items-center gap-2 flex-shrink-0">
               <PencilSquareIcon className="w-4 h-4" /> Continue
            </button>
        </article>
    );
};

const PublishedBookCard: React.FC<{ book: Book; onUnpublish: (bookId: string) => void; }> = ({ book, onUnpublish }) => {
    const publishedChapters = book.chapters.filter(c => c.status === 'published').length;
    const totalChapters = book.chapters.length;
    const [isShareOpen, setIsShareOpen] = useState(false);
    
    const handleManageChapters = () => {
        window.location.hash = `/write/book/${book.id}/manage`;
    };
    
    const handlePublishNewChapter = () => {
        window.location.hash = `/write/book/${book.id}/chapter/new/edit`;
    };

    return (
        <article className="ww-published-book-card bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-4 flex flex-col sm:flex-row items-start gap-4 group transition-shadow hover:shadow-md">
            <div className="flex gap-4 w-full sm:w-auto flex-1 min-w-0">
                <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-20 h-28 object-cover rounded-md flex-shrink-0 cursor-pointer shadow-sm transition-transform group-hover:scale-105"
                    onClick={handleManageChapters}
                />
                <div className="flex-1 flex flex-col min-w-0 justify-center">
                    <h4 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent truncate" onClick={handleManageChapters}>
                        {book.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Published on {new Date(book.publishedDate!).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{totalChapters} Chapters ({publishedChapters} published)</p>
                </div>
            </div>
            <div className="w-full sm:w-auto mt-2 sm:mt-auto flex flex-wrap items-center justify-end gap-2 pt-2 sm:self-end border-t border-gray-100 sm:border-0 dark:border-dark-border">
                <button onClick={() => { window.location.hash = '/write/analytics'; }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="View Analytics">
                    <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="Share Book">
                    <ShareIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                </button>
                <button onClick={() => onUnpublish(book.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="Unpublish Book">
                    <CloudArrowDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                </button>
                <button onClick={handlePublishNewChapter} className="flex-1 sm:flex-none justify-center text-sm font-sans font-semibold text-accent border border-accent px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-colors flex items-center gap-1.5">
                   <CloudArrowUpIcon className="w-4 h-4" /> Add Chapter
                </button>
                <button onClick={handleManageChapters} className="flex-1 sm:flex-none justify-center text-sm font-sans font-semibold text-white bg-accent px-3 py-1.5 rounded-lg hover:bg-primary transition-colors flex items-center gap-1.5">
                   <PencilSquareIcon className="w-4 h-4" /> Chapters
                </button>
            </div>
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                book={book}
                url={`${window.location.origin}/#/book/${book.id}`}
                shareTextOverride={`Read my book '${book.title}' on WordWeft — ${book.chapters.length} chapters of ${book.genres[0] || 'fiction'}. Check it out!`}
            />
        </article>
    );
};

const CreateNewBookCard: React.FC = () => (
    <article
        onClick={() => window.location.hash = '/write/book/create'} 
        className="ww-create-book-card bg-white dark:bg-dark-surface h-full rounded-xl border-2 border-dashed dark:border-dark-border flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-accent dark:hover:border-accent hover:text-accent dark:hover:text-accent transition-colors group"
    >
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-surface-alt flex items-center justify-center mb-4 transition-colors group-hover:bg-accent/10">
             <PlusIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-accent"/>
        </div>
        <span>Blank canvas</span>
        <p className="font-sans font-semibold">Start a new story</p>
        <small>Shape the premise, cover, and reader promise.</small>
    </article>
);


export const WriterDashboardPage: React.FC<WriterDashboardProps> = ({ currentUser, onUserUpdate }) => {
    const drafts = currentUser.writtenBooks?.filter(b => b.publicationStatus === 'draft') ?? [];
    const published = currentUser.writtenBooks?.filter(b => b.publicationStatus === 'published') ?? [];
    const allWrittenBooks = currentUser.writtenBooks ?? [];
    const totalChapters = allWrittenBooks.reduce((total, book) => total + book.chapters.length, 0);
    const totalViews = allWrittenBooks.reduce((total, book) => total + (book.viewCount || 0), 0);
    const totalLikes = allWrittenBooks.reduce((total, book) => total + (book.likesCount || 0), 0);
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('writing', 'writer_dashboard_view'); }, []);

    const handleUnpublishBook = async (bookId: string) => {
        if (!window.confirm("Are you sure you want to unpublish this book? It will be moved to your drafts.")) return;
        
        const updatedUser = await api.unpublishBook(currentUser.id, bookId);
        onUserUpdate(updatedUser);
    };

    return (
        <div className="ww-writer-dashboard p-6 md:p-8">
            <span className="ww-page-eyebrow">Writer studio</span>
            <div className="ww-writer-hero-row">
                <div>
                    <h1 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">Your stories, in motion.</h1>
                    <p className="text-text-body dark:text-dark-text-body mt-2">Welcome back, {currentUser.name}. Pick up a draft or begin with a blank page.</p>
                </div>
                <button onClick={() => window.location.hash = '/write/book/create'} className="ww-writer-new-story"><PlusIcon className="w-5 h-5" /> New story</button>
            </div>

            <section className="ww-writer-metrics" aria-label="Writing overview">
                <article><span>Projects</span><strong>{allWrittenBooks.length}</strong><small>{drafts.length} currently drafting</small></article>
                <article><span>Chapters</span><strong>{totalChapters}</strong><small>Across every story</small></article>
                <article><span>Total reads</span><strong>{totalViews.toLocaleString()}</strong><small>Published work</small></article>
                <article><span>Reader love</span><strong>{totalLikes.toLocaleString()}</strong><small>Chapter likes</small></article>
            </section>
            
            {/* Writer Quick Start Guide */}
            <div className="mt-6">
                <WriterQuickStart currentUser={currentUser} />
            </div>
            
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-4">
                    <div className="ww-writer-section-heading"><span>In progress</span><h2>Your drafts</h2></div>
                    {drafts.length > 0 ? (
                         drafts.map(book => <DraftBookListItem key={book.id} book={book} />)
                     ) : (
                         <div className="ww-writer-empty text-center py-10 bg-white dark:bg-dark-surface rounded-xl border-2 border-dashed dark:border-dark-border">
                             <strong>No drafts waiting.</strong>
                             <p className="text-gray-500 dark:text-gray-400">Start fresh or add a new chapter to a published story.</p>
                         </div>
                     )}
                </div>

                <div className="space-y-4">
                    <div className="ww-writer-section-heading"><span>Create</span><h2>Start something new</h2></div>
                    <CreateNewBookCard />
                </div>
            </div>

            <section className="mt-12">
                <div className="ww-writer-section-heading ww-writer-section-heading-inline"><span>On the shelf</span><h2>Published works</h2></div>
                {published.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {published.map(book => <PublishedBookCard key={book.id} book={book} onUnpublish={handleUnpublishBook} />)}
                    </div>
                ) : (
                    <div className="ww-writer-empty text-center py-10 bg-white dark:bg-dark-surface rounded-xl border-2 border-dashed dark:border-dark-border">
                        <strong>Your shelf is still quiet.</strong>
                        <p className="text-gray-500 dark:text-gray-400">Publish a chapter when it feels ready for readers.</p>
                    </div>
                )}
            </section>
        </div>
    );
};
