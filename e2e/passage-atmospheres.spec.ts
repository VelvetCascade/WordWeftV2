import { test, expect, type Page } from './fixtures';
const moods = ['melancholy', 'romantic', 'eerie', 'tense', 'triumphant', 'serene'];
const sentence = 'She opened the letter carefully. The familiar handwriting brought back the quiet room, the garden, and the promise she had kept for so many years. ';
const manuscript = `<p>${sentence.repeat(3)}</p>` + moods.map(mood => `<div data-mood="${mood}" class="mood-block mood-${mood}"><p>${sentence.repeat(4)}</p><p>${sentence.repeat(4)}</p></div><p>${sentence.repeat(2)}</p>`).join('') + `<p>${sentence.repeat(5)}</p>`;
async function scrollToMood(page: Page, mood: string) {
    await page.locator(`.reader-copy [data-mood="${mood}"]`).evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - Math.min(innerHeight * .32, 260) + 60, behavior: 'instant' }));
    await expect(page.locator('.ww-atmospheres')).toHaveAttribute('data-active-atmosphere', mood);
}
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('ww_reader_coach_session', '4'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); });
    await page.route('**/api/analytics/events', route => route.fulfill({ status: 204 }));
});
for (const width of [390, 1440]) for (const theme of ['light', 'sepia', 'dark']) {
    test(`passage effects crossfade safely at ${width} in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(theme => localStorage.setItem('ww_reader_preferences', JSON.stringify({ contentTheme: theme, fontSize: 19, readerWidth: 'standard', readerFont: 'literary', lineHeight: 1.85 })), theme);
        await page.route('**/api/books/*/chapters/*/content', async route => { const response = await route.fetch(); const data = await response.json(); await route.fulfill({ response, json: { ...data, content: manuscript, access: 'PREVIEW' } }); });
        const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
        await expect(page.locator('.reader-copy')).toBeVisible();
        const ink = await page.locator('.reader-copy').evaluate(element => getComputedStyle(element).color);
        for (const mood of moods) {
            await scrollToMood(page, mood);
            const layer = page.locator(`.ww-atmosphere-${mood}[data-state=open]`);
            await expect(layer).toHaveCount(1);
            await expect(layer.locator(mood === 'eerie' ? '.ww-atmosphere-veil' : mood === 'serene' ? '.ww-atmosphere-ripple' : '.ww-ambient-detail').first()).not.toHaveCSS('animation-name', 'none');
            await expect(layer.locator('svg')).toHaveCount(0);
            if (['tense', 'serene', 'triumphant'].includes(mood)) await expect(layer.locator('img[src*=fog-veil]')).toHaveCount(0);
            expect(parseFloat(await layer.evaluate(el => getComputedStyle(el).transitionDuration)) * 1000).toBeLessThanOrEqual(500);
            await expect.poll(() => layer.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
            await expect(page.locator('.ww-atmospheres')).toHaveCSS('pointer-events', 'none');
            expect(await page.locator('.reader-copy').evaluate(element => getComputedStyle(element).color)).toBe(ink);
            const edges = await layer.locator('.ww-atmosphere-edge').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
            if (width === 390) expect(Math.max(...edges)).toBeGreaterThanOrEqual(width);
            else expect(Math.max(...edges)).toBeLessThanOrEqual(320);
            const geometry = await page.locator('.ww-atmospheres').evaluate(element => {
                const copy = document.querySelector('.reader-copy')!.getBoundingClientRect();
                const left = element.querySelector('.ww-atmosphere-layer[data-state=open] .ww-atmosphere-edge-left')!.getBoundingClientRect();
                const right = element.querySelector('.ww-atmosphere-layer[data-state=open] .ww-atmosphere-edge-right')!.getBoundingClientRect();
                return { left: left.right, right: right.left, textLeft: copy.left, textRight: copy.right };
            });
            if (width > 720) {
                expect(geometry.left).toBeLessThanOrEqual(geometry.textLeft);
                expect(geometry.right).toBeGreaterThanOrEqual(geometry.textRight);
            }
            if (mood === 'melancholy') await expect(layer.locator('.ww-ambient-detail img').first()).toHaveCSS('height', width === 390 ? '42px' : '52px');
            if (mood === 'romantic') await expect(layer.locator('.ww-ambient-detail img').first()).toHaveCSS('width', width === 390 ? '20px' : '28px');
            if (mood === 'eerie') {
                await expect(layer.locator('.ww-atmosphere-veil')).toHaveCount(4);
                await expect(layer.locator('.ww-atmosphere-scenery')).toHaveCSS('opacity', width === 390 ? '0.247' : '0.65');
                expect(await layer.locator('.ww-atmosphere-veil').first().evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(width === 390 ? 380 : 700);
            }

            {
                await expect(layer).toHaveCSS('opacity', '1');
                const animated = layer.locator(mood === 'eerie' ? '.ww-atmosphere-veil' : mood === 'serene' ? '.ww-atmosphere-ripple' : '.ww-ambient-detail').first();
                const transform = await animated.evaluate(element => getComputedStyle(element).transform);
                await expect.poll(() => animated.evaluate(element => getComputedStyle(element).transform)).not.toBe(transform);
                await page.screenshot({ path: `test-results/evidence/atmospheres/${mood}-${theme}-${width}.png` });
            }
        }
        await expect(page.locator('.ww-atmosphere-layer[data-state=closed]')).toHaveCount(0);
        await page.locator('.reader-copy > .reader-comment-block').last().evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 120, behavior: 'instant' }));
        await expect(page.locator('.ww-atmospheres')).toHaveAttribute('data-active-atmosphere', 'none');
        await expect(page.locator('.ww-atmosphere-layer')).toHaveCount(0);
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    });
}
test('reduced motion stays still, and intensity updates and persists without moving the reader', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/books/*/chapters/*/content', async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...await response.json(), content: manuscript } }); });
    await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
    await expect(page.locator('.reader-copy')).toBeVisible(); await scrollToMood(page, 'melancholy');
    await expect(page.locator('.ww-atmosphere-melancholy .ww-ambient-detail').first()).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.ww-atmosphere-melancholy .ww-atmosphere-veil').first()).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
    const preferences = page.getByRole('dialog', { name: 'Reading preferences', exact: true });
    await preferences.getByRole('button', { name: 'Subtle', exact: true }).click();
    await expect(page.locator('.ww-atmospheres')).toHaveAttribute('data-intensity', 'subtle');
    await preferences.getByRole('button', { name: 'Off', exact: true }).click();
    await expect(page.locator('.ww-atmosphere-layer')).toHaveCount(0);
    await preferences.getByRole('button', { name: 'Close preferences', exact: true }).click();
    await page.reload(); await expect(page.locator('.ww-atmospheres')).toHaveAttribute('data-intensity', 'off');
});

for (const width of [390, 1440]) test(`writer scopes selected passages, changes and removes moods, and previews them at ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    const login = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy(); const token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const title = `Atmosphere editing ${crypto.randomUUID()}`;
    const created = await request.post('/api/books', { headers, data: { title, description: 'Disposable local atmosphere test.', summary: 'Local test.', genres: ['Fantasy'], ageRating: 'ALL_AGES' } });
    expect(created.ok()).toBeTruthy(); const book = (await created.json()).writtenBooks.find((book: any) => book.title === title);
    const chapter = crypto.randomUUID();
    try {
        const saved = await request.patch(`/api/books/${book.id}/chapters/${chapter}`, { headers, data: { data: { title: 'Many feelings', content: '<p>The first letter arrived.</p><p>She read it beside the window.</p><p>Outside, the garden waited.</p>' }, contentWarnings: [], disclaimerNote: '', status: 'preserve', expectedRevision: 0 } });
        expect(saved.ok()).toBeTruthy();
        await page.addInitScript(token => localStorage.setItem('wordweft_jwt', token), token);
        await page.goto(`/write/book/${book.id}/chapter/${chapter}/edit`);
        const editor = page.locator('.rte-content[contenteditable=true]'); await expect(editor).toBeVisible();
        await editor.locator('p').first().click();
        await editor.evaluate(element => {
            const paragraphs = element.querySelectorAll('p'); const range = document.createRange();
            range.setStart(paragraphs[0].firstChild!, 0); range.setEnd(paragraphs[1].lastChild!, paragraphs[1].textContent!.length);
            const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange'));
        });
        await page.getByRole('button', { name: 'Set atmosphere', exact: true }).click();
        let picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
        await expect(picker).toContainText('selected paragraphs'); await picker.getByRole('button', { name: 'Melancholy', exact: true }).click();
        await expect(editor.locator('[data-mood=melancholy] p')).toHaveCount(2);
        await editor.locator('[data-mood] p').first().click(); await page.getByRole('button', { name: 'Set atmosphere', exact: true }).click();
        picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
        await picker.getByRole('button', { name: 'Romantic', exact: true }).click();
        await expect(editor.locator('[data-mood]')).toHaveCount(1); await expect(editor.locator('[data-mood=romantic] p')).toHaveCount(2);
        await editor.locator('[data-mood] p').first().click(); await page.getByRole('button', { name: 'Set atmosphere', exact: true }).click();
        await page.getByRole('button', { name: 'Continue without a mood', exact: true }).click();
        await page.keyboard.type('A moment without atmosphere.');
        await expect(editor.locator('[data-mood]')).not.toContainText('A moment without atmosphere.');
        await page.getByRole('button', { name: 'Set atmosphere', exact: true }).click();
        await page.getByRole('button', { name: 'Serene', exact: true }).click();
        await expect(editor.locator('[data-mood=serene]')).toHaveCount(1);
        await page.getByRole('button', { name: 'Set atmosphere', exact: true }).click();
        await page.getByRole('button', { name: 'Remove this atmosphere', exact: true }).click();
        await expect(editor.locator('[data-mood=serene]')).toHaveCount(0);
        await expect(editor).toContainText('A moment without atmosphere.');
        await expect(editor).toBeFocused(); await page.keyboard.press('Control+z'); await expect(editor.locator('[data-mood=serene]')).toHaveCount(1);
        await editor.locator('[data-mood=serene] p').click(); await page.keyboard.type('The water settles.');
        await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.type('Outside the mood again.');
        await expect(editor.locator('[data-mood=serene]')).toContainText('The water settles.');
        await expect(editor.locator('[data-mood]').filter({ hasText: 'Outside the mood again.' })).toHaveCount(0);
        await expect.poll(async () => { const session = await request.get(`/api/books/${book.id}/chapters/${chapter}/edit-session`, { headers }); return (await session.json()).content; }).toContain('Outside the mood again.');
        await page.reload(); await expect(editor.locator('[data-mood=romantic] p')).toHaveCount(2); await expect(editor.locator('[data-mood=serene]')).toHaveCount(1);
        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        const preview = page.getByRole('dialog', { name: 'Reader preview', exact: true });
        await preview.getByRole('combobox', { name: 'Viewport', exact: true }).selectOption('phone');
        for (const theme of ['light', 'sepia', 'dark']) {
            await preview.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption(theme);
            const canvas = preview.locator('.ww-reading-preview-canvas');
            await canvas.evaluate(element => { const passage = element.querySelector('.reader-copy [data-mood=romantic]')!; element.scrollTop += passage.getBoundingClientRect().top - element.getBoundingClientRect().top - element.clientHeight * .32 + 10; });
            await expect(preview.locator('.ww-atmospheres')).toHaveAttribute('data-active-atmosphere', 'romantic');
            expect(await preview.locator('.ww-atmosphere-edge-left').evaluate(el => el.getBoundingClientRect().width)).toBeCloseTo(await canvas.evaluate(el => el.clientWidth), 0);
            await expect(canvas).toHaveAttribute('data-preview-theme', theme);
        }
        await page.screenshot({ path: `test-results/evidence/atmospheres/writer-preview-${width}.png` });
        await page.keyboard.press('Escape'); await expect(preview).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    } finally { await request.delete(`/api/books/${book.id}`, { headers }); }
});


