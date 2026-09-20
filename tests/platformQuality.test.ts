import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { manuscriptProgress } from '../utils/readerProgress.ts';
import { authorShareUrl, storyShareUrl } from '../utils/shareLinks.ts';
import { uploadErrorMessage } from '../utils/uploadDiagnostics.ts';
import { imageLayoutStyle, normalizeImageOffset, normalizeImageWidth, resizeImageLayout, resizeImageWidth } from '../utils/editorImageLayout.ts';

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
    assert.match(worker, /\[a-zA-Z0-9_\-\]\+/, 'Founding Writer UUIDs must be routable');
});

test('local development uses the Vite API proxy so phones do not call their own localhost', () => {
    const api = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

    assert.match(api, /VITE_API_BASE_URL \|\| '\/api'/);
    assert.match(vite, /'\/api'[\s\S]*127\.0\.0\.1:8080/);
    assert.match(vite, /bypass\(req\)/);
    assert.match(vite, /Let Vite serve source modules instead of forwarding them to Spring/);
    assert.match(env, /^VITE_API_BASE_URL=\/api$/m);
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

test('default age rating is implicit while restricted ratings remain visible', () => {
    const badge = readFileSync(new URL('../components/AgeRatingBadge.tsx', import.meta.url), 'utf8');
    assert.match(badge, /rating === 'ALL_AGES'\) return null/);
    assert.match(badge, /MATURE_18: '18\+'/);
    assert.match(badge, /ADULT_21: '21\+'/);
});

test('reader comments and coaching use responsive contextual controls', () => {
    const reader = readFileSync(new URL('../pages/ReaderPage.tsx', import.meta.url), 'utf8');
    const coach = readFileSync(new URL('../components/ReaderDiscoveryCoach.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

    assert.match(reader, /revealedCommentIndex/);
    assert.match(reader, /reader-comment-button/);
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
    assert.doesNotMatch(css, /opacity: \.78 !important/);
    assert.doesNotMatch(coach, /positionStyles/);
});

test('chapter image layout stays bounded and portable between editor and reader', () => {
    const extension = readFileSync(new URL('../components/extensions/ResizableImageExtension.tsx', import.meta.url), 'utf8');
    assert.equal(normalizeImageWidth(8), 25);
    assert.equal(normalizeImageWidth(63.4), 63);
    assert.equal(normalizeImageWidth(140), 100);
    assert.equal(normalizeImageOffset(null, 50, 25), 25);
    assert.deepEqual(imageLayoutStyle(60, 'right'), {
        width: '60%',
        marginLeft: 'auto',
        marginRight: '0',
    });
    assert.deepEqual(imageLayoutStyle(60, 'center', 20), {
        width: '60%',
        marginLeft: '20%',
        marginRight: 'auto',
    });
    assert.equal(resizeImageWidth({ direction: 'e', startWidth: 50, startX: 100, startY: 100, currentX: 200, currentY: 100, editorWidth: 1000, imageAspectRatio: 1 }), 60);
    assert.equal(resizeImageWidth({ direction: 'w', startWidth: 50, startX: 100, startY: 100, currentX: 0, currentY: 100, editorWidth: 1000, imageAspectRatio: 1 }), 60);
    assert.equal(resizeImageWidth({ direction: 'n', startWidth: 50, startX: 100, startY: 100, currentX: 100, currentY: 0, editorWidth: 1000, imageAspectRatio: 1 }), 60);
    assert.equal(resizeImageWidth({ direction: 'se', startWidth: 50, startX: 100, startY: 100, currentX: 0, currentY: 100, editorWidth: 1000, imageAspectRatio: 1 }), 40);
    assert.deepEqual(
        resizeImageLayout({ direction: 'e', startWidth: 50, startOffset: 20, startX: 100, startY: 100, currentX: 200, currentY: 100, editorWidth: 1000, imageAspectRatio: 1 }),
        { width: 60, offset: 20 },
    );
    assert.deepEqual(
        resizeImageLayout({ direction: 'w', startWidth: 50, startOffset: 20, startX: 100, startY: 100, currentX: 0, currentY: 100, editorWidth: 1000, imageAspectRatio: 1 }),
        { width: 60, offset: 10 },
    );
    assert.deepEqual(
        resizeImageLayout({ direction: 'n', startWidth: 50, startOffset: 20, startX: 100, startY: 100, currentX: 100, currentY: 0, editorWidth: 1000, imageAspectRatio: 1 }),
        { width: 60, offset: 15 },
    );
    assert.match(extension, /draggable: true/);
    assert.match(extension, /data-width/);
    assert.match(extension, /data-align/);
    assert.match(extension, /data-offset/);
    assert.match(extension, /data-drag-handle/);
    assert.match(extension, /onPointerDown=\{startResize\}/);
});

test('chapter editor keeps essential writing tools sticky and makes table editing explicit', () => {
    const editor = readFileSync(new URL('../components/RichTextEditor.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

    assert.match(editor, /role="toolbar" aria-label="Chapter formatting"/);
    assert.match(editor, /rte-toolbar-group-primary/);
    assert.match(editor, /Italic \(Ctrl\+I\)/);
    assert.match(editor, /aria-label="Table editing"/);
    assert.match(editor, /addRowAfter/);
    assert.match(editor, /addColumnAfter/);
    assert.match(editor, /deleteTable/);
    assert.match(editor, /spellcheck: 'true'/);
    assert.match(editor, /link: false/);
    assert.match(editor, /underline: false/);
    assert.match(css, /\.ww-editor-paper \{[^}]*overflow: visible;/);
    assert.match(css, /\.ww-editor-paper \.rte-toolbar \{[^}]*z-index: 30;/);
    assert.match(css, /\.ww-editor-paper \.rte-toolbar-group-primary \{[^}]*position: sticky;/);
});

test('chapter images resize from every edge and corner and expose a real document drag handle', () => {
    const extension = readFileSync(new URL('../components/extensions/ResizableImageExtension.tsx', import.meta.url), 'utf8');
    for (const direction of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
        assert.match(extension, new RegExp(`direction: '${direction}'`));
    }
    assert.match(extension, /className="rte-image-drag-handle"/);
    assert.match(extension, /data-drag-handle/);
    assert.doesNotMatch(extension, /data-drag-handle draggable="true"/);
});

test('reading library and personal profile are separate destinations', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const navbar = readFileSync(new URL('../components/Navbar.tsx', import.meta.url), 'utf8');
    const profile = readFileSync(new URL('../pages/ProfilePage.tsx', import.meta.url), 'utf8');
    const library = readFileSync(new URL('../pages/LibraryPage.tsx', import.meta.url), 'utf8');

    assert.match(app, /name: 'library'/);
    assert.match(app, /<LibraryPage user=\{currentUser!\}/);
    assert.match(navbar, /label: 'Library'[\s\S]*?href: '\/library'/);
    assert.doesNotMatch(profile, /profileSection|Reading library|ww-library-shelf-nav/);
    assert.match(library, /Your library/);
    assert.doesNotMatch(library, /user\.avatarUrl|ww-profile-hero/);
});
