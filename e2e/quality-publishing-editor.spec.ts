import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let token = '';
let testAddress = '127.39.42.7';
const books: string[] = [];
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': testAddress });
async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
    const result = await request.fetch(`/api${path}`, { method, headers: headers(), ...(data === undefined ? {} : { data }) });
    expect(result.ok(), `${method} ${path}: ${result.status()} ${await result.text()}`).toBeTruthy();
    return result.json();
}
async function story(request: APIRequestContext, name: string) {
    const title = `${name} ${crypto.randomUUID()}`;
    const user = await api(request, '/books', { title, description: 'Disposable publication review test.', summary: 'A local manuscript.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://localhost:3005/design-v2/assets/met-53681.jpg' });
    const book = user.writtenBooks.find((item: any) => item.title === title); books.push(book.id); return book;
}
async function chapter(request: APIRequestContext, bookId: string, title: string, warnings: string[] = [], content = '<p>Before the train arrived we waited beside the quiet river.</p>') {
    const id = crypto.randomUUID();
    await api(request, `/books/${bookId}/chapters/${id}`, { data: { title, content }, contentWarnings: warnings, disclaimerNote: '', status: 'preserve', expectedRevision: 0 }, 'PATCH');
    return id;
}
async function editor(page: Page, bookId: string, chapterId: string) {
    await page.goto(`/write/book/${bookId}/chapter/${chapterId}/edit`);
    await expect(page.locator('.rte-content[contenteditable=true]')).toBeVisible();
}
async function approveRelease(page: Page) {
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
    await review.getByRole('checkbox', { name: /I approve every chapter/ }).check();
    await review.getByRole('checkbox', { name: /Artwork in this story/ }).check();
    await review.getByRole('button', { name: 'Publish this release', exact: true }).click();
}
async function publish(request: APIRequestContext, bookId: string, chapterId: string) {
    const review = await api(request, `/books/${bookId}/chapters/${chapterId}/publication-impact`);
    return api(request, `/books/${bookId}/chapters/${chapterId}/publish-reviewed`, { reviewToken: review.reviewToken });
}

test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': '127.39.42.7' } });
    expect(response.ok()).toBeTruthy(); token = (await response.json()).token;
});
test.beforeEach(async ({ page, context }) => {
    // Other local suites share this backend; keep their rate-limit budgets independent.
    const address = crypto.randomUUID().slice(0, 4);
    testAddress = `127.39.${parseInt(address.slice(0, 2), 16)}.${parseInt(address.slice(2), 16)}`;
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': testAddress });
    await page.addInitScript(value => {
        localStorage.setItem('wordweft_jwt', value); localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('theme', 'light');
    }, token);
});
test.afterEach(async ({ request }) => { while (books.length) await request.delete(`/api/books/${books.pop()}`, { headers: headers() }); });

test('later editor release reviews earlier warnings and private story before approving both chapters', async ({ page, request }) => {
    const book = await story(request, 'Ordered release'); const first = await chapter(request, book.id, 'First draft', ['VIOLENCE']);
    const second = await chapter(request, book.id, 'Second draft'); await editor(page, book.id, second);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
    await expect(review).toContainText('Your private story becomes public'); await expect(review).toContainText('Chapter 1: First draft');
    await expect(review).toContainText('Chapter 2: Second draft'); await expect(review).toContainText('Violence'); await expect(review).toContainText('teen 13');
    await expect(review.getByRole('button', { name: 'Publish this release', exact: true })).toBeDisabled();
    expect((await api(request, `/books/${book.id}`)).publicationStatus).toBe('draft');
    await page.screenshot({ path: 'test-results/evidence/publishing/editor-complete-release-desktop.png', fullPage: true });
    await approveRelease(page); await expect(page.getByRole('heading', { name: 'Chapter Published!', exact: true })).toBeVisible();
    const firstSession = await api(request, `/books/${book.id}/chapters/${first}/edit-session`);
    const secondSession = await api(request, `/books/${book.id}/chapters/${second}/edit-session`);
    expect(firstSession.status).toBe('published'); expect(secondSession.status).toBe('published');
    const released = await api(request, `/books/${book.id}`); expect(released.publicationStatus).toBe('published'); expect(released.ageRating).toBe('TEEN_13');
});

test('stale review stays private then refreshes all earlier warning changes', async ({ page, request }) => {
    const book = await story(request, 'Stale review'); const first = await chapter(request, book.id, 'Before'); const second = await chapter(request, book.id, 'After');
    await editor(page, book.id, second); await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true }); await expect(review).toContainText('Chapter 1: Before');
    const before = await api(request, `/books/${book.id}/chapters/${first}/edit-session`);
    await api(request, `/books/${book.id}/chapters/${first}`, { data: { title: 'Changed before', content: '<p>New preceding manuscript.</p>' }, status: 'preserve', contentWarnings: ['STRONG_LANGUAGE'], expectedRevision: before.editRevision }, 'PATCH');
    await approveRelease(page); await expect(review).toContainText('The release changed since your review');
    expect((await api(request, `/books/${book.id}/chapters/${second}/edit-session`)).status).toBe('draft');
    expect((await api(request, `/books/${book.id}`)).publicationStatus).toBe('draft');
    await review.getByRole('button', { name: 'Refresh release review', exact: true }).click(); await expect(review).toContainText('Changed before');
    await expect(review).toContainText('Strong language'); await expect(review.getByRole('button', { name: 'Publish this release', exact: true })).toBeDisabled();
});

