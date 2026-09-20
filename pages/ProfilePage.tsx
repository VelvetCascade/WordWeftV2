
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Shelf, LibraryBook, BookProgress, ChapterProgress, Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { BookOpenIcon, ChartPieIcon, UserGroupIcon, StarIcon, Cog6ToothIcon, PlusIcon, XMarkIcon, ArrowPathIcon, CheckCircleIcon, TwitterIcon, InstagramIcon, ThreadsIcon, ClockIcon, TrophyIcon, DocumentPlusIcon, ShareIcon } from '../components/icons/Icons';
import { AuthorShareModal } from '../components/AuthorShareModal';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { ConnectionsModal } from '../components/ConnectionsModal';
import { ResilientImage } from '../components/ResilientImage';
import { ConfirmDialog } from '../components/ConfirmDialog';

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
                    <ResilientImage
                        src={book.coverUrl}
                        alt={book.title}
                        fallbackLabel={book.title}
                        variant="cover"
                        className="w-full h-auto object-cover rounded-lg shadow-soft group-hover:shadow-lifted transition-all duration-300 transform group-hover:-translate-y-1"
                    />
                    {isCompleted && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <CheckCircleIcon className="w-12 h-12 text-white/80" />
                        </div>
                    )}
                </div>
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(book.id); }}
                        className="grid min-h-11 min-w-11 place-items-center bg-black/60 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity hover:bg-danger backdrop-blur-sm"
                        aria-label="Remove from library"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                    {book.progress > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestart(book.id); }}
                            className="grid min-h-11 min-w-11 place-items-center bg-black/60 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity hover:bg-accent backdrop-blur-sm"
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

