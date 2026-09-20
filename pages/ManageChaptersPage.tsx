import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, Chapter, Book, AgeRating, ContentWarning, StoryStatus } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, CheckCircleIcon, XMarkIcon, Cog6ToothIcon, TrashIcon, ShareIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { CharacterList } from '../components/CharacterList';
import { SceneList } from '../components/SceneList';
import { NoteList } from '../components/NoteList';
import { ImageUpload } from '../components/ImageUpload';
import { ShareModal } from '../components/ShareModal';
import { validateManuscriptFile } from '../utils/manuscriptImport';
interface ManageChaptersPageProps {
    currentUser: User;
    bookId: string;
    onUserUpdate: (user: User) => void;
}

type Tab = 'chapters' | 'characters' | 'scenes' | 'notes';

const RATING_SEVERITY: Record<AgeRating, number> = {
    'ALL_AGES': 0,
    'TEEN_13': 1,
    'MATURE_18': 2,
    'ADULT_21': 3,
};

const BOOK_CATEGORIES = [
    'Novel', 'Novella', 'Short Story', 'Poetry', 'Essay',
    'Anthology', 'Memoir', 'Biography', 'Self-Help', 'Graphic Novel',
    'Light Novel', 'Web Novel', 'Fan Fiction', 'Screenplay', 'Play',
    'Journal', 'Guide', 'Other'
];

