import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
test.use({ hasTouch: true });
const content = '<p>A compact reference for the journey.</p><table><thead><tr>' + ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map(word => `<th scope="col"><p>${word}</p></th>`).join('') + '</tr></thead><tbody><tr>' + ['North', 'South', 'East', 'West', 'Dawn', 'Dusk'].map(word => `<td><p>${word}</p></td>`).join('') + '</tr></tbody></table><p>The journey continues.</p>';
for (const width of [320, 390, 820, 1440]) test(`table passages stay compact and retain actions ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('ww_reader_coach_session', '4'); localStorage.setItem('wordweft_jwt', 'synthetic-reader-session'); localStorage.setItem('ww_reader_preferences', JSON.stringify({ contentTheme: 'sepia' })); });
    const comment = { id: 'comment-one', bookId: 'table-story', chapterId: 'chapter', paragraphIndex: 1, parentId: null, content: 'Existing thread for One.', createdAt: '2026-10-01T00:00:00Z', userId: 'reader', user: { id: 'reader', name: 'Fixture Reader', avatarUrl: '/favicon.svg' } };
    const bookmark = { id: 'saved-one', bookId: 'table-story', chapterId: 'chapter', paragraphIndex: 1, quote: 'One', note: 'Remember One.', updatedAt: '2026-10-01T00:00:00Z' };
    let savedIndex: number | undefined;
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: { id: 'reader', name: 'Fixture Reader', email: 'reader@example.test', avatarUrl: '/favicon.svg', hasSeenWritingDemo: true } });
        if (path === '/api/books/table-story') return route.fulfill({ json: { id: 'table-story', title: 'A table of places', genres: ['Fantasy'], tags: [], author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, coverUrl: '/favicon.svg', chapters: [{ id: 'chapter', title: 'The route', status: 'published', wordCount: 100, content }], readingStatus: 'Ongoing' } });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: 'table-story', chapterId: 'chapter', chapterIndex: 0, content, access: 'FULL', obfuscated: false, fullWordCount: 100, visibleWordCount: 100 } });
        if (path.endsWith('/comments')) return route.fulfill({ json: [comment] });
        if (path === '/api/reading/passages/table-story') return route.fulfill({ json: [bookmark] });
        if (path.startsWith('/api/reading/passages/table-story/chapter/')) { savedIndex = Number(path.split('/').at(-1)); return route.fulfill({ json: { ...bookmark, note: route.request().postDataJSON().note } }); }
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/table-story/chapter/chapter');
    const table = page.locator('.reader-copy table'); await expect(table).toBeVisible(); await table.scrollIntoViewIfNeeded();
    const evidence = process.env.AUDIT_EVIDENCE_DIR, phase = process.env.AUDIT_PHASE || 'after';
    const measure = () => page.evaluate(() => ({ headerHeight: document.querySelector('.reader-copy th')!.getBoundingClientRect().height, tableWidth: document.querySelector('.reader-copy table')!.getBoundingClientRect().width, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    if (evidence) { mkdirSync(evidence, { recursive: true }); await page.screenshot({ path: `${evidence}/${phase}-table-${width}.png` }); writeFileSync(`${evidence}/${phase}-${width}.json`, JSON.stringify(await measure(), null, 2)); }
    expect((await measure()).headerHeight).toBeLessThan(105);
    await expect(table.locator('summary')).toHaveCount(12);
    const first = table.locator('th').first();
    await expect(first.getByRole('button', { name: /Save passage/ })).toBeHidden();
    for (const theme of ['Paper', 'Night', 'Sepia']) {
        await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
        await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
        const geometry = await measure(); expect(geometry.documentWidth).toBeLessThanOrEqual(width); expect(geometry.headerHeight).toBeLessThan(105);
    }
    // Touch can open and close a cell without hover; its targets retain 44px.
    const last = table.locator('td').last();
    await last.locator('summary').tap();
    await expect(last.getByRole('button', { name: /Save passage 13/ })).toBeVisible();
    expect(await last.getByRole('button', { name: /Save passage 13/ }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await last.locator('summary').tap();
    await expect(last.getByRole('button', { name: /Save passage 13/ })).toBeHidden();
    await first.scrollIntoViewIfNeeded();
    const disclosure = first.locator('summary'); await disclosure.focus(); await page.keyboard.press('Enter');
    await expect(first.getByRole('button', { name: /Save passage 2/ })).toBeVisible();
    if (evidence) await page.screenshot({ path: `${evidence}/after-actions-${width}.png` });
    await first.getByRole('button', { name: /Save passage 2/ }).click();
    const tools = page.getByRole('dialog', { name: 'Passages & find', exact: true });
    await expect(tools.getByRole('heading', { name: 'Keep passage 2' })).toBeVisible(); await expect(tools.getByLabel('Private note (optional)')).toHaveValue('Remember One.');
    await tools.getByLabel('Private note (optional)').fill('A new note for One.'); await tools.getByRole('button', { name: 'Update saved passage' }).click();
    await expect(tools.getByRole('status').filter({ hasText: 'Saved online' })).toBeVisible(); expect(savedIndex).toBe(1);
    await page.keyboard.press('Escape');
    await first.getByRole('button', { name: 'Open 1 paragraph comments' }).click();
    await expect(page.getByRole('dialog').getByText('Existing thread for One.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Passage 2', exact: true })).toBeVisible();
});
