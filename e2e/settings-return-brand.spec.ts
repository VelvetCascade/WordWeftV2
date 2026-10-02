import { test, expect, type Page } from './fixtures';

let token = '';
const bucket = `127.23.${Date.now() % 180 + 10}`;
const pageErrors = new WeakMap<Page, string[]>();

test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
        data: { email: 'writer@example.test', password: 'WordWeftLocal123!' },
        headers: { 'X-Forwarded-For': `${bucket}.1` },
    });
    expect(response.ok()).toBeTruthy();
    token = (await response.json()).token;
});

test.beforeEach(async ({ page, context }, info) => {
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `${bucket}.${info.testId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 180 + 10}` });
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
    expect(pageErrors.get(page)).toEqual([]);
});

const session = async (page: Page, theme = 'light', signedIn = true) => {
    await page.addInitScript(({ jwt, appearance }) => {
        if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
        if (jwt) localStorage.setItem('wordweft_jwt', jwt);
        else localStorage.removeItem('wordweft_jwt');
        localStorage.setItem('theme', appearance);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    }, { jwt: signedIn ? token : '', appearance: theme });
};

const noOverflow = async (page: Page) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
};

for (const width of [390, 1920]) {
    test(`settings round trip via notifications preserves an unsaved profile and section at ${width}px`, async ({ page }, info) => {
        await session(page);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
        await page.goto('/edit-profile');
        await page.getByLabel('Bio', { exact: true }).fill('Unsaved settings return test');
        await page.getByRole('button', { name: 'Reading preferences', exact: true }).click();
        await page.getByRole('searchbox', { name: 'Search favorite genres' }).fill('fan');
        await page.getByRole('link', { name: 'Notifications', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath('notifications-return.png') });
        await noOverflow(page);
        await expect(page.getByRole('button', { name: 'Back to settings', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
        await expect(page).toHaveURL(/\/edit-profile$/);
        await expect(page.getByRole('heading', { name: 'Reading preferences', level: 1 })).toBeVisible();
        await expect(page.getByRole('searchbox', { name: 'Search favorite genres' })).toHaveValue('fan');
        await expect(page.getByText('Unsaved changes', { exact: true }).first()).toBeVisible();
        await page.getByRole('button', { name: 'Public profile', exact: true }).click();
        await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('Unsaved settings return test');
    });

    test(`settings policy journey returns across related policies at ${width}px`, async ({ page }, info) => {
        await session(page, 'dark');
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
        await page.goto('/edit-profile');
        await page.getByLabel('Display Name', { exact: true }).fill('Unsaved profile name');
        await page.getByRole('button', { name: 'Privacy and security', exact: true }).click();
        await page.getByRole('link', { name: 'Privacy policy', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
        await page.screenshot({ path: info.outputPath('privacy-from-settings.png') });
        await expect(page.getByRole('button', { name: 'Back to settings', exact: true })).toBeVisible();
        await page.locator('footer').getByRole('link', { name: 'Terms', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
        await page.getByRole('navigation', { name: 'Related policies' }).getByRole('link', { name: 'Safety & Content Rules' }).click();
        await expect(page.getByRole('heading', { name: 'Safety & Content Rules', level: 1 })).toBeVisible();
        await noOverflow(page);
        await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
        await expect(page).toHaveURL(/\/edit-profile$/);
        await expect(page.getByRole('heading', { name: 'Privacy & security', level: 1 })).toBeVisible();
        await page.getByRole('button', { name: 'Public profile', exact: true }).click();
        await expect(page.getByLabel('Display Name', { exact: true })).toHaveValue('Unsaved profile name');
        await expect(page.getByText('Unsaved changes', { exact: true }).first()).toBeVisible();
    });

    test(`settings support journey returns from help and feedback at ${width}px`, async ({ page }, info) => {
        await session(page, 'dark');
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
        await page.goto('/edit-profile');
        await page.getByLabel('Bio', { exact: true }).fill('Unsaved support journey profile');
        await page.getByRole('button', { name: 'Reading preferences', exact: true }).click();
        await page.getByRole('button', { name: 'Open account and navigation', exact: true }).click();
        await page.getByRole('dialog').getByRole('link', { name: 'Help & contact', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'How can we help?', level: 1 })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Back to settings', exact: true })).toBeVisible();
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('contact-return.png') });
        await page.locator('footer').getByRole('link', { name: 'Share feedback', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Help shape WordWeft.', level: 1 })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Back to settings', exact: true })).toBeVisible();
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('feedback-return.png') });
        await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
        await expect(page).toHaveURL(/\/edit-profile$/);
        await expect(page.getByRole('heading', { name: 'Reading preferences', level: 1 })).toBeVisible();
        await page.getByRole('button', { name: 'Public profile', exact: true }).click();
        await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('Unsaved support journey profile');
    });
}

for (const path of ['/privacy', '/terms', '/safety']) {
    test(`public ${path} stays readable at wide and mobile sizes and returns safely from a direct link`, async ({ page, context }, info) => {
        await session(page, 'light', false);
        await context.route('https://outside.example.test/', route => route.fulfill({ contentType: 'text/html', body: '<p>External referring page</p>' }));
        await page.goto('https://outside.example.test/');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(path);
        await expect(page.locator('.wv-policy-prose')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: info.outputPath('legal-wide.png') });
        const nav = await page.locator('.wv-policy-nav').boundingBox();
        const article = await page.locator('.wv-policy-prose').boundingBox();
        expect(nav).toBeTruthy();
        expect(article).toBeTruthy();
        expect(article!.x - nav!.x - nav!.width).toBeLessThanOrEqual(64);
        expect(article!.width).toBeLessThanOrEqual(820);
        await noOverflow(page);
        await expect(page.getByRole('button', { name: 'Back to discover', exact: true })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: info.outputPath('legal-mobile.png') });
        await noOverflow(page);
        await page.locator('.wv-policy-mobile summary').click();
        await page.locator('.wv-policy-mobile a').nth(1).click();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        await page.getByRole('button', { name: 'Back to discover', exact: true }).click();
        await expect(page).toHaveURL('/');
    });
}

