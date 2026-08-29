import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createLatestRequestGate,
    createReconnectController,
    readReaderPreferences,
} from '../utils/runtimeLifecycle.ts';

test('reader preferences restore valid saved values and clamp unsafe font sizes', () => {
    const preferences = readReaderPreferences(JSON.stringify({
        fontSize: 99,
        contentTheme: 'sepia',
        readerFont: 'modern',
        readerWidth: 'wide',
        lineHeight: 2.05,
    }), 'dark');

    assert.deepEqual(preferences, {
        fontSize: 32,
        contentTheme: 'sepia',
        readerFont: 'modern',
        readerWidth: 'wide',
        lineHeight: 2.05,
    });
});

test('reader preferences fall back safely when storage is malformed', () => {
    assert.deepEqual(readReaderPreferences('{broken', 'dark'), {
        fontSize: 18,
        contentTheme: 'dark',
        readerFont: 'literary',
        readerWidth: 'standard',
        lineHeight: 1.85,
    });
});

test('latest request gate rejects a response from an older search request', () => {
    const gate = createLatestRequestGate();
    const olderRequest = gate.begin();
    const newerRequest = gate.begin();

    assert.equal(gate.isLatest(olderRequest), false);
    assert.equal(gate.isLatest(newerRequest), true);

    gate.invalidate();
    assert.equal(gate.isLatest(newerRequest), false);
});

test('reconnect controller cancels pending work when disposed', async () => {
    let reconnects = 0;
    const controller = createReconnectController(() => { reconnects += 1; }, 5);

    controller.schedule();
    controller.dispose();
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal(reconnects, 0);
});

test('reconnect controller keeps at most one pending reconnect', async () => {
    let reconnects = 0;
    const controller = createReconnectController(() => { reconnects += 1; }, 5);

    controller.schedule();
    controller.schedule();
    await new Promise(resolve => setTimeout(resolve, 20));
    controller.dispose();

    assert.equal(reconnects, 1);
});
