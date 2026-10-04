import { test, expect } from './fixtures';

test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.25.96.${info.testId.split('').reduce((sum, value) => sum + value.charCodeAt(0), 0) % 180 + 10}` });
  await page.addInitScript(() => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  });
  await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

test('opening a workshop and returning preserves the community format filter', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/community');
  await page.getByRole('combobox', { name: 'Filter by post format' }).selectOption('WORKSHOP');
  await page.getByRole('link', { name: 'Does this opening promise enough?', exact: true }).click();
  await expect(page.locator('.community-detail-layout')).toBeVisible();
  await expect(page.getByText('The conversation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Back to community|Back$/, exact: false }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole('combobox', { name: 'Filter by post format' })).toHaveValue('WORKSHOP');
  await expect(page.locator('.community-feed .community-post')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Does this opening promise enough?', exact: true })).toBeVisible();
});

test('a narrow mobile circle retains its selected format after visiting a discussion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/community/circle/general');
  await page.getByRole('combobox', { name: 'Filter by post format' }).selectOption('POLL');
  await page.getByRole('link', { name: 'Where should the next story take us?', exact: true }).click();
  await expect(page.locator('.community-detail-layout')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/community\/circle\/general$/);
  await expect(page.getByRole('combobox', { name: 'Explore a circle' })).toHaveValue('general');
  await expect(page.getByRole('combobox', { name: 'Filter by post format' })).toHaveValue('POLL');
  await expect(page.getByRole('link', { name: 'Where should the next story take us?', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'The garden gate is open', exact: true })).toHaveCount(0);
});
