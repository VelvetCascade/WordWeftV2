import test from 'node:test';
import assert from 'node:assert/strict';

import { toggleTasteGenre, appendSeenStory } from '../utils/hookFeed.ts';

test('toggleTasteGenre is case-insensitive and preserves the catalog label', () => {
    assert.deepEqual(toggleTasteGenre(['Fantasy'], 'fantasy'), []);
    assert.deepEqual(toggleTasteGenre(['Fantasy'], 'Mystery'), ['Fantasy', 'Mystery']);
});

test('toggleTasteGenre caps taste onboarding at eight choices', () => {
    const current = ['1', '2', '3', '4', '5', '6', '7', '8'];
    assert.deepEqual(toggleTasteGenre(current, '9'), current);
});

test('appendSeenStory keeps a unique bounded recent history', () => {
    assert.deepEqual(appendSeenStory(['a', 'b'], 'a', 3), ['b', 'a']);
    assert.deepEqual(appendSeenStory(['a', 'b', 'c'], 'd', 3), ['b', 'c', 'd']);
});
