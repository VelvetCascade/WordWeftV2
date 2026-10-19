import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
for (const width of [390, 1440]) test(`unresolved visible ad preserves footer and scroll ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        (window as any).auditShifts = [];
        new PerformanceObserver(list => (window as any).auditShifts.push(...list.getEntries().map((entry: any) => ({ value: entry.value, hadRecentInput: entry.hadRecentInput })))).observe({ type: 'layout-shift', buffered: true });
    });
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path.includes('/search')) return route.fulfill({ json: { books: { items: [], totalElements: 0, totalPages: 0 }, authors: { items: [], totalElements: 0, totalPages: 0 } } });
        return route.fulfill({ json: [] });
    });
    await page.goto('/search?q=spring');
    const ad = page.locator('.ww-ad-unit'); await expect(ad).toBeVisible(); await ad.scrollIntoViewIfNeeded();
    const footerLink = page.locator('footer a').first(); await footerLink.focus();
    const measure = () => page.evaluate(() => ({ height: document.querySelector('.ww-ad-unit')!.getBoundingClientRect().height, footerY: document.querySelector('footer')!.getBoundingClientRect().top, scrollY: window.scrollY, focusedHref: document.activeElement?.getAttribute('href'), shifts: (window as any).auditShifts }));
    const before = await measure();
    const directory = process.env.AUDIT_EVIDENCE_DIR, phase = process.env.AUDIT_PHASE || 'after';
    if (directory) { mkdirSync(directory, { recursive: true }); await page.screenshot({ path: `${directory}/${phase}-pending-${width}.png` }); }
    await page.waitForTimeout(7500);
    const after = await measure();
    if (directory) { await page.screenshot({ path: `${directory}/${phase}-timeout-${width}.png` }); writeFileSync(`${directory}/${phase}-${width}.json`, JSON.stringify({ before, after }, null, 2)); }
    await expect(footerLink).toBeFocused();
    expect(after.height).toBe(before.height); expect(after.footerY).toBeCloseTo(before.footerY, 0); expect(after.scrollY).toBe(before.scrollY);
    await ad.locator('ins').evaluate(node => node.setAttribute('data-ad-status', 'filled'));
    await expect(ad).toHaveAttribute('data-load-state', 'filled');
    expect((await measure()).height).toBe(before.height);
    await expect(footerLink).toBeFocused();
});

test('unfilled and late filled ads only change geometry below the viewport', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); });
    await page.goto('/privacy');
    const ad = page.locator('.ww-ad-unit').first();
    await expect(ad).toBeAttached();
    expect((await ad.boundingBox())!.y).toBeGreaterThan(1000);
    await ad.locator('ins').evaluate(node => node.setAttribute('data-ad-status', 'unfilled'));
    await expect(ad).toHaveAttribute('data-collapsed', 'true');
    await ad.locator('ins').evaluate(node => node.setAttribute('data-ad-status', 'filled'));
    await expect(ad).toHaveAttribute('data-collapsed', 'false');
    await ad.scrollIntoViewIfNeeded();
    const filled = await ad.boundingBox();
    await page.waitForTimeout(7500);
    expect((await ad.boundingBox())!.height).toBe(filled!.height);
    await ad.locator('ins').evaluate(node => node.setAttribute('data-ad-status', 'unfilled'));
    await expect(ad).toHaveAttribute('data-load-state', 'empty');
    expect((await ad.boundingBox())!.height).toBe(filled!.height);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(ad).toHaveAttribute('data-collapsed', 'true');
});

test('blocked script collapses below viewport promptly and back navigation stays healthy', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); });
    await page.route('**/adsbygoogle.js?*', route => route.abort());
    await page.goto('/privacy');
    const ad = page.locator('.ww-ad-unit').first();
    await expect(ad).toHaveAttribute('data-load-state', 'empty');
    await expect(ad).toHaveAttribute('data-collapsed', 'true');
    await page.goto('/contact');
    await page.goBack();
    await expect(page.locator('.ww-ad-unit').first()).toHaveAttribute('data-load-state', 'empty');
    await expect(page.locator('.ww-ad-unit').first()).toHaveAttribute('data-collapsed', 'true');
});
