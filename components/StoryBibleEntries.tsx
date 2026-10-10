import React from 'react';
import type { Character, Chapter, StoryBibleEntry } from '../types';
import { bibleKinds } from '../utils/storyBible';

export function StoryBibleEntries({ entries, characters = [], chapters = [], onEdit, onDelete, busy = false }: {
    entries: StoryBibleEntry[]; characters?: Character[]; chapters?: Chapter[];
    onEdit?: (entry: StoryBibleEntry) => void; onDelete?: (entry: StoryBibleEntry) => void; busy?: boolean;
}) {
    return <div className="ww-bible-entries">{entries.map(entry => <article key={entry.id} className="ww-bible-entry ww-arrive-quiet">
        <div className="ww-bible-entry-meta"><span>{bibleKinds[entry.kind]}</span>{onEdit && <span>{entry.visibility === 'PRIVATE' ? 'Private plan' : entry.revealChapterId ? 'Chapter reveal' : 'Public from the start'}</span>}</div>
        {entry.kind === 'SECRET' && !onEdit ? <details><summary>{entry.title} <span>Reveal detail</span></summary><p>{entry.detail}</p></details> : <><h4>{entry.title}</h4><p>{entry.detail}</p></>}
        {characters.length > 0 && entry.characterIds.length > 0 && <p className="ww-bible-linked-cast">{entry.characterIds.map(id => characters.find(character => character.id === id)?.name || 'Character unavailable').join(' · ')}</p>}
        {onEdit && <div className="ww-bible-entry-footer"><small>{entry.revealChapterId ? `After ${chapters.find(chapter => chapter.id === entry.revealChapterId)?.title || 'an unavailable chapter'}${chapters.find(chapter => chapter.id === entry.revealChapterId)?.status !== 'published' ? ' · not released' : ''}` : 'No chapter gate'}</small><div><button type="button" disabled={busy} onClick={() => onEdit(entry)}>Edit entry</button><button type="button" disabled={busy} onClick={() => onDelete?.(entry)}>Delete entry</button></div></div>}
    </article>)}</div>;
}
