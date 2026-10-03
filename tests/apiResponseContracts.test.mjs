import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['api/client.ts'], bundle: true, write: false, format: 'iife', globalName: 'client', platform: 'browser', define: { 'import.meta.env': '{}' } });
const code = bundle.outputFiles[0].text;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const book = { id: 'book', chapters: [{ id: 'chapter', status: 'published' }] };
const pendingProgressKey = 'ww_reading_pending_v1:reader:book';

function harness(handler) {
    const storage = new Map([['wordweft_jwt', 'token-reader'], ['wordweft_reader_session', 'reading-session']]);
    const requests = [];
    const events = [];
    const timers = new Set();
    const context = createContext({ console, Response, AbortController, DOMException, Event, CustomEvent, URLSearchParams, document: { referrer: '' },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key), get length() { return storage.size; }, key: index => [...storage.keys()][index] ?? null },
        window: { dispatchEvent: event => { events.push(event); }, setTimeout: (callback, ms) => { const timer = setTimeout(callback, ms); timers.add(timer); return timer; }, clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); } },
        fetch: (url, init = {}) => { requests.push({ url: String(url), init }); return handler(String(url), init); },
    });
    runInContext(code, context);
    return { api: context.client, storage, requests, events, dispose: () => timers.forEach(clearTimeout) };
}

function assertInvalidResponse(api, error, status = 200) {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, status);
    assert.equal(error.code, 'invalid_response');
    assert.match(error.message, /response/i);
    assert.match(error.message, /try again|retry/i);
    return true;
}

for (const [name, body, contentType] of [
    ['HTML', '<html><body>Proxy error</body></html>', 'text/html'],
    ['malformed JSON', '{invalid}', 'application/json'],
    ['truncated JSON', '[{"name":"Fantasy"', 'application/json'],
    ['an empty body', '', 'application/json'],
    ['only whitespace', ' \n\t', 'application/json'],
]) test(`a successful ranked-genres response containing ${name} rejects with a retryable API error`, async () => {
    const h = harness(() => Promise.resolve(new Response(body, { headers: { 'Content-Type': contentType } })));
    try {
        await assert.rejects(h.api.getGenresRanked(), error => assertInvalidResponse(h.api, error));
        assert.equal(h.storage.get('wordweft_jwt'), 'token-reader');
        assert.equal(h.events.length, 0);
    } finally { h.dispose(); }
});

test('a response body interrupted after headers rejects with an API error', async () => {
    const h = harness(() => Promise.resolve(new Response(new ReadableStream({
        start(controller) { controller.error(new TypeError('The response stream was interrupted')); },
    }), { headers: { 'Content-Type': 'application/json' } })));
    try {
        await assert.rejects(h.api.getGenresRanked(), error => assertInvalidResponse(h.api, error));
    } finally { h.dispose(); }
});

for (const [name, response] of [
    ['HTML', () => new Response('<html>Gateway failure</html>', { headers: { 'Content-Type': 'text/html' } })],
    ['JSON null', () => json(null)],
    ['a JSON proxy error object', () => json({ message: 'Gateway failure' })],
]) test(`an overlapping catalog response containing ${name} rejects every reader and the next attempt fetches fresh data`, async () => {
    const pending = deferred();
    const h = harness(() => h.requests.length === 1 ? pending.promise : Promise.resolve(json([{ name: 'Fantasy', bookCount: 1, readCount: 2 }])));
    try {
        const settled = Promise.allSettled([h.api.getGenresRanked(), h.api.getGenresRanked()]);
        assert.equal(h.requests.length, 1);
        pending.resolve(response());
        const results = await settled;
        for (const result of results) {
            assert.equal(result.status, 'rejected');
            assertInvalidResponse(h.api, result.reason);
        }
        assert.equal((await h.api.getGenresRanked())[0].name, 'Fantasy');
        assert.equal(h.requests.length, 2);
    } finally { h.dispose(); }
});

