import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localPreviewApiBase } from '../scripts/local-preview-config.mjs';

const config = { apiBase: 'http://127.0.0.1:8080/api', clientApiBase: '/api' };
test('a production backend in the effective renderer override is rejected', () => {
    assert.throws(() => localPreviewApiBase(config, 'https://production.invalid/api'), /local E2E preview/);
    assert.throws(() => localPreviewApiBase({ ...config, apiBase: 'https://production.invalid/api' }), /local E2E preview/);
});
test('a compiled client with a remote API is rejected regardless of runtime settings', () => {
    assert.throws(() => localPreviewApiBase({ ...config, clientApiBase: 'https://production.invalid/api' }, config.apiBase), /local E2E preview/);
    assert.throws(() => localPreviewApiBase({ apiBase: config.apiBase }), /local E2E preview/);
});
test('local rendering and proxy use the same effective backend URL', () => {
    assert.equal(localPreviewApiBase(config), config.apiBase);
    assert.equal(localPreviewApiBase(config, 'http://localhost:8085/api/'), 'http://localhost:8085/api');
});
