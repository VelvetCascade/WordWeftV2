import { test, expect, type APIRequestContext } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let token = '';
const bookIds: string[] = [];
const headers = () => ({ Authorization: `Bearer ${token}` });
async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
    const response = await request.fetch(`/api${path}`, { method, headers: headers(), ...(data === undefined ? {} : { data }) });
    expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    return response.json();
}
async function story(request: APIRequestContext, data: Record<string, unknown> = {}) {
    const title = `Setup quality ${crypto.randomUUID()}`;
    const user = await api(request, '/books', { title, description: 'A synopsis that is separate from the introduction.', summary: 'An independent introduction.', tags: ['family'], ageRating: 'ALL_AGES', coverUrl: '', ...data });
    const book = user.writtenBooks.find((item: any) => item.title === title);
    bookIds.push(book.id); return book;
}
async function addChapter(request: APIRequestContext, bookId: string, title: string) {
    const id = crypto.randomUUID();
    await api(request, `/books/${bookId}/chapters/${id}`, { data: { title, content: '<p>A small opening beside the river.</p>' }, contentWarnings: [], disclaimerNote: '', status: 'preserve', expectedRevision: 0 }, 'PATCH');
    return id;
}
test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy(); token = (await response.json()).token;
});
test.beforeEach(async ({ page }) => {
    await page.addInitScript(value => { localStorage.setItem('wordweft_jwt', value); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); localStorage.setItem('theme', 'light'); }, token);
});
test.afterEach(async ({ request }) => { while (bookIds.length) await request.delete(`/api/books/${bookIds.pop()}`, { headers: headers() }); });

test('a title alone creates a private draft without assigning cover artwork', async ({ page, request }) => {
    await page.goto('/write/book/create');
    const title = `Title alone ${crypto.randomUUID()}`;
    await page.getByRole('textbox', { name: 'Story title', exact: true }).fill(title);
    await expect(page.getByRole('button', { name: 'Save as draft' })).toBeEnabled();
    await expect(page.locator('.ww-create-book-page img').first()).toHaveAttribute('src', '/images/unchosen-story-cover.svg');
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await expect(page).toHaveURL(/\/write\/book\/.+\/manage/);
    const bookId = page.url().match(/\/book\/([^/]+)/)![1]; bookIds.push(bookId);
    const saved = await api(request, `/books/${bookId}`);
    expect(saved.publicationStatus).toBe('draft'); expect(saved.description || '').toBe(''); expect(saved.coverUrl || '').toBe('');
    await expect(page.getByRole('link', { name: 'Preview private story' })).toBeVisible();
});

test('story details preserve independent introduction and tags and guard every dirty dismissal', async ({ page, request }) => {
    const book = await story(request);
    await page.goto(`/write/book/${book.id}/manage`);
    await page.getByRole('button', { name: 'Story details', exact: true }).click();
    const details = page.getByRole('dialog', { name: 'Story details', exact: true });
    await expect(details.getByLabel('Short introduction (optional)')).toHaveValue('An independent introduction.');
    await details.getByLabel('Description', { exact: true }).fill('The synopsis changed without replacing the introduction.');
    await details.getByLabel('Tags (optional)').fill('family, homecoming');
    await page.keyboard.press('Escape');
    const discard = page.getByRole('alertdialog', { name: 'Discard story detail changes?', exact: true });
    await expect(discard).toBeVisible(); await discard.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(details.getByLabel('Description', { exact: true })).toHaveValue('The synopsis changed without replacing the introduction.');
    await details.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(details).not.toBeVisible();
    const saved = await api(request, `/books/${book.id}`);
    expect(saved.summary).toBe('An independent introduction.'); expect(saved.tags).toEqual(['family', 'homecoming']);
    await page.getByRole('button', { name: 'Story details', exact: true }).click();
    await details.getByLabel('Title', { exact: true }).fill('Unsaved title');
    await details.getByRole('button', { name: 'Close story details' }).click();
    await expect(discard).toBeVisible(); await discard.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(details).not.toBeVisible();
    expect((await api(request, `/books/${book.id}`)).title).toBe(book.title);
});

