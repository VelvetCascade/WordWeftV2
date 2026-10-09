import { test, expect, type Page } from './fixtures';

test.use({ hasTouch: true });

const manuscript = '<h2>Arrival</h2><p>The moon arrived.</p><div data-mood="tense"><p>The <strong>moon</strong> waited.</p><p>A letter remained.</p></div><hr><p>Beyond the station.</p>';
async function selectParagraphs(page: Page, first: number, last: number) {
    const editor = page.locator('.rte-content[contenteditable=true]');
    await editor.locator('p').nth(first).click();
    await editor.evaluate((element, { first, last }) => {
        const paragraphs = element.querySelectorAll('p');
        const range = document.createRange();
        range.setStart(paragraphs[first].firstChild!, 0);
        range.setEnd(paragraphs[last].lastChild!, paragraphs[last].lastChild!.textContent!.length);
        const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
    }, { first, last });
    await expect(page.locator('.rte-bubble-menu')).toBeVisible();
}

test('opening a formatted chapter and empty navigation panels never changes or autosaves the manuscript', async ({ page, request }) => {
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Unchanged editor ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, description: 'Disposable unchanged manuscript test.', ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy();
    const book = (await created.json()).writtenBooks.find((item: any) => item.title === title);
    const chapter = crypto.randomUUID();
    const content = '<p>Opening words.</p><p>Second paragraph.</p><div data-mood="serene"><p>The river waited.</p><p>Another quiet moment.</p></div><details open><summary>A remembered detail</summary><div data-details-content><p>A marked <strong>memory</strong>.</p><p>The final promise.</p></div></details>';
    try {
        expect((await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'A saved chapter', content }, status: 'preserve', expectedRevision: 0 } })).ok()).toBeTruthy();
        const baseline = await (await request.get(`/api/books/${book.id}/chapters/${chapter}/edit-session`, { headers })).json();
        let writes = 0;
        page.on('request', req => { if (req.method() === 'PATCH' && new URL(req.url()).pathname === `/api/books/${book.id}/chapters/${chapter}`) writes++; });
        await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
        await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
        const editor = page.locator('.rte-content[contenteditable=true]');
        await expect(editor).toBeVisible();
        await expect(editor.locator('p')).toHaveCount(6);
        const loaded = await editor.innerHTML();
        await page.getByRole('button', { name: 'Find and replace', exact: true }).click();
        await page.getByRole('button', { name: 'Close find and replace', exact: true }).click();
        await page.getByRole('button', { name: 'Outline', exact: true }).click();
        await page.getByRole('button', { name: 'Close outline', exact: true }).click();
        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
        await expect(preview.locator('.reader-copy .reader-comment-block')).toHaveCount(6);
        await preview.getByRole('button', { name: 'Close reader preview', exact: true }).click();
        // Cover the editor's debounce window; an accidental mount transaction must
        // not advance the saved revision or send a manuscript write in this time.
        await page.waitForTimeout(1800);
        await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved');
        expect(await editor.innerHTML()).toBe(loaded);
        expect(writes).toBe(0);
        const unchanged = await (await request.get(`/api/books/${book.id}/chapters/${chapter}/edit-session`, { headers })).json();
        expect(unchanged.content).toBe(baseline.content);
        expect(typeof baseline.editRevision).toBe('number');
        expect(unchanged.editRevision).toBe(baseline.editRevision);
    } finally { await request.delete(`/api/books/${book.id}`, { headers }); }
});

