import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname), 'Use a disposable local runtime');
export const output = process.env.AUDIT_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });
export const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const results = [], failures = [];
export async function session(theme, width, role = 'writer') {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: width === 390, isMobile: width === 390, extraHTTPHeaders: { 'X-Forwarded-For': `127.92.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}` } });
  await context.route(/googlesyndication|doubleclick/, route => route.fulfill({ status: 200, body: '' }));
  let token;
  if (role !== 'guest') {
    if (process.env.E2E_TOKEN_FILE) token = JSON.parse(fs.readFileSync(process.env.E2E_TOKEN_FILE))[role];
    else {
      const response = await context.request.post(`${baseURL}/api/auth/login`, { data: { email: `${role}@example.test`, password: 'WordWeftLocal123!' } });
      assert(response.ok(), 'Start the seeded disposable backend');
      token = (await response.json()).token;
    }
  }
  await context.addInitScript(({ theme, token }) => {
    localStorage.setItem('theme', theme);
    if (token) localStorage.setItem('wordweft_jwt', token);
    for (const key of ['ww_welcomeJourneyCompleted', 'hasSeenWhatsNewPopup_v1']) localStorage.setItem(key, 'true');
    localStorage.setItem('ww_reader_coach_session', '4');
  }, { theme, token });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return { context, page };
}
export async function go(page, route) {
  await page.goto(baseURL + route);
  await page.locator('[data-route-loading=true]').waitFor({ state: 'hidden' });
  await page.waitForTimeout(700);
  await page.evaluate(() => document.fonts.ready);
}
// Sample rendered foreground and composite actual ancestor backgrounds, including
// translucent highlight surfaces. This also covers visible aria-hidden chart axes
// that axe deliberately omits. No assertion depends on a CSS token or source literal.
export async function check(page, selector, state) {
  const target = page.locator(selector);
  await target.first().waitFor({ state: 'visible' });
  assert(await target.count() > 0, `Missing contrast target: ${selector}`);
  await target.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(220);
  const samples = await target.evaluateAll(elements => {
    const parse = color => { const values = color.match(/[\d.]+/g).map(Number); return [values[0], values[1], values[2], values[3] ?? 1]; };
    const over = (fg, bg) => [0, 1, 2].map(i => fg[i]*fg[3]+bg[i]*(1-fg[3])).concat(1);
    const luminance = rgb => rgb.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
    return elements.filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height).map(e => {
      let bg = [255,255,255,1]; const ancestors=[];
      for (let node=e; node; node=node.parentElement) ancestors.unshift(node);
      for (const node of ancestors) bg=over(parse(getComputedStyle(node).backgroundColor),bg);
      const fg=over(parse(getComputedStyle(e).color),bg), light=luminance(fg), surface=luminance(bg);
      return { foreground:fg.slice(0,3), background:bg.slice(0,3), ratio:(Math.max(light,surface)+.05)/(Math.min(light,surface)+.05), fontSize:getComputedStyle(e).fontSize };
    });
  });
  assert(samples.length, `No visible text for ${selector}`);
  // All scoped targets are in the main document; axe.run avoids a second page.
  const axe = await new AxeBuilder({ page }).setLegacyMode().include(selector).withRules(['color-contrast']).analyze();
  const row = { state, selector, samples, axe:axe.violations.map(v => ({ id:v.id, targets:v.nodes.map(n=>n.target), details:v.nodes.map(n=>n.failureSummary) })) };
  results.push(row);
  if (samples.some(s=>s.ratio<4.5) || row.axe.length) failures.push(row);
  console.log(state, selector, 'minimum', Math.min(...samples.map(s=>s.ratio)).toFixed(3), 'axe', row.axe.length);
  if(output) await page.screenshot({ path:path.join(output, state.replace(/[^a-z0-9-]/gi,'-')+'.png') });
}
export async function finish() {
  await browser.close();
  if(output) fs.writeFileSync(path.join(output,'contrast.json'),JSON.stringify({ results, failures:failures.length },null,2));
  assert.equal(failures.length,0, `Rendered text must reach 4.5:1: ${failures.map(f=>f.state+' '+f.selector).join(', ')}`);
}
