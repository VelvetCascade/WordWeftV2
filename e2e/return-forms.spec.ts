import { test, expect } from './fixtures';

test.beforeEach(async ({ page, context }, info) => {
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.29.17.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 180 + 10}` });
    await page.addInitScript(() => {
        if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
});

test('a phone feedback draft survives visiting its privacy explanation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/feedback');
    await page.getByRole('textbox', { name: 'What could work better', exact: true }).fill('Keep my thought while I read the privacy explanation.');
    await page.getByRole('checkbox', { name: 'Allow us to contact you for clarification' }).check();
    await page.locator('.wv-feedback-form input[type=email]').fill('followup@example.test');
    await page.getByRole('link', { name: 'Read our Privacy Policy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Privacy/);
    await page.getByRole('button', { name: 'Back to your feedback', exact: true }).click();
    await expect(page).toHaveURL(/\/feedback$/);
    await expect(page.getByRole('textbox', { name: 'What could work better', exact: true })).toHaveValue('Keep my thought while I read the privacy explanation.');
    await expect(page.getByRole('checkbox', { name: 'Allow us to contact you for clarification' })).toBeChecked();
    await expect(page.locator('.wv-feedback-form input[type=email]')).toHaveValue('followup@example.test');
});

test('signing in from help returns to the message task and its draft survives a policy visit', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact');
    await page.getByRole('link', { name: 'Sign in or register' }).click();
    await page.getByLabel('Email Address', { exact: true }).fill('reader@example.test');
    await page.getByLabel('Password', { exact: true }).fill('WordWeftLocal123!');
    await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.getByLabel(/What is this about/).selectOption('general');
    await page.getByLabel(/^Subject/).fill('A question I am still composing');
    await page.getByLabel(/^Your message/).fill('Please preserve this message while I check the policy.');
    await page.locator('.wv-help-policies').getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Privacy/);
    await page.getByRole('button', { name: 'Back to help', exact: true }).click();
    await expect(page.getByLabel(/^Subject/)).toHaveValue('A question I am still composing');
    await expect(page.getByLabel(/^Your message/)).toHaveValue('Please preserve this message while I check the policy.');
    await expect(page.getByLabel(/What is this about/)).toHaveValue('general');
});

test('a reset page without its email token explains the missing link before asking for a password', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: 'Request a password reset link' })).toBeVisible();
    await expect(page.locator('input[type=password]')).toHaveCount(0);
    await page.getByRole('link', { name: 'Go to sign in' }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
});

for (const width of [1920, 390]) test(`returning from an author discussion restores their Activity tab at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/author/local-writer');
    await page.getByRole('button', { name: 'Activity', exact: true }).click();
    await page.getByRole('link', { name: 'Does this opening promise enough?', exact: true }).click();
    await expect(page.locator('.community-detail-layout')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/author\/local-writer$/);
    await expect(page.getByRole('heading', { name: 'Community posts', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Does this opening promise enough?', exact: true })).toBeVisible();
});
