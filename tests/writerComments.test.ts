import assert from 'node:assert/strict';
import test from 'node:test';
import type { Book, Comment } from '../types.ts';
import { loadWriterComments, writerCommentTargets } from '../utils/writerComments.ts';

const targets = Array.from({ length: 12 }, (_, index) => ({ bookId: 'book', bookTitle: 'A story', chapterId: `chapter-${index}`, chapterTitle: `Chapter ${index}`, commentCount: 1 }));
const comment = (chapterId: string, createdAt = '2026-01-01T00:00:00Z'): Comment => ({ id: `comment-${chapterId}`, bookId: 'book', chapterId, content: 'A thought', createdAt, paragraphIndex: null, parentId: null, userId: 'reader', user: { id: 'reader', name: 'Reader', avatarUrl: '' } });

test('writer comment loading bounds simultaneous chapter requests and returns all conversations', async () => {
    let active = 0;
    let maximumActive = 0;
    const seen: string[] = [];
    const result = await loadWriterComments(targets, async (_bookId, chapterId) => {
        active++;
        maximumActive = Math.max(active, maximumActive);
        seen.push(chapterId);
        await new Promise<void>(resolve => setImmediate(resolve));
        active--;
        return [comment(chapterId)];
    }, () => true);
    assert.equal(maximumActive, 4);
    assert.equal(seen.length, 12);
    assert.equal(result.comments.length, 12);
    assert.equal(result.comments[0].bookTitle, 'A story');
    assert.equal(result.partialFailure, false);
});

test('leaving comments cancels unsent chapter reads while the first batch settles', async () => {
    let active = true;
    const seen: string[] = [];
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const loading = loadWriterComments(targets, async (_bookId, chapterId) => { seen.push(chapterId); await pending; return [comment(chapterId)]; }, () => active);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(seen.length, 4);
    active = false;
    release();
    await loading;
    assert.equal(seen.length, 4);
});

test('disposing a queued comments load before dispatch sends no chapter requests', async () => {
    let active = true;
    let reads = 0;
    const loading = loadWriterComments(targets, async (_bookId, chapterId) => { reads++; return [comment(chapterId)]; }, () => active);
    active = false;
    await loading;
    assert.equal(reads, 0);
});

test('failed chapters preserve the other comments and report a partial failure for retry', async () => {
    const result = await loadWriterComments(targets.slice(0, 3), async (_bookId, chapterId) => {
        if (chapterId === 'chapter-1') throw new Error('offline');
        return [comment(chapterId, chapterId === 'chapter-2' ? '2026-02-01T00:00:00Z' : '2026-01-01T00:00:00Z')];
    }, () => true);
    assert.equal(result.partialFailure, true);
    assert.deepEqual(result.comments.map(item => item.chapterId), ['chapter-2', 'chapter-0']);
});

test('only published chapters with comments enter the queue and unrelated stats keep its signature stable', () => {
    const books = [{ id: 'book', title: 'A story', publicationStatus: 'published', viewCount: 1, chapters: [
        { id: 'one', title: 'One', status: 'published', commentCount: 2 },
        { id: 'two', title: 'Two', status: 'published', commentCount: 0 },
        { id: 'three', title: 'Three', status: 'draft', commentCount: 1 },
    ] }, { id: 'draft', title: 'Private', publicationStatus: 'draft', chapters: [{ id: 'four', title: 'Four', status: 'published', commentCount: 1 }] }] as Book[];
    const before = writerCommentTargets(books);
    assert.deepEqual(before, [{ bookId: 'book', bookTitle: 'A story', chapterId: 'one', chapterTitle: 'One', commentCount: 2 }]);
    const updated = books.map(book => ({ ...book, viewCount: 20, likesCount: 8, chapters: book.chapters.map(chapter => ({ ...chapter, viewCount: 30 })) }));
    assert.equal(JSON.stringify(writerCommentTargets(updated)), JSON.stringify(before));
    books[0].chapters[0].commentCount++;
    assert.notEqual(JSON.stringify(writerCommentTargets(books)), JSON.stringify(before));
});
