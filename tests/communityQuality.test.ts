import test from 'node:test';
import assert from 'node:assert/strict';
import { composerDefaults } from '../utils/community.ts';
import type { Circle } from '../types/community.ts';
const circles = [
    { id: 'critique', joined: false, allowedPostTypes: ['UPDATE', 'WORKSHOP'] },
    { id: 'common', joined: true, allowedPostTypes: ['UPDATE', 'POLL'] },
] as Circle[];
test('the composer uses the current destination or a compatible joined circle', () => {
    assert.equal(composerDefaults(circles, undefined, 'UPDATE').circleId, 'common');
    assert.equal(composerDefaults(circles, 'critique', 'UPDATE').circleId, 'critique');
});
test('unjoined destinations require an explicit choice', () => {
    assert.equal(composerDefaults(circles.map(circle => ({ ...circle, joined: false })), undefined, 'UPDATE').circleId, '');
    assert.equal(composerDefaults(circles, undefined, 'RELEASE').circleId, '');
});
