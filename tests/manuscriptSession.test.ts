import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDeviceDraft, manuscriptSessionId } from '../utils/manuscriptSession.ts';
const draft = { title: 'My version', content: '<p>Keep this manuscript</p>', contentWarnings: [], disclaimerNote: '', baseRevision: 2 };
test('failed, unavailable and mismatched storage cannot be described as a verified device save', () => {
    assert.equal(verifyDeviceDraft({ getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } }, 'draft', draft), false);
    assert.equal(verifyDeviceDraft({ getItem: () => 'different version', setItem: () => {} }, 'draft', draft), false);
});
test('device-only exit requires exact readback and keeps independent session versions', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
    assert.equal(verifyDeviceDraft(storage, 'owner:chapter:tab-one', draft), true);
    assert.equal(verifyDeviceDraft(storage, 'owner:chapter:tab-two', { ...draft, content: 'Another draft' }), true);
    assert.match(values.get('owner:chapter:tab-one')!, /Keep this manuscript/);
    assert.equal(manuscriptSessionId(storage, 'tab'), manuscriptSessionId(storage, 'tab'));
});
