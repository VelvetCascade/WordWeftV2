import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const width of [390, 1440]) test(`saved passage recovery clears only its own error ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('ww_reader_coach_session', '4'); localStorage.setItem('wordweft_jwt', 'synthetic-reader-session');
    });
    const content = '<p>A passage with a private note in progress.</p><p>A saved line from the story.</p>';
    const bookmark = { id: 'saved-line', bookId: 'recovery-story', chapterId: 'chapter', paragraphIndex: 1, quote: 'A saved line from the story.', note: 'A previously saved note.', updatedAt: '2026-10-01T00:00:00Z' };
    let listFails = true, mutationFails = true, holdList = false;
    let releaseList: (() => void) | undefined;
    const requests: { method: string; status: number }[] = [];
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname, method = route.request().method();
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: { id: 'reader', name: 'Fixture Reader', email: 'reader@example.test', avatarUrl: '/favicon.svg', hasSeenWritingDemo: true } });
        if (path === '/api/books/recovery-story') return route.fulfill({ json: { id: 'recovery-story', title: 'A reader’s notebook', genres: ['Fantasy'], tags: [], author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, coverUrl: '/favicon.svg', chapters: [{ id: 'chapter', title: 'The return', status: 'published', wordCount: 100, content }], readingStatus: 'Ongoing' } });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: 'recovery-story', chapterId: 'chapter', chapterIndex: 0, content, access: 'FULL', obfuscated: false, fullWordCount: 100, visibleWordCount: 100 } });
        if (path === '/api/reading/passages/recovery-story') {
            requests.push({ method, status: listFails ? 503 : 200 });
            if (holdList) await new Promise<void>(resolve => { releaseList = resolve; });
            return listFails ? route.fulfill({ status: 503, json: { message: 'Controlled list outage' } }) : route.fulfill({ json: [bookmark] });
        }
        if (path.startsWith('/api/reading/passages/')) {
            requests.push({ method, status: mutationFails ? 503 : 200 });
            return mutationFails ? route.fulfill({ status: 503, json: { message: 'Controlled mutation outage' } }) : route.fulfill({ json: { ...bookmark, id: 'new-note', paragraphIndex: 0, note: route.request().postDataJSON()?.note } });
        }
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/recovery-story/chapter/chapter');
    await page.locator('.reader-copy .reader-passage-bookmark').first().click();
    const panel = page.getByRole('dialog', { name: 'Passages & find', exact: true });
    const loadAlert = panel.getByRole('alert').filter({ hasText: 'Saved passages could not be loaded.' });
    const draft = panel.getByLabel('Private note (optional)');
    await expect(loadAlert).toBeVisible();
    await draft.fill('My unsaved note survives recovery.');
    listFails = false;
    await panel.getByRole('button', { name: 'Reload saved passages', exact: true }).click();
    await expect(panel.locator('.reader-saved-passage')).toContainText('A previously saved note.');
    await expect(panel.getByText('Loading your private passages…', { exact: true })).toBeHidden();
    const evidence = process.env.AUDIT_EVIDENCE_DIR, phase = process.env.AUDIT_PHASE || 'after';
    if (evidence) {
        mkdirSync(evidence, { recursive: true });
        await page.screenshot({ path: `${evidence}/${phase}-recovered-${width}.png` });
        writeFileSync(`${evidence}/${phase}-${width}.json`, JSON.stringify({ requests, savedRows: await panel.locator('.reader-saved-passage').count(), staleLoadAlerts: await loadAlert.count(), draft: await draft.inputValue() }, null, 2));
    }
    await expect(loadAlert).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Reload saved passages', exact: true })).toHaveCount(0);
    await expect(panel.getByRole('status').filter({ hasText: 'Saved passages loaded.' })).toBeVisible();
    await expect(draft).toHaveValue('My unsaved note survives recovery.');
    const reopen = async () => {
        await panel.getByRole('button', { name: 'Close passage tools', exact: true }).click();
        await page.locator('.reader-copy .reader-passage-bookmark').first().click();
        await expect(draft).toHaveValue('My unsaved note survives recovery.');
    };
    await reopen();
    await expect.poll(() => requests.filter(item => item.method === 'GET').length).toBe(3);
    await expect(loadAlert).toHaveCount(0);
    listFails = true;
    await reopen(); await expect(loadAlert).toBeVisible();
    await expect(panel.locator('.reader-saved-passage')).toContainText('A previously saved note.');
    await panel.getByRole('button', { name: 'Save passage online', exact: true }).click();
    const saveAlert = panel.getByRole('alert').filter({ hasText: 'This passage could not be saved.' });
    await expect(saveAlert).toBeVisible();
    listFails = false; holdList = true;
    await panel.getByRole('button', { name: 'Reload saved passages', exact: true }).click();
    await expect(panel.getByText('Loading your private passages…', { exact: true })).toBeVisible();
    await expect(panel.locator('.reader-saved-passage')).toContainText('A previously saved note.');
    await expect(draft).toHaveValue('My unsaved note survives recovery.');
    await expect.poll(() => Boolean(releaseList)).toBe(true);
    releaseList!(); holdList = false;
    await expect(loadAlert).toHaveCount(0); await expect(saveAlert).toBeVisible();
    await expect(draft).toHaveValue('My unsaved note survives recovery.');
    await panel.getByRole('button', { name: 'Remove saved passage 2', exact: true }).click();
    const removeAlert = panel.getByRole('alert').filter({ hasText: 'The passage could not be removed.' });
    await expect(removeAlert).toBeVisible(); await reopen();
    await expect(panel.getByText('Loading your private passages…', { exact: true })).toBeHidden();
    await expect(removeAlert).toBeVisible(); await expect(loadAlert).toHaveCount(0);
    mutationFails = false;
    await panel.getByRole('button', { name: 'Save passage online', exact: true }).click();
    await expect(panel.getByRole('status').filter({ hasText: 'Saved online' })).toBeVisible();
    await expect(removeAlert).toHaveCount(0);
    if (evidence) writeFileSync(`${evidence}/after-lifecycle-${width}.json`, JSON.stringify({ requests, finalAlerts: await panel.getByRole('alert').count(), draft: await draft.inputValue(), savedRows: await panel.locator('.reader-saved-passage').count() }, null, 2));
});
