import { test, expect, type Page, type APIRequestContext } from './fixtures';

const storyId = 'local-story-spring';
const chapterId = `${storyId}-chapter-1`;
const readerPath = `/book/${storyId}/chapter/${chapterId}`;
const password = 'WordWeftLocal123!';
let token = '';
let userId = '';
const apiHeaders = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.8.44.12' });

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password }, headers: { 'X-Forwarded-For': '127.8.44.11' } });
  expect(response.ok(), 'Start the disposable backend using scripts/dev-local-backend.sh.').toBeTruthy();
  token = (await response.json()).token;
  userId = (await (await request.get('/api/users/me', { headers: apiHeaders() })).json()).id;
});

test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.8.${Date.now() % 190 + 10}.${info.testId.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 190 + 10}` });
  await page.addInitScript(value => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
});

async function openReader(page: Page) {
  await page.goto(readerPath);
  await expect(page.locator('.reader-copy')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Existing saved-position restoration intentionally waits for manuscript layout.
  await page.waitForTimeout(200);
}
async function readingAnchor(page: Page) {
  return page.evaluate(() => {
    const element = Array.from(document.querySelectorAll<HTMLElement>('.reader-comment-block')).find(block => block.getBoundingClientRect().bottom > 100)!;
    return { id: element.id, top: element.getBoundingClientRect().top };
  });
}

for (const width of [1440, 393]) test(`reading preferences hold the visible passage and persist on the device at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await openReader(page);
  await page.locator('#paragraph-2').scrollIntoViewIfNeeded();
  const before = await readingAnchor(page);
  const trigger = page.getByRole('button', { name: 'Reading appearance and themes', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Reading preferences', exact: true });
  await expect(dialog).toBeVisible();
  const opened = await readingAnchor(page);
  expect(opened.id).toBe(before.id);
  expect(Math.abs(opened.top - before.top)).toBeLessThan(3);
  for (const control of ['A+', 'Wide', 'Modern', 'Airy', 'Night']) {
    await dialog.getByRole('button', { name: control, exact: true }).click();
    const after = await readingAnchor(page);
    expect(after.id, control).toBe(before.id);
    expect(Math.abs(after.top - before.top), control).toBeLessThan(3);
  }
  await expect(page.locator('.reader-experience')).toHaveClass(/reader-theme-dark/);
  await dialog.getByRole('button', { name: 'Close preferences', exact: true }).click();
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(page.locator('.reader-experience')).toHaveClass(/reader-theme-dark/);
  await expect(page.locator('.reader-manuscript')).toHaveClass(/reader-width-wide/);
  await expect(page.locator('.reader-copy')).toHaveClass(/reader-font-modern/);
  await trigger.click();
  await dialog.getByRole('button', { name: 'Sepia', exact: true }).click();
  await expect(page.locator('.reader-experience')).toHaveClass(/reader-theme-sepia/);
  await dialog.getByRole('button', { name: 'Paper', exact: true }).click();
  await expect(page.locator('.reader-experience')).toHaveClass(/reader-theme-light/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('chapter contents keeps the saved passage on dismissal and navigates the selected chapter', async ({ page }) => {
  await openReader(page);
  await page.locator('#paragraph-2').scrollIntoViewIfNeeded();
  const before = await readingAnchor(page);
  const trigger = page.getByRole('button', { name: 'Open table of contents', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Chapters', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Return to chapter 1', exact: true }).click();
  const after = await readingAnchor(page);
  expect(after.id).toBe(before.id);
  expect(Math.abs(after.top - before.top)).toBeLessThan(3);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator('.reader-toc-item').filter({ hasText: 'What the Rain Revealed' }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${storyId}/chapter/${storyId}-chapter-2$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What the Rain Revealed');
  await expect(dialog).not.toBeVisible();
});

async function restoreProgress(request: APIRequestContext, book: any, previous: any) {
  await request.delete(`/api/reading/progress/${book.id}`, { headers: apiHeaders() });
  if (!previous) return;
  const entries = Object.entries(previous.chapters || {}).sort(([left], [right]) => Number(left === book.chapters[previous.lastReadChapterIndex]?.id) - Number(right === book.chapters[previous.lastReadChapterIndex]?.id));
  for (const [id, item] of entries as [string, any][]) await request.post('/api/reading/progress', { headers: apiHeaders(), data: { bookId: book.id, chapterIndex: book.chapters.findIndex((chapter: any) => chapter.id === id), scrollPosition: Math.round(item.scrollPosition), chapterData: { id, progress: Math.round(item.progress), scroll: Math.round(item.scrollPosition) } } });
}

test('library supports custom shelves, restart and removal using real account data', async ({ page, request }) => {
  const bookId = 'local-story-sea';
  const book = await (await request.get(`/api/books/${bookId}`)).json();
  const progressResponse = await request.get(`/api/reading/progress/${bookId}`, { headers: apiHeaders() });
  const previous = (await progressResponse.text()) ? await progressResponse.json() : null;
  const profile = await (await request.get('/api/users/me', { headers: apiHeaders() })).json();
  const originalShelves = profile.library.filter((shelf: any) => shelf.books?.some((saved: any) => saved.id === bookId));
  const shelfName = `Reader journey ${Date.now()}`;
  try {
    await request.post('/api/reading/progress', { headers: apiHeaders(), data: { bookId, chapterIndex: 0, scrollPosition: 0, chapterData: { id: book.chapters[0].id, progress: 60, scroll: 0 } } });
    await page.goto('/library');
    await expect(page.locator('.ww-library-resume-v2')).toBeVisible();
    await page.getByRole('button', { name: 'New shelf', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'Create a shelf', exact: true });
    await create.getByLabel('Shelf name', { exact: true }).fill(shelfName);
    await create.getByRole('button', { name: 'Create shelf', exact: true }).click();
    await expect(create).not.toBeVisible();
    await expect(page.locator('.ww-library-shelf-select select option').filter({ hasText: shelfName })).toHaveCount(1);
    await page.goto(`/book/${bookId}`);
    await page.getByRole('button', { name: 'Organize shelves', exact: true }).click();
    const manage = page.getByRole('dialog', { name: 'Manage shelves', exact: true });
    await manage.locator('label').filter({ hasText: shelfName }).getByRole('checkbox').check();
    await manage.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(manage).not.toBeVisible();
    await page.goto('/library');
    const option = page.locator('.ww-library-shelf-select select option').filter({ hasText: shelfName });
    await page.locator('.ww-library-shelf-select select').selectOption((await option.getAttribute('value'))!);
    // Select all to make the existing restart/remove controls available on the row.
    await page.getByRole('button', { name: /^All stories/ }).click();
    await page.getByRole('button', { name: `Restart ${book.title}`, exact: true }).click();
    const restart = page.getByRole('alertdialog', { name: 'Restart this book?', exact: true });
    await restart.getByRole('button', { name: 'Restart progress', exact: true }).click();
    await expect(restart).not.toBeVisible();
    await page.getByRole('button', { name: /^Saved/ }).click();
    await expect(page.locator('.ww-library-book-v2')).toHaveCount(1);
    await expect(page.locator('.ww-library-book-progress')).toHaveCount(0);
    await page.getByRole('button', { name: `Remove ${book.title} from library`, exact: true }).click();
    await page.getByRole('alertdialog', { name: 'Remove this book?', exact: true }).getByRole('button', { name: 'Remove book', exact: true }).click();
    await expect(page.locator('.ww-library-book-v2')).toHaveCount(0);
    const updated = await (await request.get('/api/users/me', { headers: apiHeaders() })).json();
    expect(updated.library.some((shelf: any) => shelf.books?.some((saved: any) => saved.id === bookId))).toBeFalsy();
  } finally {
    if (originalShelves.length) await request.post(`/api/library/books/${bookId}/shelves`, { headers: apiHeaders(), data: { shelfIds: originalShelves.map((shelf: any) => shelf.id) } });
    await restoreProgress(request, book, previous);
    if (!originalShelves.length) await request.delete(`/api/library/${bookId}`, { headers: apiHeaders() });
  }
});

test('rating and review submit, edit and delete persist through the real API', async ({ page, request }) => {
  const bookId = 'local-story-sea';
  const original = (await (await request.get(`/api/books/${bookId}/reviews`)).json()).find((review: any) => review.userId === userId);
  const content = `A review written during the reader journey check ${Date.now()}.`;
  try {
    await page.goto(`/book/${bookId}`);
    await page.getByRole('button', { name: 'Reviews', exact: true }).click();
    const edit = page.getByRole('button', { name: 'Edit your review', exact: true });
    await (await edit.count() ? edit : page.getByRole('button', { name: 'Write a review', exact: true })).click();
    const dialog = page.locator('.ww-review-compose-panel');
    await dialog.getByRole('button', { name: 'Rate 4 out of 5 stars', exact: true }).click();
    await dialog.getByLabel('Your review', { exact: true }).fill(content);
    await dialog.getByRole('button', { name: /^(Post review|Update review)$/ }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.ww-story-review-entry')).toContainText(content);
    await page.reload();
    await page.getByRole('button', { name: 'Reviews', exact: true }).click();
    await expect(page.locator('.ww-story-review-entry')).toContainText(content);
    await page.getByRole('button', { name: 'Edit your review', exact: true }).click();
    await dialog.getByRole('button', { name: 'Rate 5 out of 5 stars', exact: true }).click();
    await dialog.getByLabel('Your review', { exact: true }).fill(content + ' Updated.');
    await dialog.getByRole('button', { name: 'Update review', exact: true }).click();
    await expect(page.locator('.ww-story-review-entry')).toContainText(content + ' Updated.');
    await page.getByRole('button', { name: 'Delete your review', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'Delete your review?', exact: true }).getByRole('button', { name: 'Delete review', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Write a review', exact: true })).toBeVisible();
    expect((await (await request.get(`/api/books/${bookId}/reviews`)).json()).some((review: any) => review.userId === userId)).toBeFalsy();
  } finally {
    if (original) await request.post(`/api/books/${bookId}/reviews`, { headers: apiHeaders(), data: { rating: original.rating, comment: original.comment } });
    else await request.delete(`/api/books/${bookId}/reviews`, { headers: apiHeaders() });
  }
});

test('paragraph discussion stays anchored and a failed post retains the draft for retry', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 900 });
  await openReader(page);
  const paragraph = page.locator('#paragraph-2');
  await paragraph.scrollIntoViewIfNeeded();
  const top = await paragraph.evaluate(element => element.getBoundingClientRect().top);
  await paragraph.locator('.reader-comment-button').click({ force: true });
  const dialog = page.getByRole('dialog', { name: 'Passage 3', exact: true });
  await expect(dialog).toBeVisible();
  expect(Math.abs(await paragraph.evaluate(element => element.getBoundingClientRect().top) - top)).toBeLessThan(3);
  const content = `The quiet detail in this passage stayed with me. Reader check ${Date.now()}.`;
  await dialog.getByLabel('Your comment', { exact: true }).fill(content);
  const endpoint = `**/api/books/${storyId}/chapters/${chapterId}/comments`;
  await page.route(endpoint, route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'This local test request is temporarily unavailable.' }) }) : route.continue());
  await dialog.getByRole('button', { name: 'Post Comment', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(dialog.getByLabel('Your comment', { exact: true })).toHaveValue(content);
  await expect(dialog.getByRole('button', { name: 'Post Comment', exact: true })).toBeEnabled();
  await page.unroute(endpoint);
  await dialog.getByRole('button', { name: 'Post Comment', exact: true }).click();
  await expect(dialog.getByText(content, { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Your comment', { exact: true })).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('share dialog supports keyboard focus return and copies the real story link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/book/${storyId}`);
  const trigger = page.getByRole('button', { name: 'Share this book', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share The Last Spring in Bellweather', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBeTruthy();
  await dialog.getByRole('button', { name: 'Copy story link', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/book\/local-story-spring$/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
