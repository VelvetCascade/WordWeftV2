import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteractionRecorder } from '../utils/reliabilityDiagnostics.ts';

test('interaction diagnostics retain only bounded anonymous activation metadata', () => {
    const recorder = createInteractionRecorder(3);
    for (let index = 0; index < 5; index++) {
        recorder.record({ kind: 'activation', screen: '/book/private-id?token=secret', control: 'button', input: 'touch', elapsedMs: index * 10 });
    }
    const records = recorder.snapshot();
    assert.equal(records.length, 3);
    assert.equal(records[0].elapsedMs, 20);
    assert.equal(records[0].screen, '/book/:book');
    assert.doesNotMatch(JSON.stringify(records), /private-id|secret|token/);
});

test('diagnostic snapshots cannot mutate the retained records', () => {
    const recorder = createInteractionRecorder();
    recorder.record({ kind: 'navigation', screen: '/search?q=manuscript', control: 'none', input: 'keyboard', elapsedMs: 0 });
    recorder.snapshot()[0].screen = 'changed';
    assert.equal(recorder.snapshot()[0].screen, '/search');
});
