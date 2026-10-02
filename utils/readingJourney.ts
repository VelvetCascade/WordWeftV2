import type { BookProgress } from '../types';

type ReadableChapter = { id: string; status: string };
export const CHAPTER_COMPLETION_PERCENT = 90;

export function completedChapterCount(chapters: ReadableChapter[], progress?: BookProgress | null) {
    return chapters.filter(chapter => chapter.status === 'published' && (progress?.chapters?.[chapter.id]?.progress ?? 0) >= CHAPTER_COMPLETION_PERCENT).length;
}

export function isReadingFinished(chapters: ReadableChapter[], progress?: BookProgress | null) {
    const published = chapters.filter(chapter => chapter.status === 'published');
    return published.length > 0 && completedChapterCount(published, progress) === published.length;
}

/** Resume an unfinished chapter; advance on completion, and start again only once every released chapter is finished. */
export function resumeChapterIndex(chapters: ReadableChapter[], progress?: BookProgress | null): number | null {
    const readable = chapters.map((chapter, index) => ({ ...chapter, index })).filter(chapter => chapter.status === 'published');
    if (!readable.length) return null;
    if (!progress || isReadingFinished(chapters, progress)) return readable[0].index;
    const saved = readable.find(chapter => chapter.id === progress.lastReadChapterId)
        ?? readable.find(chapter => chapter.index === progress.lastReadChapterIndex)
        ?? readable[0];
    const unfinished = (chapter: ReadableChapter) => (progress.chapters?.[chapter.id]?.progress ?? 0) < CHAPTER_COMPLETION_PERCENT;
    if (unfinished(saved)) return saved.index;
    return (readable.find(chapter => chapter.index > saved.index && unfinished(chapter))
        ?? readable.find(unfinished)
        ?? readable[0]).index;
}

export interface ReadingSnapshot {
    chapterId: string;
    chapterIndex: number;
    progress: number;
    scrollPosition: number;
    timestamp: number;
}

/** Merge unsent/in-flight observations without letting a stale response erase a completed chapter. */
export function mergeReadingSnapshots(server: BookProgress | null, snapshots: ReadingSnapshot[], chapters?: ReadableChapter[]): BookProgress | null {
    if (!snapshots.length) return server;
    const valid = snapshots.filter(snapshot => !chapters || chapters.some(chapter => chapter.id === snapshot.chapterId && chapter.status === 'published'));
    if (!valid.length) return server;
    const merged = { ...(server?.chapters ?? {}) };
    for (const snapshot of [...valid].sort((left, right) => left.timestamp - right.timestamp)) {
        merged[snapshot.chapterId] = { progress: Math.max(merged[snapshot.chapterId]?.progress ?? 0, snapshot.progress), scrollPosition: snapshot.scrollPosition };
    }
    const latest = valid.reduce((left, right) => left.timestamp > right.timestamp ? left : right);
    const published = chapters?.filter(chapter => chapter.status === 'published');
    const overallProgress = published?.length
        ? Math.floor(published.reduce((total, chapter) => total + (merged[chapter.id]?.progress ?? 0), 0) / published.length)
        : server?.overallProgress ?? 0;
    const rawTimestamp = server?.lastReadTimestamp ?? '';
    const serverTime = Date.parse(rawTimestamp && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(rawTimestamp) ? `${rawTimestamp}Z` : rawTimestamp);
    const serverIsNewer = serverTime > latest.timestamp;
    return {
        overallProgress,
        lastReadChapterIndex: serverIsNewer ? server!.lastReadChapterIndex : latest.chapterIndex,
        lastReadChapterId: serverIsNewer ? server!.lastReadChapterId : latest.chapterId,
        lastReadScrollPosition: serverIsNewer ? server!.lastReadScrollPosition : latest.scrollPosition,
        lastReadTimestamp: serverIsNewer ? server!.lastReadTimestamp : new Date(latest.timestamp).toISOString(),
        chapters: merged,
        pendingSync: true,
    };
}
