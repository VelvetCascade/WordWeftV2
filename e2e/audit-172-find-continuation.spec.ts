import { test, expect } from './fixtures';
import { mkdirSync } from 'node:fs';
test.setTimeout(120_000);
for (const width of [390, 1440]) test(`find reaches every passage beyond its initial window at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const paragraphs = Array.from({ length: 205 }, (_, i) => `<p>Common passage ${i + 1}${i < 54 ? ' fiftyfour' : ''}${i < 51 ? ' fiftyone' : ''}${i < 50 ? ' fiftytoken' : ''}${i < 49 ? ' fortynine' : ''}${i === 0 ? ' unique' : ''}.</p>`).join('');
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('ww_reader_coach_session', '4'); });
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/books/find-story') return route.fulfill({ json: { id: 'find-story', title: 'A long chapter', genres: ['Fantasy'], tags: [], author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, coverUrl: '/favicon.svg', chapters: [{ id: 'chapter', title: 'Many passages', status: 'published', wordCount: 2050 }], readingStatus: 'Ongoing' } });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: 'find-story', chapterId: 'chapter', chapterIndex: 0, content: paragraphs, access: 'FULL', obfuscated: false, fullWordCount: 2050, visibleWordCount: 2050 } });
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/find-story/chapter/chapter'); await expect(page.locator('.reader-copy')).toBeVisible();
    const open = async () => { if (width < 721) { await page.getByRole('button', { name: 'More reader actions', exact: true }).click(); await page.getByRole('dialog', { name: 'Reader actions' }).getByRole('button', { name: 'Passages & find', exact: true }).click(); } else await page.locator('.reader-header-actions').getByRole('button', { name: 'Open saved passages and find in chapter', exact: true }).click(); };
    await open();
    const dialog = page.getByRole('dialog', { name: 'Passages & find', exact: true }); const input = dialog.getByLabel('Find in this chapter');
    await input.fill('fiftyfour'); await expect(dialog.getByRole('status')).toContainText('54 passages match');
    await expect(dialog.locator('.reader-find-results > button')).toHaveCount(50);
    if (process.env.AUDIT_EVIDENCE_DIR) { mkdirSync(process.env.AUDIT_EVIDENCE_DIR, { recursive: true }); await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${width}.png` }); }
    const more = dialog.locator('.reader-find-more'); await expect(more).toBeVisible();
    await more.focus(); await page.keyboard.press('Enter');
    await expect(dialog.locator('.reader-find-results > button')).toHaveCount(54); await expect(more).toBeFocused(); await expect(input).toHaveValue('fiftyfour');
    await expect(dialog.getByRole('status')).toContainText('Showing 54 of 54');
    await dialog.locator('.reader-find-results > button').last().scrollIntoViewIfNeeded();
    if (process.env.AUDIT_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/expanded-${width}.png` });
    await dialog.locator('.reader-find-results > button').last().focus(); await page.keyboard.press('Enter');
    await expect(dialog).not.toBeVisible(); await expect(page.locator('#paragraph-53')).toBeFocused(); await expect(page).toHaveURL(/\/book\/find-story\/chapter\/chapter$/);
    await open();
    for (const [query, count] of [['missing', 0], ['unique', 1], ['fortynine', 49], ['fiftytoken', 50], ['fiftyone', 51], ['common', 205]] as const) {
        await input.fill(query);
        await expect(dialog.locator('.reader-find-results > button')).toHaveCount(Math.min(50, count));
        while (await dialog.locator('.reader-find-results > button').count() < count) { await dialog.getByRole('button', { name: /Show .*more matches/ }).click(); }
        await expect(dialog.locator('.reader-find-results > button')).toHaveCount(count);
    }
    await input.fill('fiftyfour'); await expect(dialog.locator('.reader-find-results > button')).toHaveCount(50);
    await input.fill(''); await expect(dialog.locator('.reader-find-results')).toHaveCount(0);
});
