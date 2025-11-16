import React, { useState, useMemo } from 'react';
import type { User, Shelf, LibraryBook, BookProgress } from '../types';
import { Footer } from '../components/Footer';
import { BookOpenIcon, ChartPieIcon, UserGroupIcon, StarIcon, Cog6ToothIcon, PlusIcon, XMarkIcon, ArrowPathIcon, CheckCircleIcon } from '../components/icons/Icons';

const PROGRESS_STORAGE_KEY = 'wordweft_reading_progress_v2';

const getReadingProgressForAllBooks = (userId: number): { [bookId: number]: BookProgress } | null => {
    try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        return allProgress[userId] || null;
    } catch (e) {
        return null;
    }
};

const clearReadingProgressForBook = (userId: number, bookId: number) => {
     try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        if (allProgress[userId] && allProgress[userId][bookId]) {
            delete allProgress[userId][bookId];
            localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
        }
    } catch (e) {
        console.error("Failed to clear reading progress", e);
    }
};


const LibraryBookCard: React.FC<{ book: LibraryBook, onRemove: (bookId: number) => void, onRestart: (bookId: number) => void }> = ({ book, onRemove, onRestart }) => {
    
    const isCompleted = book.progress >= 100;

    // FIX: Use `c.status` to check if chapter is published instead of non-existent `isReleased` property
    const completedChapters = useMemo(() => {
        // This is a mock calculation for the tooltip as we don't have the full progress object here.
        // A more robust solution would pass the full BookProgress object.
        const totalReleased = book.chapters.filter(c => c.status === 'published').length;
        return Math.floor((book.progress / 100) * totalReleased);
    }, [book.progress, book.chapters]);

    const cardTooltip = `${completedChapters} / ${book.chapters.filter(c => c.status === 'published').length} chapters completed.`;

    return (
        <div className="group" title={cardTooltip}>
            <div className="relative">
                 <div className="cursor-pointer">
                    <img 
                        src={book.coverUrl} 
                        alt={book.title} 
                        className="w-full h-auto object-cover rounded-lg shadow-soft group-hover:shadow-lifted transition-all duration-300 transform group-hover:-translate-y-1"
                    />
                    {isCompleted && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircleIcon className="w-12 h-12 text-white/80" />
                        </div>
                    )}
                </div>
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(book.id); }} 
                        className="p-1.5 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger backdrop-blur-sm"
                        aria-label="Remove from library"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                     {isCompleted && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRestart(book.id); }} 
                            className="p-1.5 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent backdrop-blur-sm"
                            aria-label="Restart reading progress"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                        </button>
                     )}
                </div>
            </div>
            <div className="mt-3 cursor-pointer">
                 <h3 className="font-sans font-bold text-sm text-text-rich dark:text-dark-text-rich truncate">{book.title}</h3>
                 <p className="text-xs text-text-body dark:text-dark-text-body truncate">{book.author.name}</p>
                 {!isCompleted ? (
                    <>
                        <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-accent h-1.5" style={{ width: `${book.progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                        <p className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{book.progress}%</p>
                    </>
                 ) : (
                    <div className="flex items-center gap-1.5 mt-2 text-success">
                        <CheckCircleIcon className="w-4 h-4" />
                        <p className="font-sans font-bold text-xs">Completed</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string }> = ({ icon, value, label }) => (
    <div className="bg-background dark:bg-dark-surface-alt p-6 rounded-2xl">
        <div className="text-accent mb-2">{icon}</div>
        <p className="font-sans font-bold text-2xl text-text-rich dark:text-dark-text-rich">{value}</p>
        <p className="text-sm text-text-body dark:text-dark-text-body">{label}</p>
    </div>
);

interface ProfilePageProps {
    user: User;
    updateUserLibrary: (newLibrary: Shelf[]) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, updateUserLibrary }) => {
    const [activeShelfId, setActiveShelfId] = useState<'all' | number>('all');
    const [forceUpdate, setForceUpdate] = useState(0); // Used to re-render after progress changes

    const userLibraryWithProgress = useMemo(() => {
        const allProgress = getReadingProgressForAllBooks(user.id);
        if (!allProgress) return user.library;

        return user.library.map(shelf => ({
            ...shelf,
            books: shelf.books.map(book => ({
                ...book,
                progress: allProgress[book.id]?.overallProgress ?? 0,
            }))
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id, user.library, forceUpdate]);

    const chaptersReadCount = useMemo(() => {
        const allProgress = getReadingProgressForAllBooks(user.id);
        if (!allProgress) return 0;

        let count = 0;
        Object.values(allProgress).forEach(bookProgress => {
            if (bookProgress && bookProgress.chapters) {
                Object.values(bookProgress.chapters).forEach(chapter => {
                    if (chapter.progress >= 100) {
                        count++;
                    }
                });
            }
        });
        return count;
    }, [user.id, forceUpdate]);

    const dynamicShelves = useMemo(() => {
        const reading: LibraryBook[] = [];
        const toRead: LibraryBook[] = [];
        const completed: LibraryBook[] = [];

        const allBooksMap = new Map<number, LibraryBook>();
        userLibraryWithProgress.forEach(shelf => {
            shelf.books.forEach(book => allBooksMap.set(book.id, book));
        });

        allBooksMap.forEach(book => {
            if (book.progress >= 100) completed.push(book);
            else if (book.progress > 0) reading.push(book);
            else toRead.push(book);
        });

        return [
            { id: 1, name: 'Reading', books: reading },
            { id: 2, name: 'To Read', books: toRead },
            { id: 3, name: 'Completed', books: completed },
        ];
    }, [userLibraryWithProgress]);
    
    const allBooks = useMemo(() => {
       const books = new Map<number, LibraryBook>();
        dynamicShelves.forEach(shelf => {
            shelf.books.forEach(book => {
                books.set(book.id, book);
            });
        });
        return Array.from(books.values()).sort((a,b) => a.title.localeCompare(b.title));
    }, [dynamicShelves]);

    const booksToDisplay = activeShelfId === 'all' 
        ? allBooks 
        : dynamicShelves.find(s => s.id === activeShelfId)?.books ?? [];
    
    const activeShelfName = activeShelfId === 'all' 
        ? 'All Books' 
        : dynamicShelves.find(s => s.id === activeShelfId)?.name;

    const ShelfLink: React.FC<{ name: string; isActive: boolean; onClick: () => void }> = ({ name, isActive, onClick }) => (
        <button 
            onClick={onClick}
            className={`w-full text-left font-sans font-medium px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
        >
            {name}
        </button>
    );

    const handleRemoveBook = (bookId: number) => {
        const newLibrary = user.library.map(shelf => ({
            ...shelf,
            books: shelf.books.filter(b => b.id !== bookId),
        }));
        clearReadingProgressForBook(user.id, bookId);
        updateUserLibrary(newLibrary);
    };

    const handleRestartBook = (bookId: number) => {
        clearReadingProgressForBook(user.id, bookId);
        setForceUpdate(v => v + 1); // Trigger re-render to reflect cleared progress
    };

    const handleBookClick = (book: LibraryBook) => {
        const progress = getReadingProgressForAllBooks(user.id)?.[book.id];
        const chapterIndex = progress ? progress.lastReadChapterIndex : 0;
        window.location.hash = `/read/book/${book.id}/chapter/${chapterIndex}`;
    };

    return (
        <div>
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border">
                <div className="container mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-lg" />
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">{user.name}</h1>
                            <p className="text-text-body dark:text-dark-text-body mt-1">Joined {new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                        </div>
                        <button 
                            onClick={() => { window.location.hash = '/edit-profile'; }}
                            className="bg-gray-100 dark:bg-dark-surface-alt font-sans font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                        >
                            <Cog6ToothIcon className="w-5 h-5"/> Edit Profile
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                       <StatCard icon={<BookOpenIcon className="w-7 h-7" />} value={allBooks.filter(b => b.progress === 100).length} label="Books Read" />
                       <StatCard icon={<ChartPieIcon className="w-7 h-7" />} value={chaptersReadCount} label="Chapters Read" />
                       <StatCard icon={<StarIcon className="w-7 h-7" />} value={user.stats.favoriteGenres[0]} label="Favorite Genre" />
                       <StatCard icon={<UserGroupIcon className="w-7 h-7" />} value={user.following.length} label="Authors Followed" />
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    <aside className="lg:w-64 flex-shrink-0">
                        <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-4 px-4">My Library</h2>
                        <nav className="space-y-1">
                            <ShelfLink name="All Books" isActive={activeShelfId === 'all'} onClick={() => setActiveShelfId('all')} />
                            <div className="h-px bg-gray-200 dark:bg-dark-border my-2"></div>
                             {dynamicShelves.map(shelf => (
                                 <ShelfLink key={shelf.id} name={shelf.name} isActive={activeShelfId === shelf.id} onClick={() => setActiveShelfId(shelf.id)} />
                             ))}
                        </nav>
                        <button className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-sans font-semibold text-accent bg-accent/10 px-4 py-2 rounded-lg hover:bg-accent/20 transition-colors">
                           <PlusIcon className="w-4 h-4" /> New Shelf
                        </button>
                    </aside>

                    <main className="flex-1">
                        <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-6">
                            {activeShelfName} ({booksToDisplay.length})
                        </h2>
                        {booksToDisplay.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                                {booksToDisplay.map(book => (
                                    <div key={book.id} onClick={() => handleBookClick(book)}>
                                        <LibraryBookCard book={book} onRemove={handleRemoveBook} onRestart={handleRestartBook} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-dark-surface rounded-2xl">
                                <p className="text-text-body dark:text-dark-text-body">This shelf is empty.</p>
                                <button onClick={() => window.location.hash = '/category'} className="mt-4 font-sans font-semibold text-accent hover:underline">Find books to add</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
};
