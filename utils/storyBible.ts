import type { Chapter, StoryBibleEntry, StoryBibleKind } from '../types';
export const bibleKinds: Record<StoryBibleKind, string> = { CHARACTER: 'Character update', MOTIVATION: 'Motivation', RELATIONSHIP: 'Relationship', SECRET: 'Secret', LORE: 'World & lore' };
/** Owner preview mirrors release order; reader security is enforced by the server. */
export function previewBibleEntries(entries: StoryBibleEntry[], chapters: Chapter[], throughChapterId: string): StoryBibleEntry[] {
    const released = chapters.filter(chapter => chapter.status === 'published');
    const through = released.findIndex(chapter => chapter.id === throughChapterId);
    return entries.filter(entry => entry.visibility === 'PUBLIC' && (!entry.revealChapterId || (through >= 0 && released.findIndex(chapter => chapter.id === entry.revealChapterId) >= 0 && released.findIndex(chapter => chapter.id === entry.revealChapterId) <= through)));
}
export function bibleLinksValid(kind: StoryBibleKind, characterIds: string[]) {
    const size = new Set(characterIds).size;
    return kind === 'RELATIONSHIP' ? size === 2 : (kind === 'CHARACTER' || kind === 'MOTIVATION') ? size > 0 : true;
}
