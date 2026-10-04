import { test, expect } from './fixtures';

test('unavailable announcement storage leaves the signed-in application usable', async ({ page, request }) => {
    const response = await request.post('/api/auth/login', {
        data: { email: 'reader@example.test', password: 'WordWeftLocal123!' },
    });
    expect(response.ok()).toBeTruthy();
    const { token } = await response.json();
    await page.addInitScript(token => {
        localStorage.setItem('wordweft_jwt', token);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
            if (key === 'hasSeenWhatsNewPopup_v1') throw new DOMException('Unavailable', 'SecurityError');
            return original.call(this, key);
        };
    }, token);
    await page.goto('/category');
    await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
    await expect(page.locator('.v2-brand')).toBeVisible();
    await page.locator('.v2-brand').click();
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
});

test('an unavailable story offers an in-app route back to discovery', async ({ page }) => {
    await page.goto('/book/quality-missing-story');
    await expect(page.getByRole('heading', { name: 'This story is unavailable', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Browse stories', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
});
