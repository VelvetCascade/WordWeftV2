import test from 'node:test';
import assert from 'node:assert/strict';

import { challengeStatusLabel, eventTimingLabel } from '../utils/readingGrowth.ts';

test('challengeStatusLabel describes the next useful action', () => {
    assert.equal(challengeStatusLabel({ joined: false, completed: false, progress: 0, target: 10 }), 'Join challenge');
    assert.equal(challengeStatusLabel({ joined: true, completed: false, progress: 4, target: 10 }), '4 of 10');
    assert.equal(challengeStatusLabel({ joined: true, completed: true, progress: 10, target: 10 }), 'Completed');
});

test('eventTimingLabel distinguishes upcoming, active, and ended events', () => {
    const now = new Date('2026-08-29T12:00:00Z');
    assert.match(eventTimingLabel('2026-08-30T12:00:00Z', '2026-09-02T12:00:00Z', now), /Starts/);
    assert.match(eventTimingLabel('2026-08-28T12:00:00Z', '2026-09-02T12:00:00Z', now), /Open/);
    assert.equal(eventTimingLabel('2026-08-20T12:00:00Z', '2026-08-21T12:00:00Z', now), 'Ended');
});
