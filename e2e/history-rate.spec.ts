import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    const calls: number[] = [];
    const metrics = { writes: 0, rejected: 0 };
    Object.assign(window, { historyRateMetrics: metrics });
    for (const method of ['replaceState', 'pushState'] as const) {
      const native = history[method].bind(history);
      history[method] = (...args) => {
        const now = performance.now();
        while (calls.length && calls[0] < now - 10_000) calls.shift();
        if (calls.length >= 100) {
          metrics.rejected++;
          throw new DOMException('Attempt to use history.replaceState() more than 100 times per 10 seconds', 'SecurityError');
        }
        calls.push(now); metrics.writes++;
        native(...args);
      };
    }
  });
});

test('continuous scroll followed by catalogue controls stays below the WebKit history limit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/category');
  await expect(page.locator('.ww-book-card').first()).toBeVisible();
  await page.evaluate(async () => {
    for (let frame = 0; frame < 180; frame++) {
      window.scrollTo(0, frame % 2 ? 600 : 300);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
  });
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.locator('.v2-story-list-item').first()).toBeVisible();
  const metrics = await page.evaluate(() => (window as any).historyRateMetrics);
  expect(metrics.rejected).toBe(0);
  expect(metrics.writes).toBeLessThan(35);
  expect(errors).toEqual([]);
  await expect(page.getByRole('button', { name: 'Reload screen', exact: true })).toHaveCount(0);
});

test('rapid catalogue typing keeps its latest query and exact place after a story return', async ({ page }) => {
  await page.goto('/category');
  await expect(page.locator('.ww-book-card').first()).toBeVisible();
  const query = 'river '.repeat(25);
  const input = page.getByLabel('Search the library', { exact: true });
  await input.pressSequentially(query);
  await expect(input).toHaveValue(query);
  await page.evaluate(() => window.scrollTo(0, 450));
  const position = await page.evaluate(() => window.scrollY);
  await page.locator('.ww-book-card a').first().click();
  await expect(page.locator('.ww-story-v2')).toBeVisible();
  await page.goBack();
  await expect(input).toHaveValue(query);
  await expect.poll(() => page.evaluate(value => Math.abs(window.scrollY - value), position)).toBeLessThan(3);
  expect(await page.evaluate(() => (window as any).historyRateMetrics.rejected)).toBe(0);
});

test('native Back and Forward retain a catalogue query before its persistence timer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Read', exact: true }).click();
  await expect(page.locator('.ww-book-card').first()).toBeVisible();
  await page.getByLabel('Search the library', { exact: true }).fill('last choice before Back');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page.getByLabel('Search the library', { exact: true })).toHaveValue('last choice before Back');
  expect(await page.evaluate(() => (window as any).historyRateMetrics.rejected)).toBe(0);
});

test('rapid feedback typing retains its last text across native Back and Forward', async ({ page }) => {
  await page.goto('/category');
  await page.locator('footer a[href="/feedback"]').click();
  const thoughts = page.getByRole('textbox', { name: 'Your thoughts', exact: true });
  const draft = 'A small detail. '.repeat(10);
  await thoughts.pressSequentially(draft);
  await thoughts.fill(`${draft}Last unsent change`);
  await page.goBack();
  await expect(page).toHaveURL(/\/category$/);
  await page.goForward();
  await expect(thoughts).toHaveValue(`${draft}Last unsent change`);
  expect(await page.evaluate(() => (window as any).historyRateMetrics.rejected)).toBe(0);
});
