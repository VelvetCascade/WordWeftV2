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
