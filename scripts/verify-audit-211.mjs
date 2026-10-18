// Disposable local runtime only. Login credentials stay in the environment.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw Error('Use a disposable local runtime.');
const book = process.env.E2E_READER_BOOK || 'local-story-spring';
const chapter = process.env.E2E_READER_CHAPTER || 'local-story-spring-chapter-1';
const email = process.env.E2E_READER_EMAIL || 'reader@example.test';
const password = process.env.E2E_READER_PASSWORD || 'WordWeftLocal123!';
const login = await fetch(`${baseURL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
if (!login.ok) throw Error(`Fixture login: ${login.status}`);
const { token } = await login.json();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const collection = `${baseURL}/api/reading/passages/${book}`;
const path = `${collection}/${chapter}/0`;
async function get() { const r = await fetch(collection, { headers }); if (!r.ok) throw Error(`Read: ${r.status}`); return (await r.json()).find(x => x.chapterId === chapter && x.paragraphIndex === 0); }
async function put(note) { const r = await fetch(path, { method: 'PUT', headers, body: JSON.stringify({ note }) }); if (!r.ok) throw Error(`Save: ${r.status}`); return r.json(); }
const original = await get();
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox'] });
let lastOwn;
try {
    for (const width of [1440, 390]) {
        const own = `Issue 211 disposable hydration proof ${crypto.randomUUID()}`;
        lastOwn = own; await put(own);
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        try {
            await context.addInitScript(token => {
                localStorage.setItem('wordweft_jwt', token);
                localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
                localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
                localStorage.setItem('ww_reader_coach_session', '4');
            }, token);
            await context.route(url => url.pathname === `/api/reading/passages/${book}`, async route => { await gate; await route.continue(); });
            await context.route(/googlesyndication|doubleclick/, route => route.fulfill({ status: 200, body: '' }));
            const page = await context.newPage(); let writes = 0;
            page.on('request', request => { if (request.method() === 'PUT' && request.url().includes('/reading/passages/')) writes++; });
            await page.goto(`${baseURL}/book/${book}/chapter/${chapter}`, { waitUntil: 'domcontentloaded' });
            await page.locator('.reader-copy').waitFor();
            await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).click();
            await expect(page.getByText('Loading your private passages…')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Save passage online', exact: true })).toBeDisabled();
            expect(writes).toBe(0); expect((await get()).note).toBe(own);
            if (process.env.AUDIT_EVIDENCE_DIR) { await mkdir(process.env.AUDIT_EVIDENCE_DIR, { recursive: true }); await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/loading-${width}.png` }); }
            release();
            await expect(page.getByLabel('Private note (optional)', { exact: true })).toHaveValue(own);
            await page.getByRole('button', { name: 'Update saved passage', exact: true }).click();
            await expect(page.getByText('Saved online · Only you can see this passage and note.', { exact: true })).toBeVisible();
            expect((await get()).note).toBe(own); expect(writes).toBe(1);
            console.log(`${width}px: zero PUTs during hydration; loaded save preserves the existing server note.`);
        } finally { release(); await context.close(); }
    }
} finally {
    await browser.close();
    // Restore only our own last write, so an unrelated concurrent update survives cleanup.
    const current = await get();
    if (current?.note === lastOwn) {
        if (original) await put(original.note);
        else { const r = await fetch(`${baseURL}/api/reading/passages/${current.id}`, { method: 'DELETE', headers }); if (!r.ok) throw Error(`Cleanup: ${r.status}`); }
    }
}
