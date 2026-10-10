import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let token = '', address = '127.43.21.9';
const books: string[] = [];
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': address });
async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
    const result = await request.fetch(`/api${path}`, { method, headers: headers(), ...(data === undefined ? {} : { data }) });
    expect(result.ok(), `${method} ${path}: ${result.status()} ${await result.text()}`).toBeTruthy();
    return result.json();
}
async function story(request: APIRequestContext) {
    const title = `Release comparisons ${crypto.randomUUID()}`;
    const user = await api(request, '/books', { title, description: 'Disposable comparison test.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://127.0.0.1:3000/design-v2/assets/met-53681.jpg' });
    const book = user.writtenBooks.find((item: any) => item.title === title); books.push(book.id); return book;
}
async function chapter(request: APIRequestContext, bookId: string, title: string, content = '<p>Mara waited for home.</p><p>The river was quiet.</p>') {
    const id = crypto.randomUUID();
    await api(request, `/books/${bookId}/chapters/${id}`, { data: { title, content }, status: 'preserve', expectedRevision: 0 }, 'PATCH');
    return id;
}
async function update(request: APIRequestContext, bookId: string, id: string, title: string, content: string, warnings: string[] = [], note = '') {
    const draft = await api(request, `/books/${bookId}/chapters/${id}/edit-session`);
    await api(request, `/books/${bookId}/chapters/${id}`, { data: { title, content }, contentWarnings: warnings, disclaimerNote: note, status: 'preserve', expectedRevision: draft.editRevision }, 'PATCH');
}
async function publish(request: APIRequestContext, bookId: string, id: string) {
    const review = await api(request, `/books/${bookId}/chapters/${id}/publication-impact`);
    return api(request, `/books/${bookId}/chapters/${id}/publish-reviewed`, { reviewToken: review.reviewToken });
}
async function openEditor(page: Page, bookId: string, id: string) {
    await page.goto(`/write/book/${bookId}/chapter/${id}/edit`);
    await expect(page.locator('.rte-content[contenteditable=true]')).toBeVisible();
}
async function approve(page: Page) {
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
    await review.getByRole('checkbox', { name: /I approve every chapter/ }).check();
    await review.getByRole('checkbox', { name: /Artwork in this story/ }).check();
    await review.getByRole('button', { name: 'Publish this release', exact: true }).click();
}

test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': address } });
    expect(response.ok()).toBeTruthy(); token = (await response.json()).token;
});
test.beforeEach(async ({ page, context }) => {
    const key = crypto.randomUUID().slice(0, 4); address = `127.43.${parseInt(key.slice(0,2),16)}.${parseInt(key.slice(2),16)}`;
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': address });
    await page.addInitScript(value => { localStorage.setItem('wordweft_jwt', value); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('theme', 'light'); }, token);
});
test.afterEach(async ({ request }) => { while (books.length) await request.delete(`/api/books/${books.pop()}`, { headers: headers() }); });

