import assert from 'node:assert/strict';
import test from 'node:test';
import type { Book, Chapter } from '../types.ts';
import type { ReaderComment } from '../utils/writerComments.ts';
import { filterWriterComments } from '../utils/writerComments.ts';
import { movePrivateChapter, parseImportUndo, readerConversationStats, writerMilestones } from '../utils/writerExperience.ts';

const chapter = (id: string, status = 'draft', publishedAt?: string): Chapter => ({ id, status, publishedAt, title: id, wordCount: 0 } as Chapter);
const books = (chapters: Chapter[], publicationStatus = 'draft'): Book[] => [{ id: 'book', chapters, publicationStatus } as Book];
const comment = (id: string, userId: string, parentId: string | null = null): ReaderComment => ({ id, userId, parentId, bookId: 'book', chapterId: 'one', createdAt: '2026-01-01T00:00:00Z' } as ReaderComment);

test('writer milestones only complete from saved stories and actual saved tools', () => {
    const empty = { 'create-book': false, 'add-characters': false, 'use-mentions': false, 'set-mood': false, 'world-building': false, 'publish-chapter': false };
    assert.deepEqual(writerMilestones([]), empty);
    assert.deepEqual(writerMilestones(books([chapter('one')])), { ...empty, 'create-book': true });
    assert.deepEqual(writerMilestones(books([chapter('one')]), { characters: true, mentions: false, atmosphere: true, planning: false }), { ...empty, 'create-book': true, 'add-characters': true, 'set-mood': true });
});

test('a private story cannot complete the public chapter milestone', () => {
    const manuscript = { ...chapter('one', 'published'), wordCount: 125 };
    assert.equal(writerMilestones(books([manuscript]))['publish-chapter'], false);
    assert.equal(writerMilestones(books([manuscript], 'published'))['publish-chapter'], true);
});

test('reader conversations exclude writer roots and replies; only writer replies resolve threads', () => {
    const comments = [comment('one', 'reader'), comment('reply-reader', 'another', 'one'), comment('two', 'reader'), comment('reply-author', 'author', 'two'), comment('author-root', 'author')];
    assert.deepEqual(readerConversationStats(comments, 'author'), { conversations: 2, unanswered: 1, readerMessages: 3 });
    assert.deepEqual(filterWriterComments(comments, 'author', 'all').map(item => item.id), ['one', 'two']);
    assert.deepEqual(filterWriterComments(comments, 'author', 'unanswered').map(item => item.id), ['one']);
});

test('chapter movement preserves IDs and rejects public, scheduled or previously released slots', () => {
    const chapters = [chapter('public', 'published'), chapter('first'), chapter('second'), chapter('scheduled', 'scheduled'), chapter('returned', 'draft', '2026-01-01')];
    assert.deepEqual(movePrivateChapter(chapters, 'second', -1), ['public', 'second', 'first', 'scheduled', 'returned']);
    assert.equal(movePrivateChapter(chapters, 'first', -1), null);
    assert.equal(movePrivateChapter(chapters, 'second', 1), null);
    assert.equal(movePrivateChapter(chapters, 'scheduled', 1), null);
    assert.equal(movePrivateChapter([chapter('first'), chapter('returned', 'draft', '2026-01-01')], 'returned', -1), null);
    assert.equal(movePrivateChapter(chapters, 'missing', -1), null);
    assert.deepEqual(chapters.map(item => item.id), ['public', 'first', 'second', 'scheduled', 'returned']);
});

test('restored import undo state ignores malformed optional browser values', () => {
    for (const value of [null, true, 'batch', { importId: '', count: 2 }, { importId: 'batch', count: -1 }, { importId: 'batch', count: '2' }, { importId: 'batch', count: { value: 2 } }]) assert.equal(parseImportUndo(value), null);
    assert.deepEqual(parseImportUndo({ importId: 'batch', count: 2, extra: 'ignored' }), { importId: 'batch', count: 2 });
});
