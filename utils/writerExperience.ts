import type { Book } from '../types';
import type { ReaderComment } from './writerComments';

export interface WriterGuideProgress { characters: boolean; mentions: boolean; atmosphere: boolean; planning: boolean; }
/** Milestones describe saved work, never clicks or device-wide preferences. */
export function writerMilestones(books: readonly Book[], guide: WriterGuideProgress = { characters: false, mentions: false, atmosphere: false, planning: false }) {
    return {
        'create-book': books.length > 0,
        'add-characters': guide.characters,
        'use-mentions': guide.mentions,
        'set-mood': guide.atmosphere,
        'world-building': guide.planning,
        'publish-chapter': books.some(book => book.publicationStatus === 'published' && book.chapters.some(chapter => chapter.status === 'published')),
    };
}
export function readerConversationStats(comments: readonly ReaderComment[], writerId: string) {
    const threads = comments.filter(comment => !comment.parentId && comment.userId !== writerId);
    const replied = new Set(comments.filter(comment => comment.userId === writerId && comment.parentId).map(comment => comment.parentId));
    return { conversations: threads.length, unanswered: threads.filter(thread => !replied.has(thread.id)).length, readerMessages: comments.filter(comment => comment.userId !== writerId).length };
}
/** Public/scheduled slots remain fixed so reading progress and release order stay intact. */
export function movePrivateChapter(booksChapters: Book['chapters'], chapterId: string, direction: -1 | 1): string[] | null {
    const index = booksChapters.findIndex(chapter => chapter.id === chapterId);
    if (index < 0 || (booksChapters[index].status !== 'draft' || !!booksChapters[index].publishedAt)) return null;
    const other = index + direction;
    if (other < 0 || other >= booksChapters.length || (booksChapters[other].status !== 'draft' || !!booksChapters[other].publishedAt)) return null;
    const ids = booksChapters.map(chapter => chapter.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    return ids;
}

export interface ImportUndoState { importId: string; count: number; }
export function parseImportUndo(value: unknown): ImportUndoState | null {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    if (typeof entry.importId !== 'string' || !entry.importId.trim() || !Number.isSafeInteger(entry.count) || (entry.count as number) <= 0) return null;
    return { importId: entry.importId, count: entry.count as number };
}
