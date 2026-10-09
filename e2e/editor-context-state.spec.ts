import { test, expect, type Page, type APIRequestContext } from './fixtures';

test.use({ hasTouch: true });

const manuscript = '<h1>First heading</h1><h2>Second heading</h2><h3>Third heading</h3><p>Plain opening.</p><div data-mood="tense"><p>Storm passage.</p></div><p>Between the passages.</p><div data-mood="romantic"><p>Petal passage.</p></div><p>Plain ending.</p><p><strong>Bold words</strong> and <em>italic words</em> and <u>underlined words</u> and <s>struck words</s> and <code>inline code</code> and <span data-spoiler="true">secret words</span> and <a href="https://example.com">linked words</a>.</p><blockquote><p>Quoted words.</p></blockquote><pre><code>Code words.</code></pre><ul><li><p>List words.</p></li></ul><table><tbody><tr><td><p>Cell words.</p></td><td><p>Other cell.</p></td></tr></tbody></table><p>After the table.</p>';

async function openManuscript(page: Page, request: APIRequestContext, width: number, content = manuscript) {
    await page.setViewportSize({ width, height: 940 });
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Editor context ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy();
    const book = (await created.json()).writtenBooks.find((item: any) => item.title === title);
    const chapter = crypto.randomUUID();
    expect((await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'Context journey', content }, status: 'preserve', expectedRevision: 0 } })).ok()).toBeTruthy();
    await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
    await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
    const editor = page.locator('.rte-content[contenteditable=true]');
    await expect(editor).toBeVisible();
    return { editor, cleanup: () => request.delete(`/api/books/${book.id}`, { headers }) };
}

async function selectWords(page: Page, selector: string) {
    const target = page.locator(`.rte-content ${selector}`);
    await target.click();
    await target.evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
    });
    await expect(page.locator('.rte-bubble-menu')).toBeVisible();
}

