import { test, expect, type APIRequestContext } from './fixtures';

let token = '';
let bookId = '';
const auth = () => ({ Authorization: `Bearer ${token}` });
async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
    const response = await request.fetch(`/api${path}`, { method, headers: auth(), ...(data === undefined ? {} : { data }) });
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
}
test.beforeEach(async ({ page, request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy(); token = (await response.json()).token;
    const title = `Planning experience ${Date.now()}`;
    const owner = await api(request, '/books', { title, description: 'A disposable planning fixture.', genres: ['Fantasy'], ageRating: 'ALL_AGES' });
    bookId = owner.writtenBooks.find((book: any) => book.title === title).id;
    await page.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
});
test.afterEach(async ({ request }) => { if (bookId) await request.delete(`/api/books/${bookId}`, { headers: auth() }); });

test('slow and failed planning reads never claim an empty plan, and retry keeps an open draft', async ({ page }) => {
    let release!: () => void; const pending = new Promise<void>(resolve => release = resolve);
    let failReads = true;
    await page.route(`**/api/characters/book/${bookId}`, async route => {
        if (failReads) { await pending; return route.fulfill({ status: 503, json: { message: 'Characters temporarily unavailable.' } }); }
        return route.fulfill({ json: [] });
    });
    await page.goto(`/write/book/${bookId}/manage?tab=characters`);
    const tool = page.locator('.ww-characters-tool');
    await expect(tool.getByRole('status')).toContainText('Loading characters');
    await expect(tool.getByText('Who carries this story?', { exact: true })).toHaveCount(0);
    release();
    await expect(tool.getByRole('alert')).toContainText('temporarily unavailable');
    await expect(tool.getByText('Who carries this story?', { exact: true })).toHaveCount(0);
    await tool.getByRole('button', { name: 'Add character' }).click();
    await tool.getByRole('textbox', { name: /^Name/ }).fill('A kept draft');
    failReads = false;
    await tool.getByRole('button', { name: 'Try again' }).click();
    await expect(tool.getByRole('textbox', { name: /^Name/ })).toHaveValue('A kept draft');
    await expect(tool.getByRole('alert')).toHaveCount(0);
});

test('future draft reveal, aliases and visibility are visible to the writer, and planning filters compose', async ({ page, request }) => {
    const chapterId = crypto.randomUUID();
    await api(request, `/books/${bookId}/chapters/${chapterId}`, { data: { title: 'Future crossing', content: '<p>A draft.</p>', contentWarnings: [], disclaimerNote: '' }, status: 'draft' }, 'PATCH');
    const character = await api(request, '/characters', { bookId, name: 'Lyra', role: 'Navigator', description: 'A private history', goal: 'Find the port', descriptionVisibility: 'PRIVATE', goalVisibility: 'PUBLIC', aliases: ['The Fox'], spoilerDetails: 'Secret captain', spoilerChapterId: chapterId });
    await api(request, '/scenes', { bookId, title: 'The storm', description: 'A turning point', setting: 'Ocean', time: 'Night', chapterId, characterIds: [character.id] });
    await api(request, '/scenes', { bookId, title: 'Unlinked scene', description: '', setting: '', time: '', characterIds: [] });
    await page.goto(`/write/book/${bookId}/manage?tab=characters`);
    const cast = page.locator('.ww-characters-tool');
    await expect(cast.locator('article')).toContainText('Background · Private');
    await expect(cast.locator('article')).toContainText('Goal · Public');
    await cast.getByLabel('Search characters', { exact: true }).fill('fox');
    await expect(cast.locator('article')).toHaveCount(1);
    await cast.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(cast.getByLabel('Reveal spoiler details', { exact: true })).toHaveValue(chapterId);
    await expect(cast.getByLabel('Reveal spoiler details', { exact: true }).locator('option:checked')).toContainText('Future crossing · draft');
    await cast.getByText('Public reader preview', { exact: true }).click();
    await expect(cast.locator('.ww-planning-preview')).not.toContainText('A private history');
    await expect(cast.locator('.ww-planning-preview')).not.toContainText('Secret captain');
    await cast.getByRole('textbox', { name: /^Aliases/ }).fill('The Fox, Captain, the fox');
    await cast.getByRole('button', { name: 'Save character', exact: true }).click();
    await expect(cast.getByText('Character saved online.', { exact: true })).toBeVisible();
    expect((await api(request, `/characters/${character.id}`)).aliases).toEqual(['The Fox', 'Captain']);
    await page.goto(`/write/book/${bookId}/manage?tab=scenes`);
    const scenes = page.locator('.ww-scenes-tool');
    await scenes.getByLabel('Search scenes', { exact: true }).fill('lyra');
    await scenes.getByRole('combobox', { name: 'Chapter', exact: true }).selectOption(chapterId);
    await scenes.getByRole('combobox', { name: 'Character', exact: true }).selectOption(character.id);
    await expect(scenes.locator('article')).toHaveCount(1);
    await expect(scenes.locator('article')).toContainText('The storm');
    await scenes.getByRole('combobox', { name: 'Chapter', exact: true }).selectOption('unlinked');
    await expect(scenes.getByRole('status')).toContainText('No scenes match');
    await scenes.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(scenes.locator('article')).toHaveCount(2);
});

test('story notes stay separate from chapter notes and expanded mobile editor retains failed saves', async ({ page, request }) => {
    const chapterId = crypto.randomUUID();
    await api(request, `/books/${bookId}/chapters/${chapterId}`, { data: { title: 'Notes chapter', content: '<p>Draft text.</p>', contentWarnings: [], disclaimerNote: '' }, status: 'draft' }, 'PATCH');
    const note = await api(request, '/notes', { bookId, title: 'Story research', content: 'Whole-story context' });
    await api(request, '/notes', { bookId, chapterId, title: 'Chapter secret', content: 'Only this chapter' });
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/write/book/${bookId}/manage?tab=notes`);
    const notes = page.locator('.ww-notes-tool');
    await expect(notes.locator('article')).toHaveCount(1);
    await expect(notes.locator('article')).toContainText('Story research');
    await expect(notes.locator('article')).not.toContainText('Chapter secret');
    await notes.getByRole('button', { name: 'Edit', exact: true }).click();
    await notes.getByRole('button', { name: 'Expand note editor', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Private note editor' });
    await expect(editor).toBeVisible();
    const content = editor.getByRole('textbox', { name: /^Private note content/ });
    await content.fill('A preserved thought after a failed save.');
    await expect(page.getByRole('button', { name: 'Story-wide notes', exact: true })).toBeDisabled();
    await page.route(`**/api/notes/${note.id}`, route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { message: 'A local test interruption.' } }) : route.continue());
    await editor.getByRole('button', { name: 'Save note', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('local test interruption');
    await expect(content).toHaveValue('A preserved thought after a failed save.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(editor).toHaveCount(0);
    await expect(notes.getByRole('textbox', { name: /^Private note content/ })).toHaveValue('A preserved thought after a failed save.');
    await notes.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/write/book/${bookId}/chapter/${chapterId}/edit`);
    await page.getByRole('tab', { name: 'Notes', exact: true }).click();
    const chapterNotes = page.locator('.ww-editor-notes-content .ww-notes-tool');
    await expect(chapterNotes.getByRole('button', { name: 'This chapter', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(chapterNotes.locator('article')).toHaveCount(1);
    await expect(chapterNotes.locator('article')).toContainText('Chapter secret');
    await chapterNotes.getByRole('button', { name: 'Story-wide notes', exact: true }).click();
    await expect(chapterNotes.locator('article')).toHaveCount(1);
    await expect(chapterNotes.locator('article')).toContainText('Story research');
});
