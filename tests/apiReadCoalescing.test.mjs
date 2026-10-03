import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['api/client.ts'], bundle: true, write: false, format: 'iife', globalName: 'client', platform: 'browser', define: { 'import.meta.env': '{}' } });
const code = bundle.outputFiles[0].text;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(handler) {
    const storage = new Map();
    const requests = [];
    const timers = new Set();
    const context = createContext({ console, Response, AbortController, DOMException, Event, CustomEvent, URLSearchParams, document: { referrer: '' },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
        window: { dispatchEvent: () => {}, setTimeout: (callback, ms) => { const timer = setTimeout(callback, ms); timers.add(timer); return timer; }, clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); } },
        fetch: (url, init = {}) => { requests.push({ url: String(url), init }); return handler(String(url), init); },
    });
    runInContext(code, context);
    return { api: context.client, storage, requests, dispose: () => timers.forEach(clearTimeout) };
}

test('overlapping exact catalog reads share the network response but later reads remain fresh', async () => {
    const pending = deferred();
    const h = harness(() => pending.promise);
    try {
        const one = h.api.getBooks({ page: 0, size: 7, sort: 'most_read' });
        const two = h.api.getBooks({ page: 0, size: 7, sort: 'most_read' });
        assert.equal(h.requests.length, 1);
        pending.resolve(json({ content: [{ id: 'first', chapters: [] }], hasMore: false, totalElements: 1, page: 0 }));
        const results = await Promise.all([one, two]);
        assert.equal(results[0].content[0].id, 'first');
        assert.equal(results[1].content[0].id, 'first');
        await h.api.getBooks({ page: 0, size: 7, sort: 'most_read' });
        assert.equal(h.requests.length, 2);
    } finally { h.dispose(); }
});

test('different filters and authentication scopes never share a catalog read', async () => {
    const h = harness(() => Promise.resolve(json({ content: [], hasMore: false, totalElements: 0, page: 0 })));
    try {
        const anonymous = h.api.getBooks({ genre: 'Fantasy', page: 0 });
        h.storage.set('wordweft_jwt', 'token-A');
        const firstAccount = h.api.getBooks({ genre: 'Fantasy', page: 0 });
        const otherPage = h.api.getBooks({ genre: 'Fantasy', page: 1 });
        const otherGenre = h.api.getBooks({ genre: 'Romance', page: 0 });
        h.storage.set('wordweft_jwt', 'token-B');
        const otherAccount = h.api.getBooks({ genre: 'Fantasy', page: 0 });
        await Promise.all([anonymous, firstAccount, otherPage, otherGenre, otherAccount]);
        assert.equal(h.requests.length, 5);
        assert.equal(h.requests[1].init.headers.Authorization, 'Bearer token-A');
        assert.equal(h.requests[4].init.headers.Authorization, 'Bearer token-B');
    } finally { h.dispose(); }
});

test('a mutation invalidates an overlapping catalog read before the next reader starts', async () => {
    const pending = deferred();
    let reads = 0;
    const h = harness((_url, init) => init.method === 'POST' ? Promise.resolve(json({ id: 'book', chapters: [], likesCount: 1 })) : (++reads === 1 ? pending.promise : Promise.resolve(json({ content: [{ id: 'book', chapters: [], likesCount: 1 }] }))));
    try {
        const stale = h.api.getBooks({ page: 0 });
        const mutated = await h.api.toggleBookLike('book');
        assert.equal(mutated.likesCount, 1);
        const fresh = await h.api.getBooks({ page: 0 });
        assert.equal(fresh.content[0].likesCount, 1);
        assert.equal(reads, 2);
        pending.resolve(json({ content: [{ id: 'book', chapters: [], likesCount: 0 }] }));
        await stale;
        await h.api.getBooks({ page: 0 });
        assert.equal(reads, 3);
    } finally { h.dispose(); }
});

test('logout prevents a new session from joining the previous session’s pending read', async () => {
    const pending = deferred();
    const h = harness(() => pending.promise);
    try {
        h.storage.set('wordweft_jwt', 'token-A');
        const oldSession = h.api.getBooks({ page: 0 });
        await h.api.logout();
        h.storage.set('wordweft_jwt', 'token-A');
        const newSession = h.api.getBooks({ page: 0 });
        assert.equal(h.requests.length, 2);
        pending.resolve(json({ content: [{ id: 'book', chapters: [] }] }));
        await Promise.all([oldSession, newSession]);
    } finally { h.dispose(); }
});

test('shared read failures reach every caller and a retry makes a new request', async () => {
    const pending = deferred();
    const h = harness(() => h.requests.length === 1 ? pending.promise : Promise.resolve(json(['Fantasy'])));
    try {
        const settled = Promise.allSettled([h.api.getGenres(), h.api.getGenres()]);
        assert.equal(h.requests.length, 1);
        pending.resolve(json({ message: 'Catalog temporarily unavailable' }, 503));
        const results = await settled;
        assert.equal(results.every(result => result.status === 'rejected' && result.reason.message === 'Catalog temporarily unavailable'), true);
        assert.equal((await h.api.getGenres())[0], 'Fantasy');
        assert.equal(h.requests.length, 2);
    } finally { h.dispose(); }
});

test('a rejected read from a former account cannot invalidate the active session', async () => {
    const pending = deferred();
    const h = harness(() => pending.promise);
    try {
        h.storage.set('wordweft_jwt', 'token-A');
        const stale = h.api.getBookById('book');
        h.storage.set('wordweft_jwt', 'token-B');
        pending.resolve(json({ message: 'Former session expired', errorCode: 'SESSION_INVALID' }, 401));
        await assert.rejects(stale, /Former session expired/);
        assert.equal(h.storage.get('wordweft_jwt'), 'token-B');
    } finally { h.dispose(); }
});

test('a response from before logout cannot clear a later session with the same token', async () => {
    const pending = deferred();
    const h = harness(() => pending.promise);
    try {
        h.storage.set('wordweft_jwt', 'token-A');
        const stale = h.api.getBookById('book');
        await h.api.logout();
        h.storage.set('wordweft_jwt', 'token-A');
        pending.resolve(json({ message: 'Earlier session expired', errorCode: 'SESSION_INVALID' }, 401));
        await assert.rejects(stale, /Earlier session expired/);
        assert.equal(h.storage.get('wordweft_jwt'), 'token-A');
    } finally { h.dispose(); }
});

test('chapter contents and view writes remain separate operations', async () => {
    const h = harness(() => Promise.resolve(json({ id: 'chapter', chapters: [] })));
    try {
        h.storage.set('wordweft_reader_session', 'reading-session');
        await Promise.all([h.api.getChapterContent('book', 'chapter'), h.api.getChapterContent('book', 'chapter')]);
        await Promise.all([h.api.recordChapterView('book', 'chapter'), h.api.recordChapterView('book', 'chapter')]);
        assert.equal(h.requests.length, 4);
    } finally { h.dispose(); }
});

test('each book detail read reaches the server to preserve its view effect', async () => {
    const pending = deferred();
    let views = 0;
    const h = harness(() => { views++; return pending.promise.then(value => json(value)); });
    try {
        const one = h.api.getBookById('book');
        const two = h.api.getBookById('book');
        assert.equal(views, 2);
        pending.resolve({ id: 'book', chapters: [] });
        const results = await Promise.all([one, two]);
        assert.equal(results.every(result => result.id === 'book'), true);
    } finally { h.dispose(); }
});
