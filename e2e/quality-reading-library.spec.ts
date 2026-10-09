import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const bookId = 'local-story-spring';
const chapterId = `${bookId}-chapter-1`;
const laterChapterId = `${bookId}-chapter-2`;
const run = Date.now().toString(36);
let token = '', writerToken = '';
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.38.80.2' });
async function open(page: Page, path: string, signedIn = true) {
  await page.addInitScript(value => {
    if (value) localStorage.setItem('wordweft_jwt', value); else localStorage.removeItem('wordweft_jwt');
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  }, signedIn ? token : '');
  await page.goto(path);
}
async function axe(page: Page, selector: string) {
  const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
}
test.beforeAll(async ({ request }) => {
  const email = `reading-quality-${run}@example.test`;
  const signup = await request.post('/api/auth/signup', { headers: { 'X-Forwarded-For': '127.38.80.1' }, data: { username: `Reading${run}`, email, password: 'WordWeftLocal123!', dateOfBirth: '1995-04-12' } });
  expect(signup.ok()).toBeTruthy();
  let body = '';
  await expect.poll(async () => {
    const messages = await (await request.get('http://127.0.0.1:8081/mail')).json();
    body = [...messages].reverse().find((message: any) => message.to === email && message.subject.includes('Verification'))?.htmlBody || '';
    return body;
  }).not.toBe('');
  const otp = body.match(/>\s*(\d{6})\s*</)?.[1];
  const verified = await request.post('/api/auth/verify-otp', { headers: { 'X-Forwarded-For': '127.38.80.1' }, data: { email, otp } });
  expect(verified.ok()).toBeTruthy(); token = (await verified.json()).token;
  const writer = await request.post('/api/auth/login', { headers: { 'X-Forwarded-For': '127.38.80.3' }, data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
  expect(writer.ok()).toBeTruthy(); writerToken = (await writer.json()).token;
});

test('authorized prose is readable; guest preview and locked chapter respect content boundaries', async ({ page, request }) => {
  const full = await (await request.get(`/api/books/${bookId}/chapters/${chapterId}/content`, { headers: headers() })).json();
  expect(full.access).toBe('FULL'); expect(full.obfuscated).toBe(false); expect(full.content).not.toMatch(/[\uE000-\uF8FF]/);
  const preview = await (await request.get(`/api/books/${bookId}/chapters/${chapterId}/content`)).json();
  expect(preview.access).toBe('PREVIEW'); expect(preview.obfuscated).toBe(false); expect(preview.content).not.toMatch(/[\uE000-\uF8FF]/);
  expect(preview.content.length).toBeLessThan(full.content.length);
  const locked = await request.get(`/api/books/${bookId}/chapters/${laterChapterId}/content`);
  expect(locked.status()).toBe(401); expect(await locked.json()).not.toHaveProperty('content');
  await open(page, `/book/${bookId}/chapter/${chapterId}`);
  await expect(page.locator('.reader-copy')).toBeVisible(); expect(await page.locator('.reader-copy').innerText()).not.toMatch(/[\uE000-\uF8FF]/);
  await page.screenshot({ path:'test-results/evidence/reading/reading-prose-desktop.png' });
  await page.locator('.reader-header-actions').getByRole('button', { name: 'Open saved passages and find in chapter' }).click();
  const tools = page.getByRole('dialog', { name: 'Passages & find' });
  const phrase = (await page.locator('#paragraph-0 > p').innerText()).split(/\s+/).slice(0,3).join(' ');
  await tools.getByLabel('Find in this chapter').fill(phrase);
  await expect(tools.locator('.reader-find-results button').first()).toBeVisible();
  await axe(page, '.reader-tools-panel');
  await tools.locator('.reader-find-results button').first().click(); await expect(page.locator('#paragraph-0')).toBeFocused();
});

test('private passage notes save online, survive reload and cannot be read or deleted by another account', async ({ page, request }) => {
  await open(page, `/book/${bookId}/chapter/${chapterId}`);
  await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).focus();
  await page.keyboard.press('Enter');
  const tools = page.getByRole('dialog', { name: 'Passages & find' });
  await page.setViewportSize({width:390,height:480});
  await tools.getByLabel('Private note (optional)').fill(`Private memory ${run}`);
  await axe(page,'.reader-tools-panel');
  await tools.getByRole('button',{name:/Save passage online|Update saved passage/}).scrollIntoViewIfNeeded();
  expect((await tools.getByRole('button',{name:/Save passage online|Update saved passage/}).boundingBox())!.y).toBeLessThan(480);
  await page.screenshot({path:'test-results/evidence/reading/reading-private-note-short-viewport.png'});
  await tools.getByRole('button', { name: /Save passage online|Update saved passage/ }).click();
  await expect(tools.getByRole('status')).toContainText('Saved online');
  const items = await (await request.get(`/api/reading/passages/${bookId}`, { headers: headers() })).json();
  const saved = items.find((item: any) => item.note === `Private memory ${run}`);
  expect((await request.put(`/api/reading/passages/${bookId}/${chapterId}/-1`,{headers:headers(),data:{note:'Invalid anchor'}})).status()).toBe(400);
  expect((await request.put(`/api/reading/passages/${bookId}/${chapterId}/0`,{headers:headers(),data:{note:'x'.repeat(4001)}})).status()).toBe(400);
  expect((await request.get(`/api/reading/passages/${bookId}`)).status()).toBe(401);
  expect(saved.paragraphIndex).toBe(0); expect(saved.quote).not.toMatch(/[\uE000-\uF8FF]/);
  const foreignHeaders = { Authorization: `Bearer ${writerToken}`, 'X-Forwarded-For': '127.38.80.5' };
  expect(await (await request.get(`/api/reading/passages/${bookId}`, { headers: foreignHeaders })).json()).not.toContainEqual(expect.objectContaining({ id: saved.id }));
  expect((await request.delete(`/api/reading/passages/${saved.id}`, { headers: foreignHeaders })).ok()).toBeTruthy();
  expect(await (await request.get(`/api/reading/passages/${bookId}`, { headers: headers() })).json()).toContainEqual(expect.objectContaining({ id: saved.id }));
  await page.route('**/api/books/*/chapters/*/content', async route => {
    const response = await route.fetch(); const body = await response.json();
    if (body.access === 'FULL') body.content = `<p>A new passage inserted by the writer.</p>${body.content}`;
    await route.fulfill({ response, json: body });
  });
  await page.reload(); await expect(page.locator('.reader-copy')).toBeVisible();
  await page.locator('.reader-header-actions').getByRole('button', { name: 'Open saved passages and find in chapter' }).click();
  await page.locator('.reader-saved-passage').filter({ hasText: `Private memory ${run}` }).getByRole('button').first().click();
  await expect(page.locator('#paragraph-1')).toBeFocused();
  await request.delete(`/api/reading/passages/${saved.id}`, { headers: headers() });
});

test('failed passage save retains the note and retries locally without replacing the chapter', async ({ page }) => {
  let fail = true;
  await page.route('**/api/reading/passages/*/*/*', async route => {
    if (route.request().method() === 'PUT' && fail) return route.fulfill({ status: 503, json: { message: 'Local retry test' } });
    return route.continue();
  });
  await open(page, `/book/${bookId}/chapter/${chapterId}`);
  await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).focus(); await page.keyboard.press('Enter');
  const tools = page.getByRole('dialog', { name: 'Passages & find' });
  await tools.getByLabel('Private note (optional)').fill(`Retained note ${run}`);
  await tools.getByRole('button', { name: /Save passage online|Update saved passage/ }).click();
  await expect(tools.getByRole('alert')).toContainText('Your note remains here');
  await expect(tools.getByLabel('Private note (optional)')).toHaveValue(`Retained note ${run}`);
  await expect(page.locator('.reader-copy')).toBeAttached(); fail = false;
  await tools.getByRole('button', { name: /Save passage online|Update saved passage/ }).click();
  await expect(tools.getByRole('status')).toContainText('Saved online');
});

