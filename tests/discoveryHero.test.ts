import test from 'node:test';
import assert from 'node:assert/strict';
import type { Book } from '../types.ts';
import { groupDiscoveryBooks, nextDiscoveryGroup, normalizeDiscoveryGroups } from '../utils/discoveryHero.ts';

const book = (id: string, category = '', genres: string[] = []): Book => ({
    id, title: id, category, genres, coverUrl: `/covers/${id}.jpg`, publicationStatus: 'published',
    author: { id: 'writer', name: 'Writer', avatarUrl: '', bio: '' }, chapters: [],
} as Book);

test('hero groups respect the published format and never label a novella or novel as poetry', () => {
    const result = groupDiscoveryBooks([
        book('short', 'Short Story'), book('novella', 'Novella'), book('fan', 'Fan Fiction'),
        book('novel', 'Novel', ['Poetry']), book('web', 'Web Novel'), book('light', 'Light Novel'),
        book('poem', 'Poem'), book('poems', 'Poetry Collection'), book('legacy-poetry', '', ['Poetry']),
    ]);
    assert.deepEqual(result.stories.map(item => item.id), ['short', 'novella', 'fan']);
    assert.deepEqual(result.novels.map(item => item.id), ['novel', 'web', 'light']);
    assert.deepEqual(result.poems.map(item => item.id), ['poem', 'poems', 'legacy-poetry']);
});

test('sparse story groups use real fiction and omit drafts, unavailable books and duplicate IDs', () => {
    const published = book('novel', 'Novel');
    const result = groupDiscoveryBooks([
        { ...book('draft', 'Short Story'), publicationStatus: 'draft' },
        { ...book('hidden', 'Novel'), isDiscoverable: false } as Book,
        book('guide', 'Guide', ['Non-Fiction']), published, published, book('poem', 'Poetry'),
    ]);
    assert.deepEqual(result.stories.map(item => item.id), ['novel']);
    assert.deepEqual(result.novels.map(item => item.id), ['novel']);
    assert.deepEqual(result.poems.map(item => item.id), ['poem']);
});

test('server groups are validated before display and missing formats are skipped', () => {
    const result = normalizeDiscoveryGroups({ stories: [book('story', 'Short Story')], novels: [book('poem', 'Poetry'), book('novel', 'Novel')], poems: [] });
    assert.deepEqual(result.novels.map(item => item.id), ['novel']);
    assert.equal(nextDiscoveryGroup('stories', result), 'novels');
    assert.equal(nextDiscoveryGroup('novels', result), 'stories');
    assert.equal(nextDiscoveryGroup('poems', result), 'stories');
    assert.equal(nextDiscoveryGroup('stories', { stories: [], novels: [], poems: [] }), 'stories');
});
