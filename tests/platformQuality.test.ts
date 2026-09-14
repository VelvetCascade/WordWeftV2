import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { manuscriptProgress } from '../utils/readerProgress.ts';
import { authorShareUrl, storyShareUrl } from '../utils/shareLinks.ts';
import { uploadErrorMessage } from '../utils/uploadDiagnostics.ts';

test('share URLs use crawler-visible routes instead of hash fragments', () => {
    assert.equal(storyShareUrl('book 1', 'https://example.com/'), 'https://example.com/book/book%201');
    assert.equal(authorShareUrl('author/1', 'https://example.com'), 'https://example.com/author/author%2F1');
});
test('reader progress is scoped to manuscript bounds', () => {
    assert.equal(manuscriptProgress({ contentTop: 100, contentHeight: 2100, viewportHeight: 600, scrollY: 100 }), 0);
    assert.equal(manuscriptProgress({ contentTop: 100, contentHeight: 2100, viewportHeight: 600, scrollY: 850 }), 50);
    assert.equal(manuscriptProgress({ contentTop: 100, contentHeight: 2100, viewportHeight: 600, scrollY: 1600 }), 100);
    assert.equal(manuscriptProgress({ contentTop: 100, contentHeight: 300, viewportHeight: 600, scrollY: 0 }), 0);
    assert.equal(manuscriptProgress({ contentTop: 100, contentHeight: 300, viewportHeight: 600, scrollY: 100 }), 100);
});

test('upload failures are converted to actionable reader-safe messages', () => {
    assert.match(uploadErrorMessage(403, 'bad signature'), /session expired/i);
    assert.match(uploadErrorMessage(429), /busy/i);
    assert.doesNotMatch(uploadErrorMessage(500, 'provider internals'), /provider internals/i);
});

test('reader sign-in gate ships enabled with the approved reader language', () => {
    const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
    const properties = readFileSync(new URL('../backend/src/main/resources/application.properties', import.meta.url), 'utf8');
    const story = readFileSync(new URL('../pages/BookDetailsPage.tsx', import.meta.url), 'utf8');
    const gate = readFileSync(new URL('../components/ReaderSignInGate.tsx', import.meta.url), 'utf8');
    const seo = readFileSync(new URL('../seo/render.mjs', import.meta.url), 'utf8');

    assert.match(env, /^READER_SIGN_IN_GATE_ENABLED=true$/m);
    assert.match(properties, /\$\{READER_SIGN_IN_GATE_ENABLED:true\}/);
    assert.match(`${story}\n${gate}\n${seo}`, /Sign in to read/);
    assert.doesNotMatch(`${story}\n${gate}\n${seo}`, /Free account required/i);
});
