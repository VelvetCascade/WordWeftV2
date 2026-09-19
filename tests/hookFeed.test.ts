import test from 'node:test';
import assert from 'node:assert/strict';

import { toggleTasteGenre, appendSeenStory } from '../utils/hookFeed.ts';
import { readFileSync } from 'node:fs';

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

test('hook feed exposes compact controls and restores failed optimistic likes', () => {
    const page = readFileSync(new URL('../pages/HookFeedPage.tsx', import.meta.url), 'utf8');
    assert.match(page, /role="dialog"/);
    assert.match(page, /likingChapterId/);
    assert.match(page, /likesCount: previousCount/);
    assert.match(page, /result\.items\.filter\(card => card\.liked\)/);
    const styles = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
    assert.match(styles, /\.hook-feed-excerpt[\s\S]*-webkit-line-clamp:\s*4/);
    assert.doesNotMatch(page, /Opening lines, not algorithms/);
    assert.doesNotMatch(page, /Find your next obsession/);
});
