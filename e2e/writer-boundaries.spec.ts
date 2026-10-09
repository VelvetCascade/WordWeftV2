import { test, expect, type Page, type APIRequestContext } from './fixtures';

test.use({ hasTouch: true });

async function manuscript(page: Page, request: APIRequestContext, width: number, content: string) {
    await page.setViewportSize({ width, height: 940 });
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy();
    const token = (await response.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Writer boundaries ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy();
    const book = (await created.json()).writtenBooks.find((entry: any) => entry.title === title);
    const chapter = crypto.randomUUID();
    expect((await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'Boundary journey', content }, status: 'preserve', expectedRevision: 0 } })).ok()).toBeTruthy();
    await page.addInitScript(token => {
        localStorage.setItem('wordweft_jwt', token);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    }, token);
    await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
    const editor = page.locator('.rte-content[contenteditable=true]');
    await expect(editor).toBeVisible();
    return { editor, cleanup: () => request.delete(`/api/books/${book.id}`, { headers }) };
}

test('the floating selection menu cannot intercept expanded toolbar controls at 320px', async ({ page, request }) => {
    const { editor, cleanup } = await manuscript(page, request, 320, '<p>Select these words beside the river.</p><p>Keep the next paragraph.</p>');
    try {
        await editor.locator('p').first().click();
        await editor.locator('p').first().evaluate(element => {
            const range = document.createRange(); range.selectNodeContents(element);
            const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        await expect(page.locator('.rte-bubble-menu')).toBeVisible();
        await page.locator('.rte-toolkit').getByRole('button', { name: /^More/ }).tap();
        const note = page.locator('.rte-toolkit').getByRole('button', { name: 'Add footnote', exact: true });
        await note.scrollIntoViewIfNeeded();
        expect(await note.evaluate(element => {
            const bounds = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
        })).toBeTruthy();
        await note.tap();
        const form = page.getByRole('dialog', { name: 'Add a footnote', exact: true });
        await expect(form).toBeVisible();
        await form.getByLabel('Note text').fill('The selected source.');
        await form.getByRole('button', { name: 'Add note', exact: true }).tap();
        await expect(editor.locator('[data-footnote]')).toHaveAttribute('data-footnote', 'The selected source.');
        await expect(editor).toContainText('Select these words beside the river.');
    } finally { await cleanup(); }
});

test('a quote saves and reopens with its formatting, note and attribution intact', async ({ page, request }) => {
    const { editor, cleanup } = await manuscript(page, request, 390, '<p>Before the quote.</p><p>Selected <strong>quote words</strong><span data-footnote="Quoted source." data-footnote-index="1">1</span>.</p><p>After the quote.</p>');
    try {
        const paragraph = editor.locator('p').nth(1); await paragraph.click();
        await paragraph.evaluate(element => {
            const range = document.createRange(); range.selectNodeContents(element);
            const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        await page.locator('.rte-toolkit').getByRole('button', { name: /^More/ }).click();
        await page.getByRole('button', { name: 'Pull quote or epigraph', exact: true }).click();
        await editor.locator('.pull-quote-cite').click(); await page.keyboard.type('The original source.');
        await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved');
        await page.reload(); await expect(editor).toBeVisible();
        await expect(editor.locator('.pull-quote-text strong')).toHaveText('quote words');
        await expect(editor.locator('[data-pullquote] [data-footnote]')).toHaveAttribute('data-footnote', 'Quoted source.');
        await expect(editor.locator('.pull-quote-cite')).toHaveText('The original source.');
        await editor.locator('.pull-quote-cite').click();
        await expect(page.getByRole('group', { name: 'Pull quote actions', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
        await expect(preview.locator('[data-pullquote] strong')).toHaveText('quote words');
        await expect(preview.locator('[data-pullquote] cite')).toHaveText('The original source.');
    } finally { await cleanup(); }
});

for (const width of [390, 1440]) {
    for (const kind of ['quote', 'details']) test(`selected prose becomes ${kind} without losing words or marks at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await manuscript(page, request, width, '<p>Before the passage.</p><p>Keep these <strong>important words</strong> beside the river.</p><p>After the passage.</p>');
        try {
            const prose = editor.locator('p').nth(1);
            await prose.click();
            await prose.evaluate(element => {
                const range = document.createRange(); range.selectNodeContents(element);
                const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
                document.dispatchEvent(new Event('selectionchange'));
            });
            await expect(page.locator('.rte-bubble-menu')).toBeVisible();
            await page.locator('.rte-toolkit').getByRole('button', { name: /^More/ }).click();
            await page.locator('.rte-toolkit').getByRole('button', { name: kind === 'quote' ? 'Pull quote or epigraph' : 'Collapsible section', exact: true }).click();
            const block = editor.locator(kind === 'quote' ? '[data-pullquote] .pull-quote-text' : '[data-details-content]');
            await expect(block).toHaveText('Keep these important words beside the river.');
            await expect(block.locator('strong')).toHaveText('important words');
            await expect(editor).toContainText('Before the passage.');
            await expect(editor).toContainText('After the passage.');
            await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).click();
            await expect(editor.locator(kind === 'quote' ? '[data-pullquote]' : 'details')).toHaveCount(0);
            await expect(editor.locator('p').nth(1)).toHaveText('Keep these important words beside the river.');
            await expect(editor.locator('p').nth(1).locator('strong')).toHaveText('important words');
        } finally { await cleanup(); }
    });

    test(`Backspace in an empty quote never deletes its attribution at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await manuscript(page, request, width, '<p>Before the quote.</p><blockquote data-pullquote="true"><p></p><cite>Keep this attribution.</cite></blockquote><p>After the quote.</p>');
        try {
            await editor.locator('.pull-quote-text').click();
            await page.keyboard.press('Home'); await page.keyboard.press('Backspace');
            await expect(editor).toContainText('Keep this attribution.');
            await expect(editor).toContainText('Before the quote.');
            await expect(editor).toContainText('After the quote.');
        } finally { await cleanup(); }
    });

    test(`Enter inside an empty nested table cell retains the passage atmosphere at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await manuscript(page, request, width, '<p>Before the table.</p><div data-mood="tense"><table><tbody><tr><td><p></p></td><td><p>Keep this cell.</p></td></tr></tbody></table></div><p>After the table.</p>');
        try {
            await editor.locator('td p').first().click(); await page.keyboard.press('Enter');
            await expect(editor.locator('[data-mood=tense] table')).toHaveCount(1);
            await expect(editor.locator('td').last()).toHaveText('Keep this cell.');
            await expect(page.getByRole('group', { name: 'Current passage atmosphere' })).toContainText('Tense atmosphere');
        } finally { await cleanup(); }
    });

    test(`structure-bound quote and summary fields do not offer impossible heading changes at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await manuscript(page, request, width, '<blockquote data-pullquote="true"><p>Quoted words.</p><cite>Attribution.</cite></blockquote><details open><summary>Summary.</summary><div data-details-content><p>Normal body.</p></div></details>');
        try {
            const style = page.getByRole('combobox', { name: 'Text style', exact: true });
            for (const selector of ['.pull-quote-text', '.pull-quote-cite', 'summary']) {
                await editor.locator(selector).click(); await expect(style, selector).toBeDisabled();
            }
            await editor.locator('[data-details-content] p').click(); await expect(style).toBeEnabled();
            await style.selectOption('heading-2');
            await expect(editor.locator('[data-details-content] h2')).toHaveText('Normal body.');
        } finally { await cleanup(); }
    });

    test(`Enter beside a footnote-only paragraph keeps the note and its atmosphere at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await manuscript(page, request, width, '<p>Before the passage.</p><div data-mood="tense"><p>Keep the passage.</p><p><span data-footnote="Keep this source." data-footnote-index="1">1</span></p></div><p>After the passage.</p>');
        try {
            const paragraph = editor.locator('[data-mood] > p').last();
            await paragraph.click();
            await paragraph.evaluate(element => {
                const range = document.createRange(); range.selectNodeContents(element); range.collapse(false);
                const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
                document.dispatchEvent(new Event('selectionchange'));
            });
            await page.keyboard.press('Enter');
            await expect(editor.locator('[data-footnote="Keep this source."]')).toHaveCount(1);
            await expect(editor.locator('[data-mood=tense] [data-footnote]')).toHaveCount(1);
            await expect(editor).toContainText('Keep the passage.');
        } finally { await cleanup(); }
    });
}
