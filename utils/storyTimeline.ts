import type { Chapter, Scene, StoryBibleEntry } from '../types';
export function chapterTimeline(scenes: Scene[], chapters: Chapter[], entries: StoryBibleEntry[] = []) {
    const ids = new Set(chapters.map(chapter => chapter.id));
    return [{ id: 'initial', title: 'Before the first chapter', chapter: null, index: -1, scenes: [] as Scene[], entries: entries.filter(entry => !entry.revealChapterId) }, ...chapters.map((chapter, index) => ({ id: chapter.id, title: chapter.title, chapter, index,
        scenes: scenes.filter(scene => scene.chapterId === chapter.id), entries: entries.filter(entry => entry.revealChapterId === chapter.id) })),
        { id: 'unlinked', title: 'Not linked to an available chapter', chapter: null, index: -1,
            scenes: scenes.filter(scene => !scene.chapterId || !ids.has(scene.chapterId)), entries: entries.filter(entry => !!entry.revealChapterId && !ids.has(entry.revealChapterId)) }];
}
export function chronologyTimeline(scenes: Scene[]) {
    return { ordered: scenes.filter(scene => scene.chronologyOrder != null).sort((a,b) => a.chronologyOrder! - b.chronologyOrder! || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
        unplaced: scenes.filter(scene => scene.chronologyOrder == null) };
}
