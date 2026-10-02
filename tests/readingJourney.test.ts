import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedChapterCount, isReadingFinished, mergeReadingSnapshots, resumeChapterIndex } from '../utils/readingJourney.ts';

const chapters = [{ id: 'one', status: 'published' }, { id: 'draft', status: 'draft' }, { id: 'two', status: 'published' }];
const progress = (items: Record<string, number>, index = 0, id?: string) => ({ overallProgress: 0, lastReadChapterIndex: index, lastReadChapterId: id, lastReadScrollPosition: 0, chapters: Object.fromEntries(Object.entries(items).map(([id, progress]) => [id, { progress, scrollPosition: 0 }])) });

test('resume advances past finished chapters, skips drafts and reopens a partially read chapter', () => {
    assert.equal(resumeChapterIndex(chapters, progress({ one: 100 })), 2);
    assert.equal(resumeChapterIndex(chapters, progress({ one: 100, two: 35 }, 2)), 2);
    assert.equal(resumeChapterIndex(chapters, progress({ one: 100, two: 90 }, 2)), 0);
    assert.equal(resumeChapterIndex([{ id: 'draft', status: 'draft' }]), null);
});
test('stable chapter IDs survive reorder, stale indexes and removed chapters', () => {
    assert.equal(resumeChapterIndex(chapters, progress({ two: 50 }, 0, 'two')), 2);
    assert.equal(resumeChapterIndex(chapters, progress({ one: 100 }, 100, 'removed')), 2);
    assert.equal(resumeChapterIndex(chapters, progress({ two: 100 }, 2)), 0);
});
test('finished counts only released chapters and matches the chapter completion threshold', () => {
    const saved = progress({ one: 90, two: 100, removed: 100 });
    assert.equal(completedChapterCount(chapters, saved), 2);
    assert.equal(isReadingFinished(chapters, saved), true);
    assert.equal(isReadingFinished([], saved), false);
});
test('in-flight chapter observations survive stale server reads without rolling back completion', () => {
    const merged = mergeReadingSnapshots(progress({ one: 100 }), [
        { chapterId: 'one', chapterIndex: 0, progress: 2, scrollPosition: 10, timestamp: 1_000 },
        { chapterId: 'two', chapterIndex: 2, progress: 100, scrollPosition: 500, timestamp: 2_000 },
    ], chapters)!;
    assert.equal(merged.chapters.one.progress, 100);
    assert.equal(merged.chapters.one.scrollPosition, 10);
    assert.equal(merged.chapters.two.progress, 100);
    assert.equal(merged.overallProgress, 100);
    assert.equal(merged.lastReadChapterId, 'two');
    assert.equal(merged.pendingSync, true);
});