test('wide Full mode stays visible between the manuscript and both sidebar cards', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1224 });
    await page.route('**/api/books/*/chapters/*/content', async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...await response.json(), content: manuscript, access: 'FULL' } }); });
    await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
    await expect(page.locator('.reader-conversation-rail')).toBeVisible();
    for (const mood of moods) {
        await scrollToMood(page, mood);
        const layer = page.locator(`.ww-atmosphere-${mood}[data-state=open]`);
        await expect(layer).toHaveCSS('opacity', '1');
        const geometry = await page.evaluate(() => {
            const left = document.querySelector('.ww-atmosphere-layer[data-state=open] .ww-atmosphere-edge-left')!.getBoundingClientRect();
            const right = document.querySelector('.ww-atmosphere-layer[data-state=open] .ww-atmosphere-edge-right')!.getBoundingClientRect();
            const outline = document.querySelector('.reader-outline-rail')!.getBoundingClientRect();
            const conversation = document.querySelector('.reader-conversation-rail')!.getBoundingClientRect();
            return { leftStart: left.left, leftWidth: left.width, rightEnd: right.right, rightWidth: right.width, outlineEnd: outline.right, conversationStart: conversation.left };
        });
        expect(geometry.leftStart).toBeGreaterThan(geometry.outlineEnd);
        expect(geometry.rightEnd).toBeLessThan(geometry.conversationStart);
        expect(geometry.leftWidth).toBeGreaterThan(200); expect(geometry.rightWidth).toBeGreaterThan(200);
        // The scenery spans the page, but must paint beneath both solid sidebar cards.
        for (const selector of ['.reader-outline-rail', '.reader-conversation-rail']) {
            const rail = page.locator(selector);
            expect(await rail.evaluate(element => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(1);
            expect(await rail.evaluate(element => {
                const bounds = element.getBoundingClientRect();
                return element.contains(document.elementFromPoint(bounds.left + 10, bounds.top + 10));
            })).toBeTruthy();
        }
        if (['eerie', 'melancholy', 'romantic'].includes(mood)) {
            await expect(layer.locator('.ww-atmosphere-veil')).toHaveCount(4);
            await expect(layer.locator('.ww-atmosphere-scenery')).not.toHaveCSS('mask-image', 'none');
        }
        if (mood === 'romantic' || mood === 'melancholy') {
            const strength = await layer.locator('.ww-ambient-detail').evaluateAll(elements => Math.max(...elements.map(element => parseFloat(getComputedStyle(element).opacity))));
            expect(strength).toBeGreaterThan(.65);
        }
        await page.screenshot({ path: `test-results/evidence/atmospheres/full-wide-${mood}.png` });
    }
});


test('quick passage changes leave one active mood and reduced motion stills every motif', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/books/*/chapters/*/content', async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...await response.json(), content: manuscript, access: 'PREVIEW' } }); });
    await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
    await expect(page.locator('.reader-copy')).toBeVisible();
    for (const mood of ['romantic', 'tense', 'eerie', 'romantic', 'serene']) await scrollToMood(page, mood);
    await expect(page.locator('.ww-atmosphere-layer[data-state=open]')).toHaveCount(1);
    await expect(page.locator('.ww-atmosphere-layer[data-state=closed]')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const mood of moods) {
        await scrollToMood(page, mood);
        const layer = page.locator(`.ww-atmosphere-${mood}[data-state=open]`);
        expect(await layer.locator('.ww-atmosphere-veil, .ww-ambient-detail, .ww-atmosphere-ripple').evaluateAll(elements => elements.every(el => getComputedStyle(el).animationName === 'none'))).toBeTruthy();
        await expect(layer).toHaveCSS('transition-duration', '0s');
        expect(await page.locator('.reader-copy').evaluate(el => {
            const bounds = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(bounds.left + 40, 350));
        })).toBeTruthy();
    }
});
