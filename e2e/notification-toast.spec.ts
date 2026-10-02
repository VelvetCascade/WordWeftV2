import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let token = '';
test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', { headers: { 'X-Forwarded-For': '127.32.42.1' }, data: { email: 'reader@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy();
    token = (await response.json()).token;
});

for (const [theme, width] of [['light', 1440], ['dark', 390]] as const) test(`a live notification is readable and opens or dismisses by keyboard in ${theme} mode`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.32.43.${theme === 'dark' ? 2 : 1}` });
    await page.addInitScript(({ token, theme }) => {
        if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
        localStorage.setItem('wordweft_jwt', token);
        localStorage.setItem('theme', theme);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    }, { token, theme });
    // A controlled SSE event makes the brief toast repeatable. The account and destination use the real backend.
    const notification = { id: 'toast-keyboard', type: 'AUTHOR_NEW_STORY', entityId: 'local-story-spring', message: 'Mira Ellery published a new story.', metadata: { actorName: 'Mira Ellery' } };
    await context.route('**/api/notifications/stream?*', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: `event: notification\ndata: ${JSON.stringify(notification)}\n\n` }));
    await page.goto('/library');
    const toast = page.locator('.ww-notification-toast');
    await expect(toast).toBeVisible();
    await expect(toast.locator('.ww-notification-toast-copy')).toHaveText('Mira Ellery published a new story.');
    const bounds = await toast.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const results = await new AxeBuilder({ page }).include('.ww-notification-toast').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id)).toEqual([]);
    await toast.getByRole('button', { name: 'Dismiss notification', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(toast).not.toBeVisible();
    // The pending page must not take focus away from an action the user has already reached.
    let releaseLibrary!: () => void;
    const libraryReady = new Promise<void>(resolve => { releaseLibrary = resolve; });
    await context.route('**/pages/LibraryPage.tsx*', async route => { await libraryReady; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const open = page.getByRole('button', { name: 'Open notification: Mira Ellery published a new story.', exact: true });
    await expect(open).toBeVisible();
    await open.focus();
    releaseLibrary();
    await expect(page.getByRole('heading', { name: 'Your library', level: 1, exact: true })).toBeVisible();
    await expect(open).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/book\/local-story-spring$/);
    await expect(page.getByRole('heading', { name: 'The Last Spring in Bellweather', level: 1, exact: true })).toBeVisible();
    await expect(toast).not.toBeVisible();
});
