import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGenreArtwork } from '../utils/genreArtwork.ts';

const actualHomepageGenres = ['Romance', 'Young Adult', 'LGBTQ+', 'Comedy', 'Tragedy', 'Drama', 'Mystery', 'Humor', 'Fan Fiction', 'Adventure', 'Horror', 'Fantasy', 'Non-Fiction', 'Action', 'Supernatural', 'Suspense', 'Thriller', 'Dark Fantasy', 'Crime', 'War', 'Urban Fantasy', 'Sci-Fi', 'Slice of Life', 'Military', 'Poetry', 'Literary Fiction'];

test('every actual live and local homepage genre has distinct thematic sourced artwork', () => {
    const images = new Set();
    for (const genre of actualHomepageGenres) {
        const art = getGenreArtwork(genre);
        assert.ok(art, `${genre} needs individual artwork`);
        assert.ok(!images.has(art.file), `${genre} must not reuse another genre image`);
        images.add(art.file);
        assert.match(art.source, /^https:\/\/www\.metmuseum\.org\/art\/collection\/search\//);
        assert.match(art.rights, /public domain|CC0/i);
        assert.ok(art.theme.length > 20, `${genre} needs a meaningful association`);
        const bytes = readFileSync(new URL(`../public${art.file}`, import.meta.url));
        assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
    }
});

test('genre artwork lookup preserves exact labels and handles unfamiliar genres honestly', () => {
    assert.equal(getGenreArtwork('  ROMANCE ')?.genre, 'Romance');
    assert.equal(getGenreArtwork('Unknown future genre'), undefined);
});
