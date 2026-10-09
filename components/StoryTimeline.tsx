import React, { useState } from 'react';
import { Flag, Layers, BookOpen } from 'lucide-react';
import type { Chapter, Character, Scene, StoryBibleEntry } from '../types';
import { chapterTimeline, chronologyTimeline } from '../utils/storyTimeline';
import { bibleKinds } from '../utils/storyBible';
import '../styles/story-planning.css';

export function StoryTimeline({ scenes, chapters, characters, entries, onEdit, onAdd, busy }: {
    scenes: Scene[]; chapters: Chapter[]; characters: Character[]; entries: StoryBibleEntry[];
    onEdit: (scene: Scene) => void; onAdd: (chapterId?: string) => void; busy: boolean;
}) {
    const [order, setOrder] = useState<'chapters' | 'chronology'>('chapters');
    const chronology = chronologyTimeline(scenes);
    const card = (scene: Scene) => <article className="ww-timeline-card ww-arrive-quiet" key={scene.id}>
        <div className="ww-timeline-card-kicker">{scene.kind === 'EVENT' ? <Flag size={15} /> : <Layers size={15} />}<span>{scene.kind === 'EVENT' ? 'Important event' : 'Scene'}{order === 'chronology' && scene.chronologyOrder != null ? ` · ${scene.chronologyOrder}` : ''}</span></div>
        <h4>{scene.title}</h4><p className="ww-timeline-context">{[scene.time, scene.setting].filter(Boolean).join(' · ') || 'Time and setting not set'}</p>
        {scene.description && <p>{scene.description}</p>}{scene.characterIds?.length > 0 && <p className="ww-bible-linked-cast">{scene.characterIds.map(id => characters.find(character => character.id === id)?.name || 'Character unavailable').join(' · ')}</p>}
        {order === 'chronology' && <small>{chapters.find(chapter => chapter.id === scene.chapterId)?.title || 'No chapter linked'}</small>}
        <button type="button" disabled={busy} onClick={() => onEdit(scene)}>Edit {scene.kind === 'EVENT' ? 'event' : 'scene'}</button>
    </article>;
    return <section className="ww-story-timeline" aria-label="Story timeline"><div className="ww-timeline-heading"><div><h4>Your story, connected.</h4><p>Private planning. Scene placement never changes chapter publication or manuscript order.</p></div><div className="ww-plan-segmented" role="group" aria-label="Timeline order"><button aria-pressed={order === 'chapters'} onClick={() => setOrder('chapters')}>Chapter map</button><button aria-pressed={order === 'chronology'} onClick={() => setOrder('chronology')}>Story chronology</button></div></div>
        {order === 'chapters' ? <div className="ww-timeline-chapters">{chapterTimeline(scenes, chapters, entries).filter(group => group.chapter || group.scenes.length || group.entries.length).map(group => <section key={group.id} className="ww-timeline-chapter"><header><span className="ww-timeline-number" aria-hidden="true">{group.index >= 0 ? group.index + 1 : '—'}</span><div><h5>{group.title}</h5><small>{group.chapter ? `${group.chapter.status === 'published' ? 'Published' : group.chapter.status === 'scheduled' ? 'Scheduled' : 'Private draft'} · ` : ''}{group.scenes.length} {group.scenes.length === 1 ? 'moment' : 'moments'} · {group.entries.length} Bible {group.entries.length === 1 ? 'entry' : 'entries'}</small></div>{group.id!=='initial'&&<button type="button" disabled={busy} onClick={() => onAdd(group.chapter?.id)}>Add scene</button>}</header><div className="ww-timeline-moments">{group.scenes.map(card)}{group.entries.map(entry => <article key={entry.id} className="ww-timeline-reveal"><BookOpen size={16} /><div><span>{entry.visibility === 'PRIVATE' ? 'Private Bible note' : 'Reader reveal'} · {bibleKinds[entry.kind]}</span><h6>{entry.title}</h6></div><a href={`/write/book/${encodeURIComponent(entry.bookId)}/manage?tab=bible&entry=${encodeURIComponent(entry.id)}`}>Open entry</a></article>)}{!group.scenes.length && !group.entries.length && <p className="ww-timeline-empty">No moments planned for this chapter yet.</p>}</div></section>)}</div> : <>
            <p className="ww-bible-help">Ordered by each scene’s story time position. Use negative positions for earlier events, or the same position for simultaneous moments. Reader reveals stay on the chapter map.</p><div className="ww-timeline-chronology">{chronology.ordered.map(card)}</div>{!chronology.ordered.length && <p className="ww-timeline-empty">Set a story time position on a scene or event to place it here.</p>}{chronology.unplaced.length > 0 && <section className="ww-timeline-unplaced"><h5>Not placed in story time</h5><p className="ww-bible-help">These moments remain in your plan. Edit one to set its position.</p><div className="ww-timeline-chronology">{chronology.unplaced.map(card)}</div></section>}
        </>}
    </section>;
}
