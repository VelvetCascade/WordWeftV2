import { test, expect } from './fixtures';
import { mkdirSync } from 'node:fs';

for (const [width, height, reducedMotion] of [[390, 844, false], [740, 360, false], [1440, 1000, false], [740, 360, true]] as const) {
    for (const surface of ['preferences', 'contents', 'passages', 'share', 'comments', 'focus']) test(`coaching yields to ${surface} ${width}px reduced=${reducedMotion}`, async ({ page }) => {
        test.setTimeout(45000);
        page.setDefaultTimeout(15000);
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
        await page.addInitScript(() => {
            localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
            localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
            localStorage.setItem('ww_reader_coach_session', '0');
            localStorage.setItem('ww_reader_coach_dismissed', '[]');
        });
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
            if (path === '/api/books/coach-story') return route.fulfill({ json: { id: 'coach-story', title: 'Quiet reading', genres: ['Fantasy'], tags: [], author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, coverUrl: '/favicon.svg', chapters: [{ id: 'chapter', title: 'An ordinary chapter', status: 'published', wordCount: 500 }], readingStatus: 'Ongoing' } });
            if (path.endsWith('/content')) return route.fulfill({ json: { bookId: 'coach-story', chapterId: 'chapter', chapterIndex: 0, content: '<p>A quiet chapter for reading preferences and passage tools.</p>'.repeat(20), access: 'FULL', obfuscated: false, fullWordCount: 500, visibleWordCount: 500 } });
            return route.fulfill({ json: [] });
        });
        const tip = page.locator('.reader-coach-nudge');
            await page.goto('/book/coach-story/chapter/chapter', { waitUntil: 'domcontentloaded' });
            await expect(page.locator('.reader-copy')).toBeVisible();
            if (surface === 'preferences') await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
            if (surface === 'contents') await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
            if (surface === 'passages' || surface === 'share') {
                if (width <= 740) {
                    if (width === 740) await page.setViewportSize({ width: 720, height });
                    await page.getByRole('button', { name: 'More reader actions', exact: true }).click();
                    await page.getByRole('dialog', { name: 'Reader actions', exact: true }).getByRole('button', { name: surface === 'passages' ? 'Passages & find' : 'Share chapter', exact: true }).click();
                    if (width === 740) await page.setViewportSize({ width, height });
                } else await page.locator('.reader-header-actions').getByRole('button', { name: surface === 'passages' ? 'Open saved passages and find in chapter' : 'Share chapter', exact: true }).click();
            }
            if (surface === 'comments') await page.getByRole('button', { name: 'Open chapter discussion', exact: true }).click();
            if (surface === 'focus') {
                await expect(tip).toBeVisible({ timeout: 6000 });
                await expect(tip).toBeVisible();
                await page.keyboard.press('f');
                await expect(page.getByRole('button', { name: /Exit focus/ })).toBeVisible();
            }
            // Wait beyond the scheduled first tip while the surface owns attention.
            await page.waitForTimeout(3500);
            if (process.env.AUDIT_EVIDENCE_DIR && (surface === 'preferences' || surface === 'focus') && !reducedMotion) {
                mkdirSync(process.env.AUDIT_EVIDENCE_DIR, { recursive: true });
                await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${surface}-${width}.png` });
            }
            await expect(tip).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Dismiss tip', includeHidden: true })).toHaveCount(0);
            await page.keyboard.press('Escape');
            await expect(tip).toBeVisible({ timeout: 6000 });
            await expect(tip).toBeVisible();
            expect(await page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('1');
            const dismissedId = (await tip.innerText()).includes('Choose light') ? 'theme-switcher' : 'font-size';
            await page.getByRole('button', { name: 'Dismiss tip', exact: true }).focus();
            await page.keyboard.press('Enter');
            await expect(tip).toHaveCount(0);
            expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ww_reader_coach_dismissed') || '[]'))).toContain(dismissedId);
            if (surface === 'preferences') {
                await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
                await page.keyboard.press('Escape');
                await page.waitForTimeout(3500);
                await expect(tip).toHaveCount(0);
            }
    });
}
