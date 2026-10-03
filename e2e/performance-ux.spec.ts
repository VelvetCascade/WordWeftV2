import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  });
});

for (const width of [1366, 1440, 390]) {
  test(`catalog toolbar stays above the first row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/category');
    await expect(page.locator('.ww-book-card').first()).toBeVisible();
    const toolbar = await page.locator('.ww-library-filter').boundingBox();
    const firstBook = await page.locator('.ww-book-card').first().boundingBox();
    expect(toolbar).not.toBeNull();
    expect(firstBook).not.toBeNull();
    expect(firstBook!.y - (toolbar!.y + toolbar!.height)).toBeGreaterThanOrEqual(24);
  });
}

test('mobile navigation accepts one tap while destinations are loading', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  for (let round = 0; round < 3; round++) {
    for (const path of ['/category', '/', '/community', '/']) {
      await page.locator(path === '/' ? '.v2-brand' : `.v2-bottom-nav a[href="${path}"]`).tap();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path + '$'}`));
    }
  }
  await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

test('page-asset recovery reloads once and keeps the selected route', async ({ page }) => {
  let documents = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.goto('/category');
  await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
  const failAsset = () => page.evaluate(() => {
    dispatchEvent(Object.assign(new Event('vite:preloadError', { cancelable: true }), {
      payload: new TypeError('Failed to fetch dynamically imported module: /assets/obsolete-page.js'),
    }));
  });
  await failAsset();
  await expect.poll(() => documents).toBe(2);
  await expect(page).toHaveURL(/\/category$/);
  await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
  await failAsset();
  await expect(page.locator('.ww-book-card').first()).toBeVisible();
  expect(documents).toBe(2);
});