for (const [name, invoke, valid] of [
    ['genres', api => api.getGenres(), ['Fantasy']],
    ['ranked genres', api => api.getGenresRanked(), [{ name: 'Fantasy', bookCount: 1, readCount: 2 }]],
    ['book reviews', api => api.getBookReviews('book'), [{ id: 'review', rating: 4 }]],
    ['chapter comments', api => api.getChapterComments('book', 'chapter'), [{ id: 'comment', content: 'Great chapter' }]],
]) {
    for (const [invalidName, invalid] of [
        ['JSON null', null],
        ['a JSON proxy error object', { message: 'Gateway failure' }],
        ['a JSON string', 'Gateway failure'],
    ]) test(`${name} rejects ${invalidName} instead of returning an unusable list`, async () => {
        const h = harness(() => Promise.resolve(json(invalid)));
        try { await assert.rejects(invoke(h.api), error => assertInvalidResponse(h.api, error)); }
        finally { h.dispose(); }
    });

    test(`${name} preserves empty and populated JSON arrays`, async () => {
        let value = [];
        const h = harness(() => Promise.resolve(json(value)));
        try {
            const empty = await invoke(h.api);
            assert.ok(Array.isArray(empty));
            assert.equal(empty.length, 0);
            value = valid;
            assert.equal(JSON.stringify(await invoke(h.api)), JSON.stringify(valid));
        } finally { h.dispose(); }
    });
}

for (const [name, invoke] of [
    ['paginated catalog', api => api.getBooks({ page: 0 })],
    ['hero catalog', api => api.getDiscoveryHero()],
    ['home genres', api => api.getHomeGenres()],
    ['book detail', api => api.getBookById('book')],
    ['author profile', api => api.getAuthorById('author')],
    ['all reading progress', api => api.getAllReadingProgress('reader')],
    ['book-like mutation', api => api.toggleBookLike('book')],
]) test(`${name} requires data and rejects an unexpected successful JSON null response`, async () => {
    const h = harness(() => Promise.resolve(json(null)));
    try { await assert.rejects(invoke(h.api), error => assertInvalidResponse(h.api, error)); }
    finally { h.dispose(); }
});

for (const [name, invoke, status] of [
    ['character deletion', api => api.deleteCharacter('character'), 200],
    ['scene deletion', api => api.deleteScene('scene'), 200],
    ['note deletion', api => api.deleteNote('note'), 200],
    ['reading progress clearing', api => api.clearReadingProgress('reader', 'book'), 200],
    ['chapter view recording', api => api.recordChapterView('book', 'chapter'), 204],
    ['upload diagnostics', api => api.reportImageUploadDiagnostic({ uploadId: 'upload', event: 'auth_ready' }), 204],
]) test(`${name} preserves its legitimate empty ${status} response`, async () => {
    const h = harness(() => Promise.resolve(new Response(null, { status })));
    try { assert.equal(await invoke(h.api), undefined); }
    finally { h.dispose(); }
});

test('a successful mutation with a JSON contract rejects an empty body', async () => {
    const h = harness(() => Promise.resolve(new Response(null, { status: 200 })));
    try {
        await assert.rejects(h.api.toggleBookLike('book'), error => assertInvalidResponse(h.api, error));
    } finally { h.dispose(); }
});

test('an empty-response mutation still rejects a nonempty malformed response', async () => {
    const h = harness(() => Promise.resolve(new Response('<html>Upstream failed</html>', { headers: { 'Content-Type': 'text/html' } })));
    try {
        await assert.rejects(h.api.deleteNote('note'), error => assertInvalidResponse(h.api, error));
    } finally { h.dispose(); }
});

test('an explicitly void mutation preserves a JSON null acknowledgement', async () => {
    const h = harness(() => Promise.resolve(json(null)));
    try { assert.equal(await h.api.deleteNote('note'), undefined); }
    finally { h.dispose(); }
});

for (const [name, response] of [
    ['an empty 200 body', () => new Response(null, { status: 200 })],
    ['JSON null', () => json(null)],
]) test(`reading progress without a record preserves ${name} as null`, async () => {
    const h = harness(() => Promise.resolve(response()));
    try { assert.equal(await h.api.getReadingProgressForBook('reader', 'book'), null); }
    finally { h.dispose(); }
});

