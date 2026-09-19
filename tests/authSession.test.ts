import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

test('password requirement enforces 8-64 characters and rejects <= 10 limit across all forms', () => {
    const authPage = readFileSync(new URL('../pages/AuthPage.tsx', import.meta.url), 'utf8');
    const resetPage = readFileSync(new URL('../pages/ResetPasswordPage.tsx', import.meta.url), 'utf8');
    const profilePage = readFileSync(new URL('../pages/EditProfilePage.tsx', import.meta.url), 'utf8');

    for (const [name, content] of [['AuthPage', authPage], ['ResetPasswordPage', resetPage], ['EditProfilePage', profilePage]]) {
        assert.match(content, /8-64 characters/, `${name} must display 8-64 characters requirement`);
        assert.match(content, /pw\.length <= 64|password\.length <= 64|newPassword\.length <= 64/, `${name} must allow passwords up to 64 chars`);
        assert.doesNotMatch(content, /8-10 characters/, `${name} must not restrict passwords to 10 chars`);
    }
});
