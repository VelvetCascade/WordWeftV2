import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createReaderAuthIntent,
    isReaderAuthIntentFresh,
    readerChapterPath,
} from '../utils/readerAuthIntent.ts';

test('reader auth intent rejects external, unrelated, and mismatched return paths', () => {
    assert.equal(createReaderAuthIntent({ returnPath: 'https://evil.test', bookId: 'b', chapterId: 'c' }), null);
    assert.equal(createReaderAuthIntent({ returnPath: '/profile', bookId: 'b', chapterId: 'c' }), null);
    assert.equal(createReaderAuthIntent({ returnPath: '/book/b/chapter/other', bookId: 'b', chapterId: 'c' }), null);
});

test('reader auth intent accepts an exact canonical chapter path and expires after 30 minutes', () => {
    const returnPath = readerChapterPath('book / one', 'chapter / two');
    const intent = createReaderAuthIntent({
        returnPath,
        bookId: 'book / one',
        chapterId: 'chapter / two',
        chapterIndex: 1,
        source: 'locked_chapter',
        authView: 'signup',
        scrollY: 720,
        now: 1_000,
    });

    assert.equal(intent?.returnPath, '/book/book%20%2F%20one/chapter/chapter%20%2F%20two');
    assert.equal(intent?.scrollY, 720);
    assert.equal(isReaderAuthIntentFresh(intent!, 1_000 + 29 * 60_000), true);
    assert.equal(isReaderAuthIntentFresh(intent!, 1_000 + 31 * 60_000), false);
});

test('reader auth intent normalizes unsafe scroll and index values', () => {
    const intent = createReaderAuthIntent({
        returnPath: '/book/b/chapter/c',
        bookId: 'b',
        chapterId: 'c',
        chapterIndex: -5,
        scrollY: Number.POSITIVE_INFINITY,
    });

    assert.equal(intent?.chapterIndex, 0);
    assert.equal(intent?.scrollY, 0);
});
