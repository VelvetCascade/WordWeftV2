import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('frontend chapter contract models server-enforced access states', () => {
    const types = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');

    assert.match(types, /ChapterAccess\s*=\s*'FULL'\s*\|\s*'PREVIEW'\s*\|\s*'AUTH_REQUIRED'/);
    assert.match(types, /accessLabel\??:\s*'FULL'\s*\|\s*'PREVIEW'\s*\|\s*'SIGN_IN'/);
    assert.match(client, /getChapterContent/);
    assert.match(client, /AUTH_REQUIRED/);
});
