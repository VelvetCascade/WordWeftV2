import { expect, test, type Page } from './fixtures';

const password = 'WordWeftLocal123!';
let readerToken = '';
let adminToken = '';

test.beforeAll(async ({ request }) => {
  for (const role of ['reader', 'admin']) {
    const response = await request.post('/api/auth/login', {
      data: { email: `${role}@example.test`, password },
      headers: { 'X-Forwarded-For': '127.5.1.4' },
    });
    expect(response.ok(), 'Start the isolated local backend before admin E2E tests.').toBeTruthy();
    const body = await response.json();
    if (role === 'admin') adminToken = body.token; else readerToken = body.token;
  }
});

async function session(page: Page, token: string) {
  await page.addInitScript(value => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  }, token);
}

test('admin API refuses anonymous and ordinary member requests', async ({ request }) => {
  const anonymous = await request.get('/api/admin/console/overview');
  expect([401, 403]).toContain(anonymous.status());
  const reader = await request.get('/api/admin/console/overview', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  expect(reader.status()).toBe(403);
  const directory = await request.get('/api/admin/console/users', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  expect(directory.status()).toBe(403);
  const reports = await request.get('/api/admin/console/reports', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  expect(reports.status()).toBe(403);
});

test('admin API returns live counts and safe account projections', async ({ request }) => {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const overview = await request.get('/api/admin/console/overview', { headers });
  expect(overview.ok()).toBeTruthy();
  const data = await overview.json();
  expect(data.users).toBeGreaterThan(0);
  expect(data.activity).toHaveLength(7);
  expect(data.stories).toBeGreaterThanOrEqual(data.publishedStories);
  const members = await request.get('/api/admin/console/users?page=0&size=20', { headers });
  expect(members.ok()).toBeTruthy();
  const people = await members.json();
  expect(people.items.length).toBeGreaterThan(0);
  for (const person of people.items) {
    expect(person).not.toHaveProperty('password');
    expect(person).not.toHaveProperty('resetPasswordToken');
    expect(person).not.toHaveProperty('emailVerificationOtp');
  }
  const stories = await request.get('/api/admin/console/stories?page=0&size=20', { headers });
  expect(stories.ok()).toBeTruthy();
  for (const item of (await stories.json()).items) {
    expect(item).not.toHaveProperty('content');
    expect(item).not.toHaveProperty('publishedContent');
  }
});

test('the admin workspace shows data and working directory navigation', async ({ page }) => {
  await session(page, adminToken);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByText('Total members', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Member directory' })).toBeVisible();
  await expect(page.getByRole('table').first()).toBeVisible();
  await page.getByRole('button', { name: 'Stories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Story directory' })).toBeVisible();
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Content reports' })).toBeVisible();
});

test('non-admin UI does not render management data', async ({ page }) => {
  await session(page, readerToken);
  await page.goto('/admin');
  await expect(page.getByText('Administrator access required')).toBeVisible();
  await expect(page.getByText('Total members')).toHaveCount(0);
});

test('admin can inspect moderation actions without changing real data', async ({ page }) => {
  await session(page, adminToken);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Member directory' })).toBeVisible();
  const action = page.getByRole('button', { name: /^Suspend$|^Reinstate$/ }).first();
  if (await action.count()) {
    await action.click();
    const dialog = page.getByRole('dialog', { name: /Suspend member|Reinstate member/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Reason for this action/)).toBeVisible();
    await expect(dialog.getByLabel(/Internal case note/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Activity log', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Moderation history' })).toBeVisible();
});

test('anonymous and ordinary readers cannot read admin moderation audit', async ({ request }) => {
  const unauthorized = await request.get('/api/admin/console/audit');
  expect([401, 403]).toContain(unauthorized.status());
  const headers = { Authorization: `Bearer ${readerToken}` };
  expect((await request.get('/api/admin/console/audit', { headers })).status()).toBe(403);
});
