import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
});

for (const body of ['', '<html>Temporary upstream failure</html>']) {
    test(`a ${body ? 'non-JSON' : 'missing'} genre response cannot crash the home screen`, async ({ page }) => {
        let requests = 0;
        await page.route('**/api/books/genres/ranked', route => ++requests === 1
            ? route.fulfill({ status: 200, contentType: 'text/html', body })
            : route.fulfill({ json: [{ name: 'Fantasy', bookCount: 3, readCount: 10 }] }));
        const genreResponse = page.waitForResponse('**/api/books/genres/ranked');
        await page.goto('/');
        await genreResponse;
        await expect(page.locator('.v2-feature-story').first()).toBeVisible();
        await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
        await page.locator('.v2-feature-story').first().evaluate(element => element.setAttribute('data-retry-probe', 'retained'));
        await page.getByRole('button', { name: 'Retry genres', exact: true }).click();
        await expect(page.locator('.v2-genre-tile')).toHaveCount(1);
        await expect(page.locator('.v2-feature-story').first()).toHaveAttribute('data-retry-probe', 'retained');
        expect(requests).toBe(2);
    });
}

test('a failed page import does not permanently poison repeat navigation', async ({ page }) => {
    let failed = false;
    await page.route('**/pages/CategoryPage.tsx', route => {
        if (!failed) { failed = true; return route.abort('failed'); }
        return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
    await page.locator('.v2-nav-primary a[href="/category"]').click();
    await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible({ timeout: 12000 });
    await page.locator('.v2-brand').click();
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
    await page.locator('.v2-nav-primary a[href="/category"]').click();
    await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
});

test('a failed review request retries within the story without replacing it', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/books/local-story-spring/reviews', route => ++requests === 1
        ? route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Temporary upstream failure</html>' })
        : route.fulfill({ json: [] }));
    await page.goto('/book/local-story-spring');
    await expect(page.locator('.ww-story-v2')).toBeVisible();
    await page.locator('.ww-story-v2').evaluate(element => element.setAttribute('data-retry-probe', 'retained'));
    await page.getByRole('button', { name: 'Reviews', exact: true }).click();
    await page.getByRole('button', { name: 'Retry reviews', exact: true }).click();
    await expect.poll(() => requests).toBe(2);
    await expect(page.getByRole('button', { name: 'Retry reviews', exact: true })).toBeHidden();
    await expect(page.locator('.ww-story-v2')).toHaveAttribute('data-retry-probe', 'retained');
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
});
