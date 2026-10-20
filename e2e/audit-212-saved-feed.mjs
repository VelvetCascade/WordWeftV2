import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname), 'Disposable local backend only');
const output = process.env.AUDIT_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });
const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': `127.212.${process.pid % 200 + 1}.1` };
async function api(path, token, method = 'GET', body) {
  const response = await fetch(`${baseURL}/api${path}`, { method, headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert(response.ok, `${method} ${path}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
const login = async role => (await api('/auth/login', '', 'POST', { email: `${role}@example.test`, password: 'WordWeftLocal123!' })).token;
const reader = await login('reader'), writer = await login('writer');
const fixture = await api('/community/posts', writer, 'POST', { circleId: 'circle-general', type: 'UPDATE', title: 'A conversation to keep', body: 'A disposable conversation for checking the Saved feed. A good story stays with you; a saved conversation should stay only while you want it here.' });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const rows = [], failures = [];
const check = (name, fn) => { try { fn(); } catch (error) { failures.push({ name, message: error.message }); } };
const delay = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };
async function open(width, route = '/community?mode=saved', pagination = false) {
  const saved = await api(`/community/posts/${fixture.id}/save`, reader, 'PUT', { active: true });
  const context = await browser.newContext({ viewport: { width, height: width < 760 ? 844 : 1000 }, extraHTTPHeaders: headers });
  await context.addInitScript(token => {
    localStorage.setItem('wordweft_jwt', token);
    localStorage.setItem('theme', 'light');
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
  }, reader);
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.route(/googlesyndication|doubleclick/, r => r.fulfill({ status: 200, body: '' }));
  // Keep other workers' local posts out of the proof; mutations still use the real backend.
  // Filter real feed responses to the fixture, seeding it when the selected mode does
  // not include it, so reconciliation checks need no shared follow/membership changes.
  await page.route('**/api/community/feed?*', async r => {
    const response = await r.fetch(), data = await response.json();
    const item = data.items.find(post => post.id === fixture.id) || saved;
    await r.fulfill({ response, json: { ...data, items: [{ ...item, createdAt: '2026-10-20T00:00:00Z' }], nextCursor: pagination ? 'audit-next' : null } });
  });
  await page.goto(baseURL + route, { waitUntil: 'domcontentloaded' });
  const card = page.locator('.community-post').filter({ hasText: fixture.title });
  await expect(card).toBeVisible();
  await expect(card.locator('.community-save')).toHaveAttribute('aria-pressed', 'true');
  return { context, page, card, saved };
}
try {
  for (const width of [390, 1440]) {
    const { context, page, card } = await open(width);
    const gate = delay(); let requested = false;
    await page.route(`**/api/community/posts/${fixture.id}/save`, async r => { requested = true; await gate.promise; await r.continue(); });
    await card.locator('.community-save').click();
    await expect.poll(() => requested).toBe(true);
    await expect(card).toBeVisible(); await expect(card.locator('.community-save')).toBeDisabled();
    const response = page.waitForResponse(r => r.url().endsWith(`/posts/${fixture.id}/save`) && r.request().method() === 'PUT');
    gate.release(); assert((await response).ok());
    await page.waitForTimeout(400);
    const backendSaved = (await api('/community/feed?mode=saved&limit=30', reader)).items.some(post => post.id === fixture.id);
    const count = await card.count(), empty = await page.getByText('Keep the conversations that stay with you.', { exact: true }).count();
    if (output) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${output}/saved-success-${width}.png`, fullPage: true });
    }
    rows.push({ case: 'successful unsave', width, backendSaved, renderedCards: count, emptyStates: empty });
    check(`success-${width}`, () => { assert.equal(backendSaved, false); assert.equal(count, 0); assert.equal(empty, 1); });
    await context.close();
  }
  if (!process.env.AUDIT_SUCCESS_ONLY) {
  {
    const { context, page, card } = await open(390);
    const gate = delay(); let requested = false;
    await page.route(`**/api/community/posts/${fixture.id}/save`, async r => { requested = true; await gate.promise; await r.fulfill({ status: 503, json: { message: 'Could not unsave this conversation. Please try again.' } }); });
    await card.locator('.community-save').click(); await expect.poll(() => requested).toBe(true);
    await expect(card).toBeVisible(); await expect(card.locator('.community-save')).toBeDisabled();
    gate.release(); await expect(card.getByRole('alert')).toHaveText('Could not unsave this conversation. Please try again.');
    await expect(card.locator('.community-save')).toHaveAttribute('aria-pressed', 'true'); await expect(card.locator('.community-save')).toBeEnabled();
    assert((await api('/community/feed?mode=saved&limit=30', reader)).items.some(post => post.id === fixture.id));
    rows.push({ case: 'failed unsave', width: 390, renderedCards: await card.count(), saved: true, visibleError: true });
    await context.close();
  }
  for (const [name, route] of [['discover', '/community'], ['following', '/community?mode=following'], ['circles', '/community?mode=circles'], ['circle', '/community/circle/general'], ['detail', `/community/post/${fixture.id}`]]) {
    const { context, page, card } = await open(390, route);
    await card.locator('.community-save').click(); await expect(card.locator('.community-save')).toBeEnabled();
    await expect(card.locator('.community-save')).toHaveAttribute('aria-pressed', 'false'); await expect(card).toBeVisible();
    rows.push({ case: `${name} retains unsaved conversation`, renderedCards: await card.count(), saved: false });
    await context.close();
  }
  {
    const { context, page, card, saved } = await open(390, '/community?mode=saved', true);
    const more = page.getByRole('button', { name: 'More conversations', exact: true });
    const gate = delay(); let requested = false;
    await page.route('**/api/community/feed?*cursor=*', async r => { requested = true; await gate.promise; await r.fulfill({ json: { items: [saved], nextCursor: 'audit-tail' } }); });
    await more.click(); await expect.poll(() => requested).toBe(true);
    await card.locator('.community-save').click();
    await expect.poll(async () => (await api(`/community/posts/${fixture.id}`, reader)).saved).toBe(false);
    await page.waitForTimeout(200); gate.release(); await expect(more).toBeEnabled();
    const count = await card.count();
    rows.push({ case: 'stale in-flight pagination', renderedCards: count, nextCursorRetained: await more.count() === 1 });
    check('pagination', () => assert.equal(count, 0));
    await context.close();
  }
  }
  if (output) fs.writeFileSync(`${output}/results.json`, JSON.stringify({ rows, failures }, null, 2));
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
  await api(`/community/posts/${fixture.id}`, writer, 'DELETE');
}
