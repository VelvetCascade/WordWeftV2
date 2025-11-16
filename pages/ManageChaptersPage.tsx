
import React from 'react';
import type { User, Chapter } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, CloudArrowUpIcon, CloudArrowDownIcon } from '../components/icons/Icons';

interface ManageChaptersPageProps {
  currentUser: User;
  bookId: number;
  onUpdateUser: (updater: (user: User) => User) => void;
}

const ChapterListItem: React.FC<{ chapter: Chapter, bookId: number, index: number, onPublishToggle: () => void }> = ({ chapter, bookId, index, onPublishToggle }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg border dark:border-dark-border group">
        <div className="flex items-center gap-4">
            <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</span>
            <div>
                <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                     <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full ${chapter.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {chapter.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{chapter.wordCount.toLocaleString()} words</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={() => window.location.hash = `/write/book/${bookId}/chapter/${chapter.id}/edit`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors"
                title="Edit Chapter"
            >
                <PencilIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
            </button>
            <button 
                onClick={onPublishToggle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors"
                title={chapter.status === 'published' ? 'Unpublish' : 'Publish'}
            >
                {chapter.status === 'published' ? (
                    <CloudArrowDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                    <CloudArrowUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
            </button>
        </div>
    </div>
);


export const ManageChaptersPage: React.FC<ManageChaptersPageProps> = ({ currentUser, bookId, onUpdateUser }) => {
    const book = currentUser.writtenBooks?.find(b => b.id === bookId);

    const handlePublishToggle = (chapterId: number) => {
        onUpdateUser(user => {
            const targetBook = user.writtenBooks?.find(b => b.id === bookId);
            if (!targetBook) return user;
            
            const targetChapter = targetBook.chapters.find(c => c.id === chapterId);
            if (!targetChapter) return user;

            targetChapter.status = targetChapter.status === 'published' ? 'draft' : 'published';

            const hasPublishedChapters = targetBook.chapters.some(c => c.status === 'published');

            if (targetBook.publicationStatus === 'draft' && hasPublishedChapters) {
                targetBook.publicationStatus = 'published';
                targetBook.publishedDate = new Date().toISOString().split('T')[0];
            } else if (targetBook.publicationStatus === 'published' && !hasPublishedChapters) {
                targetBook.publicationStatus = 'draft';
                delete targetBook.publishedDate;
            }
            
            return user;
        });
    };
    
    if (!book) {
        return <div className="p-8">Book not found.</div>;
    }

    return (
        <div className="p-8 relative min-h-full">
            <div className="flex items-start gap-6 mb-8">
                <button 
                    onClick={() => window.location.hash = '/write'} 
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors mt-1"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <img src={book.coverUrl} alt={book.title} className="w-24 h-36 object-cover rounded-lg shadow-md" />
                <div>
                     <h1 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich truncate">
                        {book.title}
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body">Manage your book's chapters.</p>
                     <span className={`mt-2 inline-block text-xs font-sans font-medium px-2 py-0.5 rounded-full ${book.publicationStatus === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {book.publicationStatus}
                    </span>
                </div>
            </div>

             <div className="space-y-3">
                {book.chapters.length > 0 ? (
                    book.chapters.map((chapter, i) => (
                       <ChapterListItem 
                            key={chapter.id} 
                            chapter={chapter} 
                            bookId={book.id}
                            index={i} 
                            onPublishToggle={() => handlePublishToggle(chapter.id)}
                       />
                    ))
                ) : (
                     <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-500 dark:border-dark-border dark:text-gray-400">
                         <p>This book has no chapters yet.</p>
                         <p>Add your first chapter to get started!</p>
                     </div>
                )}
            </div>

            <button 
                onClick={() => window.location.hash = `/write/book/${bookId}/chapter/new/edit`}
                className="fixed bottom-8 right-8 w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary transition-transform hover:scale-110"
                title="Add New Chapter"
            >
                <PlusIcon className="w-8 h-8"/>
            </button>
        </div>
    );
};
