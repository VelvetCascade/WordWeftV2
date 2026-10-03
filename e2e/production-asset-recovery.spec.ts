import { test, expect } from './fixtures';

test.skip(process.env.E2E_PRODUCTION_PREVIEW !== 'true', 'Run separately against the built app with E2E_PRODUCTION_PREVIEW=true.');

test('an interrupted production route chunk recovers once at the selected destination', async ({ page }) => {
    let documents = 0, failures = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    await page.route(/\/assets\/CategoryPage-[^/]+\.js(?:\?.*)?$/, route => {
        if (!failures++) return route.fulfill({ status: 503, contentType: 'text/javascript', body: 'Temporarily unavailable' });
        return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
    await page.locator('.v2-nav-primary a[href="/category"]').click();
    await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/category$/);
    expect(documents).toBe(2);
    await expect(page.locator('.ww-book-card').first()).toBeVisible();
});

test('persistent production asset failures cannot reload repeatedly and leave useful diagnostics', async ({ page }) => {
    let documents = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    await page.route(/\/assets\/CategoryPage-[^/]+\.js(?:\?.*)?$/, route => route.abort('failed'));
    await page.goto('/');
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
    await page.locator('.v2-nav-primary a[href="/category"]').click();
    await expect(page.getByRole('button', { name: 'Reload screen', exact: true })).toBeVisible();
    expect(documents).toBe(2);
    await page.getByText('Error details', { exact: true }).click();
    await expect(page.locator('.ww-error-details pre')).toContainText(/Failed to fetch dynamically imported module|Importing a module script failed/);
    await expect(page.locator('.ww-error-details pre')).toContainText('build');
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('wordweft:recent-page-errors') || '[]').length)).toBeGreaterThan(0);
    expect(documents).toBe(2);
});

test('an interrupted shared page dependency also recovers on the same destination', async ({ page }) => {
    let documents = 0, failures = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    await page.route(/\/assets\/CharacterList-[^/]+\.js(?:\?.*)?$/, route => {
        if (!failures++) return route.fulfill({ status: 503, contentType: 'text/javascript', body: 'Temporarily unavailable' });
        return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
    await page.locator('.v2-feature-story').first().locator('.v2-feature-cover').click();
    await expect(page.getByRole('heading', { name: 'The Last Spring in Bellweather', exact: true, level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/book\/local-story-spring$/);
    expect(documents).toBe(2);
    await expect(page.locator('.ww-story-v2')).toBeVisible();
});
