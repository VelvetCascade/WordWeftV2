import test from 'node:test';
import assert from 'node:assert/strict';

import { revisionReasonLabel } from '../utils/chapterRevisions.ts';

test('revision reasons are presented as reader-friendly recovery labels', () => {
    assert.equal(revisionReasonLabel('AUTOSAVE'), 'Automatic backup');
    assert.equal(revisionReasonLabel('PRE_RESTORE'), 'Before a restore');
    assert.equal(revisionReasonLabel('unknown_value'), 'Saved version');
});
