import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManuscriptFile } from '../utils/manuscriptImport.ts';

test('manuscript import accepts txt, markdown, and docx files', () => {
    assert.doesNotThrow(() => validateManuscriptFile('story.txt', 10));
    assert.doesNotThrow(() => validateManuscriptFile('story.md', 10));
    assert.doesNotThrow(() => validateManuscriptFile('story.docx', 10));
});

test('manuscript import rejects unsupported and oversized files', () => {
    assert.throws(() => validateManuscriptFile('story.pdf', 10), /txt, md, or docx/i);
    assert.throws(() => validateManuscriptFile('story.docx', 5 * 1024 * 1024 + 1), /5 MB/i);
});
