import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const password = 'WordWeftLocal123!';
let token = '';
const createdBooks: string[] = [];
const apiHeaders = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.6.33.18' });

async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
  const response = await request.fetch(`/api${path}`, { method, headers: apiHeaders(), ...(data === undefined ? {} : { data }) });
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}
async function createStory(request: APIRequestContext, name: string) {
  const title = `${name} ${Date.now()}`;
  const user = await api(request, '/books', { title, description: 'An isolated writer browser test manuscript.', summary: 'A local test story.', coverUrl: 'http://localhost:3000/design-v2/assets/met-53681.jpg', ageRating: 'ALL_AGES', genres: ['Fantasy'] });
  const book = user.writtenBooks.find((item: any) => item.title === title);
  createdBooks.push(book.id);
  return book;
}
async function seedChapter(request: APIRequestContext, bookId: string, title: string, content: string) {
  const id = crypto.randomUUID();
  await api(request, `/books/${bookId}/chapters/${id}`, { data: { title, content, contentWarnings: [], disclaimerNote: '' }, status: 'draft' }, 'PATCH');
  return id;
}
async function openEditor(page: Page, bookId: string, chapterId: string) {
  await page.goto(`/write/book/${bookId}/chapter/${chapterId}/edit`);
  await expect(page.locator('.rte-content[contenteditable=true]')).toBeVisible();
  await expect(page.getByLabel('Chapter title', { exact: true })).toBeEnabled();
}
async function saved(page: Page) {
  await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
}

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password }, headers: { 'X-Forwarded-For': '127.6.33.18' } });
  expect(response.ok(), 'Run the isolated local backend before writer tests.').toBeTruthy();
  token = (await response.json()).token;
});
test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.6.34.${info.testId.split('').reduce((sum, value) => sum + value.charCodeAt(0), 0) % 200 + 1}` });
  await page.addInitScript(value => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
});
test.afterEach(async ({ request }) => {
  while (createdBooks.length) await request.delete(`/api/books/${createdBooks.pop()}`, { headers: apiHeaders() });
});

test('writer creates a private story, edits a chapter, autosaves, and resumes the correct manuscript', async ({ page, request }) => {
  await page.goto('/write/book/create');
  const title = `Browser story ${Date.now()}`;
  await page.getByLabel('Story title', { exact: true }).fill(title);
  await page.getByLabel('A short introduction', { exact: false }).fill('A letter arrives after the last train.');
  await page.getByLabel('Synopsis', { exact: true }).fill('An archivist returns home to discover a letter addressed to the future.');
  await page.getByLabel('Tags', { exact: false }).fill('Letters, homecoming');
  await page.getByLabel('Age rating', { exact: true }).selectOption('ALL_AGES');
  await page.getByRole('button', { name: 'Save as draft', exact: true }).click();
  await expect(page).toHaveURL(/\/write\/book\/[^/]+\/manage$/);
  const bookId = new URL(page.url()).pathname.split('/')[3]; createdBooks.push(bookId);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New chapter', exact: true }).click();
  await expect(page.locator('.rte-content[contenteditable=true]')).toBeVisible();
  await page.getByLabel('Chapter title', { exact: true }).fill('The last train');
  await page.locator('.rte-content[contenteditable=true]').fill('The envelope waited on the platform long after everyone had left.');
  await saved(page);
  const chapterId = new URL(page.url()).pathname.split('/')[5];
  const result = await api(request, `/books/${bookId}/chapters/${chapterId}/content?mode=edit`);
  expect(result.content).toContain('The envelope waited');
  await page.getByRole('button', { name: 'Back to story studio', exact: true }).click();
  await page.goto('/write');
  await page.getByRole('link', { name: 'Continue writing', exact: true }).click();
  await expect(page.getByLabel('Chapter title', { exact: true })).toHaveValue('The last train');
  await expect(page.locator('.rte-content')).toContainText('The envelope waited');
});

test('verified local recovery survives a failed save and a reload, then saves the recovered text', async ({ page, request, context }) => {
  const book = await createStory(request, 'Offline recovery');
  const chapterId = await seedChapter(request, book.id, 'A safe starting point', '<p>The saved opening.</p>');
  await openEditor(page, book.id, chapterId);
  await context.setOffline(true);
  await page.locator('.rte-content[contenteditable=true]').fill('A thought written while the connection was gone.');
  await expect(page.locator('.ww-editor-save-state')).toHaveText('Offline · saved on this device');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('ww:writer-draft:')))).toBeTruthy();
  await context.setOffline(false);
  const savePattern = `**/api/books/${book.id}/chapters/${chapterId}`;
  await page.route(savePattern, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'A test interruption prevented the save.' }) }));
  await expect(page.getByRole('alert')).toContainText('test interruption', { timeout: 15_000 });
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
  await expect(page.locator('.rte-content')).toContainText('The saved opening.');
  await page.unroute(savePattern);
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator('.rte-content')).toContainText('A thought written while the connection was gone.');
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toHaveCount(0);
});

test('chapter rails preserve the correct state and review, preview, schedule, and revision restoration work', async ({ page, request }) => {
  const book = await createStory(request, 'Publishing workflow');
  const first = await seedChapter(request, book.id, 'The unopened letter', '<p>An unopened letter waited beside the river.</p>');
  const second = await seedChapter(request, book.id, 'The long way home', '<p>We walked home along the river after sunset.</p>');
  await openEditor(page, book.id, first);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
  await expect(preview).toContainText('An unopened letter waited');
  await page.keyboard.press('Escape'); await expect(preview).not.toBeVisible();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
  await expect(review).toContainText('The unopened letter');
  await expect(review.getByRole('button', { name: 'Publish this release', exact: true })).toBeDisabled();
  await review.getByRole('checkbox', { name: /I approve every chapter/ }).check();
  await review.getByRole('checkbox', { name: /Artwork in this story/ }).check();
  await review.getByRole('button', { name: 'Publish this release', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chapter Published!', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to studio', exact: true }).click();
  await openEditor(page, book.id, first);
  await page.getByRole('navigation', { name: 'Chapters', exact: true }).getByRole('button', { name: /The long way home/ }).click();
  await expect(page.getByLabel('Chapter title', { exact: true })).toHaveValue('The long way home');
  await expect(page.locator('.rte-content')).toContainText('We walked home');
  await page.getByRole('button', { name: 'Schedule chapter', exact: true }).click();
  const schedule = page.getByRole('dialog', { name: /Schedule The long way home/ });
  const future = new Date(Date.now() + 86400_000);
  const two = (value: number) => String(value).padStart(2, '0');
  await schedule.getByLabel('Release date and time', { exact: true }).fill(`${future.getFullYear()}-${two(future.getMonth()+1)}-${two(future.getDate())}T${two(future.getHours())}:${two(future.getMinutes())}`);
  await schedule.getByRole('button', { name: 'Schedule chapter', exact: true }).click();
  await expect(schedule).not.toBeVisible();
  await expect(page.locator('.ww-editor-detail-section').first()).toContainText('Scheduled ·');
  await page.getByRole('button', { name: 'View revisions', exact: true }).click();
  const versions = page.getByRole('dialog', { name: 'Version history', exact: true });
  await expect(versions.getByRole('button', { name: 'Restore', exact: true }).first()).toBeVisible();
  await versions.getByRole('button', { name: 'Restore', exact: true }).first().click();
  await page.getByRole('alertdialog', { name: 'Restore this version?', exact: true }).getByRole('button', { name: 'Restore version', exact: true }).click();
  await expect(versions).not.toBeVisible();
  await expect(page.locator('.ww-editor-detail-section').first()).toContainText('Your chapter stays private');
  await expect(page.getByLabel('Chapter title', { exact: true })).toHaveValue('The long way home');
});

for (const width of [1440, 393, 320]) test(`writer editor and tool sheets remain reachable at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 900 });
  const book = await createStory(request, 'Responsive manuscript');
  const chapter = await seedChapter(request, book.id, 'The Station at the Edge of the River After Rain', '<p>The last shop on the river had turned its lights off.</p>');
  await openEditor(page, book.id, chapter);
  await page.evaluate(() => document.fonts.ready);
  const titleFits = await page.getByLabel('Chapter title', { exact: true }).evaluate(element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1);
  expect(titleFits, 'The complete chapter title should remain visible without scrolling inside its field').toBeTruthy();
  const spacing = await page.evaluate(() => ({
    headerHeight: document.querySelector('.ww-editor-topbar')!.getBoundingClientRect().height,
    toolbarToManuscript: document.querySelector('.rte-document')!.getBoundingClientRect().top - document.querySelector('.rte-toolbar')!.getBoundingClientRect().bottom,
  }));
  expect(spacing.headerHeight, 'The editor header should leave room for the manuscript on small screens').toBeLessThanOrEqual(80);
  expect(spacing.toolbarToManuscript, 'A hidden formatting menu should not occupy manuscript space').toBeLessThanOrEqual(28);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  if (width < 980) {
    await page.getByRole('navigation', { name: 'Writing tools', exact: true }).getByRole('button', { name: 'Details', exact: true }).click();
    const details = page.getByRole('dialog', { name: 'Chapter details', exact: true });
    await expect(details.getByRole('button', { name: 'View revisions', exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(details).not.toBeVisible();
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious','critical'].includes(item.impact || '')).map(item => ({ id:item.id, nodes:item.nodes.map(node => node.target) }))).toEqual([]);
});
