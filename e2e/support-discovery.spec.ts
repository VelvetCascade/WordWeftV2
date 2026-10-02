import { test, expect } from './fixtures';

let token = '';
const bucket = `127.11.${Date.now() % 200 + 1}`;
test.beforeAll(async ({ request }) => {
  // Feedback permits three submissions per account per hour. A new fixture
  // makes repeated local runs independent while preserving that product limit.
  const run = Date.now().toString(36), email = `support-${run}@example.test`;
  const headers = { 'X-Forwarded-For': `${bucket}.1` };
  const signup = await request.post('/api/auth/signup', { data: { username: `Support${run}`, email, password: 'WordWeftLocal123!', dateOfBirth: '1995-04-12' }, headers });
  expect(signup.ok()).toBeTruthy();
  let otp = '';
  await expect.poll(async () => {
    const messages = await (await request.get('http://127.0.0.1:8081/mail')).json();
    otp = messages.findLast((message: any) => message.to === email && message.subject?.includes('Verification'))?.htmlBody?.match(/>\s*(\d{6})\s*</)?.[1] || '';
    return otp;
  }, { timeout: 15_000 }).not.toBe('');
  const verified = await request.post('/api/auth/verify-otp', { data: { email, otp }, headers });
  expect(verified.ok()).toBeTruthy(); token = (await verified.json()).token;
});
test.beforeEach(async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `${bucket}.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 190 + 10}` });
  await page.addInitScript(value => {
    if (!['localhost','127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  }, token);
});

test('help search and support submission retain the message after a failed request', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('searchbox', { name: 'Search help topics' }).fill('paragraph');
  await expect(page.locator('.wv-faq')).toHaveCount(1);
  await page.locator('.wv-faq summary').click();
  await expect(page.locator('.wv-faq p')).toBeVisible();
  await page.getByLabel('What is this about?', { exact: false }).selectOption('general');
  await page.getByLabel('Subject', { exact: false }).fill('Local browser verification');
  const message = page.getByLabel('Your message', { exact: false });
  await message.fill('A disposable support request sent through the complete local browser flow.');
  await page.route('**/api/support/grievances', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Support is temporarily unavailable.' }) }));
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(message).toHaveValue('A disposable support request sent through the complete local browser flow.');
  await page.unroute('**/api/support/grievances');
  const submitted = page.waitForResponse(response => response.url().endsWith('/api/support/grievances') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  expect((await submitted).ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Message sent', exact: true })).toBeVisible();
});

test('the complete feedback form sends its original fields and optional follow-up consent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/feedback');
  await page.getByRole('radio', { name: 'Both', exact: true }).check();
  await page.getByRole('button', { name: '5: Extremely smooth', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reading stories', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Writing a story', exact: true }).check();
  await page.getByLabel('What you enjoyed', { exact: true }).fill('The reading typography and saved place.');
  await page.getByLabel('Feature idea', { exact: true }).fill('Offline reading'); await page.getByLabel('Feature idea', { exact: true }).press('Enter');
  await page.getByRole('radio', { name: 'Sometimes', exact: true }).check();
  await page.getByLabel('Where did it happen?', { exact: false }).fill('A slow connection.');
  await page.getByRole('radio', { name: 'Few times a week', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Allow us to contact you for clarification' }).check();
  await page.getByLabel('Email address', { exact: true }).fill('reader@example.test');
  const submitted = page.waitForResponse(response => response.url().endsWith('/api/feedback') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  const response = await submitted;
  expect(response.ok(), `Feedback API returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({ userType: 'both', overallRating: 5, triedFeatures: ['Reading stories','Writing a story'], missingFeatures: ['Offline reading'], contactPermission: true, contactEmail: 'reader@example.test' });
  expect((await response.json()).id).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Thank you.', exact: true })).toBeVisible();
});

test('hook discovery saves reading taste, reacts, skips and opens the selected story', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${token}`, 'X-Forwarded-For': `${bucket}.2` };
  const original = (await (await request.get('/api/users/me', { headers })).json()).favoriteGenres || [];
  try {
    await page.goto('/hooks'); await expect(page.locator('.wv-hook-card')).toBeVisible();
    await page.getByRole('button', { name: 'Tune my feed', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose genres', exact: true });
    const fantasy = dialog.getByRole('button', { name: 'Fantasy', exact: true });
    if (await fantasy.getAttribute('aria-pressed') !== 'true') await fantasy.click();
    const romance = dialog.getByRole('button', { name: 'Romance', exact: true });
    if (await romance.getAttribute('aria-pressed') !== 'true') await romance.click();
    await dialog.getByRole('button', { name: 'Save my taste', exact: true }).click(); await expect(dialog).not.toBeVisible();
    expect((await (await request.get('/api/users/me', { headers })).json()).favoriteGenres).toContain('Romance');
    await expect(page.locator('.wv-hook-card')).toBeVisible();
    const opening = page.locator('.wv-hook-like');
    const wasLiked = await opening.getAttribute('aria-pressed') === 'true';
    const liked = page.waitForResponse(response => /\/chapters\/[^/]+\/like$/.test(response.url()) && response.request().method() === 'POST');
    await opening.click();
    expect((await liked).ok()).toBeTruthy();
    await expect(opening).toHaveAttribute('aria-pressed', String(!wasLiked)); await expect(opening).toBeEnabled();
    const restored = page.waitForResponse(response => /\/chapters\/[^/]+\/like$/.test(response.url()) && response.request().method() === 'POST');
    await opening.click(); expect((await restored).ok()).toBeTruthy(); await expect(opening).toHaveAttribute('aria-pressed', String(wasLiked));
    await page.getByRole('button', { name: 'Not for me', exact: true }).click();
    await expect(page.locator('.wv-hook-card')).toBeVisible();
    await page.getByRole('button', { name: 'Open story', exact: true }).click(); await expect(page).toHaveURL(/\/book\//);
    await expect(page.locator('.ww-story-v2')).toBeVisible();
  } finally { await request.put('/api/discovery/taste', { headers, data: { favoriteGenres: original } }); }
});