test('scheduled status is consistent and publishing a later chapter discloses its replaced release', async ({ page, request }) => {
    const book = await story(request, 'Scheduled release'); const first = await chapter(request, book.id, 'Opening'); const second = await chapter(request, book.id, 'Scheduled middle'); const third = await chapter(request, book.id, 'Final draft');
    await publish(request, book.id, first); const scheduledAt = new Date(Date.now() + 86400_000).toISOString();
    const middle = await api(request, `/books/${book.id}/chapters/${second}/edit-session`);
    await api(request, `/books/${book.id}/chapters/${second}/schedule`, { scheduledAt, expectedRevision: middle.editRevision }, 'PUT');
    await editor(page, book.id, second); await expect(page.locator('.ww-editor-context')).toContainText('Scheduled');
    await expect(page.locator('.ww-editor-title-block')).toContainText('Scheduled'); await expect(page.locator('.ww-editor-context')).toContainText(/in (1 day|24 hours)/);
    await expect(page.getByRole('button', { name: 'Cancel schedule', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/evidence/publishing/editor-scheduled-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Cancel schedule', exact: true }).click();
    await expect(page.locator('.ww-editor-context')).toContainText('Private draft');
    const cancelled = await api(request, `/books/${book.id}/chapters/${second}/edit-session`);
    expect(cancelled.status).toBe('draft'); expect(cancelled.scheduledAt).toBeNull();
    await api(request, `/books/${book.id}/chapters/${second}/schedule`, { scheduledAt, expectedRevision: cancelled.editRevision }, 'PUT');
    await editor(page, book.id, third); await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true }); await expect(review).toContainText('This schedule will be replaced by publication now');
    await expect(review).toContainText('Scheduled middle'); await approveRelease(page); await expect(page.getByRole('heading', { name: 'Chapter Published!', exact: true })).toBeVisible();
    expect((await api(request, `/books/${book.id}/chapters/${second}/edit-session`)).scheduledAt).toBeNull();
});

test('failed online save offers verified device leave and export when device storage is blocked', async ({ page, request }) => {
    const book = await story(request, 'Failed save'); const id = await chapter(request, book.id, 'Recoverable chapter'); await editor(page, book.id, id);
    await page.route(`**/api/books/${book.id}/chapters/${id}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Save interrupted for local verification.' }) }));
    await page.locator('.rte-content[contenteditable=true]').fill('This new manuscript must survive leaving without an online save.');
    await page.getByRole('button', { name: 'Back to story studio', exact: true }).click();
    const exit = page.getByRole('dialog', { name: 'Keep your draft before leaving', exact: true }); await expect(exit).toBeVisible();
    await expect(exit).toContainText('Your changes are not saved online'); await expect(exit.getByRole('button', { name: 'Discard changes and leave', exact: true })).toBeDisabled();
    await page.evaluate(() => { const set = Storage.prototype.setItem; (window as any).__draftStorageSet = set; Storage.prototype.setItem = function(key, value) { if (key.startsWith('ww:writer-draft:')) throw new DOMException('Blocked', 'QuotaExceededError'); return set.call(this, key, value); }; });
    await exit.getByRole('button', { name: 'Keep device draft and leave', exact: true }).click(); await expect(exit).toContainText('Device storage could not be verified');
    const download = page.waitForEvent('download'); await exit.getByRole('button', { name: 'Export manuscript', exact: true }).click(); expect((await download).suggestedFilename()).toBe('wordweft-device-draft.html');
    await page.screenshot({ path: 'test-results/evidence/publishing/editor-failed-save-exit.png', fullPage: true });
    await page.evaluate(() => { Storage.prototype.setItem = (window as any).__draftStorageSet; });
    await exit.getByRole('button', { name: 'Keep device draft and leave', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/write/book/${book.id}/manage$`));
    expect((await api(request, `/books/${book.id}/chapters/${id}/edit-session`)).content).not.toContain('This new manuscript');
    await editor(page, book.id, id); await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
});

