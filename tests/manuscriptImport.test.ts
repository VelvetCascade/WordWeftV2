import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validateManuscriptFile } from '../utils/manuscriptImport.ts';

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
