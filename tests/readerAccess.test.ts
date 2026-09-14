import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('frontend chapter contract models server-enforced access states', () => {
    const types = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');

    assert.match(types, /ChapterAccess\s*=\s*'FULL'\s*\|\s*'PREVIEW'\s*\|\s*'AUTH_REQUIRED'/);
    assert.match(types, /accessLabel\??:\s*'FULL'\s*\|\s*'PREVIEW'\s*\|\s*'SIGN_IN'/);
    assert.match(client, /getChapterContent/);
    assert.match(client, /AUTH_REQUIRED/);
});

test('story, reader, and auth screens implement the approved contextual sign-in flow', () => {
    const story = readFileSync(new URL('../pages/BookDetailsPage.tsx', import.meta.url), 'utf8');
    const reader = readFileSync(new URL('../pages/ReaderPage.tsx', import.meta.url), 'utf8');
    const gate = readFileSync(new URL('../components/ReaderSignInGate.tsx', import.meta.url), 'utf8');
    const auth = readFileSync(new URL('../pages/AuthPage.tsx', import.meta.url), 'utf8');
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const combined = `${story}\n${reader}\n${gate}\n${auth}\n${app}`;

    assert.match(story, /Preview/);
    assert.match(story, /Sign in to read/);
    assert.match(reader, /getChapterContent/);
    assert.match(reader, /consumeReaderResumeIntent/);
    assert.match(gate, /Sign in to keep reading/);
    assert.match(gate, /Sign in to read this chapter/);
    assert.match(gate, />Sign in</);
    assert.match(gate, />Create account</);
    assert.match(auth, /initialView/);
    assert.match(app, /markReaderAuthComplete/);
    assert.doesNotMatch(combined, /Free account required/i);
});

test('reader gate analytics cover the funnel without manuscript metadata', () => {
    const reader = readFileSync(new URL('../pages/ReaderPage.tsx', import.meta.url), 'utf8');
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const analytics = readFileSync(new URL('../utils/analyticsService.ts', import.meta.url), 'utf8');
    const source = `${reader}\n${app}`;

    for (const action of [
        'reader_preview_started',
        'reader_preview_gate_viewed',
        'reader_gate_auth_clicked',
        'locked_chapter_viewed',
        'reader_gate_auth_completed',
        'reader_full_content_resumed',
        'reader_next_chapter_started',
    ]) assert.match(source, new RegExp(action));

    assert.doesNotMatch(source, /metadata:\s*\{[^}]*content\s*:/s);
    assert.doesNotMatch(source, /metadata:\s*\{[^}]*email\s*:/s);
    assert.doesNotMatch(analytics, /if\s*\(!token\)\s*return;\s*\/\/ Don't send analytics/);
    assert.doesNotMatch(analytics, /events\?token=/);
});
