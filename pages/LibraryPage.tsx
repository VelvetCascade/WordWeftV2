import React, { useEffect, useMemo, useState } from 'react';
import type { Book, BookProgress, LibraryBook, Shelf, User } from '../types';
import { Footer } from '../components/Footer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResilientImage } from '../components/ResilientImage';
import {
    ArrowPathIcon,
    BookOpenIcon,
    CheckCircleIcon,
    PlusIcon,
    SearchIcon,
    XMarkIcon,
} from '../components/icons/Icons';
import * as api from '../api/client';

type LibrarySort = 'recent' | 'title' | 'progress';

const isMatureBook = (book: LibraryBook | Book) => (
    !!(book.isMature || book.ageRating === 'MATURE_18' || book.ageRating === 'ADULT_21')
);

const LibraryBookCard: React.FC<{
    book: LibraryBook;
    onOpen: (book: LibraryBook) => void;
    onRemove: (bookId: string) => void;
    onRestart: (bookId: string) => void;
}> = ({ book, onOpen, onRemove, onRestart }) => {
    const publishedChapters = book.chapters.filter(chapter => chapter.status === 'published').length;
    const completedChapters = Math.floor((book.progress / 100) * publishedChapters);
    const isCompleted = book.progress >= 100;

    return (
        <article className="ww-reading-card group" title={`${completedChapters} of ${publishedChapters} chapters completed`}>
            <div className="relative">
                <button type="button" className="block w-full text-left" onClick={() => onOpen(book)} aria-label={`Continue ${book.title}`}>
                    <ResilientImage src={book.coverUrl} alt={book.title} fallbackLabel={book.title} variant="cover" className="h-auto w-full rounded-lg object-cover shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lifted" />
                    {isCompleted && <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/35"><CheckCircleIcon className="h-12 w-12 text-white/90" /></span>}
                </button>
                <div className="absolute right-1.5 top-1.5 flex flex-col gap-1.5">
                    <button type="button" onClick={() => onRemove(book.id)} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-black/65 text-white opacity-100 backdrop-blur-sm transition hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`Remove ${book.title} from library`}><XMarkIcon className="h-4 w-4" /></button>
                    {book.progress > 0 && <button type="button" onClick={() => onRestart(book.id)} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-black/65 text-white opacity-100 backdrop-blur-sm transition hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`Restart ${book.title}`}><ArrowPathIcon className="h-4 w-4" /></button>}
                </div>
            </div>
            <button type="button" className="mt-3 block w-full text-left" onClick={() => onOpen(book)}>
                <h3 className="truncate text-sm font-bold text-text-rich dark:text-dark-text-rich">{book.title}</h3>
                <p className="truncate text-xs text-text-body dark:text-dark-text-body">{book.author.name}</p>
                {isCompleted ? (
                    <span className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success"><CheckCircleIcon className="h-4 w-4" /> Completed</span>
                ) : (
                    <>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-border"><span className="block h-full bg-accent transition-all" style={{ width: `${book.progress}%` }} /></span>
                        <span className="mt-1 block text-right text-xs text-gray-500 dark:text-gray-400">{book.progress}%</span>
                    </>
                )}
            </button>
        </article>
    );
};

const ShelfLink: React.FC<{ shelf: Shelf; count: number; active: boolean; onClick: () => void }> = ({ shelf, count, active, onClick }) => (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${active ? 'bg-accent text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-surface-alt'}`} aria-pressed={active}>
        <span className="truncate">{shelf.name}</span>
        <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-border'}`}>{count}</span>
    </button>
);

