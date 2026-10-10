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
    const user = await api(request, '/books', { title, description: 'Disposable publication review test.', summary: 'A local manuscript.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://127.0.0.1:3000/design-v2/assets/met-53681.jpg' });
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
    await approveRelease(page); await expect(page.getByRole('heading', { name: 'Chapter published', exact: true })).toBeVisible();
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
    await expect(page.locator('.ww-editor-title-block')).toContainText('Scheduled'); await expect(page.locator('.ww-editor-detail-section').first()).toContainText(/in (1 day|24 hours)/);
    await expect(page.getByRole('button', { name: 'Cancel schedule', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/evidence/publishing/editor-scheduled-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Cancel schedule', exact: true }).click();
    await expect(page.locator('.ww-editor-context')).toContainText('Private draft');
    const cancelled = await api(request, `/books/${book.id}/chapters/${second}/edit-session`);
    expect(cancelled.status).toBe('draft'); expect(cancelled.scheduledAt).toBeNull();
    await api(request, `/books/${book.id}/chapters/${second}/schedule`, { scheduledAt, expectedRevision: cancelled.editRevision }, 'PUT');
    await editor(page, book.id, third); await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true }); await expect(review).toContainText('This schedule will be replaced by publication now');
    await expect(review).toContainText('Scheduled middle'); await approveRelease(page); await expect(page.getByRole('heading', { name: 'Chapter published', exact: true })).toBeVisible();
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
    const download = page.waitForEvent('download'); await exit.getByRole('button', { name: 'Export manuscript', exact: true }).click(); expect((await download).suggestedFilename()).toBe('Recoverable chapter.html');
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

test('phone preview matches the live reader typography and paper without visiting the reader first', async ({ page, context, request }) => {
    const book = await story(request, 'Preview fidelity');
    const id = await chapter(request, book.id, 'The house beside the river', [], '<p>Before the train arrived, Mara waited beside the quiet river. The evening light settled on the water, and every window in the village began to glow.</p><p>She unfolded the letter again. Between its familiar lines was a promise she had almost forgotten.</p>');
    await editor(page, book.id, id);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
    await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('phone');
    const reader = await context.newPage();
    try {
        await reader.setViewportSize({ width: 390, height: 844 });
        await reader.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
        await expect(reader.locator('.reader-chapter-intro h1')).toBeVisible();
        const liveType = await reader.locator('.reader-chapter-intro h1').evaluate(element => ({ size: getComputedStyle(element).fontSize, align: getComputedStyle(element).textAlign }));
        await expect(preview.locator('.reader-chapter-intro h1')).toHaveCSS('font-size', liveType.size);
        await expect(preview.locator('.reader-chapter-intro h1')).toHaveCSS('text-align', liveType.align);
        await reader.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
        for (const [theme, label] of [['light', 'Paper'], ['sepia', 'Sepia'], ['dark', 'Night']]) {
            await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption(theme);
            await reader.getByRole('button', { name: label, exact: true }).click();
            await expect(reader.locator('.reader-experience')).toHaveClass(new RegExp(`reader-theme-${theme}`));
            // The live reader has a short theme transition; wait for its paper
            // to settle before comparing the two independently mounted screens.
            const previewPaper = await preview.locator('.ww-reading-preview-canvas').evaluate(element => getComputedStyle(element).backgroundColor);
            await expect(reader.locator('.reader-experience')).toHaveCSS('background-color', previewPaper);
            const livePaper = await reader.locator('.reader-experience').evaluate(element => getComputedStyle(element).backgroundColor);
            await expect(preview.locator('.ww-reading-preview-canvas')).toHaveCSS('background-color', livePaper);
        }
        const bodyGap = await preview.evaluate(element => element.querySelector('.reader-copy')!.getBoundingClientRect().top - element.querySelector('h1')!.getBoundingClientRect().bottom);
        expect(bodyGap).toBeLessThanOrEqual(72);
        await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('sepia');
        await page.screenshot({ path: 'test-results/evidence/publishing/editor-refined-phone-preview.png', fullPage: true });
        await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('desktop');
        await page.screenshot({ path: 'test-results/evidence/publishing/editor-refined-desktop-preview.png', fullPage: true });
    } finally { await reader.close(); }
});

test('preview footnotes stay inside the phone canvas and Escape closes the note before the preview', async ({ page, request }) => {
    const book = await story(request, 'Footnote edges');
    const id = await chapter(request, book.id, 'A letter at dusk', [], '<p>At dusk, Mara followed the river home. Every turn brought her closer to the house she remembered.</p><p style="text-align: right">A small detail<span data-footnote="This note belongs to the last words on the line." data-footnote-index="1"></span></p><p>Morning would bring another letter.</p>');
    await editor(page, book.id, id);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
    await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('phone');
    await preview.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    await expect(preview.locator('.footnote-popup')).toHaveCSS('opacity', '1');
    const bounds = await preview.evaluate(element => { const canvas = element.querySelector('.ww-reading-preview-canvas')!.getBoundingClientRect(); const note = element.querySelector('.footnote-popup')!.getBoundingClientRect(); return { left: note.left - canvas.left, right: canvas.right - note.right }; });
    expect(bounds.left).toBeGreaterThanOrEqual(8);
    expect(bounds.right).toBeGreaterThanOrEqual(8);
    await page.keyboard.press('Escape');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.footnote-popup')).toHaveCount(0);
    await preview.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    await preview.getByRole('combobox', { name: 'Appearance', exact: true }).click();
    await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('dark');
    await expect(preview.locator('.footnote-popup')).toHaveCount(0);
    await preview.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    await expect(preview.locator('.footnote-popup')).toHaveCSS('opacity', '1');
    const accessibility = await new AxeBuilder({ page }).include('.ww-editor-reader-preview').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, failure: node.failureSummary })) }))).toEqual([]);
    await preview.getByRole('button', { name: 'Close reader preview', exact: true }).click();
    await expect(preview).toHaveCount(0);
});

