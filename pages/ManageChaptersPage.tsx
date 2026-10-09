import { ReleaseImpactDialog } from '../components/ReleaseImpactDialog';
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
import { DisclosureMenu } from '../components/DisclosureMenu';
import { useDialog } from '../hooks/useDialog';
import { validateManuscriptFile } from '../utils/manuscriptImport';
import { importProgressCopy, type ImportProgressPhase } from '../utils/importProgress';
import { lockNavigation, navigatePath } from '../utils/navigation';
import { ArrowRight, ExternalLink, Plus, Search, Upload } from 'lucide-react';
import '../styles/writer-experience.css';
import { movePrivateChapter, parseImportUndo } from '../utils/writerExperience';
import { readOptionalSessionValue, writeOptionalSessionValue } from '../utils/optionalStorage';
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
    const [summary, setSummary] = useState(book.summary || '');
    const [tags, setTags] = useState((book.tags || []).join(', '));
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
    const [showDiscard, setShowDiscard] = useState(false);
    const parsedTags = tags === (book.tags || []).join(', ') ? book.tags || [] : tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const draftDetails = { title, description, summary, tags: parsedTags, coverUrl, coverFileId, category, readingStatus, genres, ageRating, contentWarnings, customDisclaimer, isAIGenerated };
    const initialDetails = { title: book.title, description: book.description || '', summary: book.summary || '', tags: book.tags || [], coverUrl: book.coverUrl, coverFileId: book.coverFileId || null, category: book.category || '', readingStatus: book.readingStatus || 'Ongoing', genres: book.genres || [], ageRating: book.ageRating || 'ALL_AGES', contentWarnings: book.contentWarnings || [], customDisclaimer: book.customDisclaimer || '', isAIGenerated: book.isAIGenerated || false };
    const isDirty = JSON.stringify(draftDetails) !== JSON.stringify(initialDetails);
    const requestClose = () => { if (isSaving || isCoverUploading) return; if (isDirty) setShowDiscard(true); else onClose(); };
    const dialogRef = useDialog(isOpen, requestClose, !isSaving && !isCoverUploading);
    useEffect(() => { if (!isOpen || !isDirty) return; return lockNavigation('Save or discard your story detail changes before leaving.'); }, [isOpen, isDirty]);

    useEffect(() => {
        if (isOpen) {
            api.getGenres().then(setAllGenres).catch(() => setAllGenres(book.genres || []));
            setTitle(book.title);
            setDescription(book.description || '');
            setSummary(book.summary || '');
            setTags((book.tags || []).join(', '));
            setShowDiscard(false);
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
    }, [isOpen, book.id]);

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
        if (!title.trim()) { setSaveError('Give your story a title.'); return; }
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
                title: title.trim(),
                description,
                summary,
                tags: parsedTags,
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
        <div className="ww-studio-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={event => { if (event.target === event.currentTarget && !isSaving && !isCoverUploading) requestClose(); }}>
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="story-details-title" aria-busy={isSaving || isCoverUploading} className="ww-story-details-dialog bg-white dark:bg-dark-surface w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-dark-border flex justify-between items-center">
                    <h3 id="story-details-title" className="text-xl font-bold dark:text-dark-text-rich">Story details</h3>
                    <button onClick={requestClose} disabled={isSaving || isCoverUploading} aria-label="Close story details"><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form id="edit-book-form" onSubmit={handleSave}><fieldset disabled={isSaving} className="ww-pending-fields space-y-4">
                        <div>
                            <label htmlFor="story-details-name" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Title</label>
                            <input id="story-details-name" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" required />
                        </div>
                        <ImageUpload 
                            value={coverUrl}
                            onChange={(url, fileId) => {
                                setCoverUrl(url);
                                setCoverFileId(fileId);
                            }}
                            label="Book Cover"
                            fallbackUrl="/images/unchosen-story-cover.svg"
                            aspectRatio={2/3}
                            cropShape="rect"
                            onBusyChange={setIsCoverUploading}
                            disabled={isSaving}
                        />
                        <div>
                            <label htmlFor="story-details-summary" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Short introduction (optional)</label>
                            <input id="story-details-summary" value={summary} maxLength={200} onChange={event => setSummary(event.target.value)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" />
                        </div>
                        <div>
                            <label htmlFor="story-details-tags" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Tags (optional)</label>
                            <input id="story-details-tags" value={tags} onChange={event => setTags(event.target.value)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" aria-describedby="story-details-tags-help" />
                            <p id="story-details-tags-help" className="mt-1 text-xs text-gray-500">Separate tags with commas.</p>
                        </div>
                        <div>
                            <label htmlFor="story-details-description" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Description</label>
                            <textarea id="story-details-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" />
                        </div>
                        <div>
                            <label htmlFor="story-details-category" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Category</label>
                            <select
                                id="story-details-category"
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
                            <label htmlFor="story-details-status" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Story status</label>
                            <select id="story-details-status" value={readingStatus} onChange={e => setReadingStatus(e.target.value as StoryStatus)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border">
                                <option value="Ongoing">Ongoing — new chapters are expected</option>
                                <option value="Hiatus">On hiatus — updates are paused</option>
                                <option value="Completed">Completed — the story is finished</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This is shown to readers and can be changed any time.</p>
                        </div>
                        <div>
                            <label htmlFor="story-details-genres" className="block text-sm font-bold mb-2 dark:text-dark-text-body">Genres</label>
                            {genres.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {genres.map(g => (
                                        <button key={g} type="button" aria-label={`Remove ${g}`} onClick={() => toggleGenre(g)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white cursor-pointer hover:bg-primary/80 transition-colors">
                                            {g} <span className="text-white/70">×</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input
                                id="story-details-genres"
                                type="text"
                                placeholder="Search genres..."
                                value={genreSearch}
                                onChange={e => setGenreSearch(e.target.value)}
                                className="w-full p-2 mb-2 rounded-lg border text-sm dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich focus:ring-1 focus:ring-accent focus:border-accent"
                            />
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                {filteredGenres.map(g => (
                                    <button key={g} type="button" aria-pressed={genres.includes(g)} onClick={() => toggleGenre(g)} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${genres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt dark:text-dark-text-body hover:bg-gray-200 dark:hover:bg-dark-border'}`}>
                                        {g}
                                    </button>
                                ))}
                                {filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match your search.</p>}
                            </div>
                        </div>
                        <div className="pt-2 border-t dark:border-dark-border mt-4">
                            <label htmlFor="story-details-rating" className="block text-sm font-bold mb-1 dark:text-dark-text-body">Age rating</label>
                            <select id="story-details-rating" value={ageRating} onChange={e => setAgeRating(e.target.value as AgeRating)} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border">
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
                                {(['VIOLENCE','GORE','STRONG_LANGUAGE','SEXUAL_CONTENT','ABUSE','SELF_HARM','SUBSTANCE_USE','GRIEF','DISCRIMINATION','OTHER'] as ContentWarning[]).map(w => <button key={w} type="button" aria-pressed={contentWarnings.includes(w)} onClick={() => setContentWarnings(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])} className={`px-3 py-1 rounded-full text-xs ${contentWarnings.includes(w) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt'}`}>{w.replaceAll('_',' ')}</button>)}
                            </div>
                            <label htmlFor="story-details-note" className="block text-sm font-bold mt-4 mb-1 dark:text-dark-text-body">Author’s content note</label>
                            <textarea id="story-details-note" value={customDisclaimer} onChange={e => setCustomDisclaimer(e.target.value)} maxLength={1000} rows={3} className="w-full p-2 rounded-lg border dark:bg-dark-surface-alt dark:border-dark-border" placeholder="Optional context for readers" />
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
                    </fieldset></form>
                </div>
                <div className="p-6 border-t dark:border-dark-border flex justify-end gap-3">
                    {saveError && <p className="mr-auto max-w-sm text-xs font-semibold text-red-600 dark:text-red-400" role="alert">{saveError}</p>}
                    <button onClick={requestClose} disabled={isSaving || isCoverUploading} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
                    <button form="edit-book-form" type="submit" disabled={isSaving || isCoverUploading} className="px-4 py-2 text-sm font-bold text-white bg-accent hover:bg-primary rounded-lg disabled:opacity-50">
                        {isCoverUploading ? 'Uploading cover…' : isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
            <ConfirmDialog isOpen={showDiscard} title="Discard story detail changes?" message="Your changes have not been saved. Keep editing to save them, or discard them to close story details." confirmLabel="Discard changes" processingLabel="Discarding…" onConfirm={onClose} onCancel={() => setShowDiscard(false)} />
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
    const dialogRef = useDialog(isOpen, onCancel, !isProcessing);
    if (!isOpen) return null;
    return (
        <div className="ww-studio-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={event => { if (event.target === event.currentTarget && !isProcessing) onCancel(); }}>
            <div ref={dialogRef} tabIndex={-1} className="ww-studio-dialog bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6" role="alertdialog" aria-label={title} aria-modal="true" aria-busy={isProcessing}>
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
    const dialogRef = useDialog(isOpen, onClose, !isPublishing);

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
        <div className="ww-studio-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={event => { if (event.target === event.currentTarget && !isPublishing) onClose(); }}>
            <section ref={dialogRef} tabIndex={-1} className="ww-studio-dialog w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-surface" role="dialog" aria-modal="true" aria-labelledby="publish-story-title">
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
                        {isPublishing ? 'Publishing…' : 'Review selected release'}
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
    const dialogRef = useDialog(true, onClose, !isSaving);
    useEffect(() => setSelected([]), [candidates]);
    return (
        <div className="ww-studio-dialog-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
            <section ref={dialogRef} tabIndex={-1} className="ww-studio-dialog w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-dark-surface sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="import-review-title">
                <h3 id="import-review-title" className="text-xl font-bold text-text-rich dark:text-dark-text-rich">Import complete</h3>
                <p className="mt-1 text-sm text-text-body dark:text-dark-text-body">
                    {uploadedImages > 0 ? `${uploadedImages} of ${embeddedImages} embedded images were placed in the imported chapters. ` : ''}
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

const ManuscriptPreflightDialog: React.FC<{ file: File; preview: api.ManuscriptPreflight | null; error: string; onClose: () => void; onConfirm: () => void; onRetry: () => void }> = ({ file, preview, error, onClose, onConfirm, onRetry }) => {
    const dialogRef = useDialog(true, onClose);
    return (
        <div className="ww-studio-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="import-preview-title" className="ww-import-preview bg-white dark:bg-dark-surface rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <h2 id="import-preview-title" className="text-xl font-bold">Review manuscript import</h2>
                <p>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>
                {!preview && !error && <p role="status">Checking chapter boundaries and images…</p>}
                {error && <p role="alert">{error} <button className="ww-studio-text-link" onClick={onRetry}>Check manuscript again</button></p>}
                {preview && <>
                    <p>{preview.chapters.length} {preview.chapters.length === 1 ? 'chapter' : 'chapters'} · {preview.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0).toLocaleString()} words{preview.embeddedImages ? ` · ${preview.embeddedImages} embedded images` : ''}</p>
                    <p>These chapters will be added after your existing manuscript as private drafts. Your current chapters stay saved.</p>
                    {preview.warnings.length > 0 && <ul className="ww-import-preview-warnings">{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
                    <ol className="ww-import-preview-chapters">{preview.chapters.map((chapter, index) => <li key={index}><span>{index + 1}. {chapter.title}</span><small>{chapter.wordCount.toLocaleString()} words</small></li>)}</ol>
                    <p>You can undo the whole imported chapter batch while every imported chapter is unchanged and private.</p>
                </>}
                <div className="flex justify-end gap-3 mt-6">
                    <button className="px-4 py-2" onClick={onClose}>Cancel import</button>
                    <button className="ww-studio-primary" disabled={!preview || preview.chapters.length === 0} onClick={onConfirm}>Import private drafts</button>
                </div>
            </div>
        </div>
    );
};

const ChapterListItem: React.FC<{ chapter: Chapter, bookId: string, index: number, isBusy?: boolean, onPublishToggle: () => void, onCancelSchedule: () => void, onDelete: () => void, onShare: () => void, onDuplicate: () => void, onMove: (direction: -1 | 1) => void, canMoveUp: boolean, canMoveDown: boolean }> = ({ chapter, bookId, index, isBusy = false, onPublishToggle, onCancelSchedule, onDelete, onShare, onDuplicate, onMove, canMoveUp, canMoveDown }) => (
    <div className="ww-manage-chapter-card ww-arrive-quiet flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg border dark:border-dark-border group hover:border-accent/30 transition-colors gap-4">
        <div className="ww-manage-chapter-main flex items-center gap-4">
            <span className="font-sans font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</span>
            <div className="ww-manage-chapter-copy">
                <a href={`/write/book/${bookId}/chapter/${chapter.id}/edit`}><h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich">{chapter.title || `Chapter ${index + 1}`}</h4></a>
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
        <span className="ww-manage-chapter-reads">{chapter.status === 'published' ? `${chapter.viewCount.toLocaleString()} reads` : 'Private'}</span>
        <DisclosureMenu className="ww-manage-chapter-menu" contentClassName="ww-manage-chapter-actions" label={`Actions for ${chapter.title || `Chapter ${index + 1}`}`}>
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
            <button onClick={onDuplicate} disabled={isBusy}>Duplicate as private draft</button>
            {chapter.status === 'draft' && !chapter.publishedAt && <><button onClick={() => onMove(-1)} disabled={isBusy || !canMoveUp}>Move up</button><button onClick={() => onMove(1)} disabled={isBusy || !canMoveDown}>Move down</button></>}
            <button
                onClick={onDelete}
                disabled={isBusy}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                title="Delete chapter"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </DisclosureMenu>
    </div>
);


export const ManageChaptersPage: React.FC<ManageChaptersPageProps> = ({ currentUser, bookId, onUserUpdate }) => {
    const { trackEvent } = useAnalytics();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const readTab = (): Tab => { const value = new URLSearchParams(window.location.search).get('tab'); return value === 'characters' || value === 'scenes' || value === 'notes' ? value : 'chapters'; };
    const [activeTab, setActiveTab] = useState<Tab>(readTab);
    useEffect(() => { const sync = () => setActiveTab(readTab()); window.addEventListener('wordweft:navigate', sync); window.addEventListener('popstate', sync); return () => { window.removeEventListener('wordweft:navigate', sync); window.removeEventListener('popstate', sync); }; }, [bookId]);
    const [deleteChapterTarget, setDeleteChapterTarget] = useState<{ id: string; title: string } | null>(null);
    const [showDeleteBookConfirm, setShowDeleteBookConfirm] = useState(false);
    // W4: Chapter share state
    const [shareChapter, setShareChapter] = useState<Chapter | null>(null);
    // W2: Book publish celebration state
    const [showPublishCelebration, setShowPublishCelebration] = useState(false);
    const [bookShareOpen, setBookShareOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const isImportingRef = useRef(false);
    const releaseImportNavigationLockRef = useRef<null | (() => void)>(null);
    const [importFileName, setImportFileName] = useState('');
    const [importPhase, setImportPhase] = useState<ImportProgressPhase>('uploading');
    const [importPercent, setImportPercent] = useState(0);
    const [importElapsedSeconds, setImportElapsedSeconds] = useState(0);
    const [importNotice, setImportNotice] = useState('');
    const [importReview, setImportReview] = useState<{ candidates: string[]; embeddedImages: number; uploadedImages: number } | null>(null);
    const [isCreatingImportedCharacters, setIsCreatingImportedCharacters] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [stagedImport, setStagedImport] = useState<{ file: File; preview: api.ManuscriptPreflight | null; error: string } | null>(null);
    const preflightSequence = useRef(0);
    const importUndoKey = `ww:import-undo:${currentUser.id}:${bookId}`;
    const [undoImport, setUndoImport] = useState<{ importId: string; count: number } | null>(() => { try { return parseImportUndo(JSON.parse(readOptionalSessionValue(importUndoKey) || 'null')); } catch { return null; } });
    const [showUndoImport, setShowUndoImport] = useState(false);
    useEffect(() => { try { const value = JSON.parse(readOptionalSessionValue(importUndoKey) || 'null'); setUndoImport(parseImportUndo(value)); } catch { setUndoImport(null); } setShowUndoImport(false); setStagedImport(null); }, [importUndoKey]);
    const [isNavigatingNewChapter, setIsNavigatingNewChapter] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [chapterSearch, setChapterSearch] = useState('');
    const [chapterFilter, setChapterFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all');
    const [showPublishStoryDialog, setShowPublishStoryDialog] = useState(false);
    const [releaseTarget, setReleaseTarget] = useState<string | null>(null);
    const [showReturnDraftConfirm, setShowReturnDraftConfirm] = useState(false);
    const [chapterStatusTarget, setChapterStatusTarget] = useState<{ id: string; title: string; mode: 'publish-story' | 'unpublish-cascade'; laterCount: number } | null>(null);

    useEffect(() => {
        if (!isImporting) return;
        const startedAt = Date.now();
        document.body.style.overflow = 'hidden';
        const timer = window.setInterval(() => setImportElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => {
            window.clearInterval(timer);
            document.body.style.overflow = '';
        };
    }, [isImporting]);

    useEffect(() => () => releaseImportNavigationLockRef.current?.(), []);

    const handleNewChapterClick = () => {
        if (isNavigatingNewChapter) return;
        setIsNavigatingNewChapter(true);
        window.location.hash = `/write/book/${bookId}/chapter/new/edit`;
    };

    const book = currentUser.writtenBooks?.find(b => b.id === bookId);

    // Derived state
    const publishedChapterCount = book?.chapters.filter(c => c.status === 'published').length || 0;
    const isBookPublished = book?.publicationStatus === 'published';
    const visibleChapters = (book?.chapters || []).filter(chapter => (chapterFilter === 'all' || chapter.status === chapterFilter) && chapter.title.toLowerCase().includes(chapterSearch.toLowerCase()));
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
        } else {
            setReleaseTarget(chapterId);
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

    const confirmStoryPublication = (chapterIds: string[]) => {
        if (!book || pendingAction || chapterIds.length === 0) return;
        const target = book.chapters.filter(chapter => chapterIds.includes(chapter.id)).at(-1);
        if (!target) return;
        setShowPublishStoryDialog(false);
        setReleaseTarget(target.id);
    };

    const handleBookUpdate = async (updates: Partial<Book>) => {
        const updatedUser = await api.updateBookDetails(currentUser.id, bookId, updates);
        onUserUpdate(updatedUser);
    };

    const prepareManuscriptImport = async (file?: File) => {
        if (!file || isImportingRef.current) return;
        setErrorMsg(null);
        if (importInputRef.current) importInputRef.current.value = '';
        try { validateManuscriptFile(file.name, file.size); } catch (failure) { setErrorMsg(failure instanceof Error ? failure.message : 'Choose a supported manuscript.'); return; }
        const sequence = ++preflightSequence.current;
        setStagedImport({ file, preview: null, error: '' });
        try { const preview = await api.preflightManuscript(bookId, file); if (sequence === preflightSequence.current) setStagedImport({ file, preview, error: '' }); }
        catch (failure) { if (sequence === preflightSequence.current) setStagedImport({ file, preview: null, error: failure instanceof Error ? failure.message : 'Could not check this manuscript.' }); }
    };
    const cancelPreflight = () => { preflightSequence.current++; setStagedImport(null); };
    useEffect(() => () => { preflightSequence.current++; }, [bookId]);
    const performChapterAction = async (chapterId: string, direction?: -1 | 1) => {
        if (!book || pendingAction) return;
        const chapterIds = direction ? movePrivateChapter(book.chapters, chapterId, direction) : null;
        if (direction && !chapterIds) return;
        setPendingAction(direction ? 'reorder-chapters' : `duplicate-chapter:${chapterId}`);
        setErrorMsg(null);
        try { onUserUpdate(direction ? await api.reorderChapters(bookId, chapterIds!) : await api.duplicateChapter(bookId, chapterId)); }
        catch (failure) { setErrorMsg(failure instanceof Error ? failure.message : 'The chapter could not be changed.'); }
        finally { setPendingAction(null); }
    };
    const undoManuscript = async () => {
        if (!undoImport || pendingAction) return;
        setPendingAction('undo-import');
        try { onUserUpdate(await api.undoManuscriptImport(bookId, undoImport.importId)); setUndoImport(null); writeOptionalSessionValue(importUndoKey, 'null'); setShowUndoImport(false); setImportReview(null); setImportNotice('The imported chapter batch was removed. Your previous manuscript stays saved.'); setErrorMsg(null); }
        catch (failure) { setErrorMsg(failure instanceof Error ? failure.message : 'The import could not be undone.'); setShowUndoImport(false); }
        finally { setPendingAction(null); }
    };
    const handleManuscriptImport = async (file?: File) => {
        if (!file || isImportingRef.current) return;
        isImportingRef.current = true;
        setErrorMsg(null);
        setImportNotice('');
        try {
            validateManuscriptFile(file.name, file.size);
            setImportFileName(file.name);
            setImportPhase('uploading');
            setImportPercent(0);
            setImportElapsedSeconds(0);
            releaseImportNavigationLockRef.current = lockNavigation('Your manuscript is still being imported.');
            setIsImporting(true);
            const result = await api.importManuscript(bookId, file, (phase, percent) => {
                setImportPhase(phase);
                setImportPercent(percent);
            });
            onUserUpdate(result.user);
            if (result.importId) { const undo = { importId: result.importId, count: result.importedChapters }; setUndoImport(undo); writeOptionalSessionValue(importUndoKey, JSON.stringify(undo)); }
            const imageSummary = result.embeddedImages > 0 ? ` ${result.uploadedImages} embedded ${result.uploadedImages === 1 ? 'image was' : 'images were'} placed in the imported chapters.` : '';
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
            releaseImportNavigationLockRef.current?.();
            releaseImportNavigationLockRef.current = null;
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

    const progressCopy = importProgressCopy({ phase: importPhase, percent: importPercent, elapsedSeconds: importElapsedSeconds });
    const privateChapterCount = book.chapters.filter(chapter => chapter.status !== 'published').length;
    const workspaceTitle = { chapters: book.title, characters: 'Characters', scenes: 'Scenes', notes: 'Private notes' }[activeTab];
    const workspaceDescription = {
        chapters: `${publishedChapterCount} published ${publishedChapterCount === 1 ? 'chapter' : 'chapters'} · ${privateChapterCount} private ${privateChapterCount === 1 ? 'draft' : 'drafts'} · ${totalWords.toLocaleString()} words`,
        characters: 'Build your cast and link character details to your manuscript.',
        scenes: 'Plan the moments that connect your chapters.',
        notes: 'A private space for ideas, research, and reminders.',
    }[activeTab];

    return (
        <div className="ww-manage-book-page">
            <header className="ww-studio-pagehead ww-manage-heading">
                <span className="ww-studio-eyebrow">{activeTab === 'chapters' ? 'Your story' : book.title}</span>
                <div><div><h1>{workspaceTitle}</h1><p>{workspaceDescription}</p></div>{activeTab === 'chapters' && <button className="ww-studio-primary" onClick={handleNewChapterClick} disabled={isNavigatingNewChapter}>New chapter <Plus size={19} /></button>}</div>
            </header>
            {errorMsg && <div className="ww-manage-error" role="alert">{errorMsg}</div>}
            {importNotice && <div className="ww-manage-import-notice" role="status">{importNotice}</div>}
            {undoImport && <div className="ww-manage-import-notice">{undoImport.count} imported {undoImport.count === 1 ? 'chapter' : 'chapters'} in your latest batch. <button className="ww-studio-text-link" onClick={() => setShowUndoImport(true)} disabled={pendingAction !== null}>Undo chapter import</button><small>Available while all imported chapters are unchanged and private.</small></div>}

            <div className="ww-manage-workspace">
                <nav className="ww-manage-tabs" aria-label="Story workspace">
                    {(['chapters', 'characters', 'scenes', 'notes'] as Tab[]).map((tab) => (
                        <button key={tab} aria-current={activeTab === tab ? 'page' : undefined} onClick={() => { setActiveTab(tab); navigatePath(`/write/book/${bookId}/manage${tab === 'chapters' ? '' : `?tab=${tab}`}`); }} className={activeTab === tab ? 'active' : ''}>
                            <span>{tab === 'notes' ? 'Private notes' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                            {tab === 'chapters' && <small>{book.chapters.length}</small>}
                        </button>
                    ))}
                    <button onClick={() => setIsEditModalOpen(true)}>Story details</button>
                    <button onClick={() => navigatePath(`/write/analytics?book=${bookId}`)}>Statistics</button>
                </nav>
                <div className="ww-manage-workspace-toolbar"><span className={`ww-studio-status ${book.publicationStatus}`}>{isBookPublished ? 'Published' : 'Private story'}</span><a className="ww-studio-text-link" href={`/book/${book.id}`}>{isBookPublished ? 'Preview story' : 'Preview private story'} <ExternalLink size={16} /></a><DisclosureMenu label="Story actions"><button onClick={() => importInputRef.current?.click()} disabled={isImporting}><Upload size={16} />{isImporting ? 'Importing…' : 'Import manuscript'}</button><button onClick={handleBookPublishToggle} disabled={pendingAction !== null}>{pendingAction === 'book-status' ? 'Updating…' : isBookPublished ? 'Return to draft' : 'Publish story'}</button><button onClick={() => setIsEditModalOpen(true)}>Edit story details</button><button className="danger" onClick={() => setShowDeleteBookConfirm(true)} disabled={pendingAction !== null}>Delete story</button></DisclosureMenu><input ref={importInputRef} className="sr-only" type="file" aria-label="Import manuscript file" accept=".txt,.md,.markdown,.docx" disabled={isImporting} onChange={event => prepareManuscriptImport(event.target.files?.[0])} /></div>
                {activeTab !== 'chapters' && <div className="ww-manage-guide-note">Private notes stay visible only to you. Public character fields linked in your manuscript appear in the reader’s story guide. Private fields stay hidden; spoiler details follow their reveal rules.</div>}
                {activeTab === 'chapters' && (
                    <section className="ww-manage-chapters">
                        <div className="ww-manage-section-head">
                            <div><span>Manuscript</span><h2>Chapters</h2></div>
                            <p>{publishedChapterCount} of {book.chapters.length} published</p>
                        </div>
                        {book.chapters.length > 0 && <div className="ww-manage-chapter-filters"><label><Search size={17} /><input type="search" aria-label="Search chapters" placeholder="Search chapter titles" value={chapterSearch} onChange={event => setChapterSearch(event.target.value)} /></label><label>Status<select aria-label="Chapter status" value={chapterFilter} onChange={event => setChapterFilter(event.target.value as typeof chapterFilter)}><option value="all">All chapters</option><option value="draft">Private drafts</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label><span role="status">{visibleChapters.length} of {book.chapters.length} chapters</span></div>}
                        <div className="ww-manage-chapter-list">
                            {book.chapters.length > 0 ? visibleChapters.map((chapter) => (
                                <ChapterListItem
                                    key={chapter.id}
                                    chapter={chapter}
                                    bookId={book.id}
                                    index={book.chapters.indexOf(chapter)}
                                    isBusy={pendingAction !== null}
                                    onPublishToggle={() => handlePublishChapterToggle(chapter.id)}
                                    onCancelSchedule={() => handleCancelSchedule(chapter.id)}
                                    onDelete={() => setDeleteChapterTarget({ id: chapter.id, title: chapter.title })}
                                    onShare={() => setShareChapter(chapter)}
                                    onDuplicate={() => performChapterAction(chapter.id)}
                                    onMove={direction => performChapterAction(chapter.id, direction)}
                                    canMoveUp={!!movePrivateChapter(book.chapters, chapter.id, -1)}
                                    canMoveDown={!!movePrivateChapter(book.chapters, chapter.id, 1)}
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
                        {book.chapters.length > 0 && visibleChapters.length === 0 && <div className="ww-manage-empty"><h3>No chapters match.</h3><p>Try another title or status.</p><button onClick={() => { setChapterSearch(''); setChapterFilter('all'); }}>Show all chapters</button></div>}
                    </section>
                )}

                {activeTab === 'characters' && <CharacterList bookId={bookId} ownerId={currentUser.id} compact />}
                {activeTab === 'scenes' && <SceneList bookId={bookId} ownerId={currentUser.id} chapters={book.chapters} compact />}
                {activeTab === 'notes' && <NoteList bookId={bookId} ownerId={currentUser.id} compact />}
            </div>

            <EditBookModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                book={book}
                currentUserDateOfBirth={currentUser.dateOfBirth}
                onUpdate={handleBookUpdate}
            />

            {releaseTarget && <ReleaseImpactDialog bookId={bookId} chapterId={releaseTarget} bookTitle={book.title} onClose={() => setReleaseTarget(null)} onPublished={(updatedUser, storyBecomesPublic) => { onUserUpdate(updatedUser); setErrorMsg(null); if (storyBecomesPublic) setShowPublishCelebration(true); }} />}
            <PublishStoryDialog
                isOpen={showPublishStoryDialog}
                chapters={book.chapters}
                isPublishing={pendingAction === 'book-status'}
                onClose={() => setShowPublishStoryDialog(false)}
                onPublish={confirmStoryPublication}
            />

            {stagedImport && <ManuscriptPreflightDialog file={stagedImport.file} preview={stagedImport.preview} error={stagedImport.error} onClose={cancelPreflight} onRetry={() => prepareManuscriptImport(stagedImport.file)} onConfirm={() => { const file = stagedImport.file; cancelPreflight(); void handleManuscriptImport(file); }} />}
            <ConfirmDialog isOpen={showUndoImport} title="Undo imported chapters?" message={`Remove all ${undoImport?.count || 0} chapters from this import? This only succeeds while every imported chapter is unchanged and private. Characters you added separately stay in your story bible.`} confirmLabel="Undo chapter import" processingLabel="Undoing import…" isProcessing={pendingAction === 'undo-import'} onConfirm={undoManuscript} onCancel={() => setShowUndoImport(false)} />
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

            {isImporting && (
                <div className="ww-import-progress-overlay" role="dialog" aria-modal="true" aria-labelledby="import-progress-title" aria-describedby="import-progress-detail">
                    <div className="ww-import-progress-card" aria-busy="true">
                        <div className="ww-import-progress-mark" aria-hidden="true">
                            <span /><span /><span />
                        </div>
                        <p className="ww-import-progress-eyebrow">Importing {importFileName}</p>
                        <h2 id="import-progress-title">{progressCopy.title}</h2>
                        <p id="import-progress-detail">{progressCopy.detail}</p>
                        <div className={`ww-import-progress-track ${progressCopy.determinate ? '' : 'indeterminate'}`} aria-hidden="true">
                            <i style={progressCopy.determinate ? { width: `${progressCopy.percent}%` } : undefined} />
                        </div>
                        <p className="ww-import-progress-note">Keep this page open. You can continue when every chapter and embedded image is safely saved.</p>
                    </div>
                </div>
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
