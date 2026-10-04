import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const chapterPath = '/book/local-story-spring/chapter/local-story-spring-chapter-1';
const evidence = 'test-results/evidence/interaction-polish';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('theme', 'light');
    });
    await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

for (const width of [390, 1440]) {
    test(`navigation and sorting retain focus, geometry and scroll at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/category');
        await expect(page.locator('.ww-book-card').first()).toBeVisible();
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
        const trigger = page.getByRole('button', { name: 'More navigation', exact: true });
        const brandBefore = await page.locator('.v2-brand').boundingBox();
        const paddingBefore = await page.evaluate(() => document.body.style.paddingRight);
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Explore WordWeft' });
        await expect(dialog).toBeVisible();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
        expect((await page.locator('.v2-brand').boundingBox())!.x).toBe(brandBefore!.x);
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect(dialog).toBeHidden();
        await expect(page.locator('.v2-menu-scrim')).toHaveCount(0);
        expect(await page.evaluate(() => document.body.style.paddingRight)).toBe(paddingBefore);
        await page.goto('/');
        const sort = page.locator('.v2-shelf button[aria-haspopup="menu"]');
        await expect(sort).toBeVisible();
        await sort.focus(); await page.keyboard.press('ArrowDown');
        const menu = page.getByRole('menu');
        await expect(menu.locator('[aria-checked="true"]')).toBeFocused();
        await page.keyboard.press('End');
        await expect(menu.getByRole('menuitemradio').last()).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(sort).toBeFocused();
        await expect(menu).toBeHidden();
        await sort.press('ArrowDown'); await page.keyboard.press('Escape');
        await expect(sort).toBeFocused();
        await page.goto('/category');
        await expect(page.locator('.ww-book-card').first()).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 280));
        const storyLink = page.locator('.ww-book-card .ww-book-cover-wrap > a').first();
        // Capture the position at activation, after any browser/automation scroll
        // needed to reveal the link, rather than before that deliberate scroll.
        await storyLink.evaluate(link => link.addEventListener('click', () => sessionStorage.setItem('polish-leaving-scroll', String(window.scrollY)), { once: true, capture: true }));
        await storyLink.click();
        const before = await page.evaluate(() => Number(sessionStorage.getItem('polish-leaving-scroll')));
        await expect(page.locator('.ww-story-actions-v2')).toBeVisible();
        await page.goBack();
        await expect(page.locator('.ww-book-card').first()).toBeVisible();
        await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(12);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: `${evidence}/catalog-${width}.png` });
    });

    test(`search keeps suggestions stable and ignores late responses at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        let betaRequested = false;
        await page.route('**/api/search/autocomplete?*', async route => {
            const q = new URL(route.request().url()).searchParams.get('q')!;
            if (q === 'Beta') { betaRequested = true; await held; }
            await route.fulfill({ json: { books: [{ id: 'local-story-spring', title: `${q} story`, coverUrl: '/design-v2/assets/met-53681.jpg', author: { id: 'local-writer', name: 'Local writer' }, rating: 4 }], authors: [] } });
        });
        await page.goto('/category');
        await page.getByRole('button', { name: 'Search WordWeft' }).click();
        const dialog = page.getByRole('dialog', { name: 'Search WordWeft' });
        const input = dialog.getByLabel('Search stories and people');
        await expect(input).toBeFocused();
        await input.fill('Alpha');
        const alpha = dialog.getByRole('button', { name: /Alpha story/ });
        await expect(alpha).toBeEnabled();
        const height = (await dialog.locator('.search-overlay-container').boundingBox())!.height;
        await input.fill('Beta');
        await expect(alpha).toBeVisible(); await expect(alpha).toBeDisabled();
        expect((await dialog.locator('.search-overlay-container').boundingBox())!.height).toBe(height);
        await expect.poll(() => betaRequested).toBeTruthy();
        await input.fill('Gamma');
        await expect(dialog.getByRole('button', { name: /Gamma story/ })).toBeEnabled();
        release();
        await expect(dialog.getByRole('button', { name: /Beta story/ })).toHaveCount(0);
        await expect(input).toHaveValue('Gamma');
        await expect(dialog).toHaveCSS('opacity', '1');
        expect((await new AxeBuilder({ page }).include('.search-overlay-container').analyze()).violations).toEqual([]);
        await page.screenshot({ path: `${evidence}/search-${width}.png` });
        await input.press('Enter');
        await expect(page).toHaveURL(/\/search\?q=Gamma/);
        await expect(dialog).toBeHidden();
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });

    test(`reader panels and pending comment submissions stay usable at ${width}`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 844 });
        const login = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password: 'WordWeftLocal123!' } });
        expect(login.ok()).toBeTruthy();
        const { token } = await login.json();
        await page.addInitScript(token => localStorage.setItem('wordweft_jwt', token), token);
        await page.goto(chapterPath);
        await expect(page.locator('.reader-copy')).toBeVisible();
        const appearance = page.locator('.reader-header-actions button[aria-label="Reading appearance and themes"]');
        await appearance.click();
        const preferences = page.getByRole('dialog', { name: 'Reading preferences' });
        await expect(preferences).toBeVisible();
        await preferences.getByRole('button', { name: 'Sepia', exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(appearance).toBeFocused();
        await expect(preferences).toBeHidden();
        await expect(page.locator('.reader-experience')).toHaveClass(/reader-theme-sepia/);
        const contents = page.getByRole('button', { name: 'Open contents', exact: true });
        await contents.click(); await expect(page.locator('.reader-toc-panel')).toBeVisible();
        await page.keyboard.press('Escape'); await expect(contents).toBeFocused();
        let submissions = 0;
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/books/*/chapters/*/comments', async route => {
            if (route.request().method() !== 'POST') return route.continue();
            submissions++; await held;
            await route.fulfill({ status: 503, json: { message: 'Temporary local test failure' } });
        });
        const discussions = page.getByRole('button', { name: 'Open chapter discussion', exact: true });
        await discussions.click();
        const drawer = page.locator('.reader-thread-panel');
        await drawer.getByLabel('Your comment').fill('Keep this thought if the connection fails.');
        await drawer.getByRole('button', { name: 'Post Comment', exact: true }).click();
        await expect(drawer.getByRole('button', { name: 'Posting...' })).toBeDisabled();
        await expect.poll(() => submissions).toBe(1);
        await drawer.locator('form').dispatchEvent('submit');
        expect(submissions).toBe(1);
        release();
        await expect(drawer.getByRole('alert')).toBeVisible();
        await expect(drawer.getByLabel('Your comment')).toHaveValue('Keep this thought if the connection fails.');
        await page.screenshot({ path: `${evidence}/reader-discussion-${width}.png` });
        await drawer.getByRole('button', { name: 'Close discussion' }).click();
        await expect(discussions).toBeFocused();
        await expect(drawer).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });
}

test('reduced motion and pending chapter content use stationary, accessible surfaces', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/books/*/chapters/*/content', async route => { await held; await route.continue(); });
    await page.goto(chapterPath);
    const placeholder = page.getByRole('status', { name: 'Loading chapter' });
    await expect(placeholder).toBeVisible();
    await expect(placeholder.locator('[aria-hidden="true"]')).toHaveCSS('animation-name', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    release(); await expect(page.locator('.reader-copy')).toBeVisible();
    await page.locator('.reader-header-actions button[aria-label="Reading appearance and themes"]').click();
    const dialog = page.getByRole('dialog', { name: 'Reading preferences' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('xpath=..')).toHaveCSS('animation-name', 'none');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.v2-load-state[role="alert"]')).toHaveCount(0);
});