test('browser Back restores the settings draft and scroll without saving the account', async ({ page }) => {
    await session(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/edit-profile');
    await page.getByLabel('Bio', { exact: true }).fill('Browser back unsaved profile');
    await page.getByRole('link', { name: 'Privacy policy', exact: true }).scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await page.getByRole('link', { name: 'Privacy policy', exact: true }).click();
    await expect(page.locator('.wv-policy-prose')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/edit-profile$/);
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('Browser back unsaved profile');
    await expect.poll(() => page.evaluate(previous => Math.abs(scrollY - previous), scroll)).toBeLessThan(5);
});

for (const theme of ['light', 'dark']) {
    test(`original WordWeft symbol inherits readable ${theme} branding across navigation and auth`, async ({ page }, info) => {
        await session(page, theme, false);
        await page.goto('/privacy');
        const navLogo = page.locator('.v2-brand svg');
        await expect(navLogo).toHaveAttribute('viewBox', '850 700 4300 4100');
        const colors = await navLogo.evaluate(element => ({ logo: getComputedStyle(element).color, link: getComputedStyle(element.parentElement!).color }));
        expect(colors.logo).toBe(colors.link);
        await expect(page.locator('.ww-footer-brand svg')).toHaveAttribute('viewBox', '850 700 4300 4100');
        await expect(page.locator('img[src*="brand-mark.jpg"]')).toHaveCount(0);
        await page.screenshot({ path: info.outputPath(`navbar-${theme}.png`) });
        for (const path of ['/auth', '/reset-password?token=return-flow-check']) {
            await page.goto(path);
            await expect(page.locator('.ww-account-brand svg')).toHaveAttribute('viewBox', '850 700 4300 4100');
            await expect(page.locator('img[src*="brand-mark.jpg"]')).toHaveCount(0);
            await noOverflow(page);
        }
    });
}
