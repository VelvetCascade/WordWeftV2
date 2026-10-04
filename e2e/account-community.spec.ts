import { test, expect, type APIRequestContext, type Page } from './fixtures';

// These tests use the disposable Mongo-backed runtime and its local email capture.
const password = 'WordWeftLocal123!';
const run = Date.now().toString(36);
const bucket = `127.7.${Date.now() % 200 + 1}`;
let member = { id: '', token: '', email: '' };
let visitor = { id: '', token: '', email: '' };
let writerToken = '', adminToken = '';
let releaseBookId = '';
const createdPosts: { id: string; token: string }[] = [];

async function mail(request: APIRequestContext, email: string, subject: string): Promise<string> {
  let body = '';
  await expect.poll(async () => {
    const response = await request.get('http://127.0.0.1:8081/mail');
    const messages = await response.json();
    body = messages.findLast((item: any) => item.to === email && item.subject?.includes(subject))?.htmlBody || '';
    return body;
  }, { timeout: 15_000, message: `Local inbox must receive ${subject} for the disposable account` }).not.toBe('');
  return body;
}
async function fixture(request: APIRequestContext, suffix: string) {
  const email = `acct-${run}-${suffix}@example.test`;
  const signup = await request.post('/api/auth/signup', { data: { username: `Acct${run}${suffix}`, email, password, dateOfBirth: '1995-04-12' }, headers: { 'X-Forwarded-For': `${bucket}.1` } });
  expect(signup.ok()).toBeTruthy();
  const otp = (await mail(request, email, 'Verification')).match(/>\s*(\d{6})\s*</)?.[1];
  expect(otp).toBeTruthy();
  const verified = await request.post('/api/auth/verify-otp', { data: { email, otp }, headers: { 'X-Forwarded-For': `${bucket}.1` } });
  expect(verified.ok()).toBeTruthy();
  const { token } = await verified.json();
  const me = await request.get('/api/users/me', { headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': `${bucket}.1` } });
  return { id: (await me.json()).id, token, email };
}
async function session(page: Page, token: string) {
  await page.addInitScript(value => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    if (value) localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
}
async function createPost(request: APIRequestContext, token: string, type = 'UPDATE') {
  const response = await request.post('/api/community/posts', { headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': `${bucket}.2` }, data: { circleId: 'circle-general', type, title: `Local ${run} ${type}`, body: 'A disposable conversation for the account and community flow tests.', ...(type === 'POLL' ? { pollOptions: ['River town', 'Lantern shop'] } : {}) } });
  expect(response.ok()).toBeTruthy();
  const post = await response.json(); createdPosts.push({ id: post.id, token }); return post;
}
async function openComposer(page: Page, type: string) {
  await page.getByRole('button', { name: /What are you reading or writing/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a post' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Circle', { exact: true }).selectOption('circle-general');
  await dialog.getByRole('button', { name: type, exact: true }).click();
  await dialog.getByLabel(/^Title/).fill(`Local ${run} ${type}`);
  await dialog.getByLabel(type === 'Workshop' ? 'Excerpt and feedback request' : 'Your post', { exact: false }).fill(type === 'Workshop' ? 'The rain stopped at the edge of town. I would appreciate feedback on the clarity of this opening.' : 'A disposable conversation created through the complete local publishing flow.');
  return dialog;
}

test.beforeAll(async ({ request }) => {
  member = await fixture(request, 'm'); visitor = await fixture(request, 'v');
  // Each run needs its own author: deleted posts still count toward daily quotas.
  writerToken = (await fixture(request, 'w')).token;
  const headers = { Authorization: `Bearer ${writerToken}`, 'X-Forwarded-For': `${bucket}.6` };
  const title = `Release fixture ${run}`;
  const created = await request.post('/api/books', { headers, data: { title, summary: 'A disposable release fixture.', description: 'A small story for the complete community release journey.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://localhost:3000/design-v2/assets/met-53681.jpg' } });
  expect(created.ok()).toBeTruthy(); releaseBookId = (await created.json()).writtenBooks.find((book: any) => book.title === title).id;
  const chapter = await request.patch(`/api/books/${releaseBookId}/chapters/${crypto.randomUUID()}`, { headers, data: { data: { title: 'First light', content: '<p>A lantern appeared beside the river at first light.</p>', contentWarnings: [], disclaimerNote: '' }, status: 'published' } });
  expect(chapter.ok()).toBeTruthy();
  const response = await request.post('/api/auth/login', { data: { email: 'admin@example.test', password }, headers: { 'X-Forwarded-For': `${bucket}.1` } });
  expect(response.ok(), 'Start scripts/dev-local-backend.sh before running this suite.').toBeTruthy();
  adminToken = (await response.json()).token;
});
test.beforeEach(async ({ context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `${bucket}.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 190 + 10}` });
});
test.afterAll(async ({ request }) => {
  for (const post of createdPosts) await request.delete(`/api/community/posts/${post.id}`, { headers: { Authorization: `Bearer ${post.token}`, 'X-Forwarded-For': `${bucket}.3` } });
  if (releaseBookId) await request.delete(`/api/books/${releaseBookId}`, { headers: { Authorization: `Bearer ${writerToken}`, 'X-Forwarded-For': `${bucket}.6` } });
});

test('registration enforces age and terms, verifies the real email, and resets the password', async ({ page, request }) => {
  test.setTimeout(90_000);
  const email = `signup-${run}@example.test`;
  await session(page, ''); await page.goto('/auth');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill(`Signup${run}`);
  await page.getByLabel('Email Address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password', { exact: true }).fill(password);
  await page.getByLabel('Birth month').selectOption('4'); await page.getByLabel('Birth day').selectOption('12');
  await page.getByLabel('Birth year').selectOption(String(new Date().getFullYear() - 10));
  expect(await page.locator('form').evaluate(form => (form as HTMLFormElement).checkValidity()), 'Terms and privacy must both be accepted').toBe(false);
  await page.getByRole('checkbox').nth(0).check(); await page.getByRole('checkbox').nth(1).check();
  await page.locator('button[type=submit]').click(); await expect(page.getByRole('alert')).toContainText('at least 13');
  await page.getByLabel('Birth year').selectOption('1995'); await page.locator('button[type=submit]').click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  const otp = (await mail(request, email, 'Verification')).match(/>\s*(\d{6})\s*</)?.[1]; expect(otp).toBeTruthy();
  await page.getByLabel('Verification Code').fill('000000'); await page.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Verification Code').fill(otp!); await page.locator('button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wordweft_jwt'))).not.toBeNull();
  await page.evaluate(() => localStorage.removeItem('wordweft_jwt')); await page.goto('/auth');
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await page.getByLabel('Email Address', { exact: true }).fill(email); await page.locator('button[type=submit]').click();
  const resetToken = (await mail(request, email, 'Reset')).match(/token=([a-f0-9-]+)/)?.[1]; expect(resetToken).toBeTruthy();
  await page.goto(`/reset-password?token=${resetToken}`);
  await page.getByLabel('New Password', { exact: true }).fill('RevisedAccount123!'); await page.getByLabel('Confirm Password', { exact: true }).fill('DifferentAccount123!');
  await page.getByRole('button', { name: 'Reset Password', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('do not match');
  await page.getByLabel('Confirm Password', { exact: true }).fill('RevisedAccount123!'); await page.getByRole('button', { name: 'Reset Password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
  const login = await request.post('/api/auth/login', { data: { email, password: 'RevisedAccount123!' }, headers: { 'X-Forwarded-For': `${bucket}.4` } }); expect(login.ok()).toBeTruthy();
});

test('settings save public details and preferences while keeping private data private', async ({ page, request }) => {
  await session(page, member.token); await page.goto('/edit-profile');
  const bio = `Local account settings verification ${run}`;
  await page.getByLabel('Bio', { exact: true }).fill(bio); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Profile updated');
  await page.getByRole('button', { name: 'Story preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Fantasy', exact: true }).click();
  await page.getByLabel('Date of birth', { exact: true }).fill(`${new Date().getFullYear() - 16}-01-01`); await expect(page.getByRole('checkbox', { name: /Include mature stories/ })).toBeDisabled();
  await page.getByLabel('Date of birth', { exact: true }).fill('1995-04-12'); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Profile updated');
  await page.getByRole('button', { name: 'Privacy and security', exact: true }).click(); await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();
  await page.getByLabel('Current Password', { exact: true }).fill(password); await page.getByLabel('New Password', { exact: true }).fill('NewAccount123!'); await page.getByLabel('Confirm New Password', { exact: true }).fill('Different123!');
  await page.getByRole('button', { name: 'Update Password', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('do not match');
  const response = await request.get(`/api/users/${member.id}/profile`, { headers: { 'X-Forwarded-For': `${bucket}.5` } }); const profile = await response.json();
  expect(profile.bio).toBe(bio); expect(profile.favoriteGenres).toContain('Fantasy');
  for (const privateKey of ['email', 'dateOfBirth', 'library', 'notificationPreferences', 'password']) expect(profile).not.toHaveProperty(privateKey);
  await page.goto('/notifications'); await page.getByRole('tab', { name: 'Unread', exact: true }).click(); await expect(page.getByRole('tab', { name: 'Unread', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click(); const follows = page.getByRole('switch', { name: 'Follows notifications' }); await follows.click(); await expect(follows).toHaveAttribute('aria-checked', 'false'); await expect(follows).toBeEnabled(); await page.reload(); await page.getByRole('button', { name: 'Preferences', exact: true }).click(); await expect(follows).toHaveAttribute('aria-checked', 'false'); await follows.click(); await expect(follows).toHaveAttribute('aria-checked', 'true');
});

test('every post format publishes with real attachments and circle membership', async ({ page }) => {
  test.setTimeout(90_000); await session(page, member.token); await page.goto('/community/circle/general');
  await page.getByRole('button', { name: 'Join circle', exact: true }).click(); await expect(page.getByRole('button', { name: 'Joined · Leave circle' })).toBeVisible();
  for (const type of ['Update', 'Poll', 'Workshop', 'Recommendation']) {
    const dialog = await openComposer(page, type);
    if (type === 'Poll') { await dialog.getByLabel('Option 1', { exact: true }).fill('River town'); await dialog.getByLabel('Option 2', { exact: true }).fill('Lantern shop'); }
    if (type === 'Recommendation') { await expect(dialog.locator('.community-attachment-results > button').first()).toBeVisible(); await dialog.locator('.community-attachment-results > button').first().click(); }
    const published = page.waitForResponse(response => response.url().endsWith('/api/community/posts') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Publish post', exact: true }).click(); const response = await published; expect(response.ok()).toBeTruthy(); const post = await response.json(); createdPosts.push({ id: post.id, token: member.token }); await expect(dialog).not.toBeVisible();
  }
  await session(page, writerToken); await page.goto('/community');
  const release = await openComposer(page, 'Release'); await expect(release.locator('.community-attachment-results > button').first()).toBeVisible(); await release.locator('.community-attachment-results > button').first().click();
  const published = page.waitForResponse(response => response.url().endsWith('/api/community/posts') && response.request().method() === 'POST'); await release.getByRole('button', { name: 'Publish post', exact: true }).click(); const response = await published; expect(response.ok()).toBeTruthy(); const post = await response.json(); createdPosts.push({ id: post.id, token: writerToken }); await expect(release).not.toBeVisible();
  expect(post.attachment?.bookId).toBeTruthy();
});

test('poll votes, comments, follows, saved posts and connections work together', async ({ page, request }) => {
  const post = await createPost(request, member.token, 'POLL'); await session(page, visitor.token); await page.goto(`/community/post/${post.id}`);
  await page.getByRole('button', { name: 'River town', exact: true }).click(); await expect(page.locator('.community-poll-result.selected')).toContainText('River town'); await expect(page.locator('.community-poll > small')).toContainText('Your vote: River town');
  await page.getByLabel('Add your voice').fill('A thoughtful reply from another reader.'); await page.getByRole('button', { name: 'Post comment', exact: true }).click(); await expect(page.getByText('A thoughtful reply from another reader.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/community?mode=saved'); await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible();
  await page.goto(`/author/${member.id}`); await page.getByRole('button', { name: 'Follow', exact: true }).click(); await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /\d+ followers?/i }).click(); const connections = page.getByRole('dialog', { name: 'Followers' }); await expect(connections).toBeVisible(); await expect(connections.getByRole('button', { name: 'Follow', exact: true })).toHaveCount(0); await page.keyboard.press('Escape'); await expect(connections).not.toBeVisible();
});

test('moderators can lock, remove and restore a discussion without exposing removed content', async ({ page, request, browser }) => {
  const post = await createPost(request, member.token); await session(page, adminToken); await page.goto(`/community/post/${post.id}`);
  await page.getByRole('button', { name: 'Post actions', exact: true }).click(); await page.getByRole('button', { name: 'Lock discussion', exact: true }).click(); let dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByText('This discussion is locked. You can still read the conversation.')).toBeVisible();
  await page.getByRole('button', { name: 'Post actions', exact: true }).click(); await page.getByRole('button', { name: 'Remove post', exact: true }).click(); dialog = page.getByRole('dialog'); await dialog.getByLabel('Moderation reason (required)').fill('Local moderation flow verification.'); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByText('Removed post · visible to moderators only')).toBeVisible();
  const anonymous = await browser.newContext({ baseURL: test.info().project.use.baseURL as string, extraHTTPHeaders: { 'X-Forwarded-For': `${bucket}.6` } }); const publicPage = await anonymous.newPage(); await publicPage.goto(`/community/post/${post.id}`); await expect(publicPage.getByText('This community content is no longer available.')).toBeVisible(); await expect(publicPage.getByText(post.body, { exact: true })).toHaveCount(0); await anonymous.close();
  await page.getByRole('button', { name: 'Post actions', exact: true }).click(); await page.getByRole('button', { name: 'Restore post', exact: true }).click(); dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible(); await expect(page.getByText('Removed post · visible to moderators only')).toHaveCount(0);
});
