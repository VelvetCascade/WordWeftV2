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
import { openReaderFromStory } from '../utils/navigation';
import { completedChapterCount, isReadingFinished, resumeChapterIndex } from '../utils/readingJourney';
import '../styles/reader-v2.css';
import { useDialog } from '../hooks/useDialog';

type LibrarySort = 'recent' | 'title' | 'progress';
type LibraryView = 'reading' | 'saved' | 'finished' | 'all';

const isMatureBook = (book: LibraryBook | Book) => (
    !!(book.isMature || book.ageRating === 'MATURE_18' || book.ageRating === 'ADULT_21')
);

const LibraryBookCard: React.FC<{
    book: LibraryBook;
    progressInfo?: BookProgress;
    onOpen: (book: LibraryBook) => void;
    onRemove: (bookId: string) => void;
    onRestart: (bookId: string) => void;
}> = ({ book, progressInfo, onOpen, onRemove, onRestart }) => {
    const isCompleted = isReadingFinished(book.chapters, progressInfo);
    const hasStarted = book.progress > 0 || Object.values(progressInfo?.chapters ?? {}).some(chapter => chapter.progress > 0);
    const chapterIndex = resumeChapterIndex(book.chapters, progressInfo) ?? 0;
    const chapter = book.chapters[chapterIndex];
    const actionLabel = isCompleted ? 'Read again' : hasStarted ? 'Continue reading' : 'Start reading';
    return (
        <article className={`ww-library-book-v2 ${hasStarted ? 'is-started' : 'is-saved'} ${isCompleted ? 'is-finished' : ''}`}>
            <button type="button" className="ww-library-book-cover" onClick={() => onOpen(book)} aria-label={`${actionLabel}: ${book.title}`}><ResilientImage src={book.coverUrl} alt={book.title} fallbackLabel={book.title} variant="cover" className="w-full h-full object-cover" /></button>
            <div className="ww-library-book-copy"><span className="ww-page-eyebrow">{book.genres[0] || 'A WordWeft story'}</span><button type="button" className="ww-library-book-title" onClick={() => onOpen(book)}><h3>{book.title}</h3></button><p className="ww-library-book-author">{book.author.name} · {book.readingStatus}</p><p className="ww-library-book-summary">{book.summary || book.description}</p>
                {isCompleted ? <span className="ww-library-book-finished"><CheckCircleIcon className="w-4 h-4" />Finished</span> : hasStarted ? <div className="ww-library-book-progress"><div className="ww-reading-progress-track"><span style={{ width: `${Math.min(100, book.progress)}%` }} /></div><p>{chapter ? `Chapter ${chapterIndex + 1} of ${book.chapters.length}` : 'Reading in progress'} · {Math.round(book.progress)}% read</p></div> : <p className="ww-library-book-chapters">{book.chapters.filter(chapter => chapter.status === 'published').length} published chapters · Saved for later</p>}
            </div>
            <div className="ww-library-book-actions"><button type="button" onClick={() => onOpen(book)} className="ww-library-book-open" aria-label={`${actionLabel}: ${book.title}`}><BookOpenIcon className="w-4 h-4" /><span>{actionLabel}</span></button><div><button type="button" onClick={() => onRemove(book.id)} aria-label={`Remove ${book.title} from library`} title="Remove from library"><XMarkIcon className="w-4 h-4" /></button>{hasStarted && <button type="button" onClick={() => onRestart(book.id)} aria-label={`Restart ${book.title}`} title="Restart progress"><ArrowPathIcon className="w-4 h-4" /></button>}</div></div>
        </article>
    );
};