export const LibraryPage: React.FC<{ user: User; onUserUpdate: (user: User) => void }> = ({ user, onUserUpdate }) => {
    const [allProgress, setAllProgress] = useState<Record<string, BookProgress>>({});
    const [activeShelfId, setActiveShelfId] = useState('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<LibrarySort>('recent');
    const [visibleBookCount, setVisibleBookCount] = useState(20);
    const [loadError, setLoadError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [isCreateShelfOpen, setIsCreateShelfOpen] = useState(false);
    const [newShelfName, setNewShelfName] = useState('');
    const [isCreatingShelf, setIsCreatingShelf] = useState(false);
    const [actionError, setActionError] = useState('');
    const [libraryAction, setLibraryAction] = useState<{ kind: 'remove' | 'restart'; bookId: string } | null>(null);
    const [libraryActionBusy, setLibraryActionBusy] = useState(false);

    useEffect(() => {
        let active = true;
        setLoadError('');
        api.getAllReadingProgress(user.id)
            .then(progress => { if (active) setAllProgress(progress); })
            .catch(() => { if (active) setLoadError('Your reading progress could not be loaded.'); });
        return () => { active = false; };
    }, [user.id, loadAttempt]);

    useEffect(() => {
        if (!isCreateShelfOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isCreatingShelf) setIsCreateShelfOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isCreateShelfOpen, isCreatingShelf]);

    const matureContentAllowed = useMemo(() => {
        if (!user.allowMatureContent) return false;
        if (!user.dateOfBirth) return true;
        const birthday = new Date(user.dateOfBirth);
        const now = new Date();
        let age = now.getFullYear() - birthday.getFullYear();
        if (now < new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate())) age--;
        return age >= 18;
    }, [user.allowMatureContent, user.dateOfBirth]);

    const shelves = useMemo<Shelf[]>(() => (user.library ?? [])
        .filter(shelf => shelf.id !== '1' && shelf.name !== 'My List')
        .map(shelf => ({
            ...shelf,
            books: shelf.books
                .filter(book => matureContentAllowed || !isMatureBook(book))
                .map(book => ({ ...book, progress: allProgress[book.id]?.overallProgress ?? 0 })),
        })), [user.library, allProgress, matureContentAllowed]);

    const allBooks = useMemo(() => {
        const explicitAllShelf = shelves.find(shelf => shelf.id === 'all');
        if (explicitAllShelf) return [...explicitAllShelf.books];
        const unique = new Map<string, LibraryBook>();
        shelves.forEach(shelf => shelf.books.forEach(book => unique.set(book.id, book)));
        return Array.from(unique.values());
    }, [shelves]);

    const navigationShelves = useMemo<Shelf[]>(() => {
        const withoutAll = shelves.filter(shelf => shelf.id !== 'all');
        return [{ id: 'all', name: 'All books', books: allBooks }, ...withoutAll];
    }, [shelves, allBooks]);

    const activeShelf = navigationShelves.find(shelf => shelf.id === activeShelfId) ?? navigationShelves[0];
    const filteredBooks = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const selected = activeShelf?.books ?? [];
        const filtered = normalizedQuery
            ? selected.filter(book => [book.title, book.author.name, ...(book.genres ?? [])].join(' ').toLocaleLowerCase().includes(normalizedQuery))
            : selected;
        return [...filtered].sort((left, right) => {
            if (sort === 'title') return left.title.localeCompare(right.title);
            if (sort === 'progress') return right.progress - left.progress;
            return new Date(right.addedDate || 0).getTime() - new Date(left.addedDate || 0).getTime();
        });
    }, [activeShelf, query, sort]);

    useEffect(() => setVisibleBookCount(20), [activeShelfId, query, sort]);

    const inProgressCount = allBooks.filter(book => book.progress > 0 && book.progress < 100).length;
    const completedCount = allBooks.filter(book => book.progress >= 100).length;

    const openBook = (book: LibraryBook) => {
        const progress = allProgress[book.id];
        window.location.hash = `/read/book/${book.id}/chapter/${progress?.lastReadChapterIndex ?? 0}`;
    };

    const createShelf = async () => {
        const name = newShelfName.trim();
        if (!name || isCreatingShelf) return;
        setIsCreatingShelf(true);
        setActionError('');
        try {
            const updatedUser = await api.createShelf(user.id, name);
            onUserUpdate(updatedUser);
            setNewShelfName('');
            setIsCreateShelfOpen(false);
        } catch {
            setActionError('The shelf could not be created. Please try again.');
        } finally {
            setIsCreatingShelf(false);
        }
    };

    const runLibraryAction = async () => {
        if (!libraryAction || libraryActionBusy) return;
        setLibraryActionBusy(true);
        setActionError('');
        try {
            if (libraryAction.kind === 'remove') {
                onUserUpdate(await api.removeBookFromLibrary(user.id, libraryAction.bookId));
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
            setActionError(libraryAction.kind === 'remove' ? 'The book could not be removed.' : 'Reading progress could not be restarted.');
            setLibraryAction(null);
        } finally {
            setLibraryActionBusy(false);
        }
    };

    return (
        <div className="ww-reading-library-page">
            <header className="ww-reading-library-hero">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="ww-reading-library-heading">
                        <div><span className="ww-page-eyebrow">Your reading space</span><h1>Your library</h1><p>Find the stories you saved and continue from exactly where you stopped.</p></div>
                        <button type="button" onClick={() => { window.location.hash = '/category'; }}><BookOpenIcon className="h-5 w-5" /> Discover stories</button>
                    </div>
                    <dl className="ww-reading-library-summary"><div><dt>Saved</dt><dd>{allBooks.length}</dd></div><div><dt>In progress</dt><dd>{inProgressCount}</dd></div><div><dt>Completed</dt><dd>{completedCount}</dd></div></dl>
                </div>
            </header>

            {(loadError || actionError) && <div role="alert" className="container mx-auto mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3 text-sm text-danger"><span>{loadError || actionError}</span>{loadError ? <button type="button" className="font-bold underline" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</button> : <button type="button" className="font-bold underline" onClick={() => setActionError('')}>Dismiss</button>}</div>}

            <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
                <div className="ww-library-toolbar">
                    <label className="ww-library-filter-input"><SearchIcon className="h-5 w-5" /><span className="sr-only">Search your library</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, author, or genre" /></label>
                    <label className="ww-library-sort"><span>Sort</span><select value={sort} onChange={event => setSort(event.target.value as LibrarySort)}><option value="recent">Recently added</option><option value="title">Title A–Z</option><option value="progress">Reading progress</option></select></label>
                </div>

                <div className="flex flex-col gap-7 lg:flex-row lg:gap-10">
                    <aside className="ww-library-shelf-nav shrink-0 lg:w-64" aria-label="Library shelves">
                        <div className="ww-library-shelf-nav-inner"><div className="ww-library-shelf-label"><h2>Shelves</h2><button type="button" onClick={() => setIsCreateShelfOpen(true)} aria-label="Create a shelf"><PlusIcon className="h-4 w-4" /></button></div><nav>{navigationShelves.map(shelf => <ShelfLink key={shelf.id} shelf={shelf} count={shelf.books.length} active={activeShelf?.id === shelf.id} onClick={() => setActiveShelfId(shelf.id)} />)}</nav></div>
                    </aside>

                    <main className="min-w-0 flex-1">
                        <div className="ww-library-results-heading"><div><span className="ww-page-eyebrow">Current shelf</span><h2>{activeShelf?.name ?? 'All books'}</h2></div><span>{filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}</span></div>
                        {filteredBooks.length ? <><div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">{filteredBooks.slice(0, visibleBookCount).map(book => <LibraryBookCard key={book.id} book={book} onOpen={openBook} onRemove={bookId => setLibraryAction({ kind: 'remove', bookId })} onRestart={bookId => setLibraryAction({ kind: 'restart', bookId })} />)}</div>{visibleBookCount < filteredBooks.length && <div className="mt-10 text-center"><button type="button" onClick={() => setVisibleBookCount(count => count + 20)} className="rounded-xl border border-accent/25 px-6 py-3 text-sm font-bold text-accent hover:bg-accent/5">Show 20 more</button></div>}</> : <div className="ww-profile-empty"><BookOpenIcon className="h-11 w-11" /><h3>{query ? 'No saved stories match your search.' : 'This shelf is empty.'}</h3><p>{query ? 'Try a different title, author, or genre.' : 'Save a story to keep it close and track your reading progress.'}</p>{query ? <button type="button" onClick={() => setQuery('')}>Clear search</button> : <button type="button" onClick={() => { window.location.hash = '/category'; }}>Browse stories</button>}</div>}
                    </main>
                </div>
            </div>

            {isCreateShelfOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !isCreatingShelf) setIsCreateShelfOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="create-shelf-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-surface"><div className="mb-6 flex items-center justify-between"><div><span className="ww-page-eyebrow">Organize your reading</span><h2 id="create-shelf-title" className="mt-1 text-xl font-bold">Create a shelf</h2></div><button type="button" aria-label="Close create shelf dialog" onClick={() => setIsCreateShelfOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><XMarkIcon className="h-6 w-6" /></button></div><label className="block text-sm font-semibold">Shelf name<input autoFocus maxLength={60} value={newShelfName} onChange={event => setNewShelfName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void createShelf(); }} placeholder="For example, Weekend reads" className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-accent focus:bg-white dark:border-dark-border dark:bg-dark-surface-alt" /></label><div className="mt-6 flex gap-3"><button type="button" disabled={isCreatingShelf} onClick={() => setIsCreateShelfOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold dark:bg-dark-surface-alt">Cancel</button><button type="button" disabled={!newShelfName.trim() || isCreatingShelf} onClick={() => void createShelf()} className="flex-1 rounded-xl bg-accent py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isCreatingShelf ? 'Creating…' : 'Create shelf'}</button></div></div></div>}

            <ConfirmDialog isOpen={!!libraryAction} title={libraryAction?.kind === 'remove' ? 'Remove this book?' : 'Restart this book?'} message={libraryAction?.kind === 'remove' ? 'This removes the story from your library. You can save it again later.' : 'Your saved reading progress will return to the beginning.'} confirmLabel={libraryAction?.kind === 'remove' ? 'Remove book' : 'Restart progress'} processingLabel={libraryAction?.kind === 'remove' ? 'Removing…' : 'Restarting…'} isProcessing={libraryActionBusy} tone={libraryAction?.kind === 'remove' ? 'danger' : 'warning'} onCancel={() => { if (!libraryActionBusy) setLibraryAction(null); }} onConfirm={() => void runLibraryAction()} />
            <Footer />
        </div>
    );
};
