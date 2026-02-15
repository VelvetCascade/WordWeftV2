
import React, { useState, useEffect, useMemo } from 'react';
import type { Author, Book, Shelf, LibraryBook, BookProgress } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { UserGroupIcon, PlusIcon, CheckCircleIcon, BookOpenIcon, ClockIcon, TrophyIcon, DocumentPlusIcon, TwitterIcon, InstagramIcon, ThreadsIcon, LockClosedIcon, GlobeAltIcon } from '../components/icons/Icons';
import { ConnectionsModal } from '../components/ConnectionsModal';
import * as api from '../api/client';

const ReadOnlyLibraryBookCard: React.FC<{ book: LibraryBook }> = ({ book }) => {
    const isCompleted = book.progress >= 100;

    return (
        <div className="group">
            <div className="relative cursor-pointer" onClick={() => window.location.hash = `/book/${book.id}`}>
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
            <div className="mt-3 cursor-pointer" onClick={() => window.location.hash = `/book/${book.id}`}>
                <h3 className="font-sans font-bold text-sm text-text-rich dark:text-dark-text-rich truncate">{book.title}</h3>
                <p className="text-xs text-text-body dark:text-dark-text-body truncate">{book.author.name}</p>
                {!isCompleted ? (
                    <>
                        <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-accent h-1.5" style={{ width: `${book.progress}%` }}></div>
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

const ShelfLink: React.FC<{ name: string; count: number; isActive: boolean; onClick: () => void; isCustom?: boolean; visibility?: 'PUBLIC' | 'PRIVATE' }> = ({ name, count, isActive, onClick, isCustom, visibility }) => (
    <button
        onClick={onClick}
        className={`w-full flex justify-between items-center font-sans font-medium px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-accent text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
    >
        <div className="flex items-center gap-2">
            <span>{name}</span>
            {isCustom && visibility === 'PRIVATE' && <LockClosedIcon className={`w-3 h-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />}
            {isCustom && visibility === 'PUBLIC' && <GlobeAltIcon className={`w-3 h-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />}
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-border'}`}>{count}</span>
    </button>
);

export const AuthorPage: React.FC<{ authorId: string }> = ({ authorId }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);
    const [activeShelfId, setActiveShelfId] = useState<'all' | string>('all');

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getAuthorById(authorId),
            api.getBooksByAuthor(authorId)
        ]).then(([fetchedAuthor, fetchedBooks]) => {
            setAuthor(fetchedAuthor);
            setAuthorBooks(fetchedBooks);
            setIsLoading(false);
        });
    }, [authorId]);

    const formatReadingTime = (minutes: number) => {
        if (!minutes) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const dynamicShelves = useMemo(() => {
        return author?.library.filter(s => s.id !== 'all' && s.id !== '1' && s.name !== 'My List') || [];
    }, [author]);

    const defaultShelves = useMemo(() => {
        const SYSTEM_IDS = ['reading', 'toread', 'completed'];
        return dynamicShelves.filter(s => SYSTEM_IDS.includes(s.id) || s.type === 'default');
    }, [dynamicShelves]);

    const customShelves = useMemo(() => {
        const SYSTEM_IDS = ['reading', 'toread', 'completed'];
        return dynamicShelves.filter(s => !SYSTEM_IDS.includes(s.id) && s.type !== 'default');
    }, [dynamicShelves]);

    const allBooks = useMemo(() => {
        const books = new Map<string, LibraryBook>();
        dynamicShelves.forEach(shelf => {
            shelf.books.forEach(book => {
                books.set(book.id, book);
            });
        });
        return Array.from(books.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [dynamicShelves]);

    const writtenBooks = useMemo(() => authorBooks || [], [authorBooks]);

    const booksToDisplay = useMemo(() => {
        if (activeShelfId === 'all') return allBooks;
        if (activeShelfId === 'published') return writtenBooks; // Use enriched books
        return dynamicShelves.find(s => s.id === activeShelfId)?.books ?? [];
    }, [activeShelfId, allBooks, writtenBooks, dynamicShelves]);

    const activeShelfName = useMemo(() => {
        if (activeShelfId === 'all') return 'Public Library';
        if (activeShelfId === 'published') return 'Published Works';
        return dynamicShelves.find(s => s.id === activeShelfId)?.name;
    }, [activeShelfId, dynamicShelves]);

    const handleFollowToggle = async () => {
        if (!author) return;

        // Optimistic UI update
        const prevAuthor = { ...author };
        const isNowFollowing = !author.isFollowing;
        setAuthor({
            ...author,
            isFollowing: isNowFollowing,
            followersCount: (author.followersCount || 0) + (isNowFollowing ? 1 : -1)
        });

        setIsFollowLoading(true);
        try {
            if (prevAuthor.isFollowing) {
                await api.unfollowUser(author.id);
            } else {
                await api.followUser(author.id);
            }
        } catch (error) {
            setAuthor(prevAuthor);
            if (!localStorage.getItem('wordweft_jwt')) {
                window.location.hash = '/auth';
            }
        } finally {
            setIsFollowLoading(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading author profile...</div>;
    }

    if (!author) {
        return <div className="min-h-screen flex items-center justify-center">Author not found.</div>;
    }

    return (
        <div>
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <div className="relative group">
                            <img src={author.avatarUrl} alt={author.name} className="w-32 h-32 rounded-3xl object-cover shadow-lifted border-4 border-white dark:border-dark-surface" />
                            <div className="absolute -bottom-3 -right-3 bg-white dark:bg-dark-surface p-1.5 rounded-xl shadow-md">
                                <span className="block px-2 py-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    {author.stats?.readerLevel || "Novice"}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                                <div>
                                    <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-2">{author.name}</h1>
                                    <div className="flex items-center gap-4 mb-2">
                                        <button
                                            onClick={handleFollowToggle}
                                            disabled={isFollowLoading}
                                            className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all transform active:scale-95 ${author.isFollowing
                                                ? 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-surface'
                                                : 'bg-accent text-white hover:bg-primary shadow-lg hover:shadow-xl'
                                                }`}
                                        >
                                            {author.isFollowing ? (
                                                <>
                                                    <CheckCircleIcon className="w-4 h-4" /> Following
                                                </>
                                            ) : (
                                                <>
                                                    <PlusIcon className="w-4 h-4" /> Follow
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-text-body dark:text-dark-text-body max-w-xl text-lg leading-relaxed">{author.bio || "No bio yet."}</p>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        <p>Joined {new Date(author.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                                        {author.location && <p>📍 {author.location}</p>}
                                        {author.website && (
                                            <a href={author.website.startsWith('http') ? author.website : `https://${author.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline hover:text-primary transition-colors">
                                                🔗 {author.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                    </div>

                                    {/* Socials & Genres */}
                                    <div className="flex flex-wrap items-center gap-4 mt-6">
                                        {author.socials?.twitter && (
                                            <a href={author.socials.twitter} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-[#1DA1F2] hover:text-white transition-all">
                                                <TwitterIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {author.socials?.instagram && (
                                            <a href={author.socials.instagram} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 hover:text-white transition-all">
                                                <InstagramIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {author.socials?.threads && (
                                            <a href={author.socials.threads} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                                                <ThreadsIcon className="w-5 h-5" />
                                            </a>
                                        )}

                                        {author.favoriteGenres && author.favoriteGenres.length > 0 && (
                                            <div className="flex flex-wrap gap-2 ml-2 pl-4 border-l border-gray-200 dark:border-dark-border">
                                                {author.favoriteGenres.map(g => (
                                                    <span key={g} className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-dark-surface-alt dark:text-gray-400 px-2.5 py-1 rounded-md">
                                                        {g}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-12">
                        <StatCard
                            icon={<TrophyIcon className="w-6 h-6" />}
                            value={author.stats?.readerLevel || "Novice"}
                            label="Reader Rank"
                            subLabel="Based on total words"
                        />
                        <StatCard
                            icon={<ClockIcon className="w-6 h-6" />}
                            value={formatReadingTime(author.stats?.readingTimeMinutes || 0)}
                            label="Time Reading"
                            subLabel="Estimated total time"
                        />
                        <StatCard
                            icon={<DocumentPlusIcon className="w-6 h-6" />}
                            value={(author.stats?.totalWordsRead || 0).toLocaleString()}
                            label="Words Read"
                        />
                        <StatCard
                            icon={<UserGroupIcon className="w-6 h-6" />}
                            value={author.followersCount || 0}
                            label="Followers"
                            onClick={() => setConnectionModalType('followers')}
                        />
                        <StatCard
                            icon={<UserGroupIcon className="w-6 h-6" />}
                            value={author.followingCount || 0}
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
                        <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-6 px-2">Library</h2>
                        <nav className="space-y-2">
                            <ShelfLink name="All Public Books" count={allBooks.length} isActive={activeShelfId === 'all'} onClick={() => setActiveShelfId('all')} />
                            {defaultShelves.map(shelf => (
                                <ShelfLink key={shelf.id} name={shelf.name} count={shelf.books.length} isActive={activeShelfId === shelf.id} onClick={() => setActiveShelfId(shelf.id)} />
                            ))}
                        </nav>

                        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-dark-border">
                            <h3 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Public Shelves</h3>
                            <nav className="space-y-2">
                                {customShelves.map(shelf => (
                                    <ShelfLink
                                        key={shelf.id}
                                        name={shelf.name}
                                        count={shelf.books.length}
                                        isActive={activeShelfId === shelf.id}
                                        onClick={() => setActiveShelfId(shelf.id)}
                                        isCustom={true}
                                        visibility={shelf.visibility}
                                    />
                                ))}
                                {customShelves.length === 0 && (
                                    <p className="px-2 text-sm text-gray-400 italic">No public shelves.</p>
                                )}
                            </nav>
                        </div>
                        {writtenBooks.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-dark-border">
                                <h3 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Published Works</h3>
                                <ShelfLink name="Published Works" count={writtenBooks.length} isActive={activeShelfId === 'published'} onClick={() => setActiveShelfId('published')} />
                            </div>
                        )}
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich flex items-center gap-3">
                                {activeShelfName}
                            </h2>
                        </div>

                        {booksToDisplay.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                                {booksToDisplay.map(book => (
                                    <div key={book.id}>
                                        {activeShelfId === 'published' ? (
                                            <BookCard book={book as Book} onClick={() => window.location.hash = `/book/${book.id}`} />
                                        ) : (
                                            <ReadOnlyLibraryBookCard book={book as LibraryBook} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-dark-surface rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                                <BookOpenIcon className="w-12 h-12 text-gray-300 dark:text-dark-border mb-4" />
                                <p className="text-text-body dark:text-dark-text-body font-medium">This shelf is empty.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <ConnectionsModal
                isOpen={!!connectionModalType}
                onClose={() => setConnectionModalType(null)}
                title={connectionModalType === 'followers' ? 'Followers' : 'Following'}
                userId={author.id}
                type={connectionModalType || 'followers'}
            />

            <Footer />
        </div>
    );
};