export const LibraryPage: React.FC<{ user: User; onUserUpdate: (user: User) => void }> = ({ user, onUserUpdate }) => {
    const [allProgress, setAllProgress] = useState<Record<string, BookProgress>>({});
    const [activeShelfId, setActiveShelfId] = useState('all');
    const [activeView, setActiveView] = useState<LibraryView>('reading');
    const [isProgressLoading, setIsProgressLoading] = useState(true);
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
    const createShelfDialogRef = useDialog(isCreateShelfOpen, () => setIsCreateShelfOpen(false), !isCreatingShelf);

    useEffect(() => {
        let active = true;
        setLoadError('');
        setIsProgressLoading(true);
        api.getAllReadingProgress(user.id)
            .then(progress => {
                if (!active) return;
                setAllProgress(progress);
                if (loadAttempt === 0) {
                    const started = Object.entries(progress).filter(([, item]) => item.overallProgress > 0);
                    const hasUnfinished = started.some(([bookId, item]) => {
                        const book = user.library.flatMap(shelf => shelf.books).find(book => book.id === bookId);
                        return book ? !isReadingFinished(book.chapters, item) : item.overallProgress < 100;
                    });
                    if (!hasUnfinished) setActiveView(started.length ? 'finished' : 'saved');
                }
            })
            .catch(() => { if (active) setLoadError('Your reading progress could not be loaded.'); })
            .finally(() => { if (active) setIsProgressLoading(false); });
        return () => { active = false; };
    }, [user.id, loadAttempt]);

    useEffect(() => {
        let active = true;
        const refresh = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.userId !== user.id || !active || !detail.progress) return;
            setAllProgress(previous => ({ ...previous, [detail.bookId]: detail.progress }));
        };
        window.addEventListener(api.READING_PROGRESS_UPDATED_EVENT, refresh);
        return () => { active = false; window.removeEventListener(api.READING_PROGRESS_UPDATED_EVENT, refresh); };
    }, [user.id]);


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
        const selected = (activeShelf?.books ?? []).filter(book => activeView === 'all' || (activeView === 'finished' ? isReadingFinished(book.chapters, allProgress[book.id]) : activeView === 'reading' ? book.progress > 0 && !isReadingFinished(book.chapters, allProgress[book.id]) : book.progress === 0));
        const filtered = normalizedQuery
            ? selected.filter(book => [book.title, book.author.name, ...(book.genres ?? [])].join(' ').toLocaleLowerCase().includes(normalizedQuery))
            : selected;
        return [...filtered].sort((left, right) => {
            if (sort === 'title') return left.title.localeCompare(right.title);
            if (sort === 'progress') return right.progress - left.progress;
            return new Date(right.addedDate || 0).getTime() - new Date(left.addedDate || 0).getTime();
        });
    }, [activeShelf, activeView, query, sort, allProgress]);

    useEffect(() => setVisibleBookCount(20), [activeShelfId, activeView, query, sort]);

    const inProgressCount = allBooks.filter(book => book.progress > 0 && !isReadingFinished(book.chapters, allProgress[book.id])).length;
    const completedCount = allBooks.filter(book => isReadingFinished(book.chapters, allProgress[book.id])).length;

    const openBook = (book: LibraryBook) => {
        const progress = allProgress[book.id];
        const chapterIndex = resumeChapterIndex(book.chapters, progress);
        if (chapterIndex === null) return;
        openReaderFromStory(book.id, chapterIndex, book.chapters[chapterIndex]?.id);
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

    const savedCount = allBooks.filter(book => book.progress === 0).length;
    const resumeBook = !query && (activeView === 'reading' || activeView === 'all') ? filteredBooks.find(book => book.progress > 0 && !isReadingFinished(book.chapters, allProgress[book.id])) : undefined;
    const resumeProgress = resumeBook ? allProgress[resumeBook.id] : undefined;
    const resumeIndex = resumeBook ? resumeChapterIndex(resumeBook.chapters, resumeProgress) ?? 0 : 0;
    const resumeChapter = resumeBook?.chapters[resumeIndex];
    const shelfBooks = resumeBook ? filteredBooks.filter(book => book.id !== resumeBook.id) : filteredBooks;

    return (
        <div className="ww-reading-library-page ww-library-v2">
            <div className="ww-library-page-content">
                <header className="ww-library-heading-v2"><div><span className="ww-page-eyebrow">Your reading space</span><h1>Your library</h1><p>Your next chapter is right where you left it.</p></div><a href="/category"><BookOpenIcon className="w-4 h-4" />Discover stories</a></header>
                {(loadError || actionError) && <div role="alert" className="ww-library-error"><span>{loadError || actionError}</span>{loadError ? <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</button> : <button type="button" onClick={() => setActionError('')}>Dismiss</button>}</div>}
                <nav className="ww-library-status-tabs" aria-label="Reading status">{([{ id: 'reading', label: 'Reading', count: inProgressCount }, { id: 'saved', label: 'Saved', count: savedCount }, { id: 'finished', label: 'Finished', count: completedCount }, { id: 'all', label: 'All stories', count: allBooks.length }] as const).map(view => <button key={view.id} type="button" aria-pressed={activeView === view.id} className={activeView === view.id ? 'is-active' : ''} onClick={() => setActiveView(view.id)}>{view.label}<span>{isProgressLoading ? '…' : view.count}</span></button>)}</nav>
                <div className="ww-library-tools-v2"><label className="ww-library-filter-input"><SearchIcon className="w-4 h-4" /><span className="sr-only">Search your library</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your library" /></label><label className="ww-library-shelf-select"><span className="sr-only">Shelf</span><select value={activeShelf?.id ?? 'all'} onChange={event => setActiveShelfId(event.target.value)}>{navigationShelves.map(shelf => <option key={shelf.id} value={shelf.id}>{shelf.name} ({shelf.books.length})</option>)}</select></label><label className="ww-library-sort"><span className="sr-only">Sort</span><select value={sort} onChange={event => setSort(event.target.value as LibrarySort)}><option value="recent">Recently added</option><option value="title">Title A–Z</option><option value="progress">Reading progress</option></select></label><button type="button" className="ww-library-create-shelf" onClick={() => setIsCreateShelfOpen(true)}><PlusIcon className="w-4 h-4" />New shelf</button></div>
                <main>
                    {isProgressLoading ? <div className="ww-library-progress-loading" role="status"><span />Loading your reading place…</div> : <>
                        {resumeBook && <section className="ww-library-resume-v2" aria-label="Continue reading"><ResilientImage src={resumeBook.coverUrl} alt={resumeBook.title} fallbackLabel={resumeBook.title} variant="cover" className="ww-library-resume-cover" /><div className="ww-library-resume-copy"><span className="ww-page-eyebrow">Pick up where you left off</span><h2>{resumeBook.title}</h2><p>{resumeBook.author.name}{resumeChapter && <> · Chapter {resumeIndex + 1}<br />{resumeChapter.title}</>}</p><div className="ww-saved-reading-progress"><div><span>Your reading progress</span><strong>{Math.round(resumeBook.progress)}%</strong></div><div className="ww-reading-progress-track"><span style={{ width: `${Math.min(100, resumeBook.progress)}%` }} /></div><p>{completedChapterCount(resumeBook.chapters, resumeProgress)} chapters finished · Your next chapter{resumeProgress?.pendingSync ? ' · Sync pending on this device' : ''}</p></div><div className="ww-library-resume-actions"><button type="button" onClick={() => openBook(resumeBook)}>Continue{resumeChapter ? ` chapter ${resumeIndex + 1}` : ' reading'}<BookOpenIcon className="w-4 h-4" /></button><a href={`/book/${encodeURIComponent(resumeBook.id)}`}>Story details</a><button type="button" className="ww-library-resume-secondary" aria-label={`Restart ${resumeBook.title}`} title="Restart reading progress" onClick={() => setLibraryAction({ kind: 'restart', bookId: resumeBook.id })}>Restart</button><button type="button" className="ww-library-resume-secondary" aria-label={`Remove ${resumeBook.title} from library`} title="Remove story from library" onClick={() => setLibraryAction({ kind: 'remove', bookId: resumeBook.id })}>Remove</button></div></div></section>}
                        {shelfBooks.length > 0 ? <section className="ww-library-books-section"><div className="ww-library-results-heading"><h2>{resumeBook ? 'Also on your shelf' : activeView === 'saved' ? 'Saved for later' : activeView === 'finished' ? 'Stories you finished' : activeView === 'reading' ? 'Your reading shelf' : activeShelf?.name ?? 'All stories'}</h2><span>{shelfBooks.length} {shelfBooks.length === 1 ? 'story' : 'stories'}</span></div><div className={`ww-library-books-v2 ${activeView === 'saved' ? 'is-cover-grid' : ''}`}>{shelfBooks.slice(0, visibleBookCount).map(book => <LibraryBookCard key={book.id} book={book} progressInfo={allProgress[book.id]} onOpen={openBook} onRemove={bookId => setLibraryAction({ kind: 'remove', bookId })} onRestart={bookId => setLibraryAction({ kind: 'restart', bookId })} />)}</div>{visibleBookCount < shelfBooks.length && <button type="button" className="ww-library-show-more" onClick={() => setVisibleBookCount(count => count + 20)}>Show 20 more</button>}</section> : !resumeBook && <section className={`ww-library-empty-v2 ${allBooks.length === 0 ? 'is-empty-library' : ''}`}><img src="/design-v2/assets/met-436535.jpg" alt="A hillside beneath a swirling sky in a historical painting" /><div><span className="ww-page-eyebrow">Make room for a story</span><h2>{query ? 'No stories match your search.' : allBooks.length === 0 ? 'Your reading space starts here.' : activeView === 'reading' ? 'A new chapter is waiting.' : activeView === 'finished' ? 'Every story starts with a first page.' : 'This shelf is waiting for a story.'}</h2><p>{query ? 'Try a different title, author, or genre.' : activeView === 'reading' && savedCount > 0 ? 'Your saved stories are ready whenever you are. Start one and your reading place will appear here.' : 'Save stories you want to read, and return to your next chapter here.'}</p>{query ? <button type="button" onClick={() => setQuery('')}>Clear search</button> : activeView === 'reading' && savedCount > 0 ? <button type="button" onClick={() => setActiveView('saved')}>Explore your saved stories</button> : <a href="/category">Find your next story</a>}</div></section>}
                    </>}
                </main>
            </div>

            {isCreateShelfOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !isCreatingShelf) setIsCreateShelfOpen(false); }}><div ref={createShelfDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-shelf-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-surface"><div className="mb-6 flex items-center justify-between"><div><span className="ww-page-eyebrow">Organize your reading</span><h2 id="create-shelf-title" className="mt-1 text-xl font-bold">Create a shelf</h2></div><button type="button" aria-label="Close create shelf dialog" onClick={() => setIsCreateShelfOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><XMarkIcon className="h-6 w-6" /></button></div><label className="block text-sm font-semibold">Shelf name<input autoFocus maxLength={60} value={newShelfName} onChange={event => setNewShelfName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void createShelf(); }} placeholder="For example, Weekend reads" className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-accent focus:bg-white dark:border-dark-border dark:bg-dark-surface-alt" /></label><div className="mt-6 flex gap-3"><button type="button" disabled={isCreatingShelf} onClick={() => setIsCreateShelfOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold dark:bg-dark-surface-alt">Cancel</button><button type="button" disabled={!newShelfName.trim() || isCreatingShelf} onClick={() => void createShelf()} className="flex-1 rounded-xl bg-accent py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isCreatingShelf ? 'Creating…' : 'Create shelf'}</button></div></div></div>}

            <ConfirmDialog isOpen={!!libraryAction} title={libraryAction?.kind === 'remove' ? 'Remove this book?' : 'Restart this book?'} message={libraryAction?.kind === 'remove' ? 'This removes the story from your library. You can save it again later.' : 'Your saved reading progress will return to the beginning.'} confirmLabel={libraryAction?.kind === 'remove' ? 'Remove book' : 'Restart progress'} processingLabel={libraryAction?.kind === 'remove' ? 'Removing…' : 'Restarting…'} isProcessing={libraryActionBusy} tone={libraryAction?.kind === 'remove' ? 'danger' : 'warning'} onCancel={() => { if (!libraryActionBusy) setLibraryAction(null); }} onConfirm={() => void runLibraryAction()} />
            <Footer />
        </div>
    );
};
