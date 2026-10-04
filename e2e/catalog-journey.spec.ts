import { test, expect } from './fixtures';

test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.25.94.${info.testId.split('').reduce((sum, value) => sum + value.charCodeAt(0), 0) % 180 + 10}` });
  await page.addInitScript(() => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  });
  await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});

test('mobile genre search accepts slow typing and returns keyboard focus after dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/category');
  const trigger = page.getByRole('button', { name: 'Filters', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Filters', exact: true });
  const search = dialog.getByPlaceholder('Search genres...');
  await search.pressSequentially('fantasy', { delay: 90 });
  await expect(search).toHaveValue('fantasy');
  await expect(search).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Fantasy', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Romance', exact: true })).toHaveCount(0);
  await search.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Search genres...').press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Close filters' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Close filters' }).press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Apply Filters' })).toBeFocused();
});

test('returning from a story restores the catalog genre, sort, view and both search fields', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/category');
  await page.getByRole('radio', { name: /^Adventure/ }).click();
  await page.getByRole('radio', { name: 'Newly Added', exact: true }).check();
  await page.getByRole('button', { name: 'List view' }).click();
  await page.getByLabel('Search the library').fill('Sea');
  await page.getByLabel('Search genres').fill('advent');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open story →', exact: true }).first().click();
  await expect(page).toHaveURL(/\/book\//);
  await expect(page.locator('.ww-story-v2')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/category$/);
  await expect(page.getByRole('radio', { name: /^Adventure/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Newly Added', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Search the library')).toHaveValue('Sea');
  await expect(page.locator('.v2-story-list-item')).toHaveCount(2);
  await expect(page.getByLabel('Search genres')).toHaveValue('advent');
});

test('the loaded catalog pages remain available after opening a story and returning', async ({ page, request }) => {
  const response = await request.get('/api/books?size=1');
  expect(response.ok()).toBeTruthy();
  const original = (await response.json()).content[0];
  expect(original).toBeTruthy();
  const books = Array.from({ length: 21 }, (_, index) => ({ ...original, id: index ? `catalog-journey-${index}` : original.id, title: index ? `Catalog journey story ${index}` : original.title }));
  await page.route('**/api/books?*', route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 0);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: pageNumber === 0 ? books.slice(0, 20) : books.slice(20), hasMore: pageNumber === 0, totalElements: 21 }) });
  });
  await page.goto('/category');
  await expect(page.locator('.ww-book-card')).toHaveCount(20);
  await page.getByRole('button', { name: 'Load more stories', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.ww-book-card')).toHaveCount(21);
  await page.getByRole('link', { name: original.title, exact: true }).click();
  await expect(page).toHaveURL(/\/book\//);
  await expect(page.locator('.ww-story-v2')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.ww-book-card')).toHaveCount(21);
  await expect(page.getByText('You’ve reached the end of this collection.', { exact: true })).toBeVisible();
});

test('short searches explain the minimum length instead of claiming no results', async ({ page }) => {
  await page.goto('/category');
  await page.getByLabel('Search the library').fill('a');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/category$/);
  await expect(page.getByText('Enter at least two characters to search.', { exact: true })).toBeVisible();
  await page.goto('/search?q=a');
  await expect(page.getByText('Enter at least two characters to find stories and people.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No results found', exact: true })).toHaveCount(0);
});

test('retrying a failed search page does not skip the next page of results', async ({ page }) => {
  let failNextPage = true;
  let releaseFailure: () => void = () => {};
  const failureWait = new Promise<void>(resolve => { releaseFailure = resolve; });
  const books = Array.from({ length: 13 }, (_, index) => ({ id: `search-journey-${index}`, title: `Search journey ${index}`, author: { id: 'local-writer', name: 'Mira Ellery' }, genres: ['Fantasy'], rating: 0, readingStatus: 'Ongoing', summary: 'A story in a controlled, read-only pagination response.' }));
  await page.route('**/api/search?*', async route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 0);
    if (pageNumber === 1 && failNextPage) {
      failNextPage = false;
      await failureWait;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Search is temporarily unavailable.' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ books: { items: books.slice(pageNumber * 12, (pageNumber + 1) * 12), total: 13, page: pageNumber, totalPages: 2 } }) });
  });
  await page.goto('/search?q=journey');
  await page.getByRole('button', { name: /^Books/ }).click();
  await expect(page.locator('.search-book-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Load More Results', exact: true }).click();
  await expect(page.locator('.search-book-card')).toHaveCount(12);
  await expect(page.locator('.search-book-card').first()).toBeVisible();
  releaseFailure();
  await expect(page.getByRole('alert')).toContainText('Search is temporarily unavailable.');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.search-book-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Load More Results', exact: true }).click();
  await expect(page.locator('.search-book-card')).toHaveCount(13);
  await expect(page.getByRole('button', { name: 'Load More Results', exact: true })).toHaveCount(0);
});
