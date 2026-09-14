import test from 'node:test';
import assert from 'node:assert/strict';

import {
    AUTH_SESSION_INVALID_EVENT,
    invalidateAuthSession,
    JWT_STORAGE_KEY,
} from '../utils/authSession.ts';

test('invalidating a rejected session removes its token and emits one app event', () => {
    const values = new Map([[JWT_STORAGE_KEY, 'expired-token']]);
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => { values.delete(key); },
    };
    let notifications = 0;

    assert.equal(invalidateAuthSession(storage, () => { notifications += 1; }), true);
    assert.equal(values.has(JWT_STORAGE_KEY), false);
    assert.equal(notifications, 1);
    assert.equal(AUTH_SESSION_INVALID_EVENT, 'wordweft:session-invalid');
});

test('concurrent unauthorized responses do not repeatedly reset an absent session', () => {
    const storage = {
        getItem: (_key: string) => null,
        removeItem: (_key: string) => { throw new Error('nothing should be removed'); },
    };
    let notifications = 0;

    assert.equal(invalidateAuthSession(storage, () => { notifications += 1; }), false);
    assert.equal(notifications, 0);
});
