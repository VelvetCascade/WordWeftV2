import { test, expect, type Page, type APIRequestContext } from './fixtures';

test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.25.95.${info.testId.split('').reduce((sum, value) => sum + value.charCodeAt(0), 0) % 180 + 10}` });
  await page.addInitScript(() => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  });
  // Reaction responses below are controlled: no shared fixture account is changed.
  await context.route('**/api/**', route => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) && !route.request().url().endsWith('/auth/login')) {
      return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'This read-only browser test blocked a data change.' }) });
    }
    return route.continue();
  });
  await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

async function fixture(page: Page, request: APIRequestContext, behavior: 'success' | 'already-liked' | 'retry' | 'committed-error' = 'success', omitFromFeed = false) {
  const response = await request.get('/api/discovery/hooks?genres=Romance&limit=20');
  expect(response.ok()).toBeTruthy();
  const hooks = (await response.json()).items;
  const original = hooks.find((hook: any) => hook.genres.includes('Romance'));
  const other = hooks.find((hook: any) => hook.bookId !== original?.bookId);
  expect(original).toBeTruthy(); expect(other).toBeTruthy();
  const rawBook = await (await request.get(`/api/books/${original.bookId}`)).json();
  let completed = behavior === 'already-liked';
  let calls = 0;
  const book = () => ({ ...rawBook, chapters: rawBook.chapters.map((chapter: any) => chapter.id === original.chapterId ? { ...chapter, isLiked: completed, likesCount: original.likesCount + (completed ? 1 : 0) } : chapter) });
  await page.route('**/api/discovery/hooks?*', route => {
    const url = new URL(route.request().url());
    const signedIn = !!route.request().headers().authorization;
    const items = signedIn && omitFromFeed ? [other] : url.searchParams.get('genres')?.includes('Romance') ? [{ ...original, liked: signedIn && completed }, other] : [other, { ...original, liked: signedIn && completed }];
    // Deliberately change the signed-in ranking so restoring the route alone fails.
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: signedIn ? [...items].reverse() : items, tasteGenres: [], personalized: true }) });
  });
  await page.route(`**/api/books/${original.bookId}`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(book()) }));
  await page.route(`**/api/books/${original.bookId}/chapters/${original.chapterId}/like`, route => {
    calls++;
    expect(route.request().method()).toBe('POST');
    if (calls === 1 && (behavior === 'retry' || behavior === 'committed-error')) {
      completed = behavior === 'committed-error';
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Reactions are temporarily unavailable.' }) });
    }
    completed = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(book()) });
  });
  return { original, other, calls: () => calls };
}

async function signInFromOpening(page: Page, title: string) {
  await page.goto('/hooks');
  await page.getByRole('button', { name: 'Tune my feed', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose genres', exact: true });
  await dialog.getByRole('button', { name: 'Romance', exact: true }).click();
  await dialog.getByRole('button', { name: 'Use these genres', exact: true }).click();
  await expect(page.locator('.wv-hook-card h2')).toHaveText(title);
  await page.getByRole('button', { name: 'Like this opening', exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByLabel('Email Address', { exact: true }).fill('reader@example.test');
  await page.getByLabel('Password', { exact: true }).fill('WordWeftLocal123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/hooks$/);
  await expect(page.locator('.wv-hook-card h2')).toHaveText(title);
}

test('sign-in retains the exact opening and taste and confirms the requested like once', async ({ page, request }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const state = await fixture(page, request);
  await signInFromOpening(page, state.original.title);
  await expect(page.getByRole('button', { name: 'Unlike this opening', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(state.calls()).toBe(1);
  await page.getByRole('button', { name: 'Tune my feed', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Romance', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Read the full opening', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show a shorter opening', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Not for me', exact: true }).click();
  await expect(page.locator('.wv-hook-card h2')).toHaveText(state.other.title);
  await page.getByRole('button', { name: 'Open story', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${state.other.bookId}$`));
  await expect(page.locator('.ww-story-v2')).toBeVisible();
});

test('an already liked opening remains liked without toggling it off after sign-in', async ({ page, request }) => {
  const state = await fixture(page, request, 'already-liked');
  await signInFromOpening(page, state.original.title);
  await expect(page.getByRole('button', { name: 'Unlike this opening', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(state.calls()).toBe(0);
});

test('a missing ranked opening is verified and a failed requested like can be retried', async ({ page, request }) => {
  const state = await fixture(page, request, 'retry', true);
  await signInFromOpening(page, state.original.title);
  await expect(page.getByRole('alert')).toContainText('like could not be saved');
  await expect(page.getByRole('button', { name: 'Like this opening', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(state.calls()).toBe(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.wv-hook-card h2')).toHaveText(state.original.title);
  await expect(page.getByRole('button', { name: 'Unlike this opening', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(state.calls()).toBe(2);
});

test('retry verifies a reaction committed before an error instead of toggling twice', async ({ page, request }) => {
  const state = await fixture(page, request, 'committed-error');
  await signInFromOpening(page, state.original.title);
  await expect(page.getByRole('alert')).toContainText('like could not be saved');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unlike this opening', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(state.calls()).toBe(1);
});