const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string, onClick?: () => void, subLabel?: string }> = ({ icon, value, label, onClick, subLabel }) => {
    const content = <>
        <div>
            <div className="text-accent mb-3">{icon}</div>
            <p className="font-sans font-bold text-3xl text-text-rich dark:text-dark-text-rich tracking-tight">{value}</p>
        </div>
        <div>
            <p className="text-sm font-medium text-text-body dark:text-dark-text-body">{label}</p>
            {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
        </div>
    </>;
    const className = `ww-profile-stat-card w-full bg-background dark:bg-dark-surface-alt p-6 rounded-2xl flex flex-col justify-between h-full text-left ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors' : ''}`;
    return onClick
        ? <button type="button" className={className} onClick={onClick}>{content}</button>
        : <div className={className}>{content}</div>;
};

interface ProfilePageProps {
    user: User;
    onUserUpdate: (user: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
    const { trackEvent } = useAnalytics();
    const [activeShelfId, setActiveShelfId] = useState<'all' | string>('all');
    const [allProgress, setAllProgress] = useState<Record<string, BookProgress>>({});

    // Connections Modal State
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);

    // Create Shelf State
    const [isCreateShelfModalOpen, setIsCreateShelfModalOpen] = useState(false);
    const [newShelfName, setNewShelfName] = useState('');
    const [isCreatingShelf, setIsCreatingShelf] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileLoadError, setProfileLoadError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [libraryAction, setLibraryAction] = useState<{ kind: 'remove' | 'restart'; bookId: string } | null>(null);
    const [libraryActionBusy, setLibraryActionBusy] = useState(false);
    const [profileSection, setProfileSection] = useState<'portfolio' | 'library'>(() => user.writtenBooks?.length ? 'portfolio' : 'library');
    const [visibleBookCount, setVisibleBookCount] = useState(20);

    const [writtenBooks, setWrittenBooks] = useState<Book[]>([]);

    useEffect(() => {
        let active = true;
        setProfileLoadError('');
        Promise.all([api.getAllReadingProgress(user.id), api.getBooksByAuthor(user.id)])
            .then(([progress, books]) => {
                if (!active) return;
                setAllProgress(progress);
                setWrittenBooks(books);
            })
            .catch(() => {
                if (active) setProfileLoadError('Some profile details could not be loaded.');
            });
        return () => { active = false; };
    }, [user.id, loadAttempt]);

    useEffect(() => {
        if (!isCreateShelfModalOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isCreatingShelf) setIsCreateShelfModalOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isCreateShelfModalOpen, isCreatingShelf]);

    const isMatureAllowed = useMemo(() => {
        if (!user.allowMatureContent) return false;
        if (user.dateOfBirth) {
            const d = new Date(user.dateOfBirth);
            const now = new Date();
            let age = now.getFullYear() - d.getFullYear();
            if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
            if (age < 18) return false;
        }
        return true;
    }, [user.allowMatureContent, user.dateOfBirth]);

    const isMatureBook = (book: LibraryBook | Book) => {
        return !!(book.isMature || book.ageRating === 'MATURE_18' || book.ageRating === 'ADULT_21');
    };

    const userLibraryWithProgress = useMemo(() => {
        return user.library.map(shelf => ({
            ...shelf,
            books: shelf.books
                .filter(book => isMatureAllowed || !isMatureBook(book))
                .map(book => ({
                    ...book,
                    progress: allProgress[book.id]?.overallProgress ?? 0,
                }))
        }));
    }, [user.library, allProgress, isMatureAllowed]);

    // Helpers for Reading Time Display
    const formatReadingTime = (minutes: number) => {
        if (!minutes) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const dynamicShelves = useMemo(() => {
        // Use shelves with progress and mature filtering applied
        // We filter out 'all' because it's handled separately as the default active state
        return userLibraryWithProgress.filter(s => s.id !== 'all' && s.id !== '1' && s.name !== 'My List');
    }, [userLibraryWithProgress]);

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

    useEffect(() => setVisibleBookCount(20), [activeShelfId, profileSection]);
    const visibleLibraryBooks = booksToDisplay.slice(0, visibleBookCount);

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
        setProfileError('');
        setIsCreatingShelf(true);
        try {
            const updatedUser = await api.createShelf(user.id, newShelfName);
            onUserUpdate(updatedUser);
            setIsCreateShelfModalOpen(false);
            setNewShelfName('');
        } catch (error) {
            setProfileError('The shelf could not be created. Please try again.');
        } finally {
            setIsCreatingShelf(false);
        }
    };

    const handleLibraryAction = async () => {
        if (!libraryAction || libraryActionBusy) return;
        setLibraryActionBusy(true);
        setProfileError('');
        try {
            if (libraryAction.kind === 'remove') {
                const updatedUser = await api.removeBookFromLibrary(user.id, libraryAction.bookId);
                onUserUpdate(updatedUser);
            } else {
                await api.clearReadingProgress(user.id, libraryAction.bookId);
            }
            setAllProgress(current => {
                const next = { ...current };
                delete next[libraryAction.bookId];
                return next;
            });
            setLibraryAction(null);
        } catch {
            setProfileError(libraryAction.kind === 'remove'
                ? 'The book could not be removed from your library.'
                : 'Your reading progress could not be restarted.');
            setLibraryAction(null);
        } finally {
            setLibraryActionBusy(false);
        }
    };


    const handleBookClick = (book: LibraryBook) => {
        const progress = allProgress[book.id];
        const chapterIndex = progress ? progress.lastReadChapterIndex : 0;
        window.location.hash = `/read/book/${book.id}/chapter/${chapterIndex}`;
    };

    return (
        <div>
            {/* Header Section */}
            <div className="ww-profile-hero bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="ww-profile-hero-inner container mx-auto px-6 py-12 relative z-10">
                    <div className="ww-profile-identity flex flex-col md:flex-row items-start gap-8">
                        <div className="ww-profile-avatar relative group">
                            <ResilientImage src={user.avatarUrl} alt={user.name} fallbackLabel={user.name} className="w-32 h-32 rounded-3xl object-cover shadow-lifted border-4 border-white dark:border-dark-surface" />
                            <div className="absolute -bottom-3 -right-3 bg-white dark:bg-dark-surface p-1.5 rounded-xl shadow-md">
                                <span className="block px-2 py-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    {user.stats?.readerLevel || "Novice"}
                                </span>
                            </div>
                        </div>

                        <div className="ww-profile-info flex-1 w-full">
                            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                                <div>
                                    <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-2">{user.name}</h1>
                                    <p className="text-text-body dark:text-dark-text-body max-w-xl text-lg leading-relaxed break-words break-all">{user.bio || "No bio yet."}</p>

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
                                            <a href={user.socials.twitter} target="_blank" rel="noreferrer" aria-label="Open Twitter profile" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-[#1DA1F2] hover:text-white transition-all">
                                                <TwitterIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {user.socials?.instagram && (
                                            <a href={user.socials.instagram} target="_blank" rel="noreferrer" aria-label="Open Instagram profile" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 hover:text-white transition-all">
                                                <InstagramIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {user.socials?.threads && (
                                            <a href={user.socials.threads} target="_blank" rel="noreferrer" aria-label="Open Threads profile" className="p-2 bg-gray-100 dark:bg-dark-surface-alt rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                                                <ThreadsIcon className="w-5 h-5" />
                                            </a>
                                        )}

                                        {user.favoriteGenres && user.favoriteGenres.length > 0 && (
                                            <div className="ww-profile-genres flex flex-wrap gap-2 ml-2 pl-4 border-l border-gray-200 dark:border-dark-border">
                                                {user.favoriteGenres.map(g => (
                                                    <button type="button" onClick={() => window.location.hash = `/genre/${encodeURIComponent(g)}`} key={g} className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-dark-surface-alt dark:text-gray-400 px-2.5 py-1 rounded-md hover:text-accent">
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="ww-profile-actions flex gap-2 self-start md:self-start">
                                    <button
                                        onClick={() => { window.location.hash = '/edit-profile'; }}
                                        className="bg-gray-100 dark:bg-dark-surface-alt font-sans font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                                    >
                                        <Cog6ToothIcon className="w-4 h-4" /> Edit Profile
                                    </button>
                                    <button
                                        onClick={() => setIsShareOpen(true)}
                                        className="bg-accent text-white font-sans font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary transition-colors text-sm shadow-md"
                                    >
                                        <ShareIcon className="w-4 h-4" /> Share Portfolio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="ww-profile-stats grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-12">
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

            {(profileLoadError || profileError) && (
                <div role="alert" className="container mx-auto mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3 text-sm text-danger">
                    <span>{profileLoadError || profileError}</span>
                    {profileLoadError ? (
                        <button type="button" className="font-bold underline" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</button>
                    ) : (
                        <button type="button" className="font-bold underline" onClick={() => setProfileError('')}>Dismiss</button>
                    )}
                </div>
            )}

            <nav className="ww-own-profile-tabs" aria-label="Your profile sections">
                <div className="container mx-auto px-6">
                    <button className={profileSection === 'portfolio' ? 'active' : ''} onClick={() => setProfileSection('portfolio')}>Portfolio <span>{writtenBooks.length}</span></button>
                    <button className={profileSection === 'library' ? 'active' : ''} onClick={() => setProfileSection('library')}>Reading library <span>{allBooks.length}</span></button>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 py-10">
                {profileSection === 'portfolio' ? (
                    <section>
                        <div className="ww-profile-section-head"><div><span>Written by you</span><h2>Your published work</h2><p>The public stories readers see when they visit your portfolio.</p></div><button onClick={() => { window.location.hash = '/write/book/create'; }}><PlusIcon className="w-4 h-4" /> New story</button></div>
                        {writtenBooks.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                                {writtenBooks.map(book => <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />)}
                            </div>
                        ) : (
                            <div className="ww-profile-empty"><BookOpenIcon className="w-11 h-11" /><h3>Your portfolio is ready for its first story.</h3><p>Publish a story and it will appear here automatically.</p><button onClick={() => { window.location.hash = '/write'; }}>Open writer studio</button></div>
                        )}
                    </section>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                        <aside className="ww-library-shelf-nav lg:w-64 flex-shrink-0">
                            <div className="ww-library-shelf-nav-inner">
                                <div className="ww-library-shelf-label"><h2>Library shelves</h2><button onClick={() => setIsCreateShelfModalOpen(true)} aria-label="Create a shelf"><PlusIcon className="w-4 h-4" /></button></div>
                                <nav>
                                    <ShelfLink name="All Books" count={allBooks.length} isActive={activeShelfId === 'all'} onClick={() => setActiveShelfId('all')} />
                                    {dynamicShelves.map(shelf => <ShelfLink key={shelf.id} name={shelf.name} count={shelf.books.length} isActive={activeShelfId === shelf.id} onClick={() => setActiveShelfId(shelf.id)} />)}
                                </nav>
                            </div>
                        </aside>

                        <main className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-7"><div><span className="ww-page-eyebrow">Reading library</span><h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">{activeShelfName}</h2></div><span className="text-xs text-gray-500">{booksToDisplay.length} {booksToDisplay.length === 1 ? 'book' : 'books'}</span></div>
                            {booksToDisplay.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                                        {visibleLibraryBooks.map(book => <div key={book.id} onClick={() => handleBookClick(book as LibraryBook)}><LibraryBookCard book={book as LibraryBook} onRemove={(bookId) => setLibraryAction({ kind: 'remove', bookId })} onRestart={(bookId) => setLibraryAction({ kind: 'restart', bookId })} /></div>)}
                                    </div>
                                    {visibleBookCount < booksToDisplay.length && <div className="mt-10 text-center"><button onClick={() => setVisibleBookCount(count => count + 20)} className="rounded-xl border border-accent/25 px-6 py-3 text-sm font-bold text-accent">Show more books</button></div>}
                                </>
                            ) : (
                                <div className="ww-profile-empty"><BookOpenIcon className="w-11 h-11" /><h3>This shelf is empty.</h3><p>Save a story to keep it close and track your reading progress.</p><button onClick={() => window.location.hash = '/category'}>Browse library</button></div>
                            )}
                        </main>
                    </div>
                )}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onMouseDown={(event) => { if (event.target === event.currentTarget && !isCreatingShelf) setIsCreateShelfModalOpen(false); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="create-shelf-title" className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="create-shelf-title" className="text-xl font-bold font-sans text-text-rich dark:text-dark-text-rich">Create New Shelf</h3>
                            <button type="button" aria-label="Close create shelf dialog" onClick={() => setIsCreateShelfModalOpen(false)} className="grid min-h-11 min-w-11 place-items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
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

            <ConfirmDialog
                isOpen={!!libraryAction}
                title={libraryAction?.kind === 'remove' ? 'Remove this book?' : 'Restart this book?'}
                message={libraryAction?.kind === 'remove'
                    ? 'This removes the book from your library. You can add it again later.'
                    : 'Your saved reading progress for this book will return to the beginning.'}
                confirmLabel={libraryAction?.kind === 'remove' ? 'Remove book' : 'Restart progress'}
                processingLabel={libraryAction?.kind === 'remove' ? 'Removing…' : 'Restarting…'}
                isProcessing={libraryActionBusy}
                tone={libraryAction?.kind === 'remove' ? 'danger' : 'warning'}
                onCancel={() => { if (!libraryActionBusy) setLibraryAction(null); }}
                onConfirm={handleLibraryAction}
            />

            <Footer />

            <AuthorShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                author={user}
                authorBooks={writtenBooks}
            />
        </div>
    );
};
