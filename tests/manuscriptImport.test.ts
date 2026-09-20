import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validateManuscriptFile } from '../utils/manuscriptImport.ts';
import { importProgressCopy } from '../utils/importProgress.ts';

test('manuscript import accepts txt, markdown, and docx files', () => {
    assert.doesNotThrow(() => validateManuscriptFile('story.txt', 10));
    assert.doesNotThrow(() => validateManuscriptFile('story.md', 10));
    assert.doesNotThrow(() => validateManuscriptFile('story.docx', 10));
});

test('manuscript import rejects unsupported and oversized files', () => {
    assert.throws(() => validateManuscriptFile('story.pdf', 10), /txt, md, or docx/i);
    assert.throws(() => validateManuscriptFile('story.docx', 25 * 1024 * 1024 + 1), /25 MB/i);
});

test('manuscript import allows documents larger than an embedded image limit', () => {
    assert.doesNotThrow(() => validateManuscriptFile('illustrated-story.docx', 12 * 1024 * 1024));
});

test('manuscript import allows enough time for embedded images to reach cloud storage', () => {
    const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');
    assert.match(client, /books\/\$\{bookId\}\/import[\s\S]*180_000/);
});

test('manuscript progress reports measured uploads without inventing processing percentages', () => {
    assert.deepEqual(importProgressCopy({ phase: 'uploading', percent: 42, elapsedSeconds: 3 }), {
        title: 'Uploading manuscript',
        detail: '42% uploaded',
        percent: 42,
        determinate: true,
    });
    assert.deepEqual(importProgressCopy({ phase: 'processing', percent: 100, elapsedSeconds: 18 }), {
        title: 'Building your chapters',
        detail: 'Reading structure, uploading embedded images, and saving private drafts · 18s elapsed',
        percent: null,
        determinate: false,
    });
});

test('manuscript import blocks navigation while upload and processing are active', () => {
    const manager = readFileSync(new URL('../pages/ManageChaptersPage.tsx', import.meta.url), 'utf8');
    const navigation = readFileSync(new URL('../utils/navigation.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');

    assert.match(manager, /lockNavigation\('Your manuscript is still being imported\.'/);
    assert.match(manager, /aria-modal="true"/);
    assert.match(navigation, /beforeunload/);
    assert.match(navigation, /restoreLockedNavigation/);
    assert.match(client, /xhr\.upload\.addEventListener\('progress'/);
});
