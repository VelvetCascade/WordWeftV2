import type { Book, Comment } from '../types';

export type ReaderComment = Comment & { bookTitle: string; chapterTitle: string };
export interface ChapterCommentTarget {
    bookId: string;
    bookTitle: string;
    chapterId: string;
    chapterTitle: string;
    commentCount: number;
}

export function writerCommentTargets(books: readonly Book[]): ChapterCommentTarget[] {
    return books.filter(book => book.publicationStatus === 'published').flatMap(book =>
        book.chapters.filter(chapter => chapter.status === 'published' && chapter.commentCount > 0).map(chapter => ({
            bookId: book.id, bookTitle: book.title, chapterId: chapter.id, chapterTitle: chapter.title, commentCount: chapter.commentCount,
        })),
    );
}

export async function loadWriterComments(
    targets: readonly ChapterCommentTarget[],
    read: (bookId: string, chapterId: string) => Promise<Comment[]>,
    isActive: () => boolean,
): Promise<{ comments: ReaderComment[]; partialFailure: boolean }> {
    // A disposed mount can cancel its queue before any requests are dispatched.
    await Promise.resolve();
    const results: ReaderComment[][] = targets.map(() => []);
    let next = 0;
    let partialFailure = false;
    const worker = async () => {
        while (isActive() && next < targets.length) {
            const index = next++;
            const target = targets[index];
            try {
                results[index] = (await read(target.bookId, target.chapterId)).map(comment => ({ ...comment, bookTitle: target.bookTitle, chapterTitle: target.chapterTitle }));
            } catch {
                partialFailure = true;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(4, targets.length) }, worker));
    return { comments: results.flat().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), partialFailure };
}

export type WriterInboxFilter = 'all' | 'new' | 'unanswered' | 'replied';
/** Replies by other readers do not resolve the writer's inbox. New means reader activity since the previous visit. */
export function filterWriterComments(comments: readonly ReaderComment[], writerId: string, filter: WriterInboxFilter, bookId = '', lastVisit: string | null = null): ReaderComment[] {
    return comments.filter(comment => !comment.parentId && (!bookId || comment.bookId === bookId)).filter(comment => {
        const replies = comments.filter(reply => reply.parentId === comment.id);
        const replied = replies.some(reply => reply.userId === writerId);
        if (filter === 'replied') return replied;
        if (filter === 'unanswered') return !replied;
        if (filter === 'new') return [comment, ...replies].some(activity => activity.userId !== writerId && (!lastVisit || Date.parse(activity.createdAt) > Date.parse(lastVisit)));
        return true;
    });
}
export function writerCommentPath(comment: Pick<ReaderComment, 'bookId' | 'chapterId' | 'paragraphIndex'>): string {
    return `/book/${encodeURIComponent(comment.bookId)}/chapter/${encodeURIComponent(comment.chapterId)}` + (comment.paragraphIndex != null ? `?paragraph=${comment.paragraphIndex}` : '');
}
