import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
let readerToken = '', writerToken = '';
const bucket = `127.12.${Date.now() % 200 + 1}`;
test.beforeAll(async ({ request }) => {
  for (const role of ['reader','writer']) {
    const response = await request.post('/api/auth/login', { data: { email: `${role}@example.test`, password: 'WordWeftLocal123!' }, headers: { 'X-Forwarded-For': `${bucket}.1` } });
    expect(response.ok()).toBeTruthy();
    if (role === 'reader') readerToken = (await response.json()).token; else writerToken = (await response.json()).token;
  }
});
for (const route of ['/', '/category', '/book/local-story-spring', '/library', '/profile', '/author/local-writer', '/edit-profile', '/notifications', '/community', '/community/post/local-post-recommendation', '/write', '/write/analytics', '/write/book/local-story-draft/chapter/local-story-draft-chapter-1/edit', '/auth', '/contact', '/feedback']) test(`dark appearance remains readable: ${route}`, async ({ page, context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `${bucket}.${info.testId.split('').reduce((sum,char) => sum + char.charCodeAt(0),0) % 190 + 10}` });
  await page.addInitScript(value => {
    if (!['localhost','127.0.0.1'].includes(location.hostname)) return;
    if(value) localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('theme','dark');
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1','true');
  }, route === '/auth' ? '' : route.startsWith('/write') || ['/edit-profile','/profile'].includes(route) ? writerToken : readerToken);
  await page.goto(route); await expect(page.locator('h1,.ww-editor-shell').first()).toBeVisible();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious','critical'].includes(item.impact || '')).map(item => ({id:item.id,nodes:item.nodes.map(node => ({ target:node.target,html:node.html,message:node.failureSummary }))}))).toEqual([]);
});
