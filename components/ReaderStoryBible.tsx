import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import * as api from '../api/client';
import type { StoryBibleEntry, Chapter, Character } from '../types';
import { usePlanningCollection } from '../hooks/usePlanningCollection';
import { PlanningLoadState } from './PlanningLoadState';
import { StoryBibleEntries } from './StoryBibleEntries';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import '../styles/story-planning.css';

export function ReaderStoryBible({ bookId, chapterId, characterId, characters, chapters = [], refreshKey = '' }: { bookId: string; chapterId?: string; characterId?: string; characters?: Character[]; chapters?: Chapter[]; refreshKey?: string }) {
    const collection = usePlanningCollection<StoryBibleEntry>(`${bookId}:${chapterId || ''}:${characterId || ''}:${refreshKey}`, useCallback(() => api.getStoryBibleEntries(bookId, { chapterId, characterId, readerView: true }), [bookId, chapterId, characterId, refreshKey]));
    const cast = usePlanningCollection<Character>(`${bookId}:${refreshKey}`, useCallback(() => characters ? Promise.resolve(characters) : api.getCharactersByBookId(bookId, chapterId), [bookId, chapterId, refreshKey, characters]));
    return <section className="ww-bible-reader" aria-label="Known story details">
        <p className="ww-bible-help">Starting details and reveals from chapters you’ve completed. Future reveals stay hidden.</p>
        <PlanningLoadState loading={collection.loading} error={collection.loadError} retry={collection.retry} label="story details" />
        {!collection.loading && !collection.loadError && collection.data.length === 0 && <p className="ww-bible-help">No new story details here yet. They’ll appear as the writer adds them and you complete their chapters.</p>}
        {cast.loadError && <PlanningLoadState loading={false} error={cast.loadError} retry={cast.retry} label="character links" />}
        <StoryBibleEntries entries={collection.data} characters={cast.data} chapters={chapters} />
    </section>;
}
export function ReaderStoryBibleDialog({ onClose, isOpen, ...props }: React.ComponentProps<typeof ReaderStoryBible> & { isOpen: boolean; onClose: () => void }) {
    const ref = useDialog(isOpen, onClose);
    const present = usePresence(isOpen);
    if (!present) return null;
    return <div className="ww-bible-overlay ww-presence" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} aria-hidden={!isOpen || undefined} onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className="ww-bible-panel" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reader-bible-title"><header><h2 id="reader-bible-title">Story Bible</h2><button type="button" aria-label="Close Story Bible" onClick={onClose}><X size={20}/></button></header><ReaderStoryBible {...props}/></div></div>;
}
