import { test, expect } from './fixtures';

let token = '', bookId = '', characterId = '', chapterId = '';
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.30.41.2' });

test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', { headers: { 'X-Forwarded-For': '127.30.41.1' }, data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy(); token = (await response.json()).token;
    const title = `Public character guide ${Date.now()}`;
    const created = await request.post('/api/books', { headers: headers(), data: { title, summary: 'A disposable character guide.', description: 'A story for checking public cast access.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://localhost:3000/design-v2/assets/met-53681.jpg' } });
    expect(created.ok()).toBeTruthy(); bookId = (await created.json()).writtenBooks.find((book: any) => book.title === title).id;
    const character = await request.post('/api/characters', { headers: headers(), data: { bookId, name: 'Mira Vale', role: 'Protagonist', description: 'A navigator following the river.', goal: 'PRIVATE_AUTHOR_PLAN', imageFileId: '' } });
    expect(character.ok()).toBeTruthy(); characterId = (await character.json()).id;
    chapterId = crypto.randomUUID();
    const published = await request.patch(`/api/books/${bookId}/chapters/${chapterId}`, { headers: headers(), data: { data: { title: 'The navigator', content: `<p><span data-type="mention" data-id="${characterId}" data-label="Mira Vale">Mira Vale</span> followed the river toward a distant light.</p><p>${'The reeds swayed beside the quiet water. '.repeat(40)}</p>`, contentWarnings: [], disclaimerNote: '' }, status: 'published' } });
    expect(published.ok()).toBeTruthy();
});
test.beforeEach(async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': '127.30.41.3' });
    await page.addInitScript(() => {
        if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
        localStorage.removeItem('wordweft_jwt');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
});
test.afterAll(async ({ request }) => {
    if (characterId) await request.delete(`/api/characters/${characterId}`, { headers: headers() });
    if (bookId) await request.delete(`/api/books/${bookId}`, { headers: headers() });
});

test('logged-out readers can open a public cast guide and keyboard preview without author-private data', async ({ page, request }) => {
    const guest = await request.get(`/api/characters/book/${bookId}`, { headers: { 'X-Forwarded-For': '127.30.41.4' } });
    expect(guest.ok()).toBeTruthy();
    const cast = await guest.json();
    expect(cast[0].name).toBe('Mira Vale');
    expect(cast[0]).not.toHaveProperty('goal');
    expect(cast[0]).not.toHaveProperty('imageFileId');
    await page.goto(`/book/${bookId}`);
    await page.getByRole('button', { name: 'Characters', exact: true }).click();
    await expect(page.getByText('Mira Vale', { exact: true })).toBeVisible();
    await page.goto(`/book/${bookId}/chapter/${chapterId}`);
    const mention = page.getByRole('button', { name: 'View Mira Vale', exact: true });
    await expect(mention).toBeVisible(); await mention.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog').filter({ hasText: 'Mira Vale' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('A navigator following the river.');
    await expect(dialog).not.toContainText('PRIVATE_AUTHOR_PLAN');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden(); await expect(mention).toBeFocused();
    const privateCast = await request.get('/api/characters/book/local-story-draft', { headers: { 'X-Forwarded-For': '127.30.41.4' } });
    expect(privateCast.status()).toBe(404);
});
