import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let token = '';
const createdBooks: string[] = [];
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.24.42.5' });

async function api(request: APIRequestContext, path: string, data?: unknown, method = data === undefined ? 'GET' : 'POST') {
  const response = await request.fetch(`/api${path}`, { method, headers: headers(), ...(data === undefined ? {} : { data }) });
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}

async function manuscript(page: Page, request: APIRequestContext, content = '<p>Elaria waited by the river. Elaria carried the last letter.</p>') {
  const title = `Writing journey ${Date.now()} ${crypto.randomUUID().slice(0, 5)}`;
  const user = await api(request, '/books', { title, description: 'A disposable writing journey test.', summary: 'An isolated local manuscript.', ageRating: 'ALL_AGES', genres: ['Fantasy'], coverUrl: 'http://localhost:3000/design-v2/assets/met-53681.jpg' });
  const book = user.writtenBooks.find((item: any) => item.title === title);
  createdBooks.push(book.id);
  const chapterId = crypto.randomUUID();
  await api(request, `/books/${book.id}/chapters/${chapterId}`, { data: { title: 'The Letter in the Station', content }, contentWarnings: [], disclaimerNote: '', status: 'draft' }, 'PATCH');
  await page.goto(`/write/book/${book.id}/chapter/${chapterId}/edit`);
  await expect(page.locator('.rte-content[contenteditable=true]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { bookId: book.id, chapterId };
}

async function openTour(page: Page, width: number) {
  if (width < 760) await page.getByRole('navigation', { name: 'Writing tools', exact: true }).getByRole('button', { name: 'Chapters', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Writing tools tour', exact: true }).filter({ visible: true });
  await opener.click();
  const tour = page.getByRole('dialog', { name: 'Writing tools tour', exact: true });
  await expect(tour).toBeVisible();
  return { opener, tour };
}

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': '127.24.42.5' } });
  expect(response.ok(), 'Start the disposable local runtime before writing journey tests.').toBeTruthy();
  token = (await response.json()).token;
});

test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.24.43.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 200 + 1}` });
  await page.addInitScript(value => {
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
});

test.afterEach(async ({ request }) => {
  while (createdBooks.length) await request.delete(`/api/books/${createdBooks.pop()}`, { headers: headers() });
});

for (const width of [1440, 1920, 320, 390]) test(`the writing tour fits, traps focus, and reopens at its first topic at ${width}px`, async ({ page, request }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await manuscript(page, request);
  const { opener, tour } = await openTour(page, width);
  await expect(tour.getByRole('heading', { name: 'Draft with confidence', exact: true })).toBeVisible();
  const bounds = await tour.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
  const headingBounds = await tour.getByRole('heading', { name: 'Draft with confidence', exact: true }).boundingBox();
  expect(headingBounds!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(headingBounds!.x + headingBounds!.width, 'Tour instructions must fit within the dialog, including on phones').toBeLessThanOrEqual(bounds!.x + bounds!.width);
  const close = tour.getByRole('button', { name: 'Close writing tools tour', exact: true });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(tour.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  const result = await new AxeBuilder({ page }).include('[role="dialog"][aria-labelledby="writing-tour-title"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: info.outputPath(`tour-${width}.png`) });
  await tour.getByRole('button', { name: 'Characters & story guide', exact: true }).click();
  await expect(tour).toContainText('Chapters');
  await page.keyboard.press('Escape');
  await expect(tour).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(tour.getByRole('heading', { name: 'Draft with confidence', exact: true })).toBeVisible();
  await tour.getByRole('button', { name: 'Characters & story guide', exact: true }).click();
  await tour.getByRole('button', { name: 'Open story guide', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'Story guide', exact: true });
  await expect(guide).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await tour.getByRole('button', { name: 'Notes & details', exact: true }).click();
  await tour.getByRole('button', { name: 'Open chapter details', exact: true }).click();
  const details = width < 980 ? page.getByRole('dialog', { name: 'Chapter details', exact: true }) : page.locator('.ww-editor-details-rail');
  await expect(details.locator('textarea').first()).toBeFocused();
  if (width < 980) await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

for (const theme of ['light', 'dark']) test(`flagged content warnings use readable rose semantics and survive autosave in ${theme} mode`, async ({ page, request }, info) => {
  const { bookId, chapterId } = await manuscript(page, request);
  await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
  const disclosure = page.locator('.ww-editor-details-rail .chapter-disclosure-editor');
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText('Optional');
  const gore = disclosure.getByRole('button', { name: 'Gore', exact: true });
  await gore.click();
  await expect(gore).toHaveAttribute('aria-pressed', 'true');
  await expect(disclosure).toContainText('Mature rating');
  const color = await gore.evaluate(element => getComputedStyle(element).color.match(/\d+/g)!.map(Number));
  expect(color[0], 'Selected warnings should use rose warning color, distinct from blue guidance').toBeGreaterThan(color[2]);
  await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
  await page.screenshot({ path: info.outputPath(`warnings-${theme}-1440.png`) });
  const savedUser = await api(request, '/users/me');
  expect(savedUser.writtenBooks.find((book: any) => book.id === bookId).chapters.find((chapter: any) => chapter.id === chapterId).contentWarnings).toContain('GORE');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('navigation', { name: 'Writing tools', exact: true }).getByRole('button', { name: 'Details', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Chapter details', exact: true });
  await details.locator('.chapter-disclosure-editor summary').click();
  await expect(details.getByRole('button', { name: 'Gore', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath(`warnings-${theme}-320.png`) });
  const result = await new AxeBuilder({ page }).include('.ww-editor-mobile-sheet').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
});

test('the character scan links the newly created cast in the same flow and saves the mentions', async ({ page, request }) => {
  const { bookId, chapterId } = await manuscript(page, request);
  await page.getByRole('button', { name: 'Scan for characters', exact: true }).click();
  const scanner = page.getByRole('dialog', { name: 'Scan for characters', exact: true });
  await expect(scanner).toBeVisible();
  await expect(scanner.getByRole('button', { name: 'Elaria', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await scanner.getByRole('button', { name: 'Add 1 character', exact: true }).click();
  await expect(scanner.getByRole('heading', { name: 'Link character names', exact: true })).toBeVisible();
  await expect(scanner).toContainText('2 names');
  await scanner.getByRole('button', { name: 'Link 2 names', exact: true }).click();
  await expect(scanner).not.toBeVisible();
  await expect(page.locator('.rte-content [data-type="mention"]')).toHaveCount(2);
  await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
  const saved = await api(request, `/books/${bookId}/chapters/${chapterId}/content?mode=edit`);
  expect((saved.content.match(/data-type="mention"/g) || []).length).toBe(2);
  await page.getByRole('button', { name: 'Scan for characters', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(scanner).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan for characters', exact: true })).toBeFocused();
});

test('phone writers can reach every formatting tool and choose an atmosphere with the keyboard', async ({ page, request }, info) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await manuscript(page, request);
  const toolbar = page.getByRole('toolbar', { name: 'Chapter formatting', exact: true });
  const controls = toolbar.locator('button:not([disabled]),select');
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const bounds = await control.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  const mood = toolbar.getByRole('button', { name: /Set atmosphere/i });
  await mood.click();
  const picker = page.getByRole('dialog', { name: 'Passage atmosphere', exact: true });
  await expect(picker).toBeVisible();
  const close = picker.getByRole('button', { name: 'Close atmosphere picker', exact: true });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(picker.getByRole('button', { name: 'Serene', exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath('atmosphere-320.png') });
  await picker.getByRole('button', { name: 'Tense', exact: true }).click();
  await expect(picker).not.toBeVisible();
  await expect(page.locator('.rte-content [data-mood="tense"]')).toBeVisible();
  await expect(page.locator('.ww-editor-mobile-save')).toHaveText('All changes saved', { timeout: 15_000 });
});

test('smart paste review is a keyboard reachable action and restores focus when dismissed', async ({ page, request }) => {
  await manuscript(page, request);
  const editor = page.locator('.rte-content[contenteditable=true]');
  await editor.focus();
  await editor.evaluate(element => {
    const text = 'Mira carried a lantern into the station. Mira waited for the letter. '.repeat(5);
    const data = new DataTransfer();
    data.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const review = page.getByRole('button', { name: 'Review pasted characters', exact: true });
  await expect(review).toBeVisible();
  await review.focus();
  await page.keyboard.press('Enter');
  const assistant = page.getByRole('dialog', { name: 'Smart Paste Assistant', exact: true });
  await expect(assistant).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(assistant).not.toBeVisible();
  await expect(editor).toBeFocused();
});

test('a failed character profile save keeps the review and chapter draft available for retry', async ({ page, request }) => {
  const { bookId, chapterId } = await manuscript(page, request);
  await page.getByRole('button', { name: 'Scan for characters', exact: true }).click();
  const scanner = page.getByRole('dialog', { name: 'Scan for characters', exact: true });
  await scanner.getByRole('button', { name: 'Add 1 character', exact: true }).click();
  await scanner.getByRole('button', { name: 'Link 2 names', exact: true }).click();
  await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review the complete release', exact: true });
  await review.getByRole('checkbox', { name: /I approve every chapter/ }).check();
  await review.getByRole('checkbox', { name: /Artwork in this story/ }).check();
  await review.getByRole('button', { name: 'Publish this release', exact: true }).click();
  const description = page.getByPlaceholder('Who are they? e.g. A rogue wizard from the eastern mountains...');
  await description.fill('A river archivist carrying the last letter.');
  await page.route('**/api/characters/*', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Profile save interrupted for the test.' }) }) : route.continue());
  await page.getByRole('button', { name: 'Finish & Publish', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Profile save interrupted for the test.');
  await expect(description).toHaveValue('A river archivist carrying the last letter.');
  const savedUser = await api(request, '/users/me');
  expect(savedUser.writtenBooks.find((book: any) => book.id === bookId).chapters.find((chapter: any) => chapter.id === chapterId).status).toBe('draft');
  await page.unroute('**/api/characters/*');
  await page.getByRole('button', { name: 'Finish & Publish', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chapter published', exact: true })).toBeVisible();
});

test('the first visit tour marks itself seen and can still be reopened', async ({ page, request }) => {
  await page.route('**/api/users/me', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), hasSeenWritingDemo: false } });
  });
  await manuscript(page, request);
  const tour = page.getByRole('dialog', { name: 'Writing tools tour', exact: true });
  await expect(tour).toBeVisible();
  const seen = page.waitForResponse(response => response.url().endsWith('/api/users/me/writing-demo') && response.request().method() === 'PUT');
  await page.keyboard.press('Escape');
  const result = await seen;
  expect(result.ok()).toBeTruthy();
  expect((await result.json()).hasSeenWritingDemo).toBeTruthy();
  await expect(tour).not.toBeVisible();
  await page.getByRole('button', { name: 'Writing tools tour', exact: true }).click();
  await expect(tour.getByRole('heading', { name: 'Draft with confidence', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('a failed tour seen request does not reopen the tour over later autosaves', async ({ page, request }) => {
  await page.route('**/api/users/me', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), hasSeenWritingDemo: false } });
  });
  await page.route('**/api/users/me/writing-demo', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Tour preference save interrupted.' }) }));
  const { bookId, chapterId } = await manuscript(page, request);
  const tour = page.getByRole('dialog', { name: 'Writing tools tour', exact: true });
  await expect(tour).toBeVisible();
  await page.keyboard.press('Escape');
  await page.route(`**/api/books/${bookId}/chapters/${chapterId}`, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), hasSeenWritingDemo: false } });
  });
  await page.getByLabel('Chapter title', { exact: true }).fill('The next letter');
  await expect(page.locator('.ww-editor-save-state')).toHaveText('All changes saved', { timeout: 15_000 });
  await expect(tour).not.toBeVisible();
  await page.getByRole('button', { name: 'Writing tools tour', exact: true }).click();
  await expect(tour).toBeVisible();
  await page.keyboard.press('Escape');
});

for (const width of [390, 1440]) test(`character recognition reviews identities, retries only failed creates and preserves formatted names at ${width}px`, async ({ page, request }, info) => {
  await page.setViewportSize({ width, height: 900 });
  if (width > 760) await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const content = '<p>Chapter One. Chapter Two. Morning was cold. Morning was quiet. London was distant. London was grey.</p><p>Jon <strong>Snow</strong> whispered to Arya Stark. Jon turned. Arya answered. Snow nodded.</p><p>“Leave,” said Vaelith.</p><pre>NotACharacter said yes. NotACharacter smiled.</pre>';
  const { bookId, chapterId } = await manuscript(page, request, content);
  if (width < 760) await page.getByRole('navigation', { name: 'Writing tools', exact: true }).getByRole('button', { name: 'Chapters', exact: true }).click();
  await page.getByRole('button', { name: 'Scan for characters', exact: true }).click();
  const scanner = page.getByRole('dialog', { name: 'Scan for characters', exact: true });
  await expect(scanner.getByRole('button', { name: 'Jon Snow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(scanner.getByRole('button', { name: 'Arya Stark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const uncertain = scanner.getByRole('button', { name: 'Vaelith', exact: true });
  await expect(uncertain).toHaveAttribute('aria-pressed', 'false');
  await expect(scanner.getByRole('button', { name: /^(Morning|London|Chapter|NotACharacter)$/ })).toHaveCount(0);
  await expect(scanner).toContainText('Also mentioned as Jon, Snow');
  await uncertain.click();
  if (width > 760) await expect(scanner.getByRole('button', { name: 'Jon Snow', exact: true })).toHaveCSS('background-color', 'rgb(40, 57, 83)');
  await page.screenshot({ path: info.outputPath(`scanner-review-${width}.png`) });
  const accessibility = await new AxeBuilder({ page }).include('.ww-editor-scanner').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id)).toEqual([]);
  let releaseStale!: () => void;
  const staleGate = new Promise<void>(resolve => { releaseStale = resolve; });
  let staleHeld = false;
  await page.route(`**/api/characters/book/${bookId}`, async route => {
    const response = await route.fetch(); staleHeld = true;
    await staleGate; await route.fulfill({ response });
  });
  await page.evaluate(bookId => window.dispatchEvent(new CustomEvent('wordweft:planning-updated', { detail: { bookId } })), bookId);
  await expect.poll(() => staleHeld).toBe(true);
  const created: string[] = [];
  await page.route('**/api/characters', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const name = route.request().postDataJSON().name; created.push(name);
    if (name === 'Vaelith') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary create failure.' }) });
    return route.continue();
  });
  await scanner.getByRole('button', { name: 'Add 3 characters', exact: true }).click();
  await expect(scanner.getByRole('alert')).toContainText('retry the remaining names');
  const staleArrived = page.waitForResponse(response => response.url().endsWith(`/api/characters/book/${bookId}`));
  releaseStale(); await staleArrived;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.unroute(`**/api/characters/book/${bookId}`);
  await expect(scanner.getByRole('button', { name: 'Jon Snow', exact: true })).toHaveCount(0);
  await expect(scanner.getByRole('button', { name: 'Arya Stark', exact: true })).toHaveCount(0);
  await page.unroute('**/api/characters');
  await scanner.getByRole('button', { name: 'Add 1 character', exact: true }).click();
  await expect(scanner.getByRole('heading', { name: 'Link character names', exact: true })).toBeVisible();
  await scanner.getByRole('button', { name: 'Link 6 names', exact: true }).click();
  await expect(page.locator('.ww-editor-save-state').filter({ visible: true }).or(page.locator('.ww-editor-mobile-save').filter({ visible: true }))).toHaveText('All changes saved', { timeout: 15000 });
  // A real edit forces Tiptap to serialize linked names, not just save the scanner's HTML.
  await page.locator('.rte-content > p').first().evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element); range.collapse(false);
    (element.closest('[contenteditable]') as HTMLElement).focus();
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  });
  await page.keyboard.insertText(' Revised.');
  await expect(page.locator('.ww-editor-save-state').filter({ visible: true }).or(page.locator('.ww-editor-mobile-save').filter({ visible: true }))).toHaveText('All changes saved', { timeout: 15000 });
  const saved = await api(request, `/books/${bookId}/chapters/${chapterId}/content?mode=edit`);
  const cast = await api(request, `/characters/book/${bookId}`);
  expect(cast.map((item: any) => item.name).sort()).toEqual(['Arya Stark', 'Jon Snow', 'Vaelith']);
  expect(cast.find((item: any) => item.name === 'Jon Snow').aliases.sort()).toEqual(['Jon', 'Snow']);
  expect(saved.content).toContain('<strong>');
  expect(saved.content).toContain('NotACharacter said yes.');
  const savedText = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent, saved.content);
  const originalText = await page.evaluate(html => { const doc = new DOMParser().parseFromString(html, 'text/html'); doc.querySelector('p')!.append(doc.createTextNode(' Revised.')); return doc.body.textContent; }, content);
  expect(savedText).toBe(originalText);
  await page.reload();
  await expect(page.locator('.rte-content')).toContainText('Revised.');
  expect(await page.locator('.rte-content').textContent()).toBe(originalText);
  await page.screenshot({ path: info.outputPath(`scanner-linked-${width}.png`) });
});

test('name linking spans inline styles, normalizes aliases, skips ordinary words and never crosses blocks or excluded content', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { analyzeMentions } = await import('/utils/autoLinker.ts');
    const original = '<p>Henry <em>Jekyll</em> spoke. O’Connor replied.</p><p>Henry</p><p>Jekyll</p><p>May whispered. May I leave? I may stay. Rose smiled. A rose fell.</p><pre>Henry Jekyll</pre><p><a href="#">Henry Jekyll</a></p>';
    const cast = [{ id: 'h', name: ' Henry Jekyll ', aliases: [] }, { id: 'o', name: "O'Connor", aliases: [] }, { id: 'm', name: 'May', aliases: [] }, { id: 'r', name: 'Rose', aliases: [] }];
    const linked = analyzeMentions(original, cast as any); const doc = new DOMParser().parseFromString(linked.newHtml, 'text/html');
    return { count: linked.count, text: doc.body.textContent, originalText: new DOMParser().parseFromString(original, 'text/html').body.textContent, styled: doc.querySelector('em span')?.textContent, code: doc.querySelector('pre')?.innerHTML, link: doc.querySelector('a')?.innerHTML };
  });
  expect(result.count).toBe(4); expect(result.text).toBe(result.originalText); expect(result.styled).toBe('Jekyll');
  expect(result.code).toBe('Henry Jekyll'); expect(result.link).toBe('Henry Jekyll');
  const ambiguous = await page.evaluate(async () => {
    const { analyzeMentions } = await import('/utils/autoLinker.ts');
    return analyzeMentions('<p>Alex met The Fox.</p>', [{ id: 'a', name: 'Alex', aliases: ['The Fox'] }, { id: 'b', name: 'Alex', aliases: ['The Fox'] }] as any).count;
  });
  expect(ambiguous).toBe(0);
  const family = await page.evaluate(async () => {
    const { analyzeMentions } = await import('/utils/autoLinker.ts');
    return analyzeMentions('<p>Mrs. Lucas said yes. Lucas nodded.</p>', [{ id: 'w', name: 'William Lucas', aliases: ['Lucas'] }] as any).occurrences;
  });
  expect(family).toEqual([{ name: 'William Lucas', label: 'Lucas', count: 1 }]);
});

test('smart paste uses the same contextual review, retries safely and saves observed aliases', async ({ page, request }) => {
  const { bookId } = await manuscript(page, request);
  const editor = page.locator('.rte-content[contenteditable=true]');
  await editor.focus();
  await editor.evaluate(element => {
    const text = 'Morning was cold. Morning was silent. Mira Ellery whispered. Mira nodded. '.repeat(5);
    const data = new DataTransfer(); data.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.getByRole('button', { name: 'Review pasted characters', exact: true }).click();
  const assistant = page.getByRole('dialog', { name: 'Smart Paste Assistant', exact: true });
  await expect(assistant.getByRole('button', { name: 'Mira Ellery', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(assistant.getByRole('button', { name: 'Morning', exact: true })).toHaveCount(0);
  await page.route('**/api/characters', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary create failure.' }) }) : route.continue());
  await assistant.getByRole('button', { name: 'Add characters', exact: true }).click();
  await expect(assistant.getByRole('alert')).toContainText('Could not add Mira Ellery');
  await expect(editor).toContainText('Mira Ellery whispered.');
  await page.unroute('**/api/characters');
  await assistant.getByRole('button', { name: 'Add characters', exact: true }).click();
  await expect(assistant).toContainText('Characters added to your story guide.');
  await expect(assistant).toBeHidden();
  const cast = await api(request, `/characters/book/${bookId}`);
  expect(cast).toHaveLength(1); expect(cast[0].name).toBe('Mira Ellery'); expect(cast[0].aliases).toEqual(['Mira']);
});
