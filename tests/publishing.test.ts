import test from 'node:test';
import assert from 'node:assert/strict';

import { toUtcSchedule } from '../utils/publishing.ts';

test('toUtcSchedule rejects an invalid local value', () => {
    assert.throws(() => toUtcSchedule('not-a-date'), /valid release time/i);
});

test('toUtcSchedule rejects a release less than two minutes away', () => {
    const now = new Date('2026-09-01T12:00:00Z');
    assert.throws(() => toUtcSchedule('2026-09-01T12:01', now), /two minutes/i);
});

test('toUtcSchedule emits an ISO UTC instant', () => {
    const result = toUtcSchedule('2026-09-01T18:00', new Date('2026-08-29T12:00:00Z'));
    assert.match(result, /^2026-09-01T\d{2}:\d{2}:00\.000Z$/);
});
