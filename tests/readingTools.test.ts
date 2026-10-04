import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discussionComments, nextUnreadChapterIndex, hasNewReleasedChapter, resolvePassageIndex, privateCharacterPreview } from '../utils/readingTools.ts';
import type { Comment } from '../types.ts';
const comments = [{ id: 'chapter', parentId: null, paragraphIndex: null }, { id: 'passage', parentId: null, paragraphIndex: 2 }, { id: 'reply', parentId: 'passage', paragraphIndex: null }] as Comment[];
test('All includes passage threads; scopes count replies with their root', () => {
    assert.equal(discussionComments(comments, 'all').length, 3);
    assert.deepEqual(discussionComments(comments, 'chapter').map(c => c.id), ['chapter']);
    assert.deepEqual(discussionComments(comments, 'passage', 2).map(c => c.id), ['passage', 'reply']);
});
test('actual unread released chapter distinguishes caught up from later release', () => {
    const chapters = [{ id: 'one', status: 'published' }, { id: 'draft', status: 'draft' }, { id: 'two', status: 'published', publishedAt: '2026-10-03T10:00:00Z' }];
    const progress = { lastReadTimestamp: '2026-10-02T10:00:00Z', overallProgress: 50, lastReadChapterIndex: 0, lastReadScrollPosition: 0, chapters: { one: { progress: 90, scrollPosition: 0 } } };
    assert.equal(nextUnreadChapterIndex(chapters, progress), 2);
    assert.equal(hasNewReleasedChapter(chapters, progress), true);
    assert.equal(hasNewReleasedChapter(chapters, null), false);
    assert.equal(nextUnreadChapterIndex(chapters.slice(0, 2), progress), -1);
});
test('new release badges include started chapters and compare backend timestamps in UTC', () => {
    const chapters = [{ id: 'one', status: 'published' }, { id: 'two', status: 'published', publishedAt: '2026-10-03T10:00:00' }];
    const progress = { lastReadTimestamp: '2026-10-03T09:59:00Z', overallProgress: 1, lastReadChapterIndex: 0, lastReadScrollPosition: 0, chapters: { one: { progress: 5, scrollPosition: 0 } } };
    assert.equal(hasNewReleasedChapter(chapters, progress), true);
    assert.equal(hasNewReleasedChapter(chapters, { ...progress, lastReadTimestamp: '2026-10-03T12:00:00+02:00' }), false);
    assert.equal(hasNewReleasedChapter(chapters, { ...progress, chapters: { one: { progress: 0, scrollPosition: 0 } } }), false);
    assert.equal(hasNewReleasedChapter(chapters, { ...progress, chapters: { ...progress.chapters, two: { progress: 10, scrollPosition: 0 } } }), false);
});
test('saved places survive insertions; changed or ambiguous passages are not falsely reopened', () => {
    assert.equal(resolvePassageIndex(['First','Saved passage'], 1, 'Saved   passage'), 1);
    assert.equal(resolvePassageIndex(['Inserted','First','Saved passage'], 1, 'Saved passage'), 2);
    assert.equal(resolvePassageIndex(['Changed'], 0, 'Old passage'), null);
    assert.equal(resolvePassageIndex(['Saved','Saved'], 9, 'Saved'), null);
});
test('reader previews preserve legacy background but never expose private planning goals', () => {
    assert.equal(privateCharacterPreview({ description: 'Bio', goal: 'Private' }).goal, '');
    assert.equal(privateCharacterPreview({ description: 'Secret', descriptionVisibility: 'PRIVATE', goal: 'Quest', goalVisibility: 'PUBLIC' }).description, '');
});
