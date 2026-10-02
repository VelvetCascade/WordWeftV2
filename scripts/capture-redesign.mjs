import { chromium, request } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

// Read-only captures against the isolated preview; never supply production tokens.
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Use the disposable local runtime for design captures.');
const directory = 'artifacts/redesign-v2';
mkdirSync(directory, { recursive: true });
const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Forwarded-For': '127.8.5.9' } });
const tokens = {};
for (const role of ['reader', 'writer']) {
  const response = await api.post('/api/auth/login', { data: { email: `${role}@example.test`, password: 'WordWeftLocal123!' } });
  if (!response.ok()) throw new Error('Start scripts/dev-local-backend.sh before taking captures.');
  tokens[role] = (await response.json()).token;
}
await api.dispose();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const screens = [
  ['home', '/', '01-home', null],
  ['reader', '/book/local-story-spring/chapter/local-story-spring-chapter-1', '10-reader-paper', 'reader'],
  ['signin', '/auth', '21-sign-in', null],
  ['community', '/community', '26-community', 'reader'],
  ['writer', '/write', '30-writer-dashboard', 'writer'],
  ['settings', '/edit-profile', '39-settings-profile', 'writer'],
];
try {
  const selected = process.argv.slice(2);
  if (selected.some(name => !screens.some(screen => screen[0] === name))) throw new Error('Choose home, reader, signin, community, writer, or settings.');
  for (const [name, route, source, role] of screens.filter(screen => !selected.length || selected.includes(screen[0]))) for (const [size, width, height] of [['desktop', 1440, 1100], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, extraHTTPHeaders: { 'X-Forwarded-For': `127.8.${width === 1440 ? 6 : 7}.${screens.findIndex(item => item[0] === name) + 10}` } });
    await context.addInitScript(({ token }) => {
      if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
      if (token) localStorage.setItem('wordweft_jwt', token);
      localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
      localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('ww:last-writing:local-writer', JSON.stringify({ bookId: 'local-story-draft', chapterId: 'local-story-draft-chapter-1' }));
    }, { token: role ? tokens[role] : null });
    const page = await context.newPage();
    await page.goto(`${baseURL}${route}`);
    await page.waitForFunction(() => document.querySelector('h1'));
    if (name === 'reader') await page.locator('.reader-copy').waitFor();
    if (name === 'home') await page.locator('.v2-feature-story').first().waitFor();
    if (name === 'writer') await page.locator('.ww-studio-resume').waitFor();
    await page.evaluate(() => document.fonts.ready);
    // Full-page captures also include images outside the initial viewport.
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).map(image => {
        image.loading = 'eager';
        return image.complete ? Promise.resolve() : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 3000);
        });
      }));
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${directory}/${name}-${size}.png`, fullPage: true, animations: 'disabled' });
    await page.goto(`${baseURL}/design-v2/WordWeft-Design-Revision-02/screens/${source}.html`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${directory}/${name}-${size}-source.png`, fullPage: true, animations: 'disabled' });
    console.log(`Captured ${name} at ${width} × ${height}, density 1.`);
    await context.close();
  }
} finally { await browser.close(); }
