import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRate, normalizeDailyTrend } from '../utils/writerAnalytics.ts';

test('normalizeDailyTrend fills missing UTC days with zero', () => {
    const result = normalizeDailyTrend(
        [{ date: '2026-08-29', readers: 3, views: 4 }],
        2,
        new Date('2026-08-29T12:00:00Z'),
    );

    assert.deepEqual(result.map(point => point.date), ['2026-08-28', '2026-08-29']);
    assert.deepEqual(result.map(point => point.readers), [0, 3]);
});

test('normalizeDailyTrend ignores duplicate and out-of-range dates safely', () => {
    const result = normalizeDailyTrend([
        { date: '2026-08-29', readers: 2, views: 2 },
        { date: '2026-08-29', readers: 4, views: 5 },
        { date: '2025-01-01', readers: 99, views: 99 },
    ], 2, new Date('2026-08-29T12:00:00Z'));

    assert.deepEqual(result.map(point => point.views), [0, 5]);
});

test('formatRate never emits NaN or an unbounded percentage', () => {
    assert.equal(formatRate(Number.NaN), '0%');
    assert.equal(formatRate(140), '100%');
    assert.equal(formatRate(49.6), '50%');
});
