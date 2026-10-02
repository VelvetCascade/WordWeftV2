import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['api/client.ts'], bundle: true, write: false, format: 'iife', globalName: 'client', platform: 'browser', define: { 'import.meta.env': '{}' } });
const code = bundle.outputFiles[0].text;
const book = { id: 'book', chapters: [{ id: 'one', status: 'published' }, { id: 'two', status: 'published' }] };
const oldProgress = { overallProgress: 100, lastReadChapterIndex: 0, lastReadScrollPosition: 500, chapters: { one: { progress: 100, scrollPosition: 500 } } };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(handler) {
    const storage = new Map();
    const events = [];
    const timers = new Set();
    const context = createContext({ console, Response, AbortController, DOMException, Event, CustomEvent,
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key), get length() { return storage.size; }, key: index => [...storage.keys()][index] ?? null },
        window: { dispatchEvent: event => { events.push(event); }, setTimeout: (callback, ms) => { const timer = setTimeout(callback, ms); timers.add(timer); return timer; }, clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); } },
        fetch: (url, init = {}) => {
            if (String(url).endsWith('/users/me')) {
                const id = init.headers.Authorization.replace('Bearer token-', '');
                return Promise.resolve(json({ id, username: id, email: `${id}@example.test`, library: [], writtenBooks: [], followers: [], following: [] }));
            }
            return handler(String(url), init);
        },
    });
    runInContext(code, context);
    return { api: context.client, storage, events, as: async id => { storage.set('wordweft_jwt', `token-${id}`); await context.client.getMe(); }, dispose: () => timers.forEach(clearTimeout) };
}

test('a delayed progress read cannot replay another account’s pending chapters or clear its session', async () => {
    const read = deferred(); const requests = []; let fail = true;
    const h = harness((url, init) => {
        if (init.method === 'POST') { requests.push(init.headers.Authorization); return Promise.resolve(fail ? json({ message: 'offline' }, 503) : json(null)); }
        return read.promise;
    });
    try {
        await h.as('A');
        await assert.rejects(h.api.saveReadingProgress('A', book, 0, 500, 100));
        const stale = h.api.getReadingProgressForBook('A', 'book');
        await h.as('B'); fail = false;
        read.resolve(json({ message: 'expired old session' }, 401));
        assert.equal(await stale, null);
        assert.equal(h.storage.get('wordweft_jwt'), 'token-B');
        assert.deepEqual(requests, ['Bearer token-A']);
        await assert.rejects(h.api.saveReadingProgress('A', book, 0, 0, 3), /account changed/);
    } finally { h.dispose(); }
});

for (const all of [false, true]) test(`a stale ${all ? 'library' : 'book'} read cannot restore completion after Restart`, async () => {
    const read = deferred(); const writes = [];
    const h = harness((url, init) => {
        if (init.method === 'POST') { writes.push(JSON.parse(init.body).chapterData.progress); return Promise.resolve(json(null)); }
        if (init.method === 'DELETE') return Promise.resolve(json(null));
        return read.promise;
    });
    try {
        await h.as('A');
        const stale = all ? h.api.getAllReadingProgress('A') : h.api.getReadingProgressForBook('A', 'book');
        await h.api.clearReadingProgress('A', 'book');
        read.resolve(json(all ? { book: oldProgress } : oldProgress));
        await stale;
        await h.api.saveReadingProgress('A', book, 0, 0, 3);
        assert.deepEqual(writes, [3]);
    } finally { h.dispose(); }
});

test('a read that started before a successful save cannot erase the just-completed chapter', async () => {
    const read = deferred();
    const h = harness((url, init) => init.method === 'POST' ? Promise.resolve(json(null)) : read.promise);
    try {
        await h.as('A');
        const stale = h.api.getReadingProgressForBook('A', 'book');
        await h.api.saveReadingProgress('A', book, 0, 500, 100);
        read.resolve(json(null));
        assert.equal((await stale).chapters.one.progress, 100);
    } finally { h.dispose(); }
});

test('retrying in a later chapter saves every earlier pending chapter before reporting success', async () => {
    let fail = true; const writes = [];
    const saved = { ...oldProgress, chapters: {} };
    const h = harness((url, init) => {
        if (init.method === 'POST') {
            const chapter = JSON.parse(init.body).chapterData;
            writes.push(chapter.id);
            if (fail) return Promise.resolve(json({ message: 'offline' }, 503));
            saved.chapters[chapter.id] = { progress: chapter.progress, scrollPosition: chapter.scroll };
            return Promise.resolve(json(null));
        }
        return Promise.resolve(json(saved));
    });
    try {
        await h.as('A');
        await assert.rejects(h.api.saveReadingProgress('A', book, 0, 500, 100));
        fail = false;
        await h.api.saveReadingProgress('A', book, 1, 200, 50);
        assert.deepEqual(writes, ['one', 'one', 'two']);
        assert.equal(h.storage.get('ww_reading_pending_v1:A:book'), undefined);
        const progress = await h.api.getReadingProgressForBook('A', 'book');
        assert.equal(h.events.at(-1).detail.progress.pendingSync, false);
        assert.equal(h.events.at(-1).detail.progress.syncError, false);
        assert.equal(progress.chapters.one.progress, 100);
        assert.equal(progress.chapters.two.progress, 50);
    } finally { h.dispose(); }
});

test('overlapping later-chapter saves retain the failure of the earlier in-flight chapter', async () => {
    const firstWrite = deferred();
    const firstStarted = deferred();
    const writes = [];
    const h = harness((url, init) => {
        if (init.method === 'POST') {
            const chapter = JSON.parse(init.body).chapterData;
            writes.push(`${chapter.id}:${chapter.progress}`);
            if (chapter.id === 'one') {
                firstStarted.resolve();
                return firstWrite.promise;
            }
            return Promise.resolve(json(null));
        }
        return Promise.resolve(json(null));
    });
    try {
        await h.as('A');
        const first = h.api.saveReadingProgress('A', book, 0, 500, 100);
        await firstStarted.promise;
        const second = h.api.saveReadingProgress('A', book, 1, 100, 20);
        const third = h.api.saveReadingProgress('A', book, 1, 200, 40);
        const settled = Promise.allSettled([first, second, third]);
        firstWrite.resolve(json({ message: 'offline' }, 503));
        const results = await settled;
        // Promise.all rejects before the later queued acknowledgements finish.
        await new Promise(setImmediate);
        assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected', 'rejected']);
        assert.deepEqual(writes, ['one:100', 'two:20', 'two:40']);
        assert.equal(h.events.at(-1).detail.progress.syncError, true);
        assert.equal(JSON.parse(h.storage.get('ww_reading_pending_v1:A:book')).snapshots[0].chapterId, 'one');
    } finally { h.dispose(); }
});
