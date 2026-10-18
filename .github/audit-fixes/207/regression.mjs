import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3024';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname), 'Use a disposable local runtime');
const before = process.env.AUDIT_BEFORE === '1';
const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Forwarded-For': `127.207.${Math.floor(Math.random()*200)+1}.1` } });
const session = await api.post('/api/auth/login', { data: { email: process.env.E2E_EMAIL || 'reader@example.test', password: process.env.E2E_PASSWORD || 'WordWeftLocal123!' } });
assert.ok(session.ok(), 'Start the disposable backend fixtures before running');
const { token } = await session.json();
const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox','--disable-dev-shm-usage'] });
const observations = [];
try {
  for (const width of [1280, 390]) for (const kind of ['feedback', 'contact']) {
    console.log('Journey', kind, width);
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width === 390, hasTouch: width === 390 });
    await context.addInitScript(token => { localStorage.setItem('wordweft_jwt', token); localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true'); }, token);
    await context.route(/^https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//, route => route.fulfill({status:200, contentType:'application/javascript', body:''}));
    let release; let requests = 0; let failure = !before; let payload;
    await context.route(kind === 'feedback' ? '**/api/feedback' : '**/api/support/grievances', async route => {
      requests++; payload = route.request().postDataJSON();
      await new Promise(resolve => { release = resolve; });
      await route.fulfill({ status: failure ? 400 : 200, contentType: 'application/json', body: JSON.stringify(failure ? { message: 'Synthetic retryable failure', error: 'Synthetic retryable failure' } : { success: true, message: 'Accepted', id: 'local-only' }) });
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/${kind}`, {waitUntil:'domcontentloaded', timeout:60000});
    const form = page.locator('form');
    const text = kind === 'feedback' ? page.getByLabel('What you enjoyed') : page.locator('#contact-message');
    if (kind === 'contact') {
      await page.locator('#contact-category').selectOption('general');
      await page.locator('#contact-subject').fill('Local draft regression');
    } else {
      await page.getByRole('radio', { name: 'Both', exact: true }).check();
      await page.getByRole('button', { name: '4: Easy to use', exact: true }).click();
      await page.getByLabel('Writing a story', { exact: true }).check();
      await page.getByLabel('Feature idea', { exact: true }).fill('Draft recovery');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
    }
    await text.fill('Original intended draft');
    const send = () => page.getByRole('button', { name: kind === 'feedback' ? 'Send feedback' : 'Send message', exact: true }).click();
    await send();
    await page.waitForFunction(() => document.querySelector('form')?.getAttribute('aria-busy') === 'true');
    await assertEventually(() => requests === 1);
    const pendingDisabled = await text.isDisabled();
    if (before) await text.fill('Newer unsent draft that must not disappear');
    else {
      assert.equal(pendingDisabled, true, `${kind} pending draft must clearly prevent edits`);
      for (const element of await form.locator('input,select,textarea,button').all()) assert.equal(await element.isDisabled(), true, 'Every submission control is locked');
      await form.evaluate(el => el.requestSubmit());
      await page.waitForTimeout(100);
      assert.equal(requests, 1, 'A second submit event cannot duplicate the request');
    }
    await text.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    await page.screenshot({ path: new URL(`${kind}-${before ? 'before' : 'after'}-pending-${width}.png`, import.meta.url).pathname });
    console.log('Releasing', kind, width); release();
    if (before) {
      await page.getByText(kind === 'feedback' ? 'Thank you.' : 'Message sent', { exact: true }).waitFor();
    } else {
      await page.getByRole('alert').waitFor();
      assert.equal(await text.inputValue(), 'Original intended draft');
      assert.equal(await text.isEnabled(), true);
      await page.evaluate(() => { window.location.hash = '/privacy'; }); await page.waitForURL('**/privacy'); await page.goBack({waitUntil:'domcontentloaded'});
      assert.equal(await text.inputValue(), 'Original intended draft', 'Failure remains recoverable after browser Back');
      await text.fill('Retry intended draft'); failure = false; await send();
      await assertEventually(() => requests === 2); release();
      await page.getByText(kind === 'feedback' ? 'Thank you.' : 'Message sent', { exact: true }).waitFor();
      assert.equal(payload[kind === 'feedback' ? 'whatFeltGood' : 'message'], 'Retry intended draft');
      if (kind === 'feedback') { assert.equal(payload.overallRating, 4); assert.deepEqual(payload.missingFeatures, ['Draft recovery']); assert.ok(payload.triedFeatures.includes('Writing a story')); }
    }
    console.log('Success settled', kind, width);
    if (kind === 'contact') await page.getByRole('button', { name: 'Send another message' }).click();
    else { await page.evaluate(() => { window.location.hash = '/privacy'; }); await page.waitForURL('**/privacy'); await page.goBack({waitUntil:'domcontentloaded'}); }
    assert.equal(await text.inputValue(), '', 'Success clears the submitted draft');
    observations.push({ width, kind, pendingDisabled, requests, submittedText: payload[kind === 'feedback' ? 'whatFeltGood' : 'message'], returnedDraft: await text.inputValue(), newerEditAccepted: before });
    if (!before) {
      if (kind === 'contact') { await page.locator('#contact-category').selectOption('general'); await page.locator('#contact-subject').fill('Reopened local draft'); }
      console.log('Lifecycle start',kind,width); await text.fill('Submitted before leaving'); await send();
      await assertEventually(() => requests === 3);
      await page.evaluate(() => { window.location.hash = '/privacy'; }); await page.waitForURL('**/privacy'); await page.goBack({waitUntil:'domcontentloaded'});
      await text.fill('New draft after browser Back');
      console.log('Lifecycle release',kind,width); release(); await page.waitForTimeout(1200); await page.reload({waitUntil:'domcontentloaded'});
      assert.equal(await text.inputValue(), 'New draft after browser Back', 'A response from the unmounted form must not clear the reopened entry');
      observations.at(-1).reopenedDraftPreserved = true;
    }
    await context.close();
  }
  await writeFile(new URL(`${before ? 'before' : 'after'}-observations.json`, import.meta.url), JSON.stringify(observations, null, 2) + '\n');
  console.log(`PASS ${before ? 'baseline reproduction' : 'regression'}: desktop/mobile feedback + contact, pending controls, duplicate guard, retry, history recovery and clean success`);
} finally { await browser.close(); await api.dispose(); }

async function assertEventually(predicate) {
  const end = Date.now() + 10000;
  while (!predicate()) { assert.ok(Date.now() < end, 'Expected request was not received'); await new Promise(resolve => setTimeout(resolve, 20)); }
}
