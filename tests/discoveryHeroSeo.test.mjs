import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResponse } from '../seo/render.mjs';

const template = '<html><head><!--SEO_HEAD--></head><body><!--SEO_BODY--></body></html>';
const options = { url: '/', host: 'www.wordweftstudio.com', template, staticBodies: { '/': '<h1>Read stories. Write your own.</h1>' } };
const book = { id: 'story', title: 'A real published story', category: 'Short Story', publicationStatus: 'published', ageRating: 'ALL_AGES' };

test('public homepage renders the current anonymous hero catalog without caching unpublished titles', async () => {
    let received;
    const result = await buildResponse({ ...options,
        fetchJson: async path => { assert.equal(path, '/hero'); return { stories: [book, { ...book, id: 'adult', title: 'Private adult title', ageRating: 'ADULT_21' }], novels: [], poems: [] }; },
        renderHome: groups => { received = groups; return `<h1>Read stories. Write your own.</h1><a href="/book/${groups.stories[0].id}">${groups.stories[0].title}</a>`; },
    });
    assert.equal(result.status, 200);
    assert.equal(received.stories.length, 1);
    assert.match(result.body, /href="\/book\/story"/);
    assert.doesNotMatch(result.body, /Private adult title/);
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
});

test('hero data outage leaves the public reading and writing homepage available', async () => {
    const result = await buildResponse({ ...options,
        fetchJson: async () => { throw new Error('Slow catalog'); },
        renderHome: groups => `<h1>Read stories. Write your own.</h1><a href="/category">Read stories</a><p>${groups.stories.length ? 'Catalog available' : 'New stories are on their way.'}</p>`,
    });
    assert.equal(result.status, 200);
    assert.match(result.body, /Read stories\. Write your own\./);
    assert.match(result.body, /href="\/category"/);
    assert.doesNotMatch(result.body, /Slow catalog/);
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
