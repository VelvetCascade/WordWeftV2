import { test, expect } from './fixtures';

test('character linking recognizes aliases without rewriting the author’s words', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
        const path = '/utils/autoLinker.ts';
        const { analyzeMentions } = await import(path);
        const original = '<p>Lyra met The Fox. The Fox spoke to Lyra.</p><pre>The Fox</pre><p><span data-type="mention" data-id="lyra">Lyra</span> listened.</p>';
        const result = analyzeMentions(original, [{ id: 'lyra', name: 'Lyra', aliases: ['The Fox'] }]);
        const doc = new DOMParser().parseFromString(result.newHtml, 'text/html');
        return { count: result.count, text: doc.body.textContent, labels: Array.from(doc.querySelectorAll('span[data-label]')).map(item => item.getAttribute('data-label')), original: new DOMParser().parseFromString(original, 'text/html').body.textContent };
    });
    expect(result.count).toBe(4);
    expect(result.text).toBe(result.original);
    expect(result.labels).toEqual(['Lyra', 'The Fox', 'The Fox', 'Lyra']);
});

for (const width of [390, 1440]) test(`writer preview and sidebar are keyboard accessible at ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Writer workflow ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, description: 'Disposable local test.', ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy();
    const book = (await created.json()).writtenBooks.find((item: any) => item.title === title);
    const chapter = crypto.randomUUID();
    try {
        expect((await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'A quiet letter', content: '<p>One paragraph.</p><p>Another paragraph.</p>' }, status: 'preserve', expectedRevision: 0 } })).ok()).toBeTruthy();
        await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
        await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
        await expect(page.locator('.rte-content')).toBeVisible();
        if (width > 980) {
            const details = page.getByRole('tab', { name: 'Details', exact: true });
            await details.focus(); await page.keyboard.press('ArrowRight');
            const notes = page.getByRole('tab', { name: 'Notes', exact: true });
            await expect(notes).toBeFocused(); await expect(notes).toHaveAttribute('aria-selected', 'true');
            await page.keyboard.press('ArrowLeft'); await expect(details).toBeFocused();
        }
        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
        await expect(preview).toBeVisible();
        const canvas = preview.getByRole('region', { name: 'Chapter preview', exact: true });
        await expect(canvas).toHaveAttribute('tabindex', '0');
        await canvas.focus(); await expect(canvas).toBeFocused();
        await page.keyboard.press('Escape'); await expect(preview).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    } finally { await request.delete(`/api/books/${book.id}`, { headers }); }
});

test('named checkpoints restore a working draft without withdrawing readers’ chapters or schedules', async ({ page, request }) => {
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const call = async (path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') => {
        const response = await request.fetch(`/api${path}`, { method, headers, ...(data === undefined ? {} : { data }) });
        expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
        return response.json();
    };
    const title = `Checkpoint journey ${crypto.randomUUID()}`;
    const user = await call('/books', { title, description: '', ageRating: 'ALL_AGES' });
    const book = user.writtenBooks.find((item: any) => item.title === title);
    const first = crypto.randomUUID(); const second = crypto.randomUUID();
    try {
        await call(`/books/${book.id}/chapters/${first}`, { data: { title: 'The first letter', content: '<p>Original ending.</p><p>The door closed.</p>' }, status: 'preserve', expectedRevision: 0 }, 'PATCH');
        await call(`/books/${book.id}/chapters/${second}`, { data: { title: 'The second letter', content: '<p>The following morning.</p>' }, status: 'preserve', expectedRevision: 0 }, 'PATCH');
        const session = await call(`/books/${book.id}/chapters/${first}/edit-session`);
        await call(`/books/${book.id}/chapters/${first}/revisions`, { label: 'Before revising the ending', expectedRevision: session.editRevision });
        await call(`/books/${book.id}/chapters/${first}`, { data: { title: 'The first letter', content: '<p>Released ending.</p><p>The door stayed open.</p>' }, status: 'preserve', expectedRevision: session.editRevision }, 'PATCH');
        const impact = await call(`/books/${book.id}/chapters/${first}/publication-impact`);
        await call(`/books/${book.id}/chapters/${first}/publish-reviewed`, { reviewToken: impact.reviewToken });
        await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
        await page.goto(`/write/book/${book.id}/chapter/${second}/edit`);
        await expect(page.locator('.rte-content')).toBeVisible();
        await page.getByRole('button', { name: 'Schedule chapter', exact: true }).click();
        const schedule = page.getByRole('dialog', { name: 'Schedule The second letter', exact: true });
        await expect(schedule.getByRole('region', { name: 'Scheduled release summary' })).toBeVisible();
        await expect(schedule).toContainText('Later private chapters stay private.');
        await expect(schedule.getByRole('button', { name: 'Schedule chapter', exact: true })).toBeDisabled();
        const date = new Date(Date.now() + 86400_000); const pad = (value: number) => String(value).padStart(2, '0');
        await schedule.getByLabel('Release date and time').fill(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
        await schedule.getByRole('checkbox', { name: /I approve this release/ }).check();
        await schedule.getByRole('button', { name: 'Schedule chapter', exact: true }).click();
        await expect(schedule).toBeHidden();
        const scheduled = await call(`/books/${book.id}/chapters/${second}/edit-session`);
        expect(scheduled.status).toBe('scheduled');
        await page.goto(`/write/book/${book.id}/chapter/${first}/edit`);
        await expect(page.locator('.rte-content')).toContainText('Released ending.');
        await page.getByRole('button', { name: 'View revisions', exact: true }).click();
        const history = page.getByRole('dialog', { name: 'Version history', exact: true });
        await history.getByLabel('Name a checkpoint').fill('Reviewed opening');
        await history.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
        await expect(history.getByRole('status')).toContainText('Checkpoint saved.');
        const revision = history.locator('article').filter({ hasText: 'Before revising the ending' });
        await revision.getByRole('button', { name: 'Compare and restore', exact: true }).click();
        await expect(history.getByRole('region', { name: 'Selected version manuscript', exact: true })).toContainText('Original ending.');
        await expect(history.getByRole('region', { name: 'Current draft manuscript', exact: true })).toContainText('Released ending.');
        await history.getByRole('button', { name: 'Restore working draft', exact: true }).click();
        const confirmation = page.getByRole('alertdialog', { name: 'Restore this working draft?', exact: true });
        await expect(confirmation).toContainText('release schedules stay unchanged');
        await confirmation.getByRole('button', { name: 'Restore working draft', exact: true }).click();
        await expect(history).toBeHidden();
        await expect(page.locator('.rte-content')).toContainText('Original ending.');
        const restored = await call(`/books/${book.id}/chapters/${first}/edit-session`);
        expect(restored.status).toBe('published'); expect(restored.content).toContain('Original ending.');
        const stillScheduled = await call(`/books/${book.id}/chapters/${second}/edit-session`);
        expect(stillScheduled.status).toBe('scheduled'); expect(stillScheduled.scheduledAt).toBe(scheduled.scheduledAt);
        const live = await request.get(`/api/books/${book.id}/chapters/${first}/content`);
        expect(live.ok()).toBeTruthy(); expect((await live.json()).content).toContain('Released ending.');
    } finally { await request.delete(`/api/books/${book.id}`, { headers }); }
});