for (const [name, body] of [
    ['truncated JSON', '{"chapters":'],
    ['HTML', '<html>Upstream failed</html>'],
    ['an empty body', ''],
]) test(`a reading progress save receiving ${name} retains its durable pending snapshot until a successful retry`, async () => {
    let fail = true;
    const h = harness(() => Promise.resolve(fail
        ? new Response(body, { headers: { 'Content-Type': 'application/json' } })
        : json({ overallProgress: 75, lastReadChapterIndex: 0, lastReadScrollPosition: 120, chapters: { chapter: { progress: 75, scrollPosition: 120 } } })));
    try {
        await assert.rejects(h.api.saveReadingProgress('reader', book, 0, 120, 75), error => assertInvalidResponse(h.api, error));
        assert.equal(JSON.parse(h.storage.get(pendingProgressKey)).snapshots[0].progress, 75);
        assert.equal(h.events.at(-1).detail.status, 'error');
        assert.equal(h.events.at(-1).detail.progress.pendingSync, true);
        fail = false;
        await h.api.saveReadingProgress('reader', book, 0, 120, 75);
        assert.equal(h.storage.get(pendingProgressKey), undefined);
        assert.equal(h.events.at(-1).detail.status, 'saved');
        assert.equal(h.events.at(-1).detail.progress.pendingSync, false);
        assert.equal(h.requests.length, 2);
    } finally { h.dispose(); }
});

test('a JSON null reading-progress acknowledgement remains compatible with the local merge', async () => {
    const h = harness(() => Promise.resolve(json(null)));
    try {
        await h.api.saveReadingProgress('reader', book, 0, 120, 75);
        assert.equal(h.storage.get(pendingProgressKey), undefined);
        assert.equal(h.events.at(-1).detail.status, 'saved');
        assert.equal(h.events.at(-1).detail.progress.chapters.chapter.progress, 75);
    } finally { h.dispose(); }
});

for (const [name, invoke, message] of [
    ['OTP resend', api => api.resendOtp('reader@example.test'), 'A new OTP has been sent to your email.'],
    ['password reset request', api => api.forgotPassword('reader@example.test'), 'If an account exists with that email, a password reset link has been sent.'],
    ['password reset', api => api.resetPassword('reset-token', 'new-password'), 'Password reset successfully. You can now login.'],
]) test(`${name} returns its successful plain text message`, async () => {
    const h = harness(() => Promise.resolve(new Response(message, { headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })));
    try { assert.equal(await invoke(h.api), message); }
    finally { h.dispose(); }
});

test('password changes preserve their text acknowledgement before refreshing the user', async () => {
    const h = harness(url => Promise.resolve(url.endsWith('/users/me/password')
        ? new Response('Password updated successfully.', { headers: { 'Content-Type': 'text/plain' } })
        : json({ id: 'reader', username: 'Reader' })));
    try {
        assert.equal((await h.api.changePassword('reader', 'old-password', 'new-password')).id, 'reader');
        assert.equal(h.requests.length, 2);
    } finally { h.dispose(); }
});

test('non-success plain text auth errors retain their message and status', async () => {
    const h = harness(() => Promise.resolve(new Response('Incorrect email or password. Please try again.', { status: 401, headers: { 'Content-Type': 'text/plain' } })));
    try {
        await assert.rejects(h.api.login('reader@example.test', 'incorrect'), error => {
            assert.ok(error instanceof h.api.ApiError);
            assert.equal(error.status, 401);
            assert.equal(error.message, 'Incorrect email or password. Please try again.');
            return true;
        });
        assert.equal(h.storage.get('wordweft_jwt'), 'token-reader');
    } finally { h.dispose(); }
});

test('valid empty collections and missing detail 404s preserve their contracts', async () => {
    const h = harness(url => Promise.resolve(url === '/api/books/book' || url === '/api/users/author/profile'
        ? new Response(null, { status: 404 })
        : json(url.endsWith('/genres/ranked') ? []
        : url.includes('/books?') ? { content: [], hasMore: false, totalElements: 0, page: 0 }
        : url === '/api/reading/progress' ? {} : null)));
    try {
        assert.equal((await h.api.getGenresRanked()).length, 0);
        assert.equal((await h.api.getBooks({ page: 0 })).content.length, 0);
        assert.equal(Object.keys(await h.api.getAllReadingProgress('reader')).length, 0);
        assert.equal(await h.api.getBookById('book'), null);
        assert.equal(await h.api.getAuthorById('author'), null);
    } finally { h.dispose(); }
});
