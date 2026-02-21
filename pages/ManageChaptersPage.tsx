import React, { useState, useEffect } from 'react';
import type { User, Chapter, Book } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, CheckCircleIcon, XMarkIcon, Cog6ToothIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { CharacterList } from '../components/CharacterList';
import { SceneList } from '../components/SceneList';
import { NoteList } from '../components/NoteList';

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
    const [category, setCategory] = useState(book.category || '');
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
            category,
            genres
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
                        <div>
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Cover URL</label>
                            <div className="flex gap-4">
                                <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} className="flex-1 p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" />
                                <img src={coverUrl} className="w-12 h-16 object-cover rounded bg-gray-200" alt="Preview" />
                            </div>
                        </div>
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

const ChapterListItem: React.FC<{ chapter: Chapter, bookId: string, index: number, onPublishToggle: () => void }> = ({ chapter, bookId, index, onPublishToggle }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg border dark:border-dark-border group hover:border-accent/30 transition-colors">
        <div className="flex items-center gap-4">
            <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</span>
            <div>
                <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${chapter.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 dark:bg-dark-surface-alt dark:text-gray-400'}`}>
                        {chapter.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{chapter.wordCount.toLocaleString()} words</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => window.location.hash = `/write/book/${bookId}/chapter/${chapter.id}/edit`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors text-text-body dark:text-dark-text-body"
            >
                <PencilIcon className="w-4 h-4" /> Edit
            </button>
            <button
                onClick={onPublishToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${chapter.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
                {chapter.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
        </div>
    </div>
);


export const ManageChaptersPage: React.FC<ManageChaptersPageProps> = ({ currentUser, bookId, onUserUpdate }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('chapters');

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);

    // Derived state
    const publishedChapterCount = book?.chapters.filter(c => c.status === 'published').length || 0;
    const isBookPublished = book?.publicationStatus === 'published';

    const handlePublishChapterToggle = async (chapterId: string) => {
        const updatedUser = await api.toggleChapterPublication(currentUser.id, bookId, chapterId);
        onUserUpdate(updatedUser);
        setErrorMsg(null);
    };

    const handleBookPublishToggle = async () => {
        try {
            const newStatus = isBookPublished ? 'draft' : 'published';
            const updatedUser = await api.setBookStatus(currentUser.id, bookId, newStatus);
            onUserUpdate(updatedUser);
            setErrorMsg(null);
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
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background pb-20">
            {/* Header / Dashboard Area */}
            <div className="bg-white dark:bg-dark-surface border-b dark:border-dark-border pt-8 pb-12 px-6 shadow-sm">
                <div className="container mx-auto max-w-4xl">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <button
                            onClick={() => window.location.hash = '/write'}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors md:hidden"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>

                        <div className="relative group flex-shrink-0">
                            <img src={book.coverUrl} alt={book.title} className="w-32 h-48 object-cover rounded-xl shadow-lg" />
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                            >
                                <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">Edit Cover</span>
                            </button>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div>
                                    <h1 className="font-sans text-3xl font-extrabold text-text-rich dark:text-dark-text-rich leading-tight mb-2">
                                        {book.title}
                                    </h1>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {book.genres.map(g => (
                                            <span key={g} className="text-xs font-semibold bg-gray-100 dark:bg-dark-surface-alt text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-sm text-text-body dark:text-dark-text-body line-clamp-2 max-w-xl mb-4">
                                        {book.description || "No description provided."}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-sm font-bold ${isBookPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {isBookPublished ? <CheckCircleIcon className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                        {isBookPublished ? 'PUBLISHED' : 'DRAFT MODE'}
                                    </div>
                                    <button
                                        onClick={handleBookPublishToggle}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${isBookPublished ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-success text-white hover:bg-opacity-90'}`}
                                    >
                                        {isBookPublished ? 'Unpublish Book' : 'Publish Book'}
                                    </button>
                                    <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                                        <Cog6ToothIcon className="w-3 h-3" /> Edit Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {errorMsg && (
                        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-slide-in-bottom">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto max-w-4xl px-4 md:px-6 py-8">

                {/* Tabs */}
                <div className="flex gap-6 border-b border-border dark:border-dark-border mb-8 overflow-x-auto">
                    {(['chapters', 'characters', 'scenes', 'notes'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-2 font-medium transition-colors border-b-2 capitalize whitespace-nowrap ${activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-muted hover:text-text-body dark:hover:text-dark-text-body'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'chapters' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-text-rich dark:text-dark-text-rich">Table of Contents</h2>
                            <span className="text-sm text-gray-500 font-medium">
                                {publishedChapterCount} / {book.chapters.length} Published
                            </span>
                        </div>

                        <div className="space-y-3">
                            {book.chapters.length > 0 ? (
                                book.chapters.map((chapter, i) => (
                                    <ChapterListItem
                                        key={chapter.id}
                                        chapter={chapter}
                                        bookId={book.id}
                                        index={i}
                                        onPublishToggle={() => handlePublishChapterToggle(chapter.id)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-white dark:bg-dark-surface dark:border-dark-border">
                                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No chapters yet</p>
                                    <p className="text-sm text-gray-400">Start writing your story to bring it to life.</p>
                                </div>
                            )}
                        </div>
                        {/* Floating Action Button for Chapters only */}
                        <button
                            onClick={() => window.location.hash = `/write/book/${bookId}/chapter/new/edit`}
                            className="fixed bottom-8 right-8 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary hover:scale-105 transition-all z-20 group"
                            title="Add New Chapter"
                        >
                            <PlusIcon className="w-7 h-7 transition-transform group-hover:rotate-90" />
                        </button>
                    </>
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
        </div>
    );
};
