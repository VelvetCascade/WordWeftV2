import React, { useCallback, useId, useRef, useState } from 'react';
import type { Chapter, Character, StoryBibleEntry, StoryBibleKind } from '../types';
import * as api from '../api/client';
import { usePlanningCollection } from '../hooks/usePlanningCollection';
import { PlanningLoadState } from './PlanningLoadState';
import { PlanningDraftForm } from './PlanningDraftForm';
import { ConfirmDialog } from './ConfirmDialog';
import { StoryBibleEntries } from './StoryBibleEntries';
import { bibleKinds, bibleLinksValid, previewBibleEntries } from '../utils/storyBible';
import { notifyPlanningUpdated } from '../utils/planningTools';
import '../styles/story-planning.css';

const emptyEntry = { kind: 'CHARACTER' as StoryBibleKind, title: '', detail: '', visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC', revealChapterId: '', characterIds: [] as string[] };
export function StoryBible({ bookId, ownerId, chapters }: { bookId: string; ownerId: string; chapters: Chapter[] }) {
    const collection = usePlanningCollection<StoryBibleEntry>(bookId, useCallback(() => api.getStoryBibleEntries(bookId), [bookId, ownerId]));
    const cast = usePlanningCollection<Character>(bookId, useCallback(() => api.getCharactersByBookId(bookId), [bookId, ownerId]));
    const [editing, setEditing] = useState<StoryBibleEntry | 'new' | null>(null);
    const [deleting, setDeleting] = useState<StoryBibleEntry | null>(null);
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState('');
    const [chapterFilter, setChapterFilter] = useState(() => new URLSearchParams(location.search).get('chapter') || '');
    const [preview, setPreview] = useState(false);
    const [previewChapter, setPreviewChapter] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const prefix = useId();
    const entryFromLink = useRef(new URLSearchParams(location.search).get('entry'));
    React.useEffect(() => {
        const id = entryFromLink.current;
        if (id && !collection.loading) {
            const entry = collection.data.find(item => item.id === id);
            if (entry) { setEditing(entry); entryFromLink.current = null; }
        }
    }, [collection.loading, collection.data]);
    const initial = editing && editing !== 'new' ? { kind: editing.kind, title: editing.title, detail: editing.detail, visibility: editing.visibility, revealChapterId: editing.revealChapterId || '', characterIds: editing.characterIds } : emptyEntry;
    const save = async (draft: typeof emptyEntry, clear: () => void) => {
        if (lock.current || !editing || !draft.title.trim() || !draft.detail.trim() || !bibleLinksValid(draft.kind, draft.characterIds)) return;
        lock.current = true; setBusy(true); setError(''); setSuccess('');
        try {
            const saved = await api.saveStoryBibleEntry({ ...draft, bookId, title: draft.title.trim(), detail: draft.detail.trim(), revealChapterId: draft.revealChapterId || null }, editing === 'new' ? undefined : editing.id);
            collection.setData(current => editing === 'new' ? [...current, saved] : current.map(entry => entry.id === saved.id ? saved : entry));
            clear(); setEditing(null); setSuccess('Story Bible entry saved.'); notifyPlanningUpdated(bookId);
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your entry could not be saved. The draft is kept.'); }
        finally { lock.current = false; setBusy(false); }
    };
    const remove = async () => {
        if (!deleting || lock.current) return;
        lock.current = true; setBusy(true); setError('');
        try { await api.deleteStoryBibleEntry(deleting.id); collection.setData(current => current.filter(entry => entry.id !== deleting.id)); setDeleting(null); setSuccess('Entry deleted.'); notifyPlanningUpdated(bookId); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'The entry could not be deleted.'); }
        finally { lock.current = false; setBusy(false); }
    };
    const entries = collection.data.filter(entry => (!kind || entry.kind === kind) && (!chapterFilter || entry.revealChapterId === chapterFilter) && `${entry.title} ${entry.detail} ${entry.characterIds.map(id => cast.data.find(character => character.id === id)?.name || '').join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    return <div className="ww-story-tool ww-bible-tool">
        <div className="ww-story-tool-heading"><div><p>Let your world grow with the story. Record changing motivations, relationships, secrets, and lore; choose exactly when readers learn them.</p></div><button className="ww-story-tool-add" disabled={!!editing || busy} onClick={() => { setEditing('new'); setSuccess(''); }}><span aria-hidden="true">+</span>Add entry</button></div>
        <PlanningLoadState loading={collection.loading} error={collection.loadError} retry={collection.retry} label="Story Bible" />
        {error && !editing && !deleting && <p className="ww-studio-alert" role="alert">{error}</p>}{success && <p role="status">{success}</p>}
        {editing && <PlanningDraftForm ownerId={ownerId} journey={`bible:${bookId}:${editing === 'new' ? 'new' : editing.id}`} initial={initial} key={editing === 'new' ? 'new' : editing.id} disabled={busy}>{(draft, update, clear) => <>
            <h4>{editing === 'new' ? 'New Story Bible entry' : 'Edit Story Bible entry'}</h4>
            <div className="ww-planning-fields">
                <div className="ww-planning-pair"><div className="ww-planning-field"><label htmlFor={`${prefix}-kind`}>Entry type</label><select id={`${prefix}-kind`} value={draft.kind} onChange={event => update({ ...draft, kind: event.target.value as StoryBibleKind })}>{Object.entries(bibleKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="ww-planning-field"><label htmlFor={`${prefix}-visibility`}>Who can see it?</label><select id={`${prefix}-visibility`} value={draft.visibility} onChange={event => update({ ...draft, visibility: event.target.value as 'PRIVATE' | 'PUBLIC' })}><option value="PRIVATE">Private · only you</option><option value="PUBLIC">Readers · follow reveal rule</option></select></div></div>
                <div className="ww-planning-field"><label htmlFor={`${prefix}-title`}>Entry title <small>{draft.title.length}/120</small></label><input id={`${prefix}-title`} autoFocus maxLength={120} value={draft.title} onChange={event => update({ ...draft, title: event.target.value })} placeholder="What changes or becomes known?" /></div>
                <div className="ww-planning-field"><label htmlFor={`${prefix}-detail`}>Detail <small>{draft.detail.length}/3000</small></label><textarea id={`${prefix}-detail`} rows={5} maxLength={3000} value={draft.detail} onChange={event => update({ ...draft, detail: event.target.value })} /></div>
                <fieldset><legend>Linked characters {draft.kind === 'RELATIONSHIP' ? '(choose two)' : draft.kind === 'CHARACTER' || draft.kind === 'MOTIVATION' ? '(at least one)' : '(optional)'}</legend><PlanningLoadState loading={cast.loading} error={cast.loadError} retry={cast.retry} label="character choices" /><div className="ww-bible-cast">{cast.data.map(character => <button key={character.id} type="button" aria-pressed={draft.characterIds.includes(character.id)} onClick={() => update({ ...draft, characterIds: draft.characterIds.includes(character.id) ? draft.characterIds.filter(id => id !== character.id) : [...draft.characterIds, character.id] })}>{character.name}</button>)}{draft.characterIds.filter(id => !cast.data.some(character => character.id === id)).map(id => <button type="button" key={id} onClick={() => update({ ...draft, characterIds: draft.characterIds.filter(value => value !== id) })}>Remove unavailable character</button>)}</div>{!cast.loading && !cast.loadError && !cast.data.length && <p className="ww-bible-help">Add your cast in Characters, or choose World & lore for an entry without a character.</p>}</fieldset>
                <div className="ww-planning-field"><label htmlFor={`${prefix}-reveal`}>Reader reveal</label><select id={`${prefix}-reveal`} value={draft.revealChapterId} onChange={event => update({ ...draft, revealChapterId: event.target.value })}><option value="">Available from the start</option>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>After {chapter.title}{chapter.status !== 'published' ? ' · not released' : ''}</option>)}{draft.revealChapterId && !chapters.some(chapter => chapter.id === draft.revealChapterId) && <option value={draft.revealChapterId}>Previously selected chapter · unavailable</option>}</select><small>{draft.visibility === 'PRIVATE' ? 'Private entries remain visible only to you, regardless of the reveal rule.' : 'Readers must complete this published chapter. Draft and unavailable chapter reveals stay hidden. Secret details also require an explicit reveal.'}</small></div>
                <details className="ww-bible-preview"><summary>Preview this entry for a reader</summary><label>Completed through<select value={previewChapter} onChange={event => setPreviewChapter(event.target.value)}><option value="">Before the first chapter</option>{chapters.filter(chapter => chapter.status === 'published').map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>{previewBibleEntries([{ ...draft, id: 'draft', bookId }], chapters, previewChapter).length ? <StoryBibleEntries entries={[{ ...draft, id: 'draft', bookId }]} characters={cast.data} /> : <p className="ww-bible-help">This entry is hidden in this reading context.</p>}</details>
            </div>{error && <p className="ww-studio-alert" role="alert">{error}</p>}<div className="ww-planning-actions"><button type="button" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Cancel</button><button type="button" className="primary" disabled={busy || !draft.title.trim() || !draft.detail.trim() || !bibleLinksValid(draft.kind, draft.characterIds)} onClick={() => save(draft, clear)}>{busy ? 'Saving…' : 'Save entry'}</button></div>
        </>}</PlanningDraftForm>}
        {!collection.loading && !collection.loadError && !collection.data.length && !editing && <div className="ww-tool-empty"><span>Living world</span><h4>Your world, revealed at the right time.</h4><p>Start with a character’s changing goal, a relationship, or a rule of your world. New entries are private until you choose to share them.</p><button onClick={() => setEditing('new')}>Create the first entry →</button></div>}
        {collection.data.length > 0 && <><div className="ww-planning-controls"><label htmlFor={`${prefix}-search`}>Search Story Bible<input type="search" id={`${prefix}-search`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Detail, character, or relationship" /></label><label htmlFor={`${prefix}-type-filter`}>Entry type<select id={`${prefix}-type-filter`} value={kind} onChange={event => setKind(event.target.value)}><option value="">All types</option>{Object.entries(bibleKinds).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label htmlFor={`${prefix}-chapter-filter`}>Reveal chapter<select id={`${prefix}-chapter-filter`} value={chapterFilter} onChange={event => setChapterFilter(event.target.value)}><option value="">All chapters</option>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label></div><button type="button" className="ww-studio-text-link" aria-expanded={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Close reader preview' : 'Preview what readers know'}</button>
            {preview && <section className="ww-bible-preview" aria-label="Story Bible reader preview"><label>Completed through<select value={previewChapter} onChange={event => setPreviewChapter(event.target.value)}><option value="">Before the first chapter</option>{chapters.filter(chapter => chapter.status === 'published').map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><StoryBibleEntries entries={previewBibleEntries(collection.data, chapters, previewChapter)} characters={cast.data} />{previewBibleEntries(collection.data, chapters, previewChapter).length === 0 && <p className="ww-bible-help">No entries are revealed in this context.</p>}</section>}
            <StoryBibleEntries entries={entries} characters={cast.data} chapters={chapters} busy={busy || !!editing} onEdit={entry => { setEditing(entry); setSuccess(''); }} onDelete={setDeleting} />{!entries.length && <p role="status">No entries match these filters. <button onClick={() => { setQuery(''); setKind(''); setChapterFilter(''); }}>Clear filters</button></p>}
        </>}
        <ConfirmDialog isOpen={!!deleting} title="Delete Story Bible entry?" message={`“${deleting?.title || 'This entry'}” will be removed from your plan and reader guides.`} error={error} confirmLabel="Delete entry" isProcessing={busy} onCancel={() => { setDeleting(null); setError(''); }} onConfirm={remove} />
    </div>;
}