test('typing during a pending passage save preserves the newer note until it is saved online', async ({ page, request }) => {
  const existing = await (await request.get(`/api/reading/passages/${bookId}`, { headers: headers() })).json();
  for (const bookmark of existing.filter((item: any) => item.chapterId === chapterId && item.paragraphIndex === 0)) {
    expect((await request.delete(`/api/reading/passages/${bookmark.id}`, { headers: headers() })).ok()).toBeTruthy();
  }
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let pending = false, delay = true;
  await page.route('**/api/reading/passages/*/*/*', async route => {
    if (route.request().method() === 'PUT' && delay) { pending = true; await gate; }
    return route.continue();
  });
  try {
    await open(page, `/book/${bookId}/chapter/${chapterId}`);
    await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).focus();
    await page.keyboard.press('Enter');
    const tools = page.getByRole('dialog', { name: 'Passages & find' });
    const note = tools.getByLabel('Private note (optional)');
    const first = `First note ${run}`, newer = `Newer note typed during save ${run}`;
    await note.fill(first);
    await tools.getByRole('button', { name: /Save passage online|Update saved passage/ }).click();
    await expect.poll(() => pending).toBe(true);
    await expect(note).toBeEnabled();
    await note.fill(newer);
    delay = false; release();
    await expect(tools.getByRole('button', { name: 'Update saved passage', exact: true })).toBeEnabled();
    await expect(note).toHaveValue(newer);
    await expect(tools.getByRole('status')).toContainText('Newer changes are unsaved');
    const savedFirst = await (await request.get(`/api/reading/passages/${bookId}`, { headers: headers() })).json();
    expect(savedFirst).toContainEqual(expect.objectContaining({ note: first, paragraphIndex: 0 }));
    expect(savedFirst).not.toContainEqual(expect.objectContaining({ note: newer }));
    await tools.getByRole('button', { name: 'Close passage tools' }).click();
    await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(note).toHaveValue(newer);
    await tools.getByRole('button', { name: 'Update saved passage', exact: true }).click();
    await expect(tools.getByRole('status')).toContainText('Saved online');
    await page.reload(); await expect(page.locator('.reader-copy')).toBeVisible();
    await page.getByRole('button', { name: 'Save passage 1 or add a private note', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(note).toHaveValue(newer);
    const savedNewer = await (await request.get(`/api/reading/passages/${bookId}`, { headers: headers() })).json();
    expect(savedNewer).toContainEqual(expect.objectContaining({ note: newer, paragraphIndex: 0 }));
  } finally { release(); }
});

test('inline shelves stay private by default and preserve story context through create and save', async ({ page, request }) => {
  const saved = await request.post(`/api/library/books/${bookId}/shelves`, { headers: headers(), data: { shelfIds: [] } });
  expect(saved.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, `/book/${bookId}`);
  const readAction = page.locator('.ww-story-read-action'); await expect(readAction).toBeVisible();
  await expect.poll(async () => (await readAction.boundingBox())?.y ?? Infinity).toBeLessThan(700);
  await page.getByRole('button', { name: 'Organize shelves', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Manage shelves' });
  await picker.getByText('New shelf', { exact: true }).click();
  await picker.getByLabel('Shelf name').fill(`Private reading ${run}`);
  await expect(picker.getByRole('radio', { name: 'Private · Only you' })).toBeChecked();
  await picker.getByRole('button', { name: 'Create and select shelf' }).click();
  await expect(picker.getByRole('checkbox', { name: new RegExp(`Private reading ${run}`) })).toBeChecked();
  await picker.getByLabel('Find a shelf').fill(`Private reading ${run}`);
  await axe(page, '.ww-story-shelves-panel');
  await page.screenshot({ path: 'test-results/evidence/reading/reading-shelves-mobile.png', fullPage: false });
  await picker.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${bookId}$`)); await expect(readAction).toBeVisible();
  const profile = await (await request.get('/api/users/me', { headers: headers() })).json();
  expect(profile.library.find((shelf: any) => shelf.name === `Private reading ${run}`)).toMatchObject({ visibility: 'PRIVATE', books: expect.arrayContaining([expect.objectContaining({ id: bookId })]) });
});

test('library organization changes its section and exposes useful privacy and resume actions', async ({ page, request }) => {
  expect((await request.post(`/api/library/books/${bookId}/shelves`, { headers: headers(), data: { shelfIds: [] } })).ok()).toBeTruthy();
  const created = await request.post('/api/library/shelves', { headers: headers(), data: { name: `Bulk reading ${run}`, visibility: 'PRIVATE' } });
  expect(created.ok()).toBeTruthy();
  const target = (await created.json()).library.find((item: any) => item.name === `Bulk reading ${run}`);
  await open(page, '/library');
  await page.getByRole('button', { name: /All stories/ }).click();
  await page.getByText('Shelf tools', { exact: true }).click();
  await page.getByRole('button', { name: 'Organize stories', exact: true }).click();
  await page.getByRole('checkbox', { name: /Select The Last Spring/ }).check();

  expect((await request.post(`/api/library/books/${bookId}/shelves`,{headers:{Authorization:`Bearer ${writerToken}`,'X-Forwarded-For':'127.38.80.6'},data:{shelfIds:[target.id]}})).status()).toBe(400);
  await page.locator('.ww-library-organize select').selectOption(target.id);
  await page.getByRole('button', { name: 'Add to shelf', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved online');
  await expect(page.getByRole('heading', { name: 'Your library', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done organizing', exact: true }).click();
  await page.locator('.ww-library-shelf-select select').selectOption(target.id);
  await expect(page.locator('.ww-library-visibility')).toContainText('Private shelf');
  await page.getByRole('button', { name: 'Share on public profile', exact: true }).click();
  await expect(page.locator('.ww-library-visibility')).toContainText('Public shelf');
  await page.getByRole('button', { name: 'Make private', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await axe(page, '.ww-library-page-content');
  await page.screenshot({ path: 'test-results/evidence/reading/reading-library-mobile.png', fullPage: false });
});

test('only a shelf owner can delete it and deletion keeps the story and other memberships', async ({ request }) => {
  const retainedName = `Keep shelf ${run}`, deletedName = `Delete shelf ${run}`;
  const keepResponse = await request.post('/api/library/shelves', { headers: headers(), data: { name: retainedName } });
  expect(keepResponse.ok()).toBeTruthy();
  const retained = (await keepResponse.json()).library.find((item: any) => item.name === retainedName);
  const deleteResponse = await request.post('/api/library/shelves', { headers: headers(), data: { name: deletedName } });
  expect(deleteResponse.ok()).toBeTruthy();
  const deleted = (await deleteResponse.json()).library.find((item: any) => item.name === deletedName);
  expect((await request.post(`/api/library/books/${bookId}/shelves`, { headers: headers(), data: { shelfIds: [retained.id, deleted.id] } })).ok()).toBeTruthy();
  expect((await request.delete(`/api/library/shelves/${deleted.id}`, { headers: { Authorization: `Bearer ${writerToken}`, 'X-Forwarded-For': '127.38.80.7' } })).status()).toBe(404);
  const afterForeign = (await (await request.get('/api/users/me', { headers: headers() })).json()).library;
  expect(afterForeign).toContainEqual(expect.objectContaining({ id: deleted.id, books: expect.arrayContaining([expect.objectContaining({ id: bookId })]) }));
  const ownedDeletion = await request.delete(`/api/library/shelves/${deleted.id}`, { headers: headers() });
  expect(ownedDeletion.ok()).toBeTruthy();
  const shelves = (await ownedDeletion.json()).library;
  expect(shelves).not.toContainEqual(expect.objectContaining({ id: deleted.id }));
  expect(shelves).toContainEqual(expect.objectContaining({ id: retained.id, books: expect.arrayContaining([expect.objectContaining({ id: bookId })]) }));
  expect(shelves).toContainEqual(expect.objectContaining({ id: 'all', books: expect.arrayContaining([expect.objectContaining({ id: bookId })]) }));
});


test('discussion scopes count API comments and exact links return to their passage', async ({ page, request }) => {
  const comments = await (await request.get(`/api/books/${bookId}/chapters/${chapterId}/comments`, { headers: headers() })).json();
  const passage = comments.find((comment: any) => comment.paragraphIndex !== null && !comment.parentId);
  expect(passage).toBeTruthy();
  await open(page, `/book/${bookId}/chapter/${chapterId}?discussion=all&comment=${encodeURIComponent(passage.id)}`);
  const drawer = page.getByRole('dialog', { name: 'Story discussions' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: `All (${comments.length})`, exact: true })).toHaveAttribute('aria-pressed','true');
  await expect(drawer.locator(`[data-comment-id="${passage.id}"]`)).toBeFocused();
  await axe(page,'.reader-thread-panel');
  await page.screenshot({ path:'test-results/evidence/reading/reading-discussion-desktop.png' });
  await drawer.getByRole('button', { name: /Chapter \(/ }).click();
  const chapterComments = comments.filter((comment: any) => comment.paragraphIndex === null && !comment.parentId);
  if (!chapterComments.length) await expect(drawer).toContainText('No comments yet');
  await drawer.getByRole('button', { name: /All \(/ }).click();
  await drawer.getByRole('button', { name: `Return to passage ${passage.paragraphIndex + 1}`, exact: true }).first().click();
  await expect(page.locator(`#paragraph-${passage.paragraphIndex}`)).toBeFocused();
  await page.goto(`/book/${bookId}/chapter/${chapterId}?paragraph=0`);
  await expect(page.locator('#paragraph-0')).toBeFocused();
});

test('quiet controls are optional with reliable reveal and keyboard access on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page,`/book/${bookId}/chapter/${chapterId}`);
  await page.getByRole('button',{ name:'Open reading appearance settings',exact:true }).click();
  const settings = page.getByRole('dialog',{name:'Reading preferences'});
  await settings.getByRole('checkbox',{name:'Quiet controls'}).check();
  await axe(page,'.reader-settings-panel');
  await settings.getByRole('button',{name:'Close preferences'}).click();
  await page.evaluate(() => window.scrollTo(0,450));
  const reveal = page.getByRole('button',{name:'Show reading controls',exact:true});
  await expect(reveal).toBeVisible();
  await reveal.click(); await expect(page.getByRole('button',{name:'Open contents',exact:true})).toBeVisible();
  await page.keyboard.press('Tab');
  await page.getByRole('button',{name:'Open reading appearance settings',exact:true}).focus();
  await page.evaluate(() => window.scrollTo(0,650));
  await expect(page.getByRole('button',{name:'Open contents',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open reading appearance settings',exact:true}).click();
  await settings.getByRole('checkbox',{name:'Quiet controls'}).uncheck();
  await settings.getByRole('button',{name:'Close preferences'}).click();
  await page.evaluate(() => window.scrollTo(0,650));
  await expect(page.getByRole('button',{name:'Open contents',exact:true})).toBeVisible();
  await page.locator('.reader-header-actions').getByRole('button',{name:'Open saved passages and find in chapter'}).click();
  await axe(page,'.reader-tools-panel');
  await page.screenshot({path:'test-results/evidence/reading/reading-tools-mobile.png'});
});


test('the compact resume action precedes mobile organization and opens the actual next unread chapter', async ({ page, request }) => {
  const saved = await request.post('/api/reading/progress',{headers:headers(),data:{bookId,chapterIndex:0,scrollPosition:0,chapterData:{id:chapterId,progress:100,scroll:0}}});
  expect(saved.ok()).toBeTruthy();
  await page.setViewportSize({width:390,height:844});
  await open(page,'/library');
  const resume = page.locator('.ww-library-resume-v2');
  await expect(resume).toContainText('What the Rain Revealed');
  const continueAction = resume.getByRole('button',{name:'Continue chapter 2',exact:true});
  await expect(continueAction).toBeVisible();
  expect((await continueAction.boundingBox())!.y).toBeLessThan(700);
  await page.screenshot({path:'test-results/evidence/reading/reading-resume-mobile.png'});
  await continueAction.click();
  await expect(page).toHaveURL(new RegExp(`/chapter/${laterChapterId}$`));
});
