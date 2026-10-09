import { test, expect } from './fixtures';

// Functional guards for arrival motion: pagination never delays access, existing
// items stay still, closing sheets are inert, and reduced motion is stationary.
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('theme', 'light');
    });
    await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

for (const width of [390, 1440]) {
    test(`appended story cards preserve existing geometry and activate immediately at ${width}`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 844 });
        const response = await request.get('/api/books?size=1');
        expect(response.ok()).toBeTruthy();
        const original = (await response.json()).content[0];
        const books = Array.from({ length: 22 }, (_, index) => ({ ...original, id: index === 21 ? original.id : `motion-${index}`, title: `Motion story ${index}` }));
        await page.route('**/api/books?*', route => {
            const next = Number(new URL(route.request().url()).searchParams.get('page') || 0) > 0;
            return route.fulfill({ json: { content: next ? books.slice(20) : books.slice(0, 20), hasMore: !next, totalElements: 22 } });
        });
        await page.goto('/category');
        const cards = page.locator('.ww-book-card:not(.ww-skeleton-card)');
        await expect(cards).toHaveCount(20);
        await expect.poll(() => cards.first().evaluate(el => el.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
        const before = await cards.first().evaluate(el => {
            (window as any).__motionFirstCard = el;
            return { width: (el as HTMLElement).offsetWidth, top: (el as HTMLElement).offsetTop };
        });
        await page.getByRole('button', { name: 'Load more stories', exact: true }).scrollIntoViewIfNeeded();
        await expect(cards).toHaveCount(22);
        expect(await cards.first().evaluate(el => ({ same: el === (window as any).__motionFirstCard, active: el.getAnimations().length, width: (el as HTMLElement).offsetWidth, top: (el as HTMLElement).offsetTop }))).toEqual({ same: true, active: 0, ...before });
        expect(await cards.last().evaluate(el => parseFloat(getComputedStyle(el).animationDelay))).toBeLessThanOrEqual(.18);
        const link = cards.last().getByRole('link', { name: /Read about/ });
        await link.focus();
        await expect(cards.last()).toHaveCSS('opacity', '1');
        await expect(cards.last()).toHaveCSS('transform', 'none');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`/book/${original.id}$`));
        await expect(page.locator('.ww-story-actions-v2')).toBeVisible();
        await page.goBack();
        await expect(cards).toHaveCount(22);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    });

    test(`notification dismissal releases focus and makes the fading sheet inert at ${width}`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 844 });
        const login = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password: 'WordWeftLocal123!' } });
        expect(login.ok()).toBeTruthy();
        await page.addInitScript(token => localStorage.setItem('wordweft_jwt', token), (await login.json()).token);
        await page.goto('/category');
        const trigger = page.getByRole('button', { name: 'Notifications', exact: true });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Notification preview' });
        await expect(dialog).toBeVisible();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
        // Capture the first committed closing frame, before retention unmounts.
        await page.evaluate(() => {
            const scrim = document.querySelector('.v2-notifications-scrim')!;
            new MutationObserver(() => {
                if (scrim.getAttribute('data-state') === 'closed') (window as any).__motionExit = {
                    inert: scrim.hasAttribute('inert'), hidden: scrim.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(scrim).pointerEvents,
                };
            }).observe(scrim, { attributes: true });
        });
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect.poll(() => page.evaluate(() => (window as any).__motionExit)).toEqual({ inert: true, hidden: 'true', pointerEvents: 'none' });
        await expect(page.locator('.v2-notifications-scrim')).toHaveCount(0);
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await trigger.click();
        await dialog.getByRole('button', { name: 'View all notifications' }).click();
        await expect(page).toHaveURL(/\/notifications$/);
        await expect(page.locator('.v2-notifications-scrim')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    });
}

test('search pagination caps entrance delays and hover works after arrival', async ({ page }) => {
    const books = Array.from({ length: 13 }, (_, index) => ({ id: `motion-search-${index}`, title: `Motion result ${index}`, author: { id: 'local-writer', name: 'Local Writer' }, genres: ['Fantasy'], rating: 0, readingStatus: 'Ongoing' }));
    await page.route('**/api/search?*', route => {
        const next = Number(new URL(route.request().url()).searchParams.get('page') || 0) > 0;
        return route.fulfill({ json: { books: { items: next ? books.slice(12) : books.slice(0, 12), total: 13, page: next ? 1 : 0, totalPages: 2 } } });
    });
    await page.goto('/search?q=Motion');
    await page.getByRole('button', { name: /^Books/ }).click();
    const cards = page.locator('.search-book-card');
    await expect(cards).toHaveCount(12);
    await page.getByRole('button', { name: 'Load More Results', exact: true }).click();
    await expect(cards).toHaveCount(13);
    expect(await cards.last().evaluate(el => parseFloat(getComputedStyle(el).animationDelay))).toBeLessThanOrEqual(.18);
    await expect.poll(() => cards.first().evaluate(el => el.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    await cards.first().hover();
    // The established design keeps the card frame still and scales its cover.
    await expect(cards.first()).toHaveCSS('transform', 'none');
    await expect(cards.first().locator('.search-book-card-cover')).toHaveCSS('transform', 'matrix(1.05, 0, 0, 1.05, 0, 0)');
    await cards.first().focus();
    await expect(cards.first()).toHaveCSS('opacity', '1');
});

test('reduced motion keeps loaded collections and reader prose stationary', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/category', '/genre/Fantasy', '/author/local-writer', '/book/local-story-spring', '/community']) {
        await page.goto(path);
        const entries = page.locator('.ww-arrive,.ww-arrive-quiet');
        await expect(entries.first()).toBeVisible();
        expect(await entries.evaluateAll(els => els.every(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el).transform === 'none'))).toBeTruthy();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
    await expect(page.locator('.reader-copy')).toBeVisible();
    await expect(page.locator('.reader-copy')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.reader-copy')).toHaveCSS('transform', 'none');
});
