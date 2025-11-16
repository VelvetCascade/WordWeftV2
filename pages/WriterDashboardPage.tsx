
import React from 'react';
import type { User, Book } from '../types';
import { PlusIcon, CloudArrowUpIcon, CloudArrowDownIcon, ChartBarIcon, PencilSquareIcon } from '../components/icons/Icons';
import * as api from '../api/client';

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
        <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border dark:border-dark-border flex items-center gap-5 group transition-shadow hover:shadow-md">
            <img 
                src={book.coverUrl} 
                alt={book.title} 
                className="w-16 h-24 object-cover rounded-md flex-shrink-0 cursor-pointer shadow-sm transition-transform group-hover:scale-105"
                onClick={handleContinueWriting}
            />
            <div className="flex-1 min-w-0">
                <h4 
                    className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent truncate"
                    onClick={handleContinueWriting}
                >
                    {book.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Draft</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{totalChapters} Chapter{totalChapters !== 1 ? 's' : ''}</p>
                </div>
            </div>
            <button onClick={handleContinueWriting} className="text-sm font-sans font-semibold text-white bg-accent px-4 py-2 rounded-lg hover:bg-primary transition-colors flex items-center gap-2 flex-shrink-0">
               <PencilSquareIcon className="w-4 h-4" /> Continue
            </button>
        </div>
    );
};

const PublishedBookCard: React.FC<{ book: Book; onUnpublish: (bookId: number) => void; }> = ({ book, onUnpublish }) => {
    const publishedChapters = book.chapters.filter(c => c.status === 'published').length;
    const totalChapters = book.chapters.length;
    
    const handleManageChapters = () => {
        window.location.hash = `/write/book/${book.id}/manage`;
    };
    
    const handlePublishNewChapter = () => {
        window.location.hash = `/write/book/${book.id}/chapter/new/edit`;
    };

    return (
        <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-4 flex items-start gap-4 group transition-shadow hover:shadow-md">
            <img
                src={book.coverUrl}
                alt={book.title}
                className="w-20 h-28 object-cover rounded-md flex-shrink-0 cursor-pointer shadow-sm transition-transform group-hover:scale-105"
                onClick={handleManageChapters}
            />
            <div className="flex-1 flex flex-col h-full min-w-0">
                <h4 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich cursor-pointer hover:text-accent truncate" onClick={handleManageChapters}>
                    {book.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Published on {new Date(book.publishedDate!).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{totalChapters} Chapters ({publishedChapters} published)</p>
                <div className="mt-auto flex items-center self-end gap-1 pt-2">
                    <button onClick={() => alert('Stats page coming soon!')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="View Stats">
                        <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button onClick={() => onUnpublish(book.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="Unpublish Book">
                        <CloudArrowDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button onClick={handleManageChapters} className="text-sm font-sans font-semibold text-white bg-accent px-3 py-1.5 rounded-lg hover:bg-primary transition-colors flex items-center gap-1.5">
                       <PencilSquareIcon className="w-4 h-4" /> Chapter
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreateNewBookCard: React.FC = () => (
    <div 
        onClick={() => window.location.hash = '/write/book/create'} 
        className="bg-white dark:bg-dark-surface h-full rounded-xl border-2 border-dashed dark:border-dark-border flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-accent dark:hover:border-accent hover:text-accent dark:hover:text-accent transition-colors group"
    >
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-surface-alt flex items-center justify-center mb-4 transition-colors group-hover:bg-accent/10">
             <PlusIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-accent"/>
        </div>
        <p className="font-sans font-semibold">Create New Book</p>
    </div>
);


export const WriterDashboardPage: React.FC<WriterDashboardProps> = ({ currentUser, onUserUpdate }) => {
    const drafts = currentUser.writtenBooks?.filter(b => b.publicationStatus === 'draft') ?? [];
    const published = currentUser.writtenBooks?.filter(b => b.publicationStatus === 'published') ?? [];

    const handleUnpublishBook = async (bookId: number) => {
        if (!window.confirm("Are you sure you want to unpublish this book? It will be moved to your drafts.")) return;
        
        const updatedUser = await api.unpublishBook(currentUser.id, bookId);
        onUserUpdate(updatedUser);
    };

    return (
        <div className="p-6 md:p-8">
            <h1 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">Welcome back, {currentUser.name}!</h1>
            <p className="text-text-body dark:text-dark-text-body mt-1">Ready to craft your next chapter?</p>
            
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">Your Drafts</h2>
                    {drafts.length > 0 ? (
                         drafts.map(book => <DraftBookListItem key={book.id} book={book} />)
                     ) : (
                         <div className="text-center py-10 bg-white dark:bg-dark-surface rounded-xl border-2 border-dashed dark:border-dark-border">
                             <p className="text-gray-500 dark:text-gray-400">You have no drafts. Start a new story!</p>
                         </div>
                     )}
                </div>

                <div className="space-y-4">
                    <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">Start Something New</h2>
                    <CreateNewBookCard />
                </div>
            </div>

            <section className="mt-12">
                <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Published Works</h2>
                {published.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {published.map(book => <PublishedBookCard key={book.id} book={book} onUnpublish={handleUnpublishBook} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-dark-surface rounded-xl border-2 border-dashed dark:border-dark-border">
                        <p className="text-gray-500 dark:text-gray-400">You haven't published any books yet.</p>
                    </div>
                )}
            </section>
        </div>
    );
};
