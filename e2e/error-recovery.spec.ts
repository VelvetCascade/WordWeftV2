import { test, expect } from './fixtures';

const harness = '/tests/fixtures/errorBoundaryHarness.tsx';
test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.v2-feature-story').first()).toBeVisible();
});

test('a render failure retries only the screen and preserves the document', async ({ page }) => {
    await page.evaluate(async path => (await import(/* @vite-ignore */ path)).mountBoundary(), harness);
    const boundary = page.locator('#boundary-test');
    await expect(boundary.getByRole('alert')).toBeVisible();
    await page.evaluate(async path => (await import(/* @vite-ignore */ path)).resolveFailure(), harness);
    const documentId = await page.evaluate(() => { (window as any).retryDocument = 'same-document'; return 'same-document'; });
    await boundary.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(boundary.getByRole('heading', { name: 'Recovered screen' })).toBeVisible();
    expect(await page.evaluate(() => (window as any).retryDocument)).toBe(documentId);
});

test('an error clears when only the destination query changes', async ({ page }) => {
    await page.evaluate(async path => (await import(/* @vite-ignore */ path)).mountBoundary(), harness);
    const boundary = page.locator('#boundary-test');
    await expect(boundary.getByRole('alert')).toBeVisible();
    await page.evaluate(async path => (await import(/* @vite-ignore */ path)).resolveFailure('/category?sort=most_read'), harness);
    await expect(boundary.getByRole('heading', { name: 'Recovered screen' })).toBeVisible();
});

test('error details identify the exception without exposing query credentials', async ({ page }) => {
    await page.evaluate(async path => (await import(/* @vite-ignore */ path)).mountBoundary(
        'Loading screen at https://www.wordweftstudio.com/reset-password?token=secret-reset-value#secret-fragment failed for private@example.test'), harness);
    const boundary = page.locator('#boundary-test');
    await boundary.getByText('Error details', { exact: true }).click();
    const details = await boundary.locator('pre').innerText();
    expect(details).toContain('Loading screen');
    expect(details).toContain('build');
    expect(details).toContain('/category');
    expect(details).not.toContain('secret-reset-value');
    expect(details).not.toContain('secret-fragment');
    expect(details).not.toContain('private@example.test');
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Unavailable')) } }));
    await boundary.getByRole('button', { name: 'Copy error details', exact: true }).click();
    await expect(boundary.getByRole('status')).toContainText('Select the details');
});

test('manual reload cannot bypass a live unsaved-work navigation lock', async ({ page }) => {
    await page.evaluate(async path => {
        const module = await import(/* @vite-ignore */ path);
        module.holdNavigation();
        module.mountBoundary();
        (window as any).reloadProbe = 'same-document';
        addEventListener('wordweft:navigation-blocked', event => { (window as any).blockedMessage = (event as CustomEvent).detail; });
    }, harness);
    await page.locator('#boundary-test').getByRole('button', { name: 'Reload page', exact: true }).click();
    expect(await page.evaluate(() => (window as any).reloadProbe)).toBe('same-document');
    expect(await page.evaluate(() => (window as any).blockedMessage)).toContain('Save your changes');
});