test('two tabs with cloned session storage detect another save and preserve both drafts for deliberate comparison', async ({ page, context, request }) => {
    const book = await story(request, 'Concurrent sessions'); const id = await chapter(request, book.id, 'Shared chapter'); await editor(page, book.id, id);
    await page.evaluate(() => sessionStorage.setItem('ww:manuscript-session', 'cloned-session'));
    const other = await context.newPage(); await other.addInitScript(value => { localStorage.setItem('wordweft_jwt', value); sessionStorage.setItem('ww:manuscript-session', 'cloned-session'); }, token);
    await editor(other, book.id, id);
    await page.locator('.rte-content[contenteditable=true]').fill('Tab A saved manuscript.'); await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
    await expect(other.getByText('Another session saved this chapter. Compare its draft before replacing it.')).toBeVisible();
    await other.locator('.rte-content[contenteditable=true]').fill('Tab B independent manuscript.');
    await expect(other.getByText('Your version is still in the editor.', { exact: false })).toBeVisible({ timeout: 15_000 });
    expect((await api(request, `/books/${book.id}/chapters/${id}/edit-session`)).content).toContain('Tab A saved manuscript');
    await other.getByRole('button', { name: 'Compare server draft', exact: true }).click(); await expect(other.locator('.ww-server-draft-copy')).toContainText('Tab A saved manuscript');
    await expect(other.locator('.rte-content')).toContainText('Tab B independent manuscript');
    await other.getByRole('button', { name: 'Save my version over this server draft', exact: true }).click(); await expect(other.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
    const revisions = await api(request, `/books/${book.id}/chapters/${id}/revisions`); expect(revisions.some((item: any) => item.content.includes('Tab A saved manuscript'))).toBeTruthy();
    await other.close();
});

test('phone and theme preview use reader prose interactions and closing preserves manuscript selection', async ({ page, request }) => {
    const book = await story(request, 'Reading conditions');
    const id = await chapter(request, book.id, 'Reading conditions', [], '<p>A quiet river.</p><p><span data-spoiler="true">The secret</span> <span data-footnote="A note beside the river." data-footnote-index="1"></span></p>');
    await editor(page, book.id, id);
    await page.locator('.rte-content').evaluate(element => { const text = element.querySelector('p')!.firstChild!; const range = document.createRange(); range.setStart(text, 2); range.setEnd(text, 7); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range); });
    await page.getByRole('button', { name: 'Preview', exact: true }).click(); const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
    await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('phone'); await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('sepia');
    expect(await preview.locator('.ww-reading-preview-canvas').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(390);
    expect(await preview.getByRole('heading', { name: 'Reading conditions', exact: true }).evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    await preview.getByRole('button', { name: 'Reveal spoiler', exact: true }).click(); await expect(preview.getByRole('button', { name: 'Hide spoiler', exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Footnote 1', exact: true }).click(); await expect(preview).toContainText('A note beside the river.');
    await expect(preview.locator('.footnote-popup')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: 'test-results/evidence/publishing/editor-phone-sepia-preview.png', fullPage: true });
    const accessibility = await new AxeBuilder({ page }).include('.ww-editor-reader-preview').withTags(['wcag2a', 'wcag2aa']).analyze(); expect(accessibility.violations.map(item => item.id)).toEqual([]);
    await preview.getByRole('button', { name: 'Close reader preview', exact: true }).click();
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('quiet');
});

test('chapter manager releases also require the complete impact review', async ({ page, request }) => {
    const book = await story(request, 'Manager release'); const first = await chapter(request, book.id, 'Earlier manager draft', ['VIOLENCE']); const second = await chapter(request, book.id, 'Later manager draft');
    await page.goto(`/write/book/${book.id}/manage`);
    const row = page.locator('.ww-manage-chapter-card').filter({ has: page.getByText('Later manager draft', { exact: true }) });
    await row.getByLabel('Actions for Later manager draft', { exact: true }).click();
    await row.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true }); await expect(review).toContainText('Earlier manager draft'); await expect(review).toContainText('This private story becomes public'); await expect(review).toContainText('violence');
    await approveRelease(page); expect((await api(request, `/books/${book.id}/chapters/${first}/edit-session`)).status).toBe('published'); expect((await api(request, `/books/${book.id}/chapters/${second}/edit-session`)).status).toBe('published');
});

test('inline story guide saves refresh mentions without moving the manuscript cursor', async ({ page, request }) => {
    const book = await story(request, 'Guide continuity'); const id = await chapter(request, book.id, 'The guide chapter'); await editor(page, book.id, id);
    const prose = page.locator('.rte-content[contenteditable=true]'); await prose.click(); await page.keyboard.press('Control+Home'); await page.keyboard.press('ArrowRight');
    const caret = await prose.evaluate(element => { element.setAttribute('data-test-editor-identity', 'same-editor'); return getSelection()?.anchorOffset; });
    await page.getByRole('button', { name: 'Story guide', exact: true }).click(); const guide = page.getByRole('dialog', { name: 'Story guide', exact: true });
    await guide.getByRole('button', { name: 'Add or edit here', exact: true }).click(); await guide.getByRole('button', { name: /Add character/ }).click();
    await guide.getByRole('textbox', { name: /^Name/ }).fill('LocalGuideHero'); await guide.getByRole('button', { name: 'Save character', exact: true }).click();
    await expect(guide.getByText('LocalGuideHero', { exact: true })).toBeVisible(); await guide.getByRole('button', { name: 'Close story guide', exact: true }).click();
    expect(await prose.getAttribute('data-test-editor-identity')).toBe('same-editor'); await prose.focus(); expect(await prose.evaluate(() => getSelection()?.anchorOffset)).toBe(caret);
    await page.keyboard.type(' @LocalGuide'); await expect(page.getByRole('button', { name: /LocalGuideHero/ })).toBeVisible(); await page.keyboard.press('Enter');
    await expect(prose.locator('[data-type="mention"]')).toContainText('LocalGuideHero');
});
