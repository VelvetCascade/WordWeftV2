
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Shelf, LibraryBook, BookProgress, ChapterProgress, Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { BookOpenIcon, ChartPieIcon, UserGroupIcon, StarIcon, Cog6ToothIcon, PlusIcon, XMarkIcon, ArrowPathIcon, CheckCircleIcon, TwitterIcon, InstagramIcon, ThreadsIcon, ClockIcon, TrophyIcon, DocumentPlusIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { ConnectionsModal } from '../components/ConnectionsModal';

const LibraryBookCard: React.FC<{ book: LibraryBook, onRemove: (bookId: string) => void, onRestart: (bookId: string) => void }> = ({ book, onRemove, onRestart }) => {

    const isCompleted = book.progress >= 100;

    const publishedChaptersCount = useMemo(() => book.chapters.filter(c => c.status === 'published').length, [book.chapters]);
    const completedChapters = useMemo(() => {
        return Math.floor((book.progress / 100) * publishedChaptersCount);
    }, [book.progress, publishedChaptersCount]);

    const cardTooltip = `${completedChapters} / ${publishedChaptersCount} chapters completed.`;

    return (
        <div className="group" title={cardTooltip}>
            <div className="relative">
                <div className="cursor-pointer" onClick={() => window.location.hash = `/read/book/${book.id}/chapter/0`}>
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
                    {book.progress > 0 && (
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

const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string, onClick?: () => void, subLabel?: string }> = ({ icon, value, label, onClick, subLabel }) => (
    <div
        className={`bg-background dark:bg-dark-surface-alt p-6 rounded-2xl flex flex-col justify-between h-full ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors' : ''}`}
        onClick={onClick}
    >
        <div>
            <div className="text-accent mb-3">{icon}</div>
            <p className="font-sans font-bold text-3xl text-text-rich dark:text-dark-text-rich tracking-tight">{value}</p>
        </div>
        <div>
            <p className="text-sm font-medium text-text-body dark:text-dark-text-body">{label}</p>
            {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
        </div>
    </div>
);

interface ProfilePageProps {
    user: User;
    onUserUpdate: (user: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
    const [activeShelfId, setActiveShelfId] = useState<'all' | string>('all');
    const [allProgress, setAllProgress] = useState<Record<string, BookProgress>>({});

    // Connections Modal State
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);

    // Create Shelf State
    const [isCreateShelfModalOpen, setIsCreateShelfModalOpen] = useState(false);
    const [newShelfName, setNewShelfName] = useState('');
    const [isCreatingShelf, setIsCreatingShelf] = useState(false);

    const [writtenBooks, setWrittenBooks] = useState<Book[]>([]);

    useEffect(() => {
        api.getAllReadingProgress(user.id).then(setAllProgress);
        api.getBooksByAuthor(user.id).then(setWrittenBooks);
    }, [user.id]);

    const userLibraryWithProgress = useMemo(() => {
        return user.library.map(shelf => ({
            ...shelf,
            books: shelf.books.map(book => ({
                ...book,
                progress: allProgress[book.id]?.overallProgress ?? 0,
            }))
        }));
    }, [user.library, allProgress]);

    // Helpers for Reading Time Display
    const formatReadingTime = (minutes: number) => {
        if (!minutes) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const dynamicShelves = useMemo(() => {
        // Use shelves directly from backend, ensuring proper ordering
        // We filter out 'all' because it's handled separately as the default active state
        return user.library.filter(s => s.id !== 'all' && s.id !== '1' && s.name !== 'My List');
    }, [user.library]);

    const allBooks = useMemo(() => {
        const books = new Map<string, LibraryBook>();
        dynamicShelves.forEach(shelf => {
            shelf.books.forEach(book => {
                books.set(book.id, book);
            });
        });
        return Array.from(books.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [dynamicShelves]);

    const booksToDisplay = useMemo(() => {
        if (activeShelfId === 'all') return allBooks;
        if (activeShelfId === 'published') return writtenBooks;
        return dynamicShelves.find(s => s.id === activeShelfId)?.books ?? [];
    }, [activeShelfId, allBooks, writtenBooks, dynamicShelves]);

    const activeShelfName = useMemo(() => {
        if (activeShelfId === 'all') return 'All Books';
        if (activeShelfId === 'published') return 'Published Works';
        return dynamicShelves.find(s => s.id === activeShelfId)?.name;
    }, [activeShelfId, dynamicShelves]);

    const ShelfLink: React.FC<{ name: string; count: number; isActive: boolean; onClick: () => void }> = ({ name, count, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`w-full flex justify-between items-center font-sans font-medium px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-accent text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
        >
            <span>{name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-border'}`}>{count}</span>
        </button>
    );

    const handleCreateShelf = async () => {
        if (!newShelfName.trim()) return;
        setIsCreatingShelf(true);
        try {
            const updatedUser = await api.createShelf(user.id, newShelfName);
            onUserUpdate(updatedUser);
            setIsCreateShelfModalOpen(false);
            setNewShelfName('');
        } catch (error) {
            console.error("Failed to create shelf", error);
            // Optionally set error state
        } finally {
            setIsCreatingShelf(false);
        }
    };

    const handleRemoveBook = async (bookId: string) => {
        const updatedUser = await api.removeBookFromLibrary(user.id, bookId);
        onUserUpdate(updatedUser);
        const newProgress = { ...allProgress };
        delete newProgress[bookId];
        setAllProgress(newProgress);
    };

    const handleRestartBook = async (bookId: string) => {
        await api.clearReadingProgress(user.id, bookId);
        const newProgress = { ...allProgress };
        delete newProgress[bookId];
        setAllProgress(newProgress);
    };


    const handleBookClick = (book: LibraryBook) => {
        const progress = allProgress[book.id];
        const chapterIndex = progress ? progress.lastReadChapterIndex : 0;
        window.location.hash = `/read/book/${book.id}/chapter/${chapterIndex}`;
    };

    return (
        <div>
            {/* Header Section */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <div className="relative group">
                            <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-3xl object-cover shadow-lifted border-4 border-white dark:border-dark-surface" />
                            <div className="absolute -bottom-3 -right-3 bg-white dark:bg-dark-surface p-1.5 rounded-xl shadow-md">
                                <span className="block px-2 py-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    {user.stats?.readerLevel || "Novice"}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                                <div>
                                    <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-2">{user.name}</h1>
                                    <p className="text-text-body dark:text-dark-text-body max-w-xl text-lg leading-relaxed">{user.bio || "No bio yet."}</p>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        <p>Joined {new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                                        {user.location && <p>📍 {user.location}</p>}
                                        {user.website && (
                                            <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline hover:text-primary transition-colors">
                                                🔗 {user.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                    </div>

                                    {/* Socials & Genres */}
                                    <div className="flex flex-wrap items-center gap-4 mt-6">
                                        {user.socials?.twitter && (
                                            <a href={user.socials.twitter} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-[#1DA1F2] hover:text-white transition-all">
                                                <TwitterIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {user.socials?.instagram && (
                                            <a href={user.socials.instagram} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 hover:text-white transition-all">
                                                <InstagramIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {user.socials?.threads && (
                                            <a href={user.socials.threads} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                                                <ThreadsIcon className="w-5 h-5" />
                                            </a>
                                        )}

                                        {user.favoriteGenres && user.favoriteGenres.length > 0 && (
                                            <div className="flex flex-wrap gap-2 ml-2 pl-4 border-l border-gray-200 dark:border-dark-border">
                                                {user.favoriteGenres.map(g => (
                                                    <span key={g} className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-dark-surface-alt dark:text-gray-400 px-2.5 py-1 rounded-md">
                                                        {g}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => { window.location.hash = '/edit-profile'; }}
                                    className="self-start md:self-start bg-gray-100 dark:bg-dark-surface-alt font-sans font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                                >
                                    <Cog6ToothIcon className="w-4 h-4" /> Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-12">
                        <StatCard
                            icon={<TrophyIcon className="w-6 h-6" />}
                            value={user.stats?.readerLevel || "Novice"}
                            label="Reader Rank"
                            subLabel="Based on total words"
                        />
                        <StatCard
                            icon={<ClockIcon className="w-6 h-6" />}
                            value={formatReadingTime(user.stats?.readingTimeMinutes || 0)}
                            label="Time Reading"
                            subLabel="Estimated total time"
                        />
                        <StatCard
                            icon={<DocumentPlusIcon className="w-6 h-6" />}
                            value={(user.stats?.totalWordsRead || 0).toLocaleString()}
                            label="Words Read"
                        />
                        <StatCard
                            icon={<UserGroupIcon className="w-6 h-6" />}
                            value={user.followersCount || 0}
                            label="Followers"
                            onClick={() => setConnectionModalType('followers')}
                        />
                        <StatCard
                            icon={<UserGroupIcon className="w-6 h-6" />}
                            value={user.followingCount || 0}
                            label="Following"
                            onClick={() => setConnectionModalType('following')}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Sidebar Navigation */}
                    <aside className="lg:w-72 flex-shrink-0">
                        <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-6 px-2">Library Shelves</h2>
                        <nav className="space-y-2">
                            <ShelfLink name="All Books" count={allBooks.length} isActive={activeShelfId === 'all'} onClick={() => setActiveShelfId('all')} />
                            {dynamicShelves.map(shelf => (
                                <ShelfLink key={shelf.id} name={shelf.name} count={shelf.books.length} isActive={activeShelfId === shelf.id} onClick={() => setActiveShelfId(shelf.id)} />
                            ))}
                            {writtenBooks.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-dark-border">
                                    <h3 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Written By You</h3>
                                    <ShelfLink name="Published Works" count={writtenBooks.length} isActive={activeShelfId === 'published'} onClick={() => setActiveShelfId('published')} />
                                </div>
                            )}
                        </nav>
                        <button
                            onClick={() => setIsCreateShelfModalOpen(true)}
                            className="w-full mt-6 flex items-center justify-center gap-2 text-sm font-sans font-bold text-accent bg-accent/10 px-4 py-3 rounded-xl hover:bg-accent/20 transition-colors border border-accent/20"
                        >
                            <PlusIcon className="w-4 h-4" /> Create New Shelf
                        </button>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">
                                {activeShelfName}
                            </h2>
                            {/* Potential Sort/Filter controls here */}
                        </div>

                        {booksToDisplay.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                                {booksToDisplay.map(book => (
                                    <div key={book.id} onClick={() => activeShelfId === 'published' ? null : handleBookClick(book as LibraryBook)}>
                                        {activeShelfId === 'published' ? (
                                            <BookCard book={book as Book} onClick={() => window.location.hash = `/book/${book.id}`} />
                                        ) : (
                                            <LibraryBookCard book={book as LibraryBook} onRemove={handleRemoveBook} onRestart={handleRestartBook} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-dark-surface rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                                <BookOpenIcon className="w-12 h-12 text-gray-300 dark:text-dark-border mb-4" />
                                <p className="text-text-body dark:text-dark-text-body font-medium">This shelf is empty.</p>
                                <button onClick={() => window.location.hash = '/category'} className="mt-4 font-sans font-bold text-accent hover:underline">Browse Library</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <ConnectionsModal
                isOpen={!!connectionModalType}
                onClose={() => setConnectionModalType(null)}
                title={connectionModalType === 'followers' ? 'Followers' : 'Following'}
                userId={user.id}
                type={connectionModalType || 'followers'}
            />

            {/* Create Shelf Modal */}
            {isCreateShelfModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-sans text-text-rich dark:text-dark-text-rich">Create New Shelf</h3>
                            <button onClick={() => setIsCreateShelfModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shelf Name</label>
                                <input
                                    type="text"
                                    value={newShelfName}
                                    onChange={(e) => setNewShelfName(e.target.value)}
                                    placeholder="e.g. My Favorites, Must Read"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-surface-alt border-2 border-transparent focus:border-accent focus:bg-white dark:focus:bg-dark-surface outline-none transition-all font-sans text-text-rich dark:text-dark-text-rich"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsCreateShelfModalOpen(false)}
                                    className="flex-1 py-3 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-surface-alt hover:bg-gray-200 dark:hover:bg-dark-border rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateShelf}
                                    disabled={!newShelfName.trim() || isCreatingShelf}
                                    className="flex-1 py-3 font-bold text-white bg-accent hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-accent/20"
                                >
                                    {isCreatingShelf ? 'Creating...' : 'Create Shelf'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};
