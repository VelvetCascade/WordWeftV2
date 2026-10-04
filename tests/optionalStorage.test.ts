import test from 'node:test';
import assert from 'node:assert/strict';
import { readOptionalValue, writeOptionalValue, readOptionalSessionValue, writeOptionalSessionValue } from '../utils/optionalStorage.ts';

test('blocked browser storage preserves optional choices in this tab only', () => {
    const original = (globalThis as any).window;
    (globalThis as any).window = {
        get localStorage() { throw new Error('blocked'); },
        get sessionStorage() { throw new Error('blocked'); },
    };
    try {
        assert.equal(readOptionalValue('blocked-test'), null);
        assert.doesNotThrow(() => writeOptionalValue('blocked-test', 'dismissed'));
        assert.equal(readOptionalValue('blocked-test'), 'dismissed');
        writeOptionalSessionValue('session-test', 'this-tab');
        assert.equal(readOptionalSessionValue('session-test'), 'this-tab');
        assert.equal(readOptionalValue('session-test'), null);
    } finally { (globalThis as any).window = original; }
});
