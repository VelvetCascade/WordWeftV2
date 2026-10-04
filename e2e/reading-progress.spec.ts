import { test, expect, type APIRequestContext, type Page } from './fixtures';

const bookId = 'local-story-spring';
const chapters = [`${bookId}-chapter-1`, `${bookId}-chapter-2`];
const run = Date.now().toString(36);
let token = '';
const headers = () => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': '127.26.42.1' });

async function save(request: APIRequestContext, index: number, progress: number, scroll = 0) {
  return request.post('/api/reading/progress', { headers: headers(), data: { bookId, chapterIndex: index, scrollPosition: scroll, chapterData: { id: chapters[index], progress, scroll } } });
}
async function open(page: Page, path: string) {
  await page.addInitScript(value => {
    if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  }, token);
  await page.goto(path);
}

test.beforeAll(async ({ request }) => {
  const email = `progress-${run}@example.test`;
  const signup = await request.post('/api/auth/signup', { headers: { 'X-Forwarded-For': '127.26.42.2' }, data: { username: `Progress${run}`, email, password: 'WordWeftLocal123!', dateOfBirth: '1995-04-12' } });
  expect(signup.ok()).toBeTruthy();
  let body = '';
  await expect.poll(async () => {
    const messages = await (await request.get('http://127.0.0.1:8081/mail')).json();
    body = [...messages].reverse().find((message: any) => message.to === email && message.subject.includes('Verification'))?.htmlBody || '';
    return body;
  }).not.toBe('');
  const otp = body.match(/>\s*(\d{6})\s*</)?.[1];
  const verified = await request.post('/api/auth/verify-otp', { headers: { 'X-Forwarded-For': '127.26.42.2' }, data: { email, otp } });
  expect(verified.ok()).toBeTruthy();
  token = (await verified.json()).token;
});
test.beforeEach(async ({ request, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.26.43.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 190 + 10}` });
  expect((await request.delete(`/api/reading/progress/${bookId}`, { headers: headers() })).ok()).toBeTruthy();
});

test('Continue advances past a completed chapter from story details and library', async ({ page, request }) => {
  expect((await save(request, 0, 100)).ok()).toBeTruthy();
  await open(page, `/book/${bookId}`);
  const action = page.locator('.ww-story-read-action');
  await expect(action).toContainText('Continue');
  await action.click();
  await expect(page).toHaveURL(new RegExp(`/chapter/${chapters[1]}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What the Rain Revealed');
  await page.goto('/library');
  await expect(page.locator('.ww-library-resume-v2')).toContainText('Chapter 2');
  await page.locator('.ww-library-resume-actions').getByRole('button', { name: 'Continue chapter 2' }).click();
  await expect(page).toHaveURL(new RegExp(`/chapter/${chapters[1]}$`));
});

for (const width of [1440, 390]) test(`reading two chapters and returning immediately keeps both completions at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 900 });
  // Delay the real save: story details must still show the just-read chapter while it is in flight.
  await page.route('**/api/reading/progress', async route => {
    if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 800));
    await route.continue();
  });
  await open(page, `/book/${bookId}/chapter/${chapters[0]}`);
  await expect(page.locator('.reader-copy')).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Read next chapter', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.reader-margin-progress > span')).toHaveText('100%');
  await page.getByRole('button', { name: 'Read next chapter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What the Rain Revealed');
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Return to story', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.reader-margin-progress > span')).toHaveText('100%');
  await page.getByRole('button', { name: 'Return to story', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${bookId}$`));
  await expect(page.locator('.ww-saved-reading-progress')).toContainText('2 chapters finished');
  await expect(page.locator('.ww-story-read-action')).toHaveText(/Read again/);
  await expect.poll(async () => {
    const progress = await (await request.get(`/api/reading/progress/${bookId}`, { headers: headers() })).json();
    return chapters.map(id => progress?.chapters?.[id]?.progress || 0);
  }).toEqual([100, 100]);
  await page.reload();
  await expect(page.locator('.ww-saved-reading-progress')).toContainText('2 chapters finished');
  await page.locator('.ww-story-read-action').click();
  await expect(page).toHaveURL(new RegExp(`/chapter/${chapters[0]}$`));
  await expect(page.locator('.reader-copy')).toBeVisible();
  await page.waitForTimeout(250);
  await expect(page.locator('.reader-margin-progress > span')).toHaveText('0%');
});

test('rereading does not roll back a completed chapter or count it twice', async ({ request }) => {
  expect((await save(request, 0, 100)).ok()).toBeTruthy();
  const before = await (await request.get('/api/users/me', { headers: headers() })).json();
  expect((await save(request, 0, 3, 20)).ok()).toBeTruthy();
  expect((await save(request, 0, 100)).ok()).toBeTruthy();
  const progress = await (await request.get(`/api/reading/progress/${bookId}`, { headers: headers() })).json();
  const after = await (await request.get('/api/users/me', { headers: headers() })).json();
  expect(progress.chapters[chapters[0]].progress).toBe(100);
  expect(after.stats.chaptersRead).toBe(before.stats.chaptersRead);
});

test('failed progress sync survives reload and a visible retry saves the real chapter', async ({ page, request }) => {
  let fail = true;
  await page.route('**/api/reading/progress', async route => {
    if (route.request().method() === 'POST' && fail) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary local test outage' }) });
    else await route.continue();
  });
  await open(page, `/book/${bookId}/chapter/${chapters[0]}`);
  await expect(page.locator('.reader-copy')).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Read next chapter', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.reader-margin-progress > span')).toHaveText('100%');
  await expect(page.getByRole('button', { name: 'Retry saving your place', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.reader-copy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry saving your place', exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry saving your place', exact: true }).click();
  await expect(page.locator('.reader-save-status')).toContainText('Saved online');
  await expect.poll(async () => (await (await request.get(`/api/reading/progress/${bookId}`, { headers: headers() })).json())?.chapters?.[chapters[0]]?.progress).toBe(100);
});

test('simultaneous chapter saves preserve both chapters and reject draft progress', async ({ request }) => {
  const results = await Promise.all([save(request, 0, 100), save(request, 1, 100)]);
  results.forEach(response => expect(response.ok()).toBeTruthy());
  const progress = await (await request.get(`/api/reading/progress/${bookId}`, { headers: headers() })).json();
  expect(chapters.map(id => progress.chapters[id]?.progress)).toEqual([100, 100]);
  expect(progress.overallProgress).toBe(100);
  const draft = await request.post('/api/reading/progress', { headers: headers(), data: { bookId, chapterIndex: 2, scrollPosition: 0, chapterData: { id: `${bookId}-chapter-3`, progress: 100, scroll: 0 } } });
  expect(draft.status()).toBe(400);
});