async function chooseImage(page: Page) {
    await page.locator('.rte-toolkit').getByRole('button', { name: /^More/ }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; canvas.getContext('2d')!.fillRect(0, 0, 256, 256); return canvas.toDataURL('image/png').split(',')[1]; });
    await (await chooser).setFiles({ name: 'writing-fixture.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    const crop = page.getByRole('dialog', { name: 'Crop Chapter Image' });
    await expect(crop).toBeVisible();
    await expect(crop.getByRole('button', { name: 'Use cropped image', exact: true })).toBeEnabled();
    await expect(crop.getByRole('button', { name: 'Cancel cropping' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    expect(await crop.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
    await crop.getByRole('button', { name: 'Use cropped image', exact: true }).click();
}

for (const width of [390, 1440]) {
    test(`heading control follows cursor, commands and undo immediately at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await openManuscript(page, request, width);
        try {
            const style = page.getByRole('combobox', { name: 'Text style', exact: true });
            for (const [selector, value] of [['h1', 'heading-1'], ['h2', 'heading-2'], ['h3', 'heading-3'], ['p', 'paragraph']]) {
                await editor.locator(selector).first().click();
                await expect(style).toHaveValue(value);
            }
            await editor.locator('h2').click();
            await style.selectOption('heading-1');
            await expect(style).toHaveValue('heading-1');
            await expect(editor.locator('h1').filter({ hasText: 'Second heading' })).toBeVisible();
            await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).click();
            await expect(style).toHaveValue('heading-2');
            await page.getByRole('button', { name: 'Redo (Ctrl/Cmd+Shift+Z)', exact: true }).click();
            await expect(style).toHaveValue('heading-1');
        } finally { await cleanup(); }
    });

    test(`atmosphere actions follow the exact passage and disappear outside it at ${width}`, async ({ page, request }) => {
        const { editor, cleanup } = await openManuscript(page, request, width);
        try {
            const context = page.getByRole('group', { name: 'Current passage atmosphere', exact: true });
            const original = await editor.innerHTML();
            await editor.locator('[data-mood=tense] p').click();
            await expect(context).toBeVisible(); await expect(context).toContainText('Tense atmosphere');
            await editor.getByText('Between the passages.', { exact: true }).click();
            await expect(context).toBeHidden();
            await editor.locator('[data-mood=romantic] p').click();
            await expect(context).toBeVisible(); await expect(context).toContainText('Romantic atmosphere');
            await page.screenshot({ path: `/tmp/ww-writer-context-${width}.png`, fullPage: false });
            await context.getByRole('button', { name: 'Change atmosphere', exact: true }).click();
            const picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
            await expect(picker.getByRole('button', { name: 'Romantic', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await picker.getByRole('button', { name: 'Close atmosphere picker', exact: true }).click();
            await editor.getByText('Plain ending.', { exact: true }).click();
            await expect(context).toBeHidden();
            expect(await editor.innerHTML()).toBe(original);
            await editor.locator('[data-mood=romantic] p').click();
            await context.getByRole('button', { name: 'Remove atmosphere', exact: true }).click();
            await expect(editor.locator('[data-mood=romantic]')).toHaveCount(0);
            await expect(editor.locator('[data-mood=tense]')).toHaveText('Storm passage.');
            await expect(context).toBeHidden();
            await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).click();
            await expect(editor.locator('[data-mood=romantic]')).toHaveText('Petal passage.');
            await expect(context).toContainText('Romantic atmosphere');
        } finally { await cleanup(); }
    });
}

test('inline tools, bubble tools and block controls follow selection without changing the manuscript', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 1440);
    try {
        const original = await editor.innerHTML();
        const toolbar = page.locator('.rte-toolkit');
        for (const [selector, name, bubbleName] of [['strong', 'Bold (Ctrl+B)', 'Bold'], ['em', 'Italic (Ctrl+I)', 'Italic'], ['u', 'Underline (Ctrl+U)', 'Underline'], ['s', 'Strikethrough', 'Strikethrough']]) {
            await selectWords(page, selector);
            await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.rte-bubble-menu').getByRole('button', { name: bubbleName, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await editor.getByText('Plain opening.', { exact: true }).click();
            await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
        }
        for (const [selector, label] of [['blockquote p', 'Blockquote actions'], ['pre', 'Code block actions'], ['td p', 'Table actions']]) {
            await editor.locator(selector).first().click();
            await expect(page.getByRole('group', { name: label, exact: true })).toBeVisible();
            if (label === 'Table actions') await expect(page.getByRole('toolbar', { name: 'Table editing' })).toBeVisible();
            await editor.getByText('After the table.', { exact: true }).click();
            await expect(page.getByRole('group', { name: label, exact: true })).toBeHidden();
            await expect(page.getByRole('toolbar', { name: 'Table editing' })).toBeHidden();
        }
        await toolbar.getByRole('button', { name: /^More/ }).click();
        for (const [selector, name] of [['p code', 'Inline code'], ['span[data-spoiler]', 'Hidden or spoiler text'], ['ul p', 'Bullet list']]) {
            await editor.locator(selector).first().click();
            await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await editor.getByText('Plain opening.', { exact: true }).click();
            await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
        }
        await editor.locator('a').click();
        await expect(toolbar.getByRole('button', { name: 'Remove link', exact: true })).toBeVisible();
        await editor.getByText('Plain opening.', { exact: true }).click();
        await expect(toolbar.getByRole('button', { name: 'Remove link', exact: true })).toHaveCount(0);
        await editor.locator('pre').click();
        await expect(page.getByRole('combobox', { name: 'Text style' })).toHaveValue('code-block');
        await expect(toolbar.getByRole('button', { name: 'Bold (Ctrl+B)', exact: true })).toBeDisabled();
        expect(await editor.innerHTML()).toBe(original);
    } finally { await cleanup(); }
});

test('mixed selections describe their scope and remove only selected atmospheres', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 1440);
    try {
        const plain = editor.getByText('Between the passages.', { exact: true });
        await plain.click();
        await editor.evaluate(element => {
            const from = element.querySelector('[data-mood=tense] p')!;
            const to = Array.from(element.querySelectorAll('p')).find(p => p.textContent === 'Between the passages.')!;
            const range = document.createRange(); range.setStart(from.firstChild!, 0); range.setEnd(to.firstChild!, to.textContent!.length);
            const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        const context = page.getByRole('group', { name: 'Current passage atmosphere' });
        await expect(context).toContainText('Mixed atmospheres');
        await expect(context).toContainText('Selected blocks only');
        await expect(context.getByRole('button', { name: 'Continue without atmosphere', exact: true })).toHaveCount(0);
        await context.getByRole('button', { name: 'Change atmosphere', exact: true }).click();
        const picker = page.getByRole('dialog', { name: 'Passage atmosphere' });
        await expect(picker.locator('[aria-pressed=true]')).toHaveCount(0);
        await picker.getByRole('button', { name: 'Close atmosphere picker' }).click();
        await context.getByRole('button', { name: 'Remove atmosphere', exact: true }).click();
        await expect(editor.locator('[data-mood=tense]')).toHaveCount(0);
        await expect(editor.locator('[data-mood=romantic]')).toHaveText('Petal passage.');
        await expect(editor).toContainText('Storm passage.Between the passages.');
        await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).click();
        await expect(editor.locator('[data-mood=tense]')).toHaveText('Storm passage.');
        await selectWords(page, 'h2');
        await editor.evaluate(element => {
            const range = document.createRange(); range.setStart(element.querySelector('h1')!.firstChild!, 0); range.setEnd(element.querySelector('h2')!.firstChild!, 3);
            const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange'));
        });
        await expect(page.getByRole('combobox', { name: 'Text style' })).toHaveValue('mixed');
    } finally { await cleanup(); }
});

test('table actions keep their cell on touch, undo restores structure and context closes outside the table', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 390);
    try {
        await editor.getByText('Cell words.', { exact: true }).tap();
        const controls = page.getByRole('toolbar', { name: 'Table editing' });
        await expect(controls).toBeVisible();
        await controls.getByRole('button', { name: 'Row below', exact: true }).tap();
        await expect(editor.locator('tr')).toHaveCount(2);
        await expect(editor).toContainText('Cell words.');
        await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).tap();
        await expect(editor.locator('tr')).toHaveCount(1);
        await editor.getByText('After the table.', { exact: true }).tap();
        await expect(controls).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    } finally { await cleanup(); }
});

test('footnotes can be edited and removed in place, with stable numbering and undo', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 390);
    try {
        await editor.getByText('Plain opening.', { exact: true }).click();
        const more = page.locator('.rte-toolkit').getByRole('button', { name: /^More/ });
        await more.click();
        await page.getByRole('button', { name: 'Add footnote', exact: true }).click();
        let dialog = page.getByRole('dialog', { name: 'Add a footnote', exact: true });
        await dialog.getByLabel('Note text').fill('Original source.');
        await dialog.getByRole('button', { name: 'Add note', exact: true }).click();
        const marker = editor.locator('[data-footnote]');
        await marker.click();
        const context = page.getByRole('group', { name: 'Selected footnote', exact: true });
        await expect(context).toBeVisible();
        await context.getByRole('button', { name: 'Edit footnote', exact: true }).click();
        dialog = page.getByRole('dialog', { name: 'Edit footnote', exact: true });
        await expect(dialog.getByLabel('Note text')).toHaveValue('Original source.');
        await dialog.getByLabel('Note text').fill('Revised source.');
        await dialog.getByRole('button', { name: 'Save note', exact: true }).click();
        await expect(marker).toHaveAttribute('data-footnote', 'Revised source.');
        await page.screenshot({ path: '/tmp/ww-writer-footnote-mobile.png', fullPage: false });
        await context.getByRole('button', { name: 'Remove footnote', exact: true }).click();
        await expect(marker).toHaveCount(0); await expect(editor).toContainText('Plain opening.');
        await page.getByRole('button', { name: 'Undo (Ctrl/Cmd+Z)', exact: true }).click();
        await expect(marker).toHaveAttribute('data-footnote', 'Revised source.');
        await editor.getByText('After the table.', { exact: true }).click();
        await expect(context).toBeHidden();
    } finally { await cleanup(); }
});

test('image upload remembers the insertion point while the writer continues typing', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 1440);
    let finish!: () => void;
    let started!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const uploading = new Promise<void>(resolve => { started = resolve; });
    await page.route('**/api/books/*/chapters/images', async route => {
        started(); await gate;
        await route.fulfill({ json: { filename: 'test.svg', url: '/images/unchosen-story-cover.svg' } });
    });
    try {
        await editor.getByText('Plain opening.', { exact: true }).click();
        await page.keyboard.press('End');
        await chooseImage(page);
        await uploading;
        await editor.getByText('After the table.', { exact: true }).click();
        await page.keyboard.press('End'); await page.keyboard.type(' Kept typing.');
        finish();
        await expect(editor.locator('img[src="/images/unchosen-story-cover.svg"]')).toBeVisible();
        const beforeStorm = await editor.evaluate(element => {
            const image = element.querySelector('img')!; const storm = element.querySelector('[data-mood=tense]')!;
            return !!(image.compareDocumentPosition(storm) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(beforeStorm).toBeTruthy();
        await expect(editor).toContainText('After the table. Kept typing.');
        await page.keyboard.type(' Still here.');
        await expect(editor).toContainText('After the table. Kept typing. Still here.');
    } finally { finish(); await cleanup(); }
});

test('adding an image to an image-only chapter preserves its original artwork', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 390, '<img src="/images/unchosen-story-cover.svg">');
    await page.route('**/api/books/*/chapters/images', route => route.fulfill({ json: { filename: 'new.svg', url: '/images/unchosen-story-cover.svg?new=1' } }));
    try {
        await expect(editor.locator('img[src]')).toHaveCount(1);
        await editor.locator('img[src]').click();
        await expect(page.getByRole('combobox', { name: 'Text style' })).toHaveValue('image');
        await expect(page.getByRole('combobox', { name: 'Text style' })).toBeDisabled();
        await chooseImage(page);
        await expect(editor.locator('img[src]')).toHaveCount(2);
        await expect(editor.locator('img[src]').first()).toHaveAttribute('src', '/images/unchosen-story-cover.svg');
    } finally { await cleanup(); }
});

test('a footnote form follows its original note when a background image upload shifts adjacent notes', async ({ page, request }) => {
    const content = '<img src="/images/unchosen-story-cover.svg"><p>' + ['One', 'Two', 'Three', 'Four'].map((note, i) => `<span data-footnote="${note}" data-footnote-index="${i + 1}">${i + 1}</span>`).join('') + '</p>';
    const { editor, cleanup } = await openManuscript(page, request, 1440, content);
    let finish!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const uploading = new Promise<void>(resolve => { started = resolve; });
    await page.route('**/api/books/*/chapters/images', async route => { started(); await gate; await route.fulfill({ json: { filename: 'new.svg', url: '/images/unchosen-story-cover.svg?new=1' } }); });
    try {
        await editor.locator('img[src]').click(); await chooseImage(page); await uploading;
        await editor.locator('[data-footnote]').last().click();
        await page.getByRole('group', { name: 'Selected footnote' }).getByRole('button', { name: 'Edit footnote', exact: true }).click();
        const form = page.getByRole('dialog', { name: 'Edit footnote', exact: true });
        await expect(form.getByLabel('Note text')).toHaveValue('Four');
        await form.getByLabel('Note text').fill('Revised fourth source.');
        finish(); await expect(editor.locator('img[src]')).toHaveCount(2);
        await form.getByRole('button', { name: 'Save note', exact: true }).click();
        await expect(form).toBeHidden();
        expect(await editor.locator('[data-footnote]').evaluateAll(elements => elements.map(element => element.getAttribute('data-footnote')))).toEqual(['One', 'Two', 'Three', 'Revised fourth source.']);
    } finally { finish(); await cleanup(); }
});

test('an open atmosphere picker follows its passage when a background upload shifts the document', async ({ page, request }) => {
    const { editor, cleanup } = await openManuscript(page, request, 390);
    let finish!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const uploading = new Promise<void>(resolve => { started = resolve; });
    await page.route('**/api/books/*/chapters/images', async route => { started(); await gate; await route.fulfill({ json: { filename: 'new.svg', url: '/images/unchosen-story-cover.svg?new=1' } }); });
    try {
        await editor.getByText('Plain opening.', { exact: true }).click();
        await page.keyboard.press('Home');
        for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
        await chooseImage(page); await uploading;
        await editor.locator('[data-mood=romantic] p').click(); await page.keyboard.press('Home');
        await page.getByRole('group', { name: 'Current passage atmosphere' }).getByRole('button', { name: 'Change atmosphere', exact: true }).click();
        const picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
        finish(); await expect(editor.locator('img[src]')).toHaveCount(1);
        await picker.getByRole('button', { name: 'Melancholy', exact: true }).click();
        await expect(picker).toBeHidden();
        await expect(editor.locator('[data-mood=romantic]')).toHaveCount(0);
        await expect(editor.locator('[data-mood=melancholy]')).toHaveText('Petal passage.');
        await expect(editor.locator('[data-mood=tense]')).toHaveText('Storm passage.');
        expect(await editor.getByText('Between the passages.', { exact: true }).evaluate(element => element.closest('[data-mood]'))).toBeNull();
    } finally { finish(); await cleanup(); }
});
