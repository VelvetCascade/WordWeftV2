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
    assert.match(uploadErrorMessage(408), /(timed out|too long)/i);
    assert.doesNotMatch(uploadErrorMessage(500, 'provider internals'), /provider internals/i);
});

test('image uploads avoid heavyweight client-side ML and expose bounded progress-aware requests', () => {
    const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    const imageUpload = readFileSync(new URL('../components/ImageUpload.tsx', import.meta.url), 'utf8');
    const api = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');

    assert.doesNotMatch(packageJson, /nsfwjs|@tensorflow\/tfjs/);
    assert.doesNotMatch(imageUpload, /nsfwjs|tensorflow|loadNSFWModel/);
    assert.match(api, /xhr\.upload\.addEventListener\('progress'/);
    assert.match(api, /upload_timeout/);
});

test('cropped image filenames match their exported JPEG bytes', () => {
    const source = readFileSync(new URL('../components/ImageCropModal.tsx', import.meta.url), 'utf8');

    assert.match(source, /toBlob\([\s\S]*'image\/jpeg'/);
    assert.match(source, /`\$\{originalBase\}\.jpg`/);
    assert.doesNotMatch(source, /new File\(\[blob\], file\.name/);
});

test('writer autosave preserves published status and profile links use the actual route', () => {
    const editor = readFileSync(new URL('../pages/ChapterEditorPage.tsx', import.meta.url), 'utf8');
    const create = readFileSync(new URL('../pages/CreateBookPage.tsx', import.meta.url), 'utf8');
    const manage = readFileSync(new URL('../pages/ManageChaptersPage.tsx', import.meta.url), 'utf8');

    assert.match(editor, /debouncedSave\('preserve', newContent, title\)/);
    assert.doesNotMatch(editor, /onChange=.*debouncedSave\('draft'/);
    assert.doesNotMatch(`${editor}\n${create}\n${manage}`, /profile\/edit/);
    assert.match(`${editor}\n${create}\n${manage}`, /edit-profile/);
});

test('chapter image storage never reports success without a configured worker', () => {
    const storage = readFileSync(new URL('../backend/src/main/java/com/wordweft/book/service/ChapterImageStorageService.java', import.meta.url), 'utf8');
    const worker = readFileSync(new URL('../worker/src/index.ts', import.meta.url), 'utf8');

    assert.match(storage, /HttpStatus\.SERVICE_UNAVAILABLE/);
    assert.doesNotMatch(storage, /return "\/api\/chapter-images\//);
    assert.match(storage, /\.timeout\(UPLOAD_TIMEOUT\)/);
    assert.match(worker, /Filename does not match token/);
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
