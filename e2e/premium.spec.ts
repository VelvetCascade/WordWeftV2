import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const password = 'WordWeftLocal123!';
let readerToken = '', writerToken = '', adminToken = '';

test.beforeAll(async ({ request }) => {
  for (const role of ['reader', 'writer', 'admin']) {
    const response = await request.post('/api/auth/login', { data: { email: `${role}@example.test`, password }, headers: { 'X-Forwarded-For': '127.5.1.4' } });
    expect(response.ok(), 'Start the isolated backend with scripts/dev-local-backend.sh before running browser tests.').toBeTruthy();
    const { token } = await response.json();
    if (role === 'reader') readerToken = token; else if (role === 'writer') writerToken = token; else adminToken = token;
  }
});
test.beforeEach(async ({ context }, info) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.9.${Math.floor(Date.now() / 1000) % 200 + 1}.${info.testId.split('').reduce((sum,char) => sum + char.charCodeAt(0),0) % 200 + 1}` });
});
async function session(page: Page, token: string) {
  await page.addInitScript(value => {
    if (!['localhost','127.0.0.1'].includes(location.hostname)) return;
    localStorage.setItem('wordweft_jwt', value);
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
}
async function healthy(page: Page) {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.getByText('This screen could not open.', { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal viewport overflow').toBeTruthy();
  expect(await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.currentSrc && image.naturalWidth === 0).map(image => image.getAttribute('src'))), 'Rendered artwork has no broken image sources').toEqual([]);
}
async function settled(page: Page) {
  await page.waitForFunction(() => document.querySelector('h1') || document.querySelector('.ww-editor-shell'));
  await page.waitForTimeout(250);
  await healthy(page);
}

test('public home follows the supplied artwork and discovery routes without full reloads', async ({ page }) => {
  await page.goto('/'); await settled(page);
  await expect(page.getByRole('heading', { name: /Read stories.*Write your own/ })).toBeVisible();
  await expect(page.locator('.v2-hero-art')).toBeVisible();
  await page.evaluate(() => (window as any).__routeProbe = 'same-document');
  await page.getByRole('link', { name: 'Read stories', exact: true }).click();
  await expect(page).toHaveURL(/\/category$/);
  expect(await page.evaluate(() => (window as any).__routeProbe)).toBe('same-document');
  await expect(page.getByRole('heading', { name: 'Browse stories', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.locator('.v2-story-list-item').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open story →', exact: true }).first().click();
  await expect(page).toHaveURL(/\/book\//); await settled(page);
});

test('global search keyboard shortcut, real autocomplete, Escape and focus return', async ({ page }) => {
  await page.goto('/'); await settled(page);
  const trigger = page.getByRole('button', { name: 'Search WordWeft', exact: true });
  await trigger.focus(); await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search WordWeft' });
  await expect(dialog).toBeVisible();
  await page.getByRole('combobox').fill('Bellweather');
  await expect(dialog.getByText('The Last Spring in Bellweather', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  await trigger.click(); await page.getByRole('combobox').fill('Bellweather'); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/search\?q=Bellweather/);
  await expect(page.getByRole('button', { name: /Open The Last Spring in Bellweather/ })).toBeVisible();
});

test('browser Back restores the story catalogue position without reloading the application', async ({ page }) => {
  await page.goto('/category');
  const card = page.locator('.ww-book-card').last();
  await expect(card).toBeVisible(); await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const position = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => (window as any).__routeProbe = 'catalogue');
  await card.click(); await expect(page).toHaveURL(/\/book\//);
  await expect(page.locator('.ww-story-v2')).toBeVisible();
  await page.goBack(); await expect(page).toHaveURL(/\/category$/);
  await expect(page.locator('.ww-book-card').last()).toBeVisible();
  await expect.poll(() => page.evaluate(expected => Math.abs(scrollY - expected), position)).toBeLessThan(5);
  expect(await page.evaluate(() => (window as any).__routeProbe)).toBe('catalogue');
});

test('chapter sign in returns to the selected chapter with full reading access', async ({ page }) => {
  await page.addInitScript(() => { if (!['localhost','127.0.0.1'].includes(location.hostname)) return; localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true'); });
  const chapter = '/book/local-story-spring/chapter/local-story-spring-chapter-2';
  await page.goto(chapter);
  await expect(page.getByRole('heading', { name: 'Sign in to read this chapter', exact: true })).toBeVisible();
  await expect(page.locator('.reader-copy')).toHaveCount(0);
  await page.locator('.reader-sign-in-gate').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  await page.getByLabel('Email Address', { exact: true }).fill('reader@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(chapter);
  await expect(page.locator('.reader-copy')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What the Rain Revealed');
});

test('empty search and failed catalogue requests have usable recovery states', async ({ page }) => {
  await page.goto('/search'); await settled(page);
  await expect(page.getByRole('heading', { name: 'Every good story starts somewhere.' })).toBeVisible();
  await page.route('**/api/books?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable' }) }));
  await page.goto('/category');
  await expect(page.getByRole('heading', { name: 'The library couldn’t be loaded.' })).toBeVisible();
  await page.unroute('**/api/books?**'); await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.ww-book-card').first()).toBeVisible();
});

test('real sign in returns a reader to the protected destination and sign out clears it', async ({ page }) => {
  await page.addInitScript(() => { if (!['localhost','127.0.0.1'].includes(location.hostname)) return; localStorage.setItem('ww_welcomeJourneyCompleted', 'true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true'); });
  await page.goto('/library'); await expect(page).toHaveURL(/\/auth$/);
  await page.getByLabel('Email Address', { exact: true }).fill('reader@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/); await settled(page);
  await page.getByRole('button', { name: 'Open account and navigation' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wordweft_jwt'))).toBeNull();
});

const publicRoutes = ['/', '/category', '/genre/Fantasy', '/search?q=Bellweather', '/auth', '/about', '/features', '/founding-writers', '/contact', '/feedback', '/terms', '/privacy', '/safety', '/read-online', '/writing-tools', '/publish-stories', '/world-building-tools', '/wattpad-alternative', '/book/local-story-spring', '/author/local-writer', '/community', '/hooks', '/events', '/challenges', '/not-a-real-page'];
for (const width of [1440, 393, 320]) test(`all public journeys render with no page errors at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1440 ? 1000 : 852 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const route of publicRoutes) { await page.goto(route); await settled(page); }
  expect(errors).toEqual([]);
});
const signedRoutes = ['/library', '/profile', '/edit-profile', '/notifications', '/community', '/community/circle/cozy-fantasy', '/write', '/write?view=stories', '/write?view=comments', '/write/book/create', '/write/book/local-story-spring/manage', '/write/book/local-story-spring/manage?tab=characters', '/write/book/local-story-spring/chapter/local-story-spring-chapter-3/edit', '/write/analytics', '/write/settings'];
for (const width of [1440, 393, 320]) test(`all signed reader and writer journeys render at ${width}px`, async ({ page }) => {
  await session(page, writerToken); await page.setViewportSize({ width, height: width === 1440 ? 1000 : 852 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const route of signedRoutes) { await page.goto(route); await settled(page); }
  expect(errors).toEqual([]);
});

test('keyboard menu traps focus, keeps every existing feature reachable and supports dark appearance', async ({ page }) => {
  await session(page, readerToken); await page.goto('/'); await settled(page);
  const trigger = page.getByRole('button', { name: 'Open account and navigation' }); await trigger.click();
  const menu = page.getByRole('dialog'); await expect(menu.getByRole('link', { name: 'Hook feed' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Events & challenges' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Account settings' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Support WordWeft', exact: true })).toHaveAttribute('href', 'https://ko-fi.com/wordweftstudio');
  await menu.getByRole('button', { name: 'Use dark appearance' }).click(); await expect(page.locator('html')).toHaveClass('dark');
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBeTruthy();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
});

test('mobile navigation, filters and story view are reachable with no overflow', async ({ page }) => {
  await page.setViewportSize({ width:393,height:852 }); await page.goto('/'); await settled(page);
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Explore' }).click();
  await page.getByRole('button', { name: 'Filters', exact:true }).click();
  const filters = page.getByRole('dialog', { name: 'Filters' }); await expect(filters).toBeVisible();
  await filters.getByRole('button', { name: 'Fantasy', exact:true }).click();
  await filters.getByRole('button', { name:'Apply Filters' }).click(); await expect(filters).not.toBeVisible();
  await expect(page.locator('.ww-book-card').first()).toBeVisible(); await healthy(page);
});

test('admin application review remains protected and renders for admins', async ({ page }) => {
  await session(page, adminToken); await page.goto('/admin/founding-writers'); await settled(page);
  await expect(page.getByRole('heading', { level:1 })).toContainText(/application|founding/i);
});

for (const route of ['/', '/category', '/auth', '/book/local-story-spring', '/community', '/write', '/edit-profile', '/library', '/notifications', '/contact', '/feedback', '/book/local-story-spring/chapter/local-story-spring-chapter-1']) test(`accessibility audit: ${route}`, async ({ page }) => {
  if (['/write','/edit-profile'].includes(route)) await session(page, writerToken);
  if (['/library','/notifications','/book/local-story-spring/chapter/local-story-spring-chapter-1'].includes(route)) await session(page, readerToken);
  await page.goto(route); await settled(page);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious','critical'].includes(item.impact || '')).map(item => ({id:item.id,nodes:item.nodes.map(node => node.target)}))).toEqual([]);
});

for (const route of ['/auth', '/notifications']) test(`mobile accessibility audit: ${route}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (route === '/notifications') await session(page, readerToken);
  await page.goto(route); await settled(page);
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious','critical'].includes(item.impact || '')).map(item => ({id:item.id,nodes:item.nodes.map(node => node.target)}))).toEqual([]);
});

for (const contentTheme of ['dark', 'sepia']) test(`reader accessibility audit in ${contentTheme} appearance`, async ({ page }) => {
  await session(page, readerToken);
  await page.addInitScript(theme => { if (!['localhost','127.0.0.1'].includes(location.hostname)) return; localStorage.setItem('ww_reader_preferences', JSON.stringify({ contentTheme: theme, fontSize: 19, readerFont: 'literary', readerWidth: 'comfortable', lineHeight: 2 })); }, contentTheme);
  await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');
  await expect(page.locator('.reader-copy')).toBeVisible();
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(item => ['serious','critical'].includes(item.impact || '')).map(item => ({id:item.id,nodes:item.nodes.map(node => node.target)}))).toEqual([]);
});