const EditBookModal: React.FC<{ isOpen: boolean; onClose: () => void; book: Book; currentUserDateOfBirth?: string; onUpdate: (updates: Partial<Book>) => Promise<void> }> = ({ isOpen, onClose, book, currentUserDateOfBirth, onUpdate }) => {
    const [title, setTitle] = useState(book.title);
    const [description, setDescription] = useState(book.description || '');
    const [coverUrl, setCoverUrl] = useState(book.coverUrl);
    const [coverFileId, setCoverFileId] = useState<string | null>(book.coverFileId || null);
    const [category, setCategory] = useState(book.category || '');
    const [readingStatus, setReadingStatus] = useState<StoryStatus>(book.readingStatus || 'Ongoing');
    const [isAIGenerated, setIsAIGenerated] = useState(book.isAIGenerated || false);
    const [genres, setGenres] = useState<string[]>(book.genres || []);
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [ageRating, setAgeRating] = useState<AgeRating>(book.ageRating || 'ALL_AGES');
    const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>(book.contentWarnings || []);
    const [customDisclaimer, setCustomDisclaimer] = useState(book.customDisclaimer || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (isOpen) {
            api.getGenres().then(setAllGenres);
            setTitle(book.title);
            setDescription(book.description || '');
            setCoverUrl(book.coverUrl);
            setCoverFileId(book.coverFileId || null);
            setCategory(book.category || '');
            setReadingStatus(book.readingStatus || 'Ongoing');
            setGenres(book.genres || []);
            setAgeRating(book.ageRating || 'ALL_AGES');
            setContentWarnings(book.contentWarnings || []);
            setCustomDisclaimer(book.customDisclaimer || '');
            setIsAIGenerated(book.isAIGenerated || false);
            setSaveError('');
            setIsSaving(false);
        }
    }, [isOpen, book]);

    const minRequiredRating: AgeRating = useMemo(() => {
        let min = 0;
        if (book.chapters) {
            for (const ch of book.chapters) {
                if (ch.contentWarnings && ch.contentWarnings.length > 0) {
                    for (const w of ch.contentWarnings) {
                        if (['GORE', 'SEXUAL_CONTENT', 'ABUSE', 'SELF_HARM'].includes(w)) {
                            min = Math.max(min, 2);
                        } else {
                            min = Math.max(min, 1);
                        }
                    }
                }
            }
        }
        if (min >= 2) return 'MATURE_18';
        if (min >= 1) return 'TEEN_13';
        return 'ALL_AGES';
    }, [book.chapters]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || isCoverUploading) return;
        setSaveError('');
        if (RATING_SEVERITY[ageRating] < RATING_SEVERITY[minRequiredRating]) {
            setSaveError(`This story contains chapters requiring at least ${minRequiredRating === 'MATURE_18' ? 'Mature (18+)' : 'Teen (13+)'}. Choose that rating or higher.`);
            return;
        }
        if ((ageRating === 'MATURE_18' || ageRating === 'ADULT_21') && !currentUserDateOfBirth) {
            setSaveError('Add your date of birth in Profile Settings before choosing an 18+ or 21+ rating.');
            return;
        }
        try {
            setIsSaving(true);
            await onUpdate({
                title,
                description,
                summary: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
                coverUrl,
                coverFileId,
                category,
                readingStatus,
                genres,
                ageRating,
                contentWarnings,
                customDisclaimer,
                isAIGenerated
            });
            onClose();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Story details could not be saved. Please try again.');
        } finally {
            setIsSaving(false);
        }
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
                    <button onClick={onClose} disabled={isSaving || isCoverUploading} aria-label="Close story details"><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
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
                            onBusyChange={setIsCoverUploading}
                            disabled={isSaving}
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
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Story status</label>
                            <select value={readingStatus} onChange={e => setReadingStatus(e.target.value as StoryStatus)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border">
                                <option value="Ongoing">Ongoing — new chapters are expected</option>
                                <option value="Hiatus">On hiatus — updates are paused</option>
                                <option value="Completed">Completed — the story is finished</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This is shown to readers and can be changed any time.</p>
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
                            <label className="block text-sm font-bold mb-1 dark:text-dark-text-body">Age rating</label>
                            <select value={ageRating} onChange={e => setAgeRating(e.target.value as AgeRating)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border">
                                <option value="ALL_AGES" disabled={RATING_SEVERITY[minRequiredRating] > RATING_SEVERITY['ALL_AGES']}>Everyone</option>
                                <option value="TEEN_13" disabled={RATING_SEVERITY[minRequiredRating] > RATING_SEVERITY['TEEN_13']}>Teen 13+</option>
                                <option value="MATURE_18">Mature 18+</option>
                                <option value="ADULT_21">Adult 21+</option>
                            </select>
                            {RATING_SEVERITY[minRequiredRating] > RATING_SEVERITY['ALL_AGES'] && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                    ⚠️ Chapters in this story contain content warnings requiring at least {minRequiredRating === 'MATURE_18' ? 'Mature (18+)' : 'Teen (13+)'}.
                                </p>
                            )}
                            {(ageRating === 'MATURE_18' || ageRating === 'ADULT_21') && !currentUserDateOfBirth && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                                    Date of birth is required before setting this rating. Add it in <a href="#/edit-profile" className="underline">Profile Settings</a>.
                                </p>
                            )}
                            <label className="block text-sm font-bold mt-4 mb-2 dark:text-dark-text-body">Content warnings</label>
                            <div className="flex flex-wrap gap-2">
                                {(['VIOLENCE','GORE','STRONG_LANGUAGE','SEXUAL_CONTENT','ABUSE','SELF_HARM','SUBSTANCE_USE','GRIEF','DISCRIMINATION','OTHER'] as ContentWarning[]).map(w => <button key={w} type="button" onClick={() => setContentWarnings(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])} className={`px-3 py-1 rounded-full text-xs ${contentWarnings.includes(w) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt'}`}>{w.replaceAll('_',' ')}</button>)}
                            </div>
                            <label className="block text-sm font-bold mt-4 mb-1 dark:text-dark-text-body">Author’s content note</label>
                            <textarea value={customDisclaimer} onChange={e => setCustomDisclaimer(e.target.value)} maxLength={1000} rows={3} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" placeholder="Optional context for readers" />
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
                    {saveError && <p className="mr-auto max-w-sm text-xs font-semibold text-red-600 dark:text-red-400" role="alert">{saveError}</p>}
                    <button onClick={onClose} disabled={isSaving || isCoverUploading} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
                    <button form="edit-book-form" type="submit" disabled={isSaving || isCoverUploading} className="px-4 py-2 text-sm font-bold text-white bg-accent hover:bg-primary rounded-lg disabled:opacity-50">
                        {isCoverUploading ? 'Uploading cover…' : isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
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
    processingLabel?: string;
    isProcessing?: boolean;
    tone?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, title, message, confirmLabel = 'Delete', processingLabel = 'Deleting…', isProcessing = false, tone = 'danger', onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6" role="alertdialog" aria-modal="true" aria-busy={isProcessing}>
                <h3 className="text-lg font-bold text-text-rich dark:text-dark-text-rich mb-2">{title}</h3>
                <p className="text-sm text-text-body dark:text-dark-text-body mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`min-w-28 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-70 ${
                            tone === 'primary'
                                ? 'bg-primary hover:bg-primary/90'
                                : tone === 'warning'
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isProcessing ? processingLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublishStoryDialog: React.FC<{
    isOpen: boolean;
    chapters: Chapter[];
    isPublishing: boolean;
    onClose: () => void;
    onPublish: (chapterIds: string[]) => void;
}> = ({ isOpen, chapters, isPublishing, onClose, onPublish }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const isComplete = (chapter: Chapter) => Boolean(
        chapter.title?.trim()
        && (chapter.content?.replace(/<[^>]*>/g, ' ').trim() || chapter.wordCount > 0)
    );

    useEffect(() => {
        if (!isOpen) return;
        const contiguous: string[] = [];
        for (const chapter of chapters) {
            if (!isComplete(chapter)) break;
            contiguous.push(chapter.id);
        }
        setSelectedIds(contiguous);
    }, [isOpen, chapters]);

    if (!isOpen) return null;

    const toggleThrough = (index: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(chapters.slice(0, index + 1).map(chapter => chapter.id));
        } else {
            setSelectedIds(chapters.slice(0, index).map(chapter => chapter.id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-surface" role="dialog" aria-modal="true" aria-labelledby="publish-story-title">
                <header className="border-b p-5 dark:border-dark-border">
                    <h3 id="publish-story-title" className="text-xl font-bold text-text-rich dark:text-dark-text-rich">Publish story</h3>
                    <p className="mt-1 text-sm text-text-body dark:text-dark-text-body">Choose how much of the story readers can see now. Chapters must be published in order.</p>
                </header>
                <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">
                    {chapters.length === 0 && <p className="text-sm text-gray-500">Create a chapter before publishing this story.</p>}
                    {chapters.map((chapter, index) => {
                        const complete = isComplete(chapter);
                        const prefixComplete = chapters.slice(0, index + 1).every(isComplete);
                        const checked = selectedIds.includes(chapter.id);
                        return (
                            <label key={chapter.id} className={`flex items-start gap-3 rounded-xl border p-3 ${prefixComplete ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} dark:border-dark-border`}>
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 accent-primary"
                                    checked={checked}
                                    disabled={!prefixComplete || isPublishing}
                                    onChange={event => toggleThrough(index, event.target.checked)}
                                />
                                <span className="min-w-0">
                                    <strong className="block truncate text-sm text-text-rich dark:text-dark-text-rich">{index + 1}. {chapter.title || 'Untitled chapter'}</strong>
                                    <small className="text-gray-500">{complete ? `${chapter.wordCount.toLocaleString()} words` : 'Add a title and content before publishing'}</small>
                                </span>
                            </label>
                        );
                    })}
                </div>
                <footer className="flex items-center justify-end gap-3 border-t p-5 dark:border-dark-border">
                    <button type="button" onClick={onClose} disabled={isPublishing} className="rounded-lg px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-surface-alt">Cancel</button>
                    <button type="button" onClick={() => onPublish(selectedIds)} disabled={isPublishing || selectedIds.length === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                        {isPublishing ? 'Publishing…' : `Publish ${selectedIds.length || ''} ${selectedIds.length === 1 ? 'chapter' : 'chapters'}`.trim()}
                    </button>
                </footer>
            </section>
        </div>
    );
};

const ImportCharacterReviewDialog: React.FC<{
    candidates: string[];
    embeddedImages: number;
    uploadedImages: number;
    isSaving: boolean;
    onClose: () => void;
    onCreate: (names: string[]) => void;
}> = ({ candidates, embeddedImages, uploadedImages, isSaving, onClose, onCreate }) => {
    const [selected, setSelected] = useState<string[]>([]);
    useEffect(() => setSelected([]), [candidates]);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <section className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-dark-surface sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="import-review-title">
                <h3 id="import-review-title" className="text-xl font-bold text-text-rich dark:text-dark-text-rich">Import complete</h3>
                <p className="mt-1 text-sm text-text-body dark:text-dark-text-body">
                    {uploadedImages > 0 ? `${uploadedImages} of ${embeddedImages} embedded images were uploaded to chapter storage. ` : ''}
                    We also found names that may be characters. Choose any you want to add to the story bible.
                </p>
                <div className="my-5 max-h-64 space-y-2 overflow-y-auto">
                    {candidates.map(name => (
                        <label key={name} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 dark:border-dark-border">
                            <input type="checkbox" checked={selected.includes(name)} onChange={() => setSelected(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name])} className="h-4 w-4 accent-primary" />
                            <span className="font-semibold text-text-rich dark:text-dark-text-rich">{name}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm font-bold text-gray-600">Not now</button>
                    <button type="button" onClick={() => onCreate(selected)} disabled={isSaving || selected.length === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? 'Adding…' : `Add ${selected.length || ''} ${selected.length === 1 ? 'character' : 'characters'}`.trim()}</button>
                </div>
            </section>
        </div>
    );
};

const ChapterListItem: React.FC<{ chapter: Chapter, bookId: string, index: number, isBusy?: boolean, onPublishToggle: () => void, onCancelSchedule: () => void, onDelete: () => void, onShare: () => void }> = ({ chapter, bookId, index, isBusy = false, onPublishToggle, onCancelSchedule, onDelete, onShare }) => (
    <div className="ww-manage-chapter-card flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg border dark:border-dark-border group hover:border-accent/30 transition-colors gap-4">
        <div className="ww-manage-chapter-main flex items-center gap-4">
            <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</span>
            <div className="ww-manage-chapter-copy">
                <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title}</h4>
                <div className="ww-manage-chapter-meta flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm flex-shrink-0 ${chapter.status === 'published' ? 'bg-green-100 text-green-800' : chapter.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 dark:bg-dark-surface-alt dark:text-gray-400'}`}>
                        {chapter.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chapter.wordCount.toLocaleString()} words</p>
                    {chapter.status === 'scheduled' && chapter.scheduledAt && (
                        <p className="ww-manage-scheduled-time">{new Date(chapter.scheduledAt).toLocaleString()}</p>
                    )}
                    {chapter.hasUnpublishedChanges && <p className="text-xs font-semibold text-amber-700">Unpublished changes</p>}
                </div>
            </div>
        </div>
        <div className="ww-manage-chapter-actions flex items-center gap-2 flex-wrap sm:opacity-0 group-hover:opacity-100 transition-opacity pl-10 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-dark-border">
            <button
                onClick={() => window.location.hash = `/write/book/${bookId}/chapter/${chapter.id}/edit`}
                className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors text-text-body dark:text-dark-text-body"
            >
                <PencilIcon className="w-4 h-4" /> Edit
            </button>
            <button
                onClick={chapter.status === 'scheduled' ? onCancelSchedule : onPublishToggle}
                disabled={isBusy}
                className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-wait ${chapter.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
                {isBusy ? 'Working…' : chapter.status === 'published' ? 'Unpublish' : chapter.status === 'scheduled' ? 'Cancel schedule' : 'Publish'}
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
                disabled={isBusy}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
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
    const [isImporting, setIsImporting] = useState(false);
    const isImportingRef = useRef(false);
    const [importNotice, setImportNotice] = useState('');
    const [importReview, setImportReview] = useState<{ candidates: string[]; embeddedImages: number; uploadedImages: number } | null>(null);
    const [isCreatingImportedCharacters, setIsCreatingImportedCharacters] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [isNavigatingNewChapter, setIsNavigatingNewChapter] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [showPublishStoryDialog, setShowPublishStoryDialog] = useState(false);
    const [showReturnDraftConfirm, setShowReturnDraftConfirm] = useState(false);
    const [chapterStatusTarget, setChapterStatusTarget] = useState<{ id: string; title: string; mode: 'publish-story' | 'unpublish-cascade'; laterCount: number } | null>(null);

    const handleNewChapterClick = () => {
        if (isNavigatingNewChapter) return;
        setIsNavigatingNewChapter(true);
        window.location.hash = `/write/book/${bookId}/chapter/new/edit`;
    };

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);

    // Derived state
    const publishedChapterCount = book?.chapters.filter(c => c.status === 'published').length || 0;
    const isBookPublished = book?.publicationStatus === 'published';
    const totalWords = book?.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0) || 0;

    const performChapterPublishToggle = async (chapterId: string) => {
        const action = `chapter-status:${chapterId}`;
        if (pendingAction) return;
        setPendingAction(action);
        try {
            const updatedUser = await api.toggleChapterPublication(currentUser.id, bookId, chapterId);
            onUserUpdate(updatedUser);
            setErrorMsg(null);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'The chapter status could not be changed.');
        } finally {
            setPendingAction(null);
        }
    };

    const handlePublishChapterToggle = (chapterId: string) => {
        if (!book || pendingAction) return;
        const index = book.chapters.findIndex(chapter => chapter.id === chapterId);
        const chapter = book.chapters[index];
        if (!chapter) return;
        if (chapter.status === 'published') {
            const laterCount = book.chapters.slice(index + 1).filter(item => item.status === 'published' || item.status === 'scheduled').length;
            if (laterCount > 0) {
                setChapterStatusTarget({ id: chapter.id, title: chapter.title, mode: 'unpublish-cascade', laterCount });
                return;
            }
        } else if (!isBookPublished) {
            setChapterStatusTarget({ id: chapter.id, title: chapter.title, mode: 'publish-story', laterCount: index });
            return;
        }
        void performChapterPublishToggle(chapterId);
    };

    const handleCancelSchedule = async (chapterId: string) => {
        const action = `chapter-status:${chapterId}`;
        if (pendingAction) return;
        setPendingAction(action);
        try {
            const updatedUser = await api.cancelChapterSchedule(bookId, chapterId);
            onUserUpdate(updatedUser);
            setErrorMsg(null);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'Could not cancel this schedule.');
        } finally {
            setPendingAction(null);
        }
    };

    const handleDeleteChapter = async (chapterId: string) => {
        const action = `delete-chapter:${chapterId}`;
        if (pendingAction) return;
        setPendingAction(action);
        try {
            const updatedUser = await api.deleteChapter(bookId, chapterId);
            onUserUpdate(updatedUser);
            setDeleteChapterTarget(null);
            setErrorMsg(null);
        } catch (e: any) {
            setErrorMsg(e.message || 'The chapter could not be deleted. Please try again.');
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setPendingAction(null);
        }
    };

    const handleDeleteBook = async () => {
        if (pendingAction) return;
        setPendingAction('delete-book');
        try {
            const updatedUser = await api.deleteBook(bookId);
            onUserUpdate(updatedUser);
            window.location.hash = '/write';
        } catch (e: any) {
            setErrorMsg(e.message || 'The story could not be deleted. Please try again.');
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setPendingAction(null);
        }
    };

    const handleBookPublishToggle = async () => {
        if (!book || pendingAction) return;
        if (!isBookPublished) {
            setShowPublishStoryDialog(true);
            return;
        }
        setShowReturnDraftConfirm(true);
    };

    const confirmReturnStoryToDraft = async () => {
        if (!book || pendingAction) return;
        try {
            setPendingAction('book-status');
            const updatedUser = await api.setBookStatus(currentUser.id, bookId, 'draft');
            onUserUpdate(updatedUser);
            setShowReturnDraftConfirm(false);
            setErrorMsg(null);
        } catch (e: any) {
            setErrorMsg(e.message);
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setPendingAction(null);
        }
    };

    const confirmStoryPublication = async (chapterIds: string[]) => {
        if (!book || pendingAction || chapterIds.length === 0) return;
        if ((book.isMature || book.ageRating === 'MATURE_18' || book.ageRating === 'ADULT_21') && !currentUser.dateOfBirth) {
            setErrorMsg('Date of birth is required in your profile before publishing mature (18+/21+) content.');
            setShowPublishStoryDialog(false);
            return;
        }
        try {
            setPendingAction('book-status');
            const updatedUser = await api.setBookStatus(currentUser.id, bookId, 'published', chapterIds);
            onUserUpdate(updatedUser);
            setShowPublishStoryDialog(false);
            setShowPublishCelebration(true);
            setErrorMsg(null);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'The story could not be published.');
        } finally {
            setPendingAction(null);
        }
    };

    const handleBookUpdate = async (updates: Partial<Book>) => {
        const updatedUser = await api.updateBookDetails(currentUser.id, bookId, updates);
        onUserUpdate(updatedUser);
    };

    const handleManuscriptImport = async (file?: File) => {
        if (!file || isImportingRef.current) return;
        isImportingRef.current = true;
        setErrorMsg(null);
        setImportNotice('');
        try {
            validateManuscriptFile(file.name, file.size);
            setIsImporting(true);
            const result = await api.importManuscript(bookId, file);
            onUserUpdate(result.user);
            const imageSummary = result.embeddedImages > 0 ? ` ${result.uploadedImages} embedded ${result.uploadedImages === 1 ? 'image' : 'images'} uploaded.` : '';
            setImportNotice(`${result.importedChapters} ${result.importedChapters === 1 ? 'chapter' : 'chapters'} imported as private drafts.${imageSummary}`);
            if (result.characterCandidates.length > 0) {
                try {
                    const existing = await api.getCharactersByBookId(bookId);
                    const existingNames = new Set(existing.map(character => character.name.toLowerCase()));
                    const candidates = result.characterCandidates.filter(name => !existingNames.has(name.toLowerCase()));
                    if (candidates.length > 0) setImportReview({ candidates, embeddedImages: result.embeddedImages, uploadedImages: result.uploadedImages });
                } catch {
                    setImportReview({ candidates: result.characterCandidates, embeddedImages: result.embeddedImages, uploadedImages: result.uploadedImages });
                }
            }
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'Could not import this manuscript.');
        } finally {
            setIsImporting(false);
            isImportingRef.current = false;
            if (importInputRef.current) importInputRef.current.value = '';
        }
    };

    const createImportedCharacters = async (names: string[]) => {
        if (isCreatingImportedCharacters || names.length === 0) return;
        setIsCreatingImportedCharacters(true);
        const results = await Promise.allSettled(names.map(name => api.createCharacter({ bookId, name, role: 'Secondary' })));
        const created = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.length - created;
        setImportReview(null);
        setImportNotice(`${created} ${created === 1 ? 'character' : 'characters'} added to the story bible.${failed ? ` ${failed} could not be added; you can add them manually from Characters.` : ''}`);
        setIsCreatingImportedCharacters(false);
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
                            <span className="ww-manage-category">{book.readingStatus}</span>
                            {book.category && <span className="ww-manage-category">{book.category}</span>}
                        </div>
                        <h1>{book.title}</h1>
                        <p>{book.description || 'Add a short description to give this story a clear direction.'}</p>
                        <div className="ww-manage-genres">
                            {book.genres.map(g => <button type="button" key={g} onClick={() => window.location.hash = `/genre/${encodeURIComponent(g)}`}>{g}</button>)}
                        </div>
                        <div className="ww-manage-stats">
                            <div><strong>{book.chapters.length}</strong><span>Chapters</span></div>
                            <div><strong>{totalWords.toLocaleString()}</strong><span>Words</span></div>
                            <div><strong>{publishedChapterCount}</strong><span>Live</span></div>
                            <div><strong>{book.viewCount?.toLocaleString() || 0}</strong><span>Reads</span></div>
                        </div>
                    </div>

                    <div className="ww-manage-actions">
                        <button className="ww-manage-primary" onClick={handleNewChapterClick} disabled={isNavigatingNewChapter}>
                            <PlusIcon className="w-4 h-4" /> New chapter
                        </button>
                        <button onClick={() => importInputRef.current?.click()} disabled={isImporting}>
                            {isImporting ? 'Importing…' : 'Import manuscript'}
                        </button>
                        <input
                            ref={importInputRef}
                            className="sr-only"
                            type="file"
                            accept=".txt,.md,.markdown,.docx"
                            disabled={isImporting}
                            onChange={event => handleManuscriptImport(event.target.files?.[0])}
                        />
                        <button className="ww-manage-publish" onClick={handleBookPublishToggle} disabled={pendingAction !== null}>
                            {pendingAction === 'book-status' ? 'Updating…' : isBookPublished ? 'Return to draft' : 'Publish story'}
                        </button>
                        <button onClick={() => setIsEditModalOpen(true)}><Cog6ToothIcon className="w-4 h-4" /> Story details</button>
                        <button className="danger" onClick={() => setShowDeleteBookConfirm(true)} disabled={pendingAction !== null}><TrashIcon className="w-4 h-4" /> Delete story</button>
                    </div>
                </div>
                {errorMsg && <div className="ww-manage-error">{errorMsg}</div>}
                {importNotice && <div className="ww-manage-import-notice" role="status">{importNotice}</div>}
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
                                    isBusy={pendingAction === `chapter-status:${chapter.id}` || pendingAction === `delete-chapter:${chapter.id}`}
                                    onPublishToggle={() => handlePublishChapterToggle(chapter.id)}
                                    onCancelSchedule={() => handleCancelSchedule(chapter.id)}
                                    onDelete={() => setDeleteChapterTarget({ id: chapter.id, title: chapter.title })}
                                    onShare={() => setShareChapter(chapter)}
                                />
                            )) : (
                                <div className="ww-manage-empty">
                                    <span>01</span>
                                    <h3>Every story starts with a blank page.</h3>
                                    <p>Create the opening chapter. It stays private until you decide to publish it.</p>
                                    <button onClick={handleNewChapterClick} disabled={isNavigatingNewChapter}>
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
                currentUserDateOfBirth={currentUser.dateOfBirth}
                onUpdate={handleBookUpdate}
            />

            <PublishStoryDialog
                isOpen={showPublishStoryDialog}
                chapters={book.chapters}
                isPublishing={pendingAction === 'book-status'}
                onClose={() => setShowPublishStoryDialog(false)}
                onPublish={confirmStoryPublication}
            />

            {importReview && (
                <ImportCharacterReviewDialog
                    candidates={importReview.candidates}
                    embeddedImages={importReview.embeddedImages}
                    uploadedImages={importReview.uploadedImages}
                    isSaving={isCreatingImportedCharacters}
                    onClose={() => setImportReview(null)}
                    onCreate={createImportedCharacters}
                />
            )}

            <ConfirmDialog
                isOpen={showReturnDraftConfirm}
                title="Return story to draft?"
                message="The story and every chapter will be removed from public reading. Your writing stays saved and can be published again later."
                confirmLabel="Return to draft"
                processingLabel="Updating story…"
                tone="warning"
                isProcessing={pendingAction === 'book-status'}
                onConfirm={confirmReturnStoryToDraft}
                onCancel={() => setShowReturnDraftConfirm(false)}
            />

            <ConfirmDialog
                isOpen={!!chapterStatusTarget}
                title={chapterStatusTarget?.mode === 'publish-story' ? 'Publish story with this chapter?' : 'Unpublish this chapter and later chapters?'}
                message={chapterStatusTarget?.mode === 'publish-story'
                    ? `“${chapterStatusTarget?.title}” belongs to a private story. Publishing it will also publish the story and ${chapterStatusTarget?.laterCount ? `${chapterStatusTarget.laterCount} preceding ${chapterStatusTarget.laterCount === 1 ? 'chapter' : 'chapters'}` : 'make this its first public chapter'}.`
                    : `To keep the reading order intact, “${chapterStatusTarget?.title}” and ${chapterStatusTarget?.laterCount} later ${chapterStatusTarget?.laterCount === 1 ? 'chapter' : 'chapters'} will return to draft.`}
                confirmLabel={chapterStatusTarget?.mode === 'publish-story' ? 'Publish story' : 'Unpublish chapters'}
                processingLabel="Updating chapters…"
                tone={chapterStatusTarget?.mode === 'publish-story' ? 'primary' : 'warning'}
                isProcessing={!!chapterStatusTarget && pendingAction === `chapter-status:${chapterStatusTarget.id}`}
                onConfirm={() => {
                    if (!chapterStatusTarget) return;
                    const id = chapterStatusTarget.id;
                    setChapterStatusTarget(null);
                    void performChapterPublishToggle(id);
                }}
                onCancel={() => setChapterStatusTarget(null)}
            />

            {/* Delete Chapter Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteChapterTarget}
                title="Delete Chapter"
                message={`Are you sure you want to delete "${deleteChapterTarget?.title}"? This action cannot be undone.`}
                onConfirm={() => deleteChapterTarget && handleDeleteChapter(deleteChapterTarget.id)}
                onCancel={() => setDeleteChapterTarget(null)}
                isProcessing={!!deleteChapterTarget && pendingAction === `delete-chapter:${deleteChapterTarget.id}`}
                processingLabel="Deleting chapter…"
            />

            {/* Delete Book Confirmation */}
            <ConfirmDialog
                isOpen={showDeleteBookConfirm}
                title="Delete Book"
                message={`Are you sure you want to delete "${book.title}"? This will permanently remove the book, all its chapters, and all associated data (reviews, comments, reading progress). This action cannot be undone.`}
                confirmLabel="Delete Book"
                processingLabel="Deleting story…"
                isProcessing={pendingAction === 'delete-book'}
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
                    shareTextOverride={`I just published '${book.title}' on WordWeft! Check it out.`}
                />
            )}
        </div>
    );
};
