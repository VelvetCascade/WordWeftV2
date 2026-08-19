import React, { useState, useEffect } from 'react';
import type { User, Chapter, Book } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, CheckCircleIcon, XMarkIcon, Cog6ToothIcon, TrashIcon, ShareIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { CharacterList } from '../components/CharacterList';
import { SceneList } from '../components/SceneList';
import { NoteList } from '../components/NoteList';
import { ImageUpload } from '../components/ImageUpload';
import { ShareModal } from '../components/ShareModal';
interface ManageChaptersPageProps {
    currentUser: User;
    bookId: string;
    onUserUpdate: (user: User) => void;
}

type Tab = 'chapters' | 'characters' | 'scenes' | 'notes';

const BOOK_CATEGORIES = [
    'Novel', 'Novella', 'Short Story', 'Poetry', 'Essay',
    'Anthology', 'Memoir', 'Biography', 'Self-Help', 'Graphic Novel',
    'Light Novel', 'Web Novel', 'Fan Fiction', 'Screenplay', 'Play',
    'Journal', 'Guide', 'Other'
];

const EditBookModal: React.FC<{ isOpen: boolean; onClose: () => void; book: Book; onUpdate: (updates: Partial<Book>) => void }> = ({ isOpen, onClose, book, onUpdate }) => {
    const [title, setTitle] = useState(book.title);
    const [description, setDescription] = useState(book.description || '');
    const [coverUrl, setCoverUrl] = useState(book.coverUrl);
    const [coverFileId, setCoverFileId] = useState<string | null>(book.coverFileId || null);
    const [category, setCategory] = useState(book.category || '');
    const [isAIGenerated, setIsAIGenerated] = useState(book.isAIGenerated || false);
    const [genres, setGenres] = useState<string[]>(book.genres || []);
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [genreSearch, setGenreSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            api.getGenres().then(setAllGenres);
        }
    }, [isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({
            title,
            description,
            summary: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
            coverUrl,
            coverFileId,
            category,
            genres,
            isAIGenerated
        });
        onClose();
    };

    const toggleGenre = (g: string) => {
        setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    };

    if (!isOpen) return null;

    const filteredGenres = allGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-dark-border flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-dark-text-rich">Edit Book Details</h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form id="edit-book-form" onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" required />
                        </div>
                        <ImageUpload 
                            value={coverUrl}
                            onChange={(url, fileId) => {
                                setCoverUrl(url);
                                setCoverFileId(fileId);
                            }}
                            label="Book Cover"
                            fallbackUrl="https://picsum.photos/seed/newbook/400/600"
                            aspectRatio={2/3}
                            cropShape="rect"
                        />
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                            >
                                <option value="">Select a category...</option>
                                {BOOK_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-dark-text-body">Genres</label>
                            {genres.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {genres.map(g => (
                                        <span key={g} onClick={() => toggleGenre(g)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white cursor-pointer hover:bg-primary/80 transition-colors">
                                            {g} <span className="text-white/70">×</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                type="text"
                                placeholder="Search genres..."
                                value={genreSearch}
                                onChange={e => setGenreSearch(e.target.value)}
                                className="w-full p-2 mb-2 rounded-lg border text-sm dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich focus:ring-1 focus:ring-accent focus:border-accent"
                            />
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                {filteredGenres.map(g => (
                                    <button key={g} type="button" onClick={() => toggleGenre(g)} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${genres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt dark:text-dark-text-body hover:bg-gray-200 dark:hover:bg-dark-border'}`}>
                                        {g}
                                    </button>
                                ))}
                                {filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match your search.</p>}
                            </div>
                        </div>
                        <div className="pt-2 border-t dark:border-dark-border mt-4">
                            <label htmlFor="editIsAIGenerated" className="flex items-center cursor-pointer py-2">
                                <div className="relative">
                                    <input type="checkbox" id="editIsAIGenerated" className="sr-only" checked={isAIGenerated} onChange={e => setIsAIGenerated(e.target.checked)} />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${isAIGenerated ? 'bg-accent' : 'bg-gray-200 dark:bg-dark-surface-alt'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAIGenerated ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-text-body dark:text-dark-text-body">
                                    <p className="font-sans font-bold text-sm flex items-center gap-1.5">✨ AI Generated Content</p>
                                    <p className="text-xs text-gray-500">Flag this book as containing AI-generated text or structure.</p>
                                </div>
                            </label>
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t dark:border-dark-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button form="edit-book-form" type="submit" className="px-4 py-2 text-sm font-bold text-white bg-accent hover:bg-primary rounded-lg">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- Confirmation Dialog ---
const ConfirmDialog: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-text-rich dark:text-dark-text-rich mb-2">{title}</h3>
                <p className="text-sm text-text-body dark:text-dark-text-body mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-lg transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};

const ChapterListItem: React.FC<{ chapter: Chapter, bookId: string, index: number, onPublishToggle: () => void, onDelete: () => void, onShare: () => void }> = ({ chapter, bookId, index, onPublishToggle, onDelete, onShare }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg border dark:border-dark-border group hover:border-accent/30 transition-colors gap-4">
        <div className="flex items-center gap-4">
            <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</span>
            <div>
                <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm flex-shrink-0 ${chapter.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 dark:bg-dark-surface-alt dark:text-gray-400'}`}>
                        {chapter.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chapter.wordCount.toLocaleString()} words</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:opacity-0 group-hover:opacity-100 transition-opacity pl-10 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-dark-border">
            <button
                onClick={() => window.location.hash = `/write/book/${bookId}/chapter/${chapter.id}/edit`}
                className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors text-text-body dark:text-dark-text-body"
            >
                <PencilIcon className="w-4 h-4" /> Edit
            </button>
            <button
                onClick={onPublishToggle}
                className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${chapter.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
                {chapter.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            {chapter.status === 'published' && (
                <button
                    onClick={onShare}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Share chapter"
                >
                    <ShareIcon className="w-4 h-4" /> Share
                </button>
            )}
            <button
                onClick={onDelete}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="Delete chapter"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);


export const ManageChaptersPage: React.FC<ManageChaptersPageProps> = ({ currentUser, bookId, onUserUpdate }) => {
    const { trackEvent } = useAnalytics();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('chapters');
    const [deleteChapterTarget, setDeleteChapterTarget] = useState<{ id: string; title: string } | null>(null);
    const [showDeleteBookConfirm, setShowDeleteBookConfirm] = useState(false);
    // W4: Chapter share state
    const [shareChapter, setShareChapter] = useState<Chapter | null>(null);
    // W2: Book publish celebration state
    const [showPublishCelebration, setShowPublishCelebration] = useState(false);
    const [bookShareOpen, setBookShareOpen] = useState(false);

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);

    // Derived state
    const publishedChapterCount = book?.chapters.filter(c => c.status === 'published').length || 0;
    const isBookPublished = book?.publicationStatus === 'published';
    const totalWords = book?.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0) || 0;

    const handlePublishChapterToggle = async (chapterId: string) => {
        const updatedUser = await api.toggleChapterPublication(currentUser.id, bookId, chapterId);
        onUserUpdate(updatedUser);
        setErrorMsg(null);
    };

    const handleDeleteChapter = async (chapterId: string) => {
        try {
            const updatedUser = await api.deleteChapter(bookId, chapterId);
            onUserUpdate(updatedUser);
            setDeleteChapterTarget(null);
            setErrorMsg(null);
        } catch (e: any) {
            setErrorMsg(e.message);
            setTimeout(() => setErrorMsg(null), 5000);
        }
    };

    const handleDeleteBook = async () => {
        try {
            const updatedUser = await api.deleteBook(bookId);
            onUserUpdate(updatedUser);
            window.location.hash = '/write';
        } catch (e: any) {
            setErrorMsg(e.message);
            setShowDeleteBookConfirm(false);
            setTimeout(() => setErrorMsg(null), 5000);
        }
    };

    const handleBookPublishToggle = async () => {
        try {
            const newStatus = isBookPublished ? 'draft' : 'published';
            const updatedUser = await api.setBookStatus(currentUser.id, bookId, newStatus);
            onUserUpdate(updatedUser);
            setErrorMsg(null);
            // W2: Show celebration on first publish
            if (newStatus === 'published') {
                setShowPublishCelebration(true);
            }
        } catch (e: any) {
            setErrorMsg(e.message);
            setTimeout(() => setErrorMsg(null), 5000);
        }
    };

    const handleBookUpdate = async (updates: Partial<Book>) => {
        const updatedUser = await api.updateBookDetails(currentUser.id, bookId, updates);
        onUserUpdate(updatedUser);
    };

    if (!book) {
        return <div className="p-8">Book not found.</div>;
    }

    return (
        <div className="ww-manage-book-page">
            <section className="ww-manage-hero">
                <div className="ww-manage-hero-inner">
                    <div className="ww-manage-cover group">
                        <img src={book.coverUrl} alt={book.title} />
                        <button onClick={() => setIsEditModalOpen(true)}>Change cover</button>
                    </div>

                    <div className="ww-manage-copy">
                        <div className="ww-manage-status-row">
                            <span className={`ww-manage-status ${isBookPublished ? 'published' : 'draft'}`}>
                                {isBookPublished ? <CheckCircleIcon className="w-4 h-4" /> : <i />}
                                {isBookPublished ? 'Published' : 'Private draft'}
                            </span>
                            {book.category && <span className="ww-manage-category">{book.category}</span>}
                        </div>
                        <h1>{book.title}</h1>
                        <p>{book.description || 'Add a short description to give this story a clear direction.'}</p>
                        <div className="ww-manage-genres">
                            {book.genres.map(g => <span key={g}>{g}</span>)}
                        </div>
                        <div className="ww-manage-stats">
                            <div><strong>{book.chapters.length}</strong><span>Chapters</span></div>
                            <div><strong>{totalWords.toLocaleString()}</strong><span>Words</span></div>
                            <div><strong>{publishedChapterCount}</strong><span>Live</span></div>
                            <div><strong>{book.viewCount?.toLocaleString() || 0}</strong><span>Reads</span></div>
                        </div>
                    </div>

                    <div className="ww-manage-actions">
                        <button className="ww-manage-primary" onClick={() => window.location.hash = `/write/book/${bookId}/chapter/new/edit`}>
                            <PlusIcon className="w-4 h-4" /> New chapter
                        </button>
                        <button className="ww-manage-publish" onClick={handleBookPublishToggle}>
                            {isBookPublished ? 'Return to draft' : 'Publish story'}
                        </button>
                        <button onClick={() => setIsEditModalOpen(true)}><Cog6ToothIcon className="w-4 h-4" /> Story details</button>
                        <button className="danger" onClick={() => setShowDeleteBookConfirm(true)}><TrashIcon className="w-4 h-4" /> Delete story</button>
                    </div>
                </div>
                {errorMsg && <div className="ww-manage-error">{errorMsg}</div>}
            </section>

            <div className="ww-manage-workspace">
                <nav className="ww-manage-tabs" aria-label="Story workspace">
                    {(['chapters', 'characters', 'scenes', 'notes'] as Tab[]).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>
                            <span>{tab}</span>
                            {tab === 'chapters' && <small>{book.chapters.length}</small>}
                        </button>
                    ))}
                </nav>

                {activeTab === 'chapters' && (
                    <section className="ww-manage-chapters">
                        <div className="ww-manage-section-head">
                            <div><span>Manuscript</span><h2>Chapters</h2></div>
                            <p>{publishedChapterCount} of {book.chapters.length} published</p>
                        </div>
                        <div className="ww-manage-chapter-list">
                            {book.chapters.length > 0 ? book.chapters.map((chapter, i) => (
                                <ChapterListItem
                                    key={chapter.id}
                                    chapter={chapter}
                                    bookId={book.id}
                                    index={i}
                                    onPublishToggle={() => handlePublishChapterToggle(chapter.id)}
                                    onDelete={() => setDeleteChapterTarget({ id: chapter.id, title: chapter.title })}
                                    onShare={() => setShareChapter(chapter)}
                                />
                            )) : (
                                <div className="ww-manage-empty">
                                    <span>01</span>
                                    <h3>Every story starts with a blank page.</h3>
                                    <p>Create the opening chapter. It stays private until you decide to publish it.</p>
                                    <button onClick={() => window.location.hash = `/write/book/${bookId}/chapter/new/edit`}>
                                        Start the first chapter <span>→</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'characters' && <CharacterList bookId={bookId} />}
                {activeTab === 'scenes' && <SceneList bookId={bookId} chapters={book.chapters} />}
                {activeTab === 'notes' && <NoteList bookId={bookId} />}
            </div>

            <EditBookModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                book={book}
                onUpdate={handleBookUpdate}
            />

            {/* Delete Chapter Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteChapterTarget}
                title="Delete Chapter"
                message={`Are you sure you want to delete "${deleteChapterTarget?.title}"? This action cannot be undone.`}
                onConfirm={() => deleteChapterTarget && handleDeleteChapter(deleteChapterTarget.id)}
                onCancel={() => setDeleteChapterTarget(null)}
            />

            {/* Delete Book Confirmation */}
            <ConfirmDialog
                isOpen={showDeleteBookConfirm}
                title="Delete Book"
                message={`Are you sure you want to delete "${book.title}"? This will permanently remove the book, all its chapters, and all associated data (reviews, comments, reading progress). This action cannot be undone.`}
                confirmLabel="Delete Book"
                onConfirm={handleDeleteBook}
                onCancel={() => setShowDeleteBookConfirm(false)}
            />

            {/* W4: Chapter-level share modal */}
            {shareChapter && (
            <ShareModal
                    isOpen={!!shareChapter}
                    onClose={() => setShareChapter(null)}
                    book={book}
                    chapter={shareChapter}
                    url={`${window.location.origin}/#/book/${book.id}`}
                    shareTextOverride={`New chapter alert: '${shareChapter.title}' from '${book.title}'. Read it on WordWeft!`}
                />
            )}

            {/* W2: Book publish celebration */}
            {showPublishCelebration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-2">Your book is published!</h3>
                        <p className="text-text-body dark:text-dark-text-body mb-6">
                            '{book.title}' is now live. Let the world discover your story.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { setShowPublishCelebration(false); setBookShareOpen(true); }}
                                className="w-full py-3 rounded-xl font-bold text-white bg-accent hover:bg-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <ShareIcon className="w-5 h-5" /> Share Your Book
                            </button>
                            <button
                                onClick={() => setShowPublishCelebration(false)}
                                className="w-full py-2.5 rounded-xl font-semibold text-gray-500 dark:text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* W2: Book-level share modal */}
            {bookShareOpen && (
                <ShareModal
                    isOpen={bookShareOpen}
                    onClose={() => setBookShareOpen(false)}
                    book={book}
                    url={`${window.location.origin}/#/book/${book.id}`}
                    shareTextOverride={`I just published '${book.title}' on WordWeft! Check it out.`}
                />
            )}
        </div>
    );
};
