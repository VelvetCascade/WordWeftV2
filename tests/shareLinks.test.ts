import test from 'node:test';
import assert from 'node:assert/strict';
import * as shareLinks from '../utils/shareLinks.ts';

test('chapter links preserve the published chapter ID independently of chapter order', () => {
    const chapterShareUrl = (shareLinks as Record<string, unknown>).chapterShareUrl as ((bookId: string, chapterId: string, origin?: string) => string) | undefined;
    assert.equal(chapterShareUrl?.('story one', 'chapter/two', 'https://example.test/'), 'https://example.test/book/story%20one/chapter/chapter%2Ftwo');
    assert.equal(shareLinks.storyShareUrl('story one', 'https://example.test/'), 'https://example.test/book/story%20one');
});
