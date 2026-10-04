import { test, expect } from './fixtures';

test.beforeEach(async ({ page, request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'writer@example.test', password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy();
    const { token } = await response.json();
    await page.addInitScript(token => {
        localStorage.setItem('wordweft_jwt', token);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    }, token);
});

test('new-story metadata survives leaving and returning to the form', async ({ page }) => {
    await page.goto('/write/book/create');
    await page.getByLabel('Story title', { exact: true }).fill('The unsent crossing');
    await page.getByRole('link', { name: 'My stories', exact: true }).click();
    await page.goBack();
    await expect(page.getByLabel('Story title', { exact: true })).toHaveValue('The unsent crossing');
    await page.reload();
    await expect(page.getByLabel('Story title', { exact: true })).toHaveValue('The unsent crossing');
});

test('a closed community composer restores its unsent post', async ({ page }) => {
    await page.goto('/community');
    await page.getByRole('button', { name: 'Start a conversation', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create a post' });
    await dialog.getByRole('textbox', { name: /^Your post/ }).fill('A thoughtful conversation I have not published yet.');
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Start a conversation', exact: true }).first().click();
    await expect(dialog.getByRole('textbox', { name: /^Your post/ })).toHaveValue('A thoughtful conversation I have not published yet.');
});

test('founding application restores metadata and asks for manuscript reselection', async ({ page }) => {
    await page.goto('/founding-writers');
    await expect(page.getByRole('textbox', { name: /Full name/ })).not.toHaveValue('');
    await page.getByRole('textbox', { name: /Story title/ }).fill('A founding journey');
    await page.getByLabel('Chapter file', { exact: false }).setInputFiles({ name: 'three-chapters.txt', mimeType: 'text/plain', buffer: Buffer.from('Chapter one\nChapter two\nChapter three') });
    await page.reload();
    await expect(page.getByRole('textbox', { name: /Story title/ })).toHaveValue('A founding journey');
    await expect(page.getByText('Your form is restored. Please choose your manuscript again; files are not saved in browser drafts.')).toBeVisible();
});

test('changing a community destination explains unavailable formats without losing text', async ({ page }) => {
    await page.goto('/community/circle/critique-corner');
    await page.getByRole('button', { name: 'Start a conversation', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create a post' });
    await dialog.getByRole('textbox', { name: /^Your post/ }).fill('Please keep my carefully composed words.');
    await dialog.getByRole('button', { name: 'Release', exact: true }).click();
    await expect(dialog.getByText(/Release posts are not available/)).toBeVisible();
    await dialog.getByRole('button', { name: /^Use / }).first().click();
    await expect(dialog.getByRole('textbox', { name: /^Your post/ })).toHaveValue('Please keep my carefully composed words.');
    await expect(dialog.locator('.community-publish-audience')).toContainText('Publishing to');
});

test('a founding application requires explicit review before any submission', async ({ page }) => {
    let submissions = 0;
    await page.route('**/api/public/founding-writer-applications', route => { submissions++; return route.fulfill({ json: { status: 'SUBMITTED' } }); });
    await page.goto('/founding-writers');
    await page.getByRole('textbox', { name: /Country/ }).fill('India');
    await page.getByRole('combobox', { name: /Primary genre/ }).selectOption('Fantasy');
    await page.getByRole('textbox', { name: /Story title/ }).fill('A reviewed application');
    await page.getByRole('textbox', { name: /Synopsis/ }).fill('An original story about a lantern maker finding her way home.');
    await page.getByLabel('Chapter file', { exact: false }).setInputFiles({ name: 'three-chapters.txt', mimeType: 'text/plain', buffer: Buffer.from('Chapter one\nChapter two\nChapter three') });
    await page.getByRole('spinbutton', { name: /Chapters already drafted/ }).fill('3');
    await page.getByRole('spinbutton', { name: /Estimated total chapters/ }).fill('12');
    await page.getByRole('combobox', { name: /Expected time/ }).selectOption('TWO_TO_FOUR_MONTHS');
    for (const checkbox of await page.locator('.fw-form input[type="checkbox"]').all()) await checkbox.check();
    await page.getByRole('button', { name: 'Review application', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
    expect(submissions).toBe(0);
    await expect(page.getByRole('button', { name: 'Confirm and send application' })).toBeVisible();
});

test('session invalidation removes the prior account’s selected manuscript', async ({ page }) => {
    await page.goto('/founding-writers');
    const file = page.getByLabel('Chapter file', { exact: false });
    await file.setInputFiles({ name: 'private-owner-a.txt', mimeType: 'text/plain', buffer: Buffer.from('A private manuscript') });
    await page.evaluate(() => window.dispatchEvent(new Event('wordweft:session-invalid')));
    await expect(page.getByRole('textbox', { name: /Full name/ })).toHaveValue('');
    await expect.poll(() => file.evaluate((input: HTMLInputElement) => input.files?.length)).toBe(0);
    await expect(page.getByText(/private-owner-a.txt/)).toHaveCount(0);
});