test('published reader footnotes remain readable and tappable above following paragraphs', async ({ page, request }) => {
    const book = await story(request, 'Reader notes');
    const id = await chapter(request, book.id, 'At the river', [], `<p>Mara waited at the river. The evening light settled on the water.</p><p style="text-align:right">A final detail<span data-footnote="${'A letter sent home in spring, before the river rose. '.repeat(4)}" data-footnote-index="1"></span></p><p>${'She followed the path along the river and thought of home. '.repeat(12)}</p>`);
    await publish(request, book.id, id);
    const login = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': testAddress } });
    expect(login.ok()).toBeTruthy();
    await page.addInitScript(value => localStorage.setItem('wordweft_jwt', value), (await login.json()).token);
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`/book/${book.id}/chapter/${id}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    await page.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    const note = page.getByRole('note', { name: 'Footnote 1', exact: true });
    await expect(note).toContainText('A letter sent home in spring');
    expect(await note.evaluate(element => { const rect = element.getBoundingClientRect(); const header = element.querySelector('.footnote-popup-header')!.getBoundingClientRect(); return element.contains(document.elementFromPoint(rect.left + 20, header.bottom + 20)); })).toBeTruthy();
    // Older backend deployments can still use the cipher typography scope;
    // note attributes are ordinary text and must retain their own fonts.
    await page.locator('.reader-copy').evaluate(element => { element.classList.add('has-cipher-font'); (element as HTMLElement).style.setProperty('--reader-cipher-font', 'WW-Cipher-Serif-1'); });
    for (const selector of ['.footnote-popup-body', '.footnote-popup-badge']) {
        expect(await note.locator(selector).evaluate(element => getComputedStyle(element).fontFamily)).not.toMatch(/Cipher/i);
    }
    await page.locator('.reader-copy').evaluate(element => { element.classList.remove('has-cipher-font'); (element as HTMLElement).style.removeProperty('--reader-cipher-font'); });
    const bounds = await note.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(8); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(382);
    await page.screenshot({ path: 'test-results/evidence/publishing/reader-refined-footnote.png', fullPage: true });
    const close = note.getByRole('button', { name: 'Close footnote', exact: true });
    expect(await close.evaluate(element => { const rect = element.getBoundingClientRect(); const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2; return [[x, y], [rect.left + 4, y], [rect.right - 4, y], [x, rect.top + 4], [x, rect.bottom - 4]].every(([px, py]) => element.contains(document.elementFromPoint(px, py))); })).toBeTruthy();
    await close.click(); await expect(note).toHaveCount(0);
    await page.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    await page.keyboard.press('Escape'); await expect(note).toHaveCount(0);
    await page.getByRole('button', { name: 'Footnote 1', exact: true }).click();
    const appearance = page.getByRole('button', { name: 'Reading appearance and themes', exact: true });
    await appearance.focus(); await page.keyboard.press('Enter');
    const preferences = page.getByRole('dialog', { name: 'Reading preferences', exact: true });
    await expect(preferences).toBeVisible();
    await expect(note).toHaveCount(0);
    expect(await preferences.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Escape'); await expect(preferences).toHaveCount(0); await expect(appearance).toBeFocused();
});

test('preview preserves paragraph rhythm and formatting inside mood and disclosure blocks', async ({ page, request }) => {
    const book = await story(request, 'Formatted preview');
    const id = await chapter(request, book.id, 'The rain begins', [], '<p>The first letter arrived on a quiet morning.</p><p>The second came with the rain.</p><div data-mood="serene"><p>A river can carry a thousand stories.</p><p style="text-align:right">This one was hers.</p></div><details><summary>Another detail</summary><p>A memory worth keeping.</p><p>A promise worth remembering.</p></details>');
    await editor(page, book.id, id);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
    await expect(preview.locator('.reader-copy .reader-comment-block')).toHaveCount(6);
    await preview.locator('summary').click();
    for (const selector of ['.reader-copy > .reader-comment-block', '[data-mood] .reader-comment-block', 'details .reader-comment-block']) {
        const gap = await preview.locator(selector).evaluateAll(elements => elements[1].getBoundingClientRect().top - elements[0].getBoundingClientRect().bottom);
        expect(gap).toBeGreaterThanOrEqual(24);
    }
    await expect(preview.locator('[data-mood] p').last()).toHaveCSS('text-align', 'right');
    await expect(preview.locator('[data-mood]')).toHaveAttribute('data-mood', 'serene');
    await preview.getByRole('button', { name: 'Close reader preview', exact: true }).click();
    await expect(page.locator('.rte-content')).toContainText('A promise worth remembering.');
});

test.describe('preview on touch screens', () => {
    test.use({ hasTouch: true });
    for (const width of [320, 390]) {
        test(`table actions stay inside their cell beside tappable notes at ${width} px`, async ({ page, request }) => {
            const book = await story(request, 'Table annotations');
            const id = await chapter(request, book.id, 'Letters along the river', [], '<p>Mara kept a list of the places she had visited.</p><table><tbody><tr><td><p>Harbor</p></td><td><p>River<span data-footnote="A quiet village beside the water." data-footnote-index="3"></span></p></td></tr></tbody></table>');
            await publish(request, book.id, id);
            await page.setViewportSize({ width, height: 844 });
            await page.goto(`/book/${book.id}/chapter/${id}`);
            const cells = page.locator('.reader-copy td');
            await expect(cells).toHaveCount(2);
            const header = await page.locator('.reader-header').evaluate(element => {
                const back = element.querySelector('.reader-back-button')!.getBoundingClientRect(), actions = element.querySelector('.reader-header-actions')!.getBoundingClientRect();
                return { separate: back.right <= actions.left, actionWidths: Array.from(element.querySelectorAll('.reader-header-actions button')).filter(button => button.getClientRects().length).map(button => button.getBoundingClientRect().width) };
            });
            expect(header.separate).toBeTruthy(); expect(header.actionWidths.every(width => width >= 44)).toBeTruthy();
            await cells.first().locator('p').tap();
            const comment = cells.first().locator('.reader-comment-button');
            const action = await comment.boundingBox(), cell = await cells.first().boundingBox();
            expect(action!.x).toBeGreaterThanOrEqual(cell!.x); expect(action!.x + action!.width).toBeLessThanOrEqual(cell!.x + cell!.width);
            const marker = cells.last().getByRole('button', { name: 'Footnote 3', exact: true });
            expect(await marker.evaluate(element => { const rect = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)); })).toBeTruthy();
            await marker.tap();
            const note = page.getByRole('note', { name: 'Footnote 3', exact: true }); await expect(note).toBeVisible();
            await note.getByRole('button', { name: 'Close footnote', exact: true }).tap();
            await expect(note).toHaveCount(0);
            await page.screenshot({ path: `test-results/evidence/publishing/reader-table-touch-${width}.png`, fullPage: true });
            await marker.tap(); await expect(note).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        });
    }
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
        test(`preview controls and long notes remain reachable at ${viewport.width} × ${viewport.height}`, async ({ page, request }) => {
            await page.setViewportSize(viewport);
            const book = await story(request, 'Touch preview');
            const id = await chapter(request, book.id, 'The letter she left beside the river at the end of a long summer', [], `<p>Mara opened the window and listened to the rain. The river had carried a thousand stories past this house, but tonight it felt as though it was waiting for hers.</p><p style="text-align:right">A detail worth keeping<span data-footnote="${'A longer note should stay readable, with its close control in reach. '.repeat(18)}" data-footnote-index="1"></span></p><p>${'She followed the path toward the water and thought of home. '.repeat(14)}</p>`);
            await editor(page, book.id, id);
            await page.getByRole('button', { name: 'Preview', exact: true }).tap();
            const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
            await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('phone');
            await page.evaluate(() => document.documentElement.classList.add('dark'));
            await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('light');
            await expect(preview.locator('.ww-reading-preview-canvas')).toHaveCSS('background-color', 'rgb(251, 250, 247)');
            const layout = await preview.evaluate(element => {
                const box = element.getBoundingClientRect();
                const canvas = element.querySelector('.ww-reading-preview-canvas') as HTMLElement;
                return { dialogFits: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, horizontalOverflow: element.scrollWidth > element.clientWidth || canvas.scrollWidth > canvas.clientWidth, canvasHeight: canvas.clientHeight, closeHeight: element.querySelector('[aria-label="Close reader preview"]')!.getBoundingClientRect().height };
            });
            expect(layout.dialogFits).toBeTruthy(); expect(layout.horizontalOverflow).toBeFalsy(); expect(layout.canvasHeight).toBeGreaterThan(140); expect(layout.closeHeight).toBeGreaterThanOrEqual(44);
            await preview.getByRole('button', { name: 'Footnote 1', exact: true }).tap();
            await expect(preview.getByRole('note', { name: 'Footnote 1', exact: true })).toBeVisible();
            const note = preview.locator('.footnote-popup');
            expect(await note.evaluate(element => element.scrollHeight > element.clientHeight)).toBeTruthy();
            await note.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await preview.getByRole('button', { name: 'Close footnote', exact: true }).tap();
            await expect(note).toHaveCount(0);
            await preview.locator('.ww-reading-preview-canvas').evaluate(element => { element.scrollTop = 0; });
            await page.screenshot({ path: `test-results/evidence/publishing/editor-preview-touch-${viewport.width}.png`, fullPage: true });
            const accessibility = await new AxeBuilder({ page }).include('.ww-editor-reader-preview').withTags(['wcag2a', 'wcag2aa']).analyze(); expect(accessibility.violations.map(item => item.id)).toEqual([]);
            await preview.getByRole('button', { name: 'Close reader preview', exact: true }).tap();
            await expect(preview).toHaveCount(0);
            await page.getByRole('button', { name: 'Publish', exact: true }).tap();
            const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
            await expect(review).toBeVisible();
            expect(await review.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
            await page.screenshot({ path: `test-results/evidence/publishing/editor-review-touch-${viewport.width}.png`, fullPage: true });
        });
    }
});

test('chapter manager releases also require the complete impact review', async ({ page, request }) => {
    const book = await story(request, 'Manager release'); const first = await chapter(request, book.id, 'Earlier manager draft', ['VIOLENCE']); const second = await chapter(request, book.id, 'Later manager draft');
    await page.goto(`/write/book/${book.id}/manage`);
    const row = page.locator('.ww-manage-chapter-card').filter({ has: page.getByText('Later manager draft', { exact: true }) });
    await row.getByLabel('Actions for Later manager draft', { exact: true }).click();
    await row.getByRole('button', { name: 'Publish', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true }); await expect(review).toContainText('Earlier manager draft'); await expect(review).toContainText('This private story becomes public'); await expect(review).toContainText(/violence/i);
    await approveRelease(page);
    await expect.poll(async () => (await api(request, `/books/${book.id}/chapters/${first}/edit-session`)).status).toBe('published');
    expect((await api(request, `/books/${book.id}/chapters/${second}/edit-session`)).status).toBe('published');
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
