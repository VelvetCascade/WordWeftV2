import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const evidence = process.env.WORDWEFT_E2E_EVIDENCE_DIR || 'test-results/evidence/discovery';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  });
  await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

for (const width of [390, 1440]) {
  test(`available catalog filters, mobile Apply, and compact first choice at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const ranked = await (await page.request.get('/api/books/genres/ranked')).json();
    await page.goto('/category');
    await expect(page.locator('.ww-book-card').first()).toBeVisible();
    for (const text of await page.locator('.ww-library-quick-genres button').allTextContents()) expect(ranked.some((g: any) => text.includes(g.name) && g.bookCount > 0)).toBe(true);
    const first = await page.locator('.ww-book-card').first().boundingBox(); expect(first!.y).toBeLessThan(450);
    await page.screenshot({ path: `${evidence}/catalog-${width}.png`, fullPage: false });
    if (width < 760) {
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Filters', exact: true });
      await dialog.getByLabel('Search genres').fill('Fantasy');
      await dialog.getByRole('button', { name: 'Fantasy', exact: true }).click();
      const apply = dialog.getByRole('button', { name: 'Apply Filters' });
      expect((await apply.boundingBox())!.y + (await apply.boundingBox())!.height).toBeLessThan(845);
      expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
      await page.screenshot({ path: `${evidence}/catalog-filter-mobile.png`, fullPage: false });
      await apply.click();
      await expect(page.locator('.ww-catalog-summary')).toContainText('Fantasy');
      await page.getByRole('button', { name: 'Remove Fantasy filter' }).click();
      await expect(page.locator('.ww-catalog-summary')).toContainText('All genres');
    } else {
      await page.getByLabel('Search genres').fill('fant');
      await page.getByRole('radio', { name: /^Fantasy/ }).check();
      await expect(page.locator('.ww-catalog-summary')).toContainText('Fantasy');
      expect(await page.getByRole('button', { name: 'Genre', exact: true }).count()).toBe(0);
    }
  });
}

test('mobile opening and actions fit the first viewport, and taste Save remains reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hooks');
  await expect(page.locator('.hook-feed-excerpt')).toBeVisible();
  const button = page.getByRole('button', { name: 'Open story', exact: true });
  expect((await page.locator('.hook-feed-excerpt').boundingBox())!.width).toBeGreaterThan(300);
  const box = await button.boundingBox(); expect(box!.y + box!.height).toBeLessThan(780);
  await page.screenshot({ path: `${evidence}/hooks-mobile.png`, fullPage: false });
  await page.getByRole('button', { name: 'Tune my feed' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search genres').fill('Myst');
  await dialog.getByRole('button', { name: 'Mystery', exact: true }).click();
  const save = dialog.getByRole('button', { name: 'Use these genres' });
  expect((await save.boundingBox())!.y + (await save.boundingBox())!.height).toBeLessThan(844);
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([]);
  await page.screenshot({ path: `${evidence}/taste-mobile.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tune my feed' })).toBeFocused();
  await page.locator('.wv-hook-card').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/book\//);
});

test('mobile search preserves input, supports keyboard submit, full results return, and recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/category');
  await page.getByRole('button', { name: 'Search WordWeft' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search WordWeft' });
  const input = dialog.getByLabel('Search stories and people');
  await input.fill('Spring');
  await expect(dialog.locator('.search-overlay-item').first()).toBeVisible();
  await page.screenshot({ path: `${evidence}/search-overlay-mobile.png`, fullPage: false });
  expect(await dialog.getByText('ESC', { exact: true }).count()).toBe(0);
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Close search' }).click();
  await page.getByRole('button', { name: 'Search WordWeft' }).click();
  await expect(input).toHaveValue('Spring');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=Spring/);
  await page.getByRole('button', { name: /^Books/ }).click();
  await expect(page.locator('.search-book-card')).not.toHaveCount(0);
  await page.getByLabel('Search books and users').fill('unsent text');
  await page.locator('.search-book-card').first().click();
  await expect(page).toHaveURL(/\/book\//);
  await page.goBack();
  await expect(page.getByLabel('Search books and users')).toHaveValue('unsent text');
  await expect(page.getByRole('button', { name: /^Books/ })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/search?q=fantazy');
  await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();
  await expect(page.locator('.ww-search-recovery').getByRole('link', { name: /Fantasy/ })).toBeVisible();
  await page.screenshot({ path: `${evidence}/search-recovery-mobile.png`, fullPage: false });
});

test('desktop discovery overlays and short mobile sheets keep their controls accessible', async ({ page }) => {
  await page.goto('/category');
  await page.getByRole('button', { name: 'Search WordWeft' }).click();
  let dialog = page.getByRole('dialog', { name: 'Search WordWeft' });
  await dialog.getByLabel('Search stories and people').fill('Spring');
  await expect(dialog.locator('.search-overlay-item').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: `${evidence}/search-overlay-desktop.png` });
  await page.keyboard.press('Escape');
  await page.goto('/hooks');
  await expect(page.locator('.hook-feed-excerpt')).toBeVisible();
  await page.screenshot({ path: `${evidence}/hooks-desktop.png` });
  await page.getByRole('button', { name: 'Tune my feed' }).click();
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 500 });
  await page.getByRole('button', { name: 'Tune my feed' }).click();
  const taste = page.getByRole('dialog');
  await taste.getByLabel('Search genres').fill('Mystery');
  await taste.getByRole('button', { name: 'Mystery', exact: true }).click();
  const save = await taste.getByRole('button', { name: 'Use these genres' }).boundingBox(); expect(save!.y + save!.height).toBeLessThan(501);
  await page.keyboard.press('Escape');
  await page.goto('/category');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const apply = await page.getByRole('button', { name: 'Apply Filters' }).boundingBox(); expect(apply!.y + apply!.height).toBeLessThan(501);
});