for (const width of [320, 1440]) test(`writer toolkit preserves prose, offers direct mood actions and navigates at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 940 });
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' });
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Editor toolkit ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, description: 'Disposable toolkit test.', ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy();
    const book = (await created.json()).writtenBooks.find((item: any) => item.title === title);
    const chapter = crypto.randomUUID();
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    try {
        expect((await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'The moon', content: manuscript }, status: 'preserve', expectedRevision: 0 } })).ok()).toBeTruthy();
        await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
        await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
        const editor = page.locator('.rte-content[contenteditable=true]'); await expect(editor).toBeVisible();
        const text = await editor.textContent();
        const toolbar = page.locator('.rte-toolkit');
        const undo = toolbar.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true });
        const redo = toolbar.getByRole('button', { name: 'Redo (Ctrl/Cmd+Shift+Z)', exact: true });
        const rectangle = await undo.boundingBox(); expect(rectangle!.x).toBeGreaterThanOrEqual(0); expect(rectangle!.x + rectangle!.width).toBeLessThanOrEqual(width);
        await selectParagraphs(page, 0, 1);
        const bubbleAtmosphere = page.getByRole('button', { name: 'Set atmosphere for selection', exact: true });
        if (width === 320) await bubbleAtmosphere.tap(); else await bubbleAtmosphere.click();
        const picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
        await expect(picker).toContainText('Partial paragraphs are included in full');
        await picker.getByRole('button', { name: 'Romantic', exact: true }).click();
        await expect(editor.locator('[data-mood] [data-mood]')).toHaveCount(0);
        await expect(editor.locator('[data-mood=romantic] p')).toHaveCount(2);
        await expect(editor.locator('[data-mood=tense]')).toHaveText('A letter remained.');
        expect(await editor.textContent()).toBe(text);
        await expect(editor.locator('strong')).toHaveText('moon');
        await undo.click(); await expect(editor.locator('[data-mood=romantic]')).toHaveCount(0);
        await redo.click(); await expect(editor.locator('[data-mood=romantic] p')).toHaveCount(2);
        await editor.locator('[data-mood=romantic] p').first().click();
        const removeAtmosphere = toolbar.getByRole('button', { name: 'Remove atmosphere', exact: true });
        if (width === 320) await removeAtmosphere.tap(); else await removeAtmosphere.click();
        await expect(editor.locator('[data-mood=romantic]')).toHaveCount(0); expect(await editor.textContent()).toBe(text);
        await undo.click(); await expect(editor.locator('[data-mood=romantic]')).toHaveCount(1);
        await editor.locator('[data-mood=romantic] p').first().click();
        await toolbar.getByRole('button', { name: 'Continue without atmosphere', exact: true }).click();
        await page.keyboard.type('Neutral words.');
        await expect(editor.locator('[data-mood]').filter({ hasText: 'Neutral words.' })).toHaveCount(0);
        await editor.click(); await page.keyboard.press('Control+f');
        const find = page.getByRole('region', { name: 'Find and replace', exact: true }); await expect(find).toBeVisible();
        await find.getByLabel('Find', { exact: true }).fill('moon');
        await expect(find).toContainText('1 of 2 matches');
        await expect(editor.locator('.rte-find-match')).toHaveCount(2);
        await find.getByRole('button', { name: 'Next match', exact: true }).click(); await expect(find).toContainText('2 of 2 matches');
        await find.getByLabel('Replace', { exact: true }).fill('sun');
        await find.getByRole('button', { name: 'Replace all', exact: true }).click();
        await expect(editor.locator('strong')).toHaveText('moon');
        await find.getByRole('button', { name: 'Confirm replace all', exact: true }).click();
        await expect(editor.locator('strong')).toHaveText('sun');
        await expect(find).toContainText('2 matches replaced');
        await find.getByRole('button', { name: 'Close find and replace', exact: true }).click();
        await undo.click(); await expect(editor.locator('strong')).toHaveText('moon');
        await toolbar.getByRole('button', { name: 'Outline', exact: true }).click();
        const outline = page.getByRole('region', { name: 'Chapter outline', exact: true });
        await expect(outline).toContainText('Arrival'); await expect(outline).toContainText('Scene 2');
        await outline.getByRole('button', { name: 'Arrival H2', exact: true }).click(); await expect(editor).toBeFocused();
        await outline.getByRole('button', { name: 'Close outline', exact: true }).click();
        // Keyboard link shortcut opens a focus-trapped form; no native prompt.
        await selectParagraphs(page, 0, 0); await page.keyboard.press('Control+k');
        const link = page.getByRole('dialog', { name: 'Add a link', exact: true }); await expect(link).toBeVisible();
        await expect(link.getByLabel('Web address')).toBeFocused();
        await link.getByLabel('Web address').fill('example.com'); await link.getByRole('button', { name: 'Save link' }).click();
        await expect(editor.locator('a[href="https://example.com"]')).toHaveText('The moon arrived.');
        const more = toolbar.getByRole('button', { name: 'More', exact: false }).filter({ hasText: 'More' }).last();
        await more.click();
        await toolbar.getByRole('button', { name: 'Add footnote', exact: true }).click();
        const note = page.getByRole('dialog', { name: 'Add a footnote', exact: true }); await note.getByLabel('Note text').fill('A source for the moon.');
        await note.getByRole('button', { name: 'Add note', exact: true }).click();
        await expect(editor.locator('[data-footnote]')).toHaveAttribute('data-footnote', 'A source for the moon.');
        await expect(editor).toContainText('The moon arrived.');
        // Block formatting can be removed without deleting its summary or prose.
        await toolbar.getByRole('button', { name: 'Collapsible section', exact: true }).click();
        const details = editor.locator('details'); await expect(details).toHaveCount(1);
        await details.locator('p').click(); await page.keyboard.type('Keep this section prose.');
        await toolbar.getByRole('button', { name: 'Remove block formatting', exact: true }).click();
        await expect(details).toHaveCount(0);
        await expect(editor).toContainText('Click to expand'); await expect(editor).toContainText('Keep this section prose.');
        await undo.click(); await expect(details).toContainText('Keep this section prose.');
        await details.locator('p').click();
        await toolbar.getByRole('button', { name: 'Continue after block', exact: true }).click();
        await page.keyboard.type('Outside the section.');
        await expect(details).not.toContainText('Outside the section.');
        if (await more.getAttribute('aria-expanded') === 'true') await more.click();
        await page.screenshot({ path: `/tmp/ww-editor-tools-${width}.png`, fullPage: false });
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await toolbar.getByRole('button', { name: 'Find and replace', exact: true }).click();
        await find.getByLabel('Find', { exact: true }).fill('moon');
        await expect(find).toContainText('2 matches');
        await page.screenshot({ path: `/tmp/ww-editor-tools-dark-${width}.png`, fullPage: false });
        await find.getByRole('button', { name: 'Close find and replace', exact: true }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        expect(errors).toEqual([]);
    } finally { await request.delete(`/api/books/${book.id}`, { headers }); }
});
