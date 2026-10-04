import { test, expect } from './fixtures';

const evidence = 'test-results/evidence/structured-placeholders';
const closeBox = (before: { x: number; y: number; width: number; height: number }, after: { x: number; y: number; width: number; height: number }, keys: Array<'x' | 'y' | 'width' | 'height'> = ['x', 'y', 'width', 'height']) => {
    for (const key of keys) expect(Math.abs(before[key] - after[key]), `${key}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`).toBeLessThan(4);
};

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('theme', 'light');
    });
    await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

for (const width of [390, 1440]) {
    for (const view of ['grid', 'list'] as const) {
        test(`catalog ${view} placeholders match loaded cover geometry at ${width}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 1000 });
            let release!: () => void;
            const held = new Promise<void>(resolve => { release = resolve; });
            await page.route('**/api/books?*', async route => { await held; await route.continue(); });
            await page.goto('/category');
            const skeleton = page.getByRole('status', { name: 'Loading stories', exact: true });
            await expect(skeleton).toBeVisible();
            if (view === 'list') {
                await page.getByRole('button', { name: 'List view', exact: true }).click();
                await expect(skeleton.locator('.v2-story-list-item').first()).toHaveCSS('padding', '16px');
            }
            await page.evaluate(() => document.fonts.ready);
            const cover = skeleton.locator(view === 'grid' ? '.ww-book-cover-wrap' : '.ww-skeleton-list-cover').first();
            const box = (await cover.boundingBox())!;
            const columns = view === 'grid' ? await skeleton.locator('.ww-catalog-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns) : '';
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await page.screenshot({ path: `${evidence}/catalog-${view}-${width}.png` });
            release(); await expect(skeleton).toHaveCount(0);
            const actual = page.locator(view === 'grid' ? '.ww-book-card .ww-book-cover-wrap' : '.v2-story-list-item > img, .v2-story-list-item > .resilient-image-fallback').first();
            await expect(actual).toBeVisible();
            closeBox(box, (await actual.boundingBox())!);
            if (view === 'grid') expect(await page.locator('.ww-catalog-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns)).toBe(columns);
        });
    }

    test(`story placeholder follows the loaded header, art and columns at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/books/local-story-spring', async route => { await held; await route.continue(); });
        await page.goto('/book/local-story-spring');
        const skeleton = page.getByRole('status', { name: 'Loading story details' });
        await expect(skeleton).toBeVisible(); await page.evaluate(() => document.fonts.ready);
        const cover = (await skeleton.locator('.ww-story-art').boundingBox())!;
        const header = (await skeleton.locator('.ww-story-header-inner').boundingBox())!;
        const copy = (await skeleton.locator('.ww-story-copy-column').boundingBox())!;
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: `${evidence}/story-${width}.png` });
        release(); await expect(skeleton).toHaveCount(0);
        await expect(page.locator('.ww-story-actions-v2')).toBeVisible();
        closeBox(cover, (await page.locator('.ww-story-art').boundingBox())!);
        closeBox(header, (await page.locator('.ww-story-header-inner').boundingBox())!);
        closeBox(copy, (await page.locator('.ww-story-copy-column').boundingBox())!, ['x', 'y', 'width']);
    });

    test(`chapter skeleton uses reader chrome, paper and saved manuscript width at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(readerWidth => localStorage.setItem('ww_reader_preferences', JSON.stringify({ readerWidth, fontSize: 22, lineHeight: 2.05, contentTheme: 'sepia', readerFont: 'modern' })), width === 1440 ? 'wide' : 'narrow');
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/books/*/chapters/*/content', async route => { await held; await route.continue(); });
        await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
        const skeleton = page.getByRole('status', { name: 'Loading chapter' });
        await expect(skeleton).toBeVisible();
        await expect(skeleton.locator('h1')).toHaveText('The First Light');
        await page.evaluate(() => document.fonts.ready);
        const header = (await skeleton.locator('.reader-header').boundingBox())!;
        const manuscript = (await skeleton.locator('.reader-manuscript').boundingBox())!;
        const title = (await skeleton.locator('h1').boundingBox())!;
        const paper = await skeleton.evaluate(element => getComputedStyle(element).backgroundColor);
        await expect(skeleton.locator('.ww-skeleton-copy')).toHaveCSS('font-size', '22px');
        expect(await skeleton.locator('button:not(:disabled), a[href]').count()).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: `${evidence}/reader-${width}.png` });
        release(); await expect(skeleton).toHaveCount(0);
        await expect(page.locator('.reader-copy')).toBeVisible();
        closeBox(header, (await page.locator('.reader-header').boundingBox())!);
        closeBox(manuscript, (await page.locator('.reader-manuscript').boundingBox())!, ['x', 'width']);
        closeBox(title, (await page.locator('.reader-chapter-intro h1').boundingBox())!);
        expect(await page.locator('.reader-experience').evaluate(element => getComputedStyle(element).backgroundColor)).toBe(paper);
    });
}

for (const width of [390, 1440]) {
    test(`missing list artwork keeps the same cover frame at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.route('**/design-v2/**', route => route.fulfill({ status: 404 }));
        await page.goto('/category');
        await page.getByRole('button', { name: 'List view', exact: true }).click();
        const fallback = page.locator('.v2-story-list-item > .resilient-image-fallback').first();
        await expect(fallback).toBeVisible();
        await expect(fallback).toHaveCSS('width', width === 390 ? '70px' : '90px');
        await expect(fallback).toHaveCSS('height', width === 390 ? '100px' : '130px');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    });
}
