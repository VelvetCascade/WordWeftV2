import { test, expect } from './fixtures';
import { mkdirSync } from 'node:fs';
test.setTimeout(120_000);

const content = '<div data-mood="eerie"><table><thead><tr><th><p>Heading one</p></th><th><p>Heading two</p></th></tr></thead><tbody><tr><td><p>A readable cell</p></td><td><p>Another cell</p></td></tr></tbody></table><details><summary>Collapsible passage</summary><div data-details-content><p>The hidden passage stays readable.</p></div></details><blockquote><p>A remembered line with <strong>emphasis</strong>.</p></blockquote><p>A <a href="https://example.test">chapter link</a> and <code>inline code</code>.</p></div>';
const story = { id: 'appearance-story', title: 'Reading surfaces', genres: ['Fantasy'], author: { id: 'writer', name: 'Fixture Writer', avatarUrl: '/favicon.svg' }, chapters: [{ id: 'chapter', title: 'Reader appearance', status: 'published', wordCount: 70 }], tags: [], publicationStatus: 'published', readingStatus: 'Ongoing', coverUrl: '/favicon.svg', contentWarnings: [] };

for (const width of [390, 1440]) test(`rich blocks follow reader appearance independently at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('ww_reader_coach_session', '4');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('ww_reader_preferences', JSON.stringify({ contentTheme: 'dark', lampMode: 'off' }));
    });
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/books/appearance-story') return route.fulfill({ json: story });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: story.id, chapterId: 'chapter', chapterIndex: 0, content, access: 'FULL', obfuscated: false, fullWordCount: 70, visibleWordCount: 70 } });
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/appearance-story/chapter/chapter');
    const copy = page.locator('.reader-copy');
    await expect(copy.locator('table')).toBeVisible();
    await copy.locator('summary').click();
    await copy.locator('table').scrollIntoViewIfNeeded();
    if (process.env.AUDIT_EVIDENCE_DIR) {
        mkdirSync(process.env.AUDIT_EVIDENCE_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${width}.png` });
    }
    const cases = [false, true].flatMap(appDark => [
        ...['dark', 'light', 'sepia'].map(theme => ({ appDark, theme, lamp: 'Off', atmosphere: 'Full' })),
        ...['Reading position', 'Pointer'].flatMap(lamp => ['Full', 'Off'].map(atmosphere => ({ appDark, theme: 'dark', lamp, atmosphere }))),
    ]);
    for (const { appDark, theme, lamp, atmosphere } of cases) {
        await page.evaluate(appDark => document.documentElement.classList.toggle('dark', appDark), appDark);
        await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
        await page.locator('.reader-theme-options').getByRole('button', { name: { dark: 'Night', light: 'Paper', sepia: 'Sepia' }[theme], exact: true }).click();
        await page.getByRole('group', { name: 'Lamp Reading', exact: true }).getByRole('button', { name: lamp, exact: true }).click();
        await page.getByRole('group', { name: 'Atmosphere intensity', exact: true }).getByRole('button', { name: atmosphere, exact: true }).click();
        await page.getByRole('button', { name: 'Close preferences', exact: true }).click();
        // Put the fixture's mood section across the real detector's reading line.
        await copy.locator('[data-mood="eerie"]').evaluate(el => {
            const top = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, Math.max(0, top - Math.min(innerHeight * .32, 260) + 24));
        });
        await expect(page.locator('.ww-atmospheres')).toHaveAttribute('data-active-atmosphere', atmosphere === 'Off' ? 'none' : 'eerie');
        await page.waitForTimeout(350); // Let the existing reader color transition finish before measuring.
        // Measure the browser's effective composited surface, including transparent paragraphs.
        const contrast = await copy.locator('th p, td p, summary, details p, blockquote p, strong, a, code').evaluateAll(elements => {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d')!;
            const rgb = (s: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); const c = [...ctx.getImageData(0, 0, 1, 1).data]; return [c[0], c[1], c[2], c[3] / 255]; };
            const luminance = (c: number[]) => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
            return elements.map(el => {
                const chain = []; for (let node: Element | null = el; node; node = node.parentElement) chain.unshift(node);
                let bg = [255, 255, 255];
                for (const node of chain) { const c = rgb(getComputedStyle(node).backgroundColor); const a = c.length > 3 ? c[3] : 1; bg = bg.map((v, i) => c[i] * a + v * (1 - a)); }
                const fg = rgb(getComputedStyle(el).color); const l = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
                return { text: el.textContent, ratio: (l[0] + .05) / (l[1] + .05) };
            });
        });
        for (const row of contrast) expect(row.ratio, `${appDark ? 'app Dark' : 'app Light'} / ${theme} / ${lamp} / ${atmosphere}: ${row.text}`).toBeGreaterThanOrEqual(4.5);
        await copy.locator('summary').click();
        await expect(copy.locator('details')).not.toHaveAttribute('open');
        await copy.locator('summary').press('Enter');
        await expect(copy.locator('details')).toHaveAttribute('open');
    }
});
