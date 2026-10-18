import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
const longTitle = 'AnUnusuallyLongChapterTitleThatMustRemainReadableAcrossAllTheControlsAndMenus世界 🌙'.repeat(2);
async function capture(page: import('@playwright/test').Page, name: string) {
    if (process.env.AUDIT_EVIDENCE_DIR) { mkdirSync(process.env.AUDIT_EVIDENCE_DIR, { recursive: true }); await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${name}.png` }); }
}
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('ww_reader_coach_session', '4'); });
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/books/header-story') return route.fulfill({ json: { id: 'header-story', title: 'A story with a lengthy title', author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], readingStatus: 'Ongoing', chapters: [{ id: 'chapter', title: longTitle, status: 'published', wordCount: 25 }] } });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: 'header-story', chapterId: 'chapter', chapterIndex: 0, content: '<p>A short readable passage.</p>', access: 'FULL', obfuscated: false, fullWordCount: 25, visibleWordCount: 25 } });
        return route.fulfill({ json: [] });
    });
});

test('long chapter context fits beside toolbar actions at intermediate and desktop widths', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 600 }); await page.goto('/book/header-story/chapter/chapter');
    await expect(page.locator('.reader-copy')).toBeVisible();
    for (const width of [390, 1440, 820]) { await page.setViewportSize({ width, height: width === 390 ? 844 : 600 }); await capture(page, String(width)); }
    for (const width of [820, 720, 744, 768, 912, 980, 1024, 1440]) {
        await page.setViewportSize({ width, height: 600 });
        for (const title of [longTitle, 'Short title', '長い章の名前'.repeat(25), 'عنوان الفصل الطويل '.repeat(15)]) {
            await page.locator('.reader-header-chapter strong').evaluate((el, value) => { el.textContent = value; }, title);
            const bounds = await page.locator('.reader-header').evaluate(header => {
                const context = header.querySelector<HTMLElement>('.reader-header-chapter')!;
                const title = header.querySelector<HTMLElement>('.reader-header-chapter strong')!;
                const actions = header.querySelector<HTMLElement>('.reader-header-actions')!;
                const t = title.getBoundingClientRect(), a = actions.getBoundingClientRect();
                return { visible: getComputedStyle(context).display !== 'none', titleRight: t.right, actionsLeft: a.left, overflow: document.documentElement.scrollWidth - innerWidth };
            });
            if (process.env.AUDIT_EVIDENCE_DIR && width === 820 && title === longTitle) writeFileSync(`${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-820-bounds.json`, JSON.stringify(bounds, null, 2));
            if (bounds.visible) expect(bounds.titleRight, `title/action collision at ${width}px`).toBeLessThanOrEqual(bounds.actionsLeft);
            expect(bounds.overflow).toBe(0);
        }
    }
    await expect(page.locator('.reader-chapter-intro h1')).toHaveText(longTitle);
    await expect(page.locator('.reader-header-chapter strong')).toHaveAttribute('title', longTitle);
});

for (const touch of [false, true]) test.describe(`${touch ? 'touch' : 'keyboard'} sharing`, () => {
    test.use({ hasTouch: touch });
    test('744px header exposes sharing', async ({ page }) => {
    await page.setViewportSize({ width: 744, height: 600 }); await page.goto('/book/header-story/chapter/chapter'); await expect(page.locator('.reader-copy')).toBeVisible();
    await capture(page, `744-${touch ? 'touch' : 'keyboard'}`);
    const more = page.getByRole('button', { name: 'More reader actions', exact: true });
    await expect(more).toBeVisible();
    if (touch) await more.tap(); else { await more.focus(); await page.keyboard.press('Enter'); }
    const actions = page.getByRole('dialog', { name: 'Reader actions', exact: true }); await expect(actions).toBeVisible();
    const share = actions.getByRole('button', { name: 'Share chapter', exact: true });
    if (touch) await share.tap(); else { await share.focus(); await page.keyboard.press('Enter'); }
    await expect(page.locator('.ww-share-dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('.ww-share-dialog')).not.toBeVisible();
    await more.click();
    await actions.getByRole('button', { name: 'Focus mode', exact: true }).click();
    await expect(page.locator('.reader-experience')).toHaveClass(/reader-focus-mode/);
    await page.getByRole('button', { name: /Exit focus/ }).click();
    await expect(page.locator('.reader-experience')).not.toHaveClass(/reader-focus-mode/);
    await page.getByRole('button', { name: 'Back to A story with a lengthy title', exact: true }).click();
    await expect(page).toHaveURL(/\/book\/header-story$/);
});
});