for (const width of [1440, 390]) test(`live comparison and editor release show exact prose and metadata at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const book = await story(request), id = await chapter(request, book.id, 'The return'); await publish(request, book.id, id);
    await update(request, book.id, id, 'The return revised', '<p>Mara waited for dawn.</p><h2>The river was quiet.</h2><div data-mood="eerie"><p>A new passage.</p></div>', ['GRIEF'], 'Reader-visible note');
    await openEditor(page, book.id, id);
    if (width === 390) await page.getByRole('button', { name: 'Details', exact: true }).click();
    await page.getByRole('button', { name: 'Compare with published version', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Changes since publication', exact: true });
    await expect(comparison.locator('.ww-diff-delete')).toContainText(['home.']);
    await expect(comparison.locator('.ww-diff-add')).toContainText(['dawn.']);
    await expect(comparison).toContainText('Heading 2'); await expect(comparison).toContainText('Atmosphere: eerie');
    await comparison.getByText('3 chapter details changed', { exact: false }).click(); await expect(comparison).toContainText('Author note'); await expect(comparison).toContainText('grief');
    expect(await comparison.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    await comparison.getByText('3 chapter details changed', { exact: false }).click();
    await page.screenshot({ path: `test-results/evidence/comparisons/live-${width}.png`, fullPage: true });
    const axe = await new AxeBuilder({ page }).include('.ww-version-dialog').withTags(['wcag2a', 'wcag2aa']).analyze(); expect(axe.violations.map(item => item.id)).toEqual([]);
    await page.keyboard.press('Escape'); await expect(comparison).not.toBeVisible();
    if (width === 390) await page.keyboard.press('Escape');
    // Unsaved title belongs to the comparison, independently of the server draft.
    await page.route(`**/api/books/${book.id}/chapters/${id}`, route => route.request().method() === 'PATCH' ? route.abort() : route.continue());
    await page.getByLabel('Chapter title', { exact: true }).fill('Not saved online');
    if (width === 390) await page.getByRole('button', { name: 'Details', exact: true }).click();
    await page.getByRole('button', { name: 'Compare with published version', exact: true }).click();
    await expect(comparison).toContainText('Not saved online');
    expect((await api(request, `/books/${book.id}/chapters/${id}/comparison`)).baseline.title).toBe('The return');
    await page.keyboard.press('Escape'); if (width === 390) await page.keyboard.press('Escape');
    await page.unroute(`**/api/books/${book.id}/chapters/${id}`);
    await page.getByRole('button', { name: 'Publish updates', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
    await expect(review.locator('.ww-diff-manuscript')).toBeVisible(); await expect(review).toContainText('dawn.');
    await approve(page); await expect(page.getByRole('heading', { name: 'Chapter published', exact: true })).toBeVisible();
    const after = await api(request, `/books/${book.id}/chapters/${id}/comparison`); expect(after.baseline.title).toBe('Not saved online'); expect(after.baseline.content).toContain('dawn.');
});

test('saved versions can be compared to each other or to the actual published version', async ({ page, request }) => {
    const book = await story(request), id = await chapter(request, book.id, 'Opening');
    const old = await api(request, `/books/${book.id}/chapters/${id}/revisions`, { label: 'Original opening', expectedRevision: 1 });
    await update(request, book.id, id, 'Opening', '<p>Mara waited for dawn.</p><p>The river was quiet.</p>');
    const draft = await api(request, `/books/${book.id}/chapters/${id}/edit-session`);
    const next = await api(request, `/books/${book.id}/chapters/${id}/revisions`, { label: 'Revised opening', expectedRevision: draft.editRevision });
    await publish(request, book.id, id);
    await update(request, book.id, id, 'Opening', '<p>Mara waited for sunset.</p><p>The river was quiet.</p>');
    await openEditor(page, book.id, id); await page.getByRole('button', { name: 'View revisions', exact: true }).click();
    const history = page.getByRole('dialog', { name: 'Version history', exact: true });
    await history.locator('article').filter({ hasText: 'Original opening' }).getByRole('button', { name: 'Compare and restore', exact: true }).click();
    await expect(history.locator('.ww-diff-delete')).toContainText(['home.']); await expect(history.locator('.ww-diff-add')).toContainText(['sunset.']);
    await history.getByRole('combobox', { name: 'Compare to', exact: true }).selectOption(next.id);
    await expect(history.locator('.ww-diff-add')).toContainText(['dawn.']); await expect(history.locator('.ww-diff-add')).not.toContainText(['sunset.']);
    await history.getByRole('combobox', { name: 'Compare to', exact: true }).selectOption('published');
    await expect(history.locator('.ww-diff-add')).toContainText(['dawn.']);
    await history.getByRole('combobox', { name: 'Compare from', exact: true }).selectOption(next.id);
    await expect(history).toContainText('No changes between these versions.');
    await history.getByRole('combobox', { name: 'Compare from', exact: true }).selectOption(old.id);
    await history.getByRole('button', { name: 'Restore working draft', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'Restore this working draft?', exact: true }).getByRole('button', { name: 'Restore working draft', exact: true }).click();
    await expect(history).toBeHidden(); await expect(page.locator('.rte-content')).toContainText('home.');
    expect((await api(request, `/books/${book.id}/chapters/${id}/comparison`)).baseline.content).toContain('dawn.');
});

test('story release reviews all earlier updates and rejects stale approval before publishing', async ({ page, request }) => {
    const book = await story(request), first = await chapter(request, book.id, 'Earlier chapter'), unchanged = await chapter(request, book.id, 'Unchanged chapter');
    await publish(request, book.id, unchanged);
    const stable = await api(request, `/books/${book.id}/chapters/${unchanged}/edit-session`);
    await update(request, book.id, first, 'Earlier chapter', '<p>Earlier revised prose.</p>');
    const target = await chapter(request, book.id, 'New chapter'), later = await chapter(request, book.id, 'Incomplete later', '');
    await page.goto(`/write/book/${book.id}/manage`);
    await page.getByLabel('Story actions', { exact: true }).click(); await page.getByRole('button', { name: 'Review story release', exact: true }).click();
    await page.getByRole('dialog', { name: 'Publish story', exact: true }).getByRole('button', { name: 'Review selected release', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
    await expect(review).toContainText('Earlier chapter'); await expect(review).toContainText('New chapter'); await expect(review).not.toContainText('Incomplete later');
    await review.getByRole('button', { name: 'Review differences', exact: true }).click();
    await expect(review.locator('.ww-diff-delete')).toContainText(['home.']); await expect(review.locator('.ww-diff-add')).toContainText(['Earlier revised prose.']);
    await update(request, book.id, first, 'Earlier chapter', '<p>Changed after review.</p>');
    await approve(page); await expect(review).toContainText('The release changed since your review');
    expect((await api(request, `/books/${book.id}/chapters/${first}/comparison`)).baseline.content).toContain('home.');
    await review.getByRole('button', { name: 'Refresh release review', exact: true }).click();
    await review.getByRole('button', { name: 'Review differences', exact: true }).click(); await expect(review.locator('.ww-diff-add')).toContainText(['Changed after review.']);
    await approve(page); await expect(review).toBeHidden();
    expect((await api(request, `/books/${book.id}/chapters/${first}/comparison`)).baseline.content).toContain('Changed after review.');
    expect((await api(request, `/books/${book.id}/chapters/${target}/edit-session`)).status).toBe('published');
    expect((await api(request, `/books/${book.id}/chapters/${later}/edit-session`)).status).toBe('draft');
    expect((await api(request, `/books/${book.id}/chapters/${unchanged}/edit-session`)).publishedAt).toBe(stable.publishedAt);
});

test('comparison failures retry without approving stale releases, and draft bodies stay private', async ({ page, request }) => {
    const book = await story(request), first = await chapter(request, book.id, 'Earlier chapter'); await publish(request, book.id, first);
    await update(request, book.id, first, 'Earlier chapter', '<p>Private update.</p>'); const target = await chapter(request, book.id, 'Target chapter');
    const impact = await api(request, `/books/${book.id}/chapters/${target}/publication-impact`); expect(impact.privateUpdatesRemaining).toBe(1);
    expect((await request.get(`/api/books/${book.id}/chapters/${first}/comparison`)).status()).toBe(401);
    const readerLogin = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': address } });
    const readerToken = (await readerLogin.json()).token;
    expect((await request.get(`/api/books/${book.id}/chapters/${first}/comparison`, { headers: { Authorization: `Bearer ${readerToken}`, 'X-Forwarded-For': address } })).status()).toBe(403);
    await openEditor(page, book.id, first);
    let failed = true; await page.route('**/comparison*', route => failed ? (failed = false, route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Comparison temporarily unavailable"}' })) : route.continue());
    await page.getByRole('button', { name: 'Compare with published version', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Changes since publication', exact: true }); await expect(comparison.getByRole('alert')).toContainText('unavailable');
    await comparison.getByRole('button', { name: 'Retry comparison', exact: true }).click(); await expect(comparison.locator('.ww-diff-add')).toContainText(['Private update.']);
    await page.keyboard.press('Escape');
    const pending = await api(request, `/books/${book.id}/chapters/${first}/publication-impact`);
    await update(request, book.id, first, 'Another change', '<p>Changed again.</p>');
    expect((await request.get(`/api/books/${book.id}/chapters/${first}/comparison?releaseChapterId=${first}&reviewToken=${pending.reviewToken}`, { headers: headers() })).status()).toBe(409);
});

test('collapsed context stays lightweight and comparisons remain readable in dark mode at 320px', async ({ page, request }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const book = await story(request), prose = Array.from({ length: 160 }, (_, index) => `<p>Quiet passage ${index}.</p>`).join('');
    const id = await chapter(request, book.id, 'Long chapter', prose); await publish(request, book.id, id);
    await update(request, book.id, id, 'Long chapter', prose.replace('Quiet passage 80.', 'The door opened at dawn.'));
    await openEditor(page, book.id, id); await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.getByRole('button', { name: 'Details', exact: true }).click(); await page.getByRole('button', { name: 'Compare with published version', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Changes since publication', exact: true });
    await expect(comparison.locator('.ww-diff-add')).toContainText(['The door opened at dawn.']);
    expect(await comparison.locator('.ww-diff-row').count()).toBeLessThan(15);
    await comparison.locator('.ww-diff-context').first().locator('summary').click();
    await expect(comparison.locator('.ww-diff-context').first()).toContainText('Quiet passage 0.');
    expect(await comparison.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth; })).toBeTruthy();
    await comparison.locator('.ww-diff-context').first().locator('summary').click();
    await page.screenshot({ path: 'test-results/evidence/comparisons/dark-320.png', fullPage: true });
    const accessibility = await new AxeBuilder({ page }).include('.ww-version-dialog').withTags(['wcag2a','wcag2aa']).analyze(); expect(accessibility.violations.map(item => item.id)).toEqual([]);
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Compare with published version', exact: true })).toBeFocused();
});