test('chapter manager searches, reorders private drafts and duplicates without changing published context', async ({ page, request }) => {
    const book = await story(request); const first = await addChapter(request, book.id, 'Alpha opening'); const second = await addChapter(request, book.id, 'Beta continuation');
    await page.goto(`/write/book/${book.id}/manage`);
    await page.getByRole('searchbox', { name: 'Search chapters', exact: true }).fill('Beta');
    await expect(page.locator('.ww-manage-chapter-card')).toHaveCount(1);
    await expect(page.locator('.ww-manage-chapter-main').first()).toContainText('2');
    await page.getByLabel('Actions for Beta continuation', { exact: true }).click();
    await page.getByRole('button', { name: 'Move up', exact: true }).click();
    await expect.poll(async () => (await api(request, `/books/${book.id}`)).chapters.map((item: any) => item.id)).toEqual([second, first]);
    await page.getByLabel('Actions for Beta continuation', { exact: true }).click();
    await page.getByRole('button', { name: 'Duplicate as private draft', exact: true }).click();
    await expect.poll(async () => (await api(request, `/books/${book.id}`)).chapters.length).toBe(3);
    const saved = await api(request, `/books/${book.id}`); const copy = saved.chapters.find((item: any) => ![first, second].includes(item.id));
    expect(copy.status).toBe('draft'); expect(copy.viewCount || 0).toBe(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('searchbox', { name: 'Search chapters', exact: true }).fill('');
    await page.screenshot({ path: 'test-results/evidence/writer-setup/chapter-manager-mobile.png', fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('manuscript review creates nothing before confirmation and undo preserves existing chapters', async ({ page, request }) => {
    const book = await story(request); const original = await addChapter(request, book.id, 'Original chapter');
    await page.goto(`/write/book/${book.id}/manage`);
    await page.getByLabel('Import manuscript file').setInputFiles({ name: 'chapters.txt', mimeType: 'text/plain', buffer: Buffer.from('Chapter 1: Imported opening\n\nA child waited beside the water.\n\nChapter 2: Imported ending\n\nThe boat came home again.') });
    const review = page.getByRole('dialog', { name: 'Review manuscript import', exact: true });
    await expect(review).toContainText('Imported opening'); await expect(review).toContainText('Imported ending');
    expect((await api(request, `/books/${book.id}`)).chapters.map((item: any) => item.id)).toEqual([original]);
    await review.getByRole('button', { name: 'Import private drafts', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo chapter import', exact: true })).toBeVisible();
    const characters = page.getByRole('dialog', { name: 'Import complete', exact: true }); if (await characters.isVisible()) await characters.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: 'Undo chapter import', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'Undo imported chapters?', exact: true }).getByRole('button', { name: 'Undo chapter import', exact: true }).click();
    await expect.poll(async () => (await api(request, `/books/${book.id}`)).chapters.map((item: any) => item.id)).toEqual([original]);
});

test('statistics filters stay visible while refreshing and selected story survives reload', async ({ page, request }) => {
    const book = await story(request); await addChapter(request, book.id, 'A private chapter');
    await page.goto(`/write/analytics?book=${book.id}`);
    await expect(page.getByRole('combobox', { name: 'Story', exact: true })).toHaveValue(book.id);
    await expect(page.getByRole('button', { name: 'Refresh statistics' })).toBeEnabled();
    await page.route('**/api/writer/analytics**', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue(); });
    await page.getByRole('button', { name: 'Refresh statistics' }).click();
    await expect(page.getByRole('combobox', { name: 'Story', exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByRole('combobox', { name: 'Story', exact: true })).toHaveValue(book.id);
    await page.getByRole('combobox', { name: 'Story', exact: true }).selectOption('');
    await expect(page).toHaveURL(/\/write\/analytics$/);
    await page.getByRole('combobox', { name: 'Story', exact: true }).selectOption(book.id);
    await expect(page).toHaveURL(new RegExp(`book=${book.id}`));
    const findings = await new AxeBuilder({ page }).include('.ww-writer-analytics').analyze();
    expect(findings.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

const quickStartFixture = `<!doctype html><html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
const [{default:React},{default:ReactDOM},{WriterQuickStart}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/components/WriterQuickStart.tsx')]);
const user = id => ({id,writtenBooks:[{id:'story',publicationStatus:'draft',chapters:[]}]});
function Fixture(){const [id,setId]=React.useState('first');return React.createElement('div',null,React.createElement('button',{onClick:()=>setId('second')},'Switch account'),React.createElement(WriterQuickStart,{currentUser:user(id)}));}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));
</script></body></html>`;

test('writer guide ignores global click flags and scopes dismissal to the account', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ww_quickstart_hidden', 'true'); localStorage.setItem('ww_qs_add-characters', 'true'); localStorage.setItem('ww_qs_use-mentions', 'true'); });
    await page.route('**/api/writer/quickstart', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ characters: false, mentions: false, atmosphere: false, planning: false }) }));
    await page.route('**/__writer-guide', route => route.fulfill({ contentType: 'text/html', body: quickStartFixture }));
    await page.goto('/__writer-guide');
    await expect(page.locator('.writer-qs-subtitle').first()).toContainText('1 of 6 complete');
    await page.getByRole('button', { name: 'Add Characters', exact: true }).click();
    await expect(page.locator('.writer-qs-subtitle').first()).toContainText('1 of 6 complete');
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(page.locator('.writer-qs')).not.toBeVisible();
    await page.getByRole('button', { name: 'Switch account', exact: true }).click();
    await expect(page.locator('.writer-qs')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('ww:writer-quickstart:second:hidden'))).toBeNull();
});
