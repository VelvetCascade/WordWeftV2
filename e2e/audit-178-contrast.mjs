import { expect } from '@playwright/test';
import { session, go, check, finish, browser, baseURL } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'writer');
await go(page,'/write/book/create');
await page.locator('label[for=customDisclaimer] > span').waitFor();
await check(page,'label[for=customDisclaimer] > span',`${theme}-${width}-optional`);
await page.getByLabel('Author’s content note').fill('An optional note remains editable.');
await check(page,'label[for=customDisclaimer] > span',`${theme}-${width}-focused`);
await expect(page.getByRole('button',{name:'Save as draft',exact:true})).toBeDisabled();
await page.getByLabel('Story title',{exact:true}).fill(`Contrast regression ${theme} ${width}`);
await expect(page.getByRole('button',{name:'Save as draft',exact:true})).toBeEnabled();
const saved = page.waitForResponse(r => r.url().endsWith('/api/books') && r.request().method() === 'POST');
await page.getByRole('button',{name:'Save as draft',exact:true}).click();
expect((await saved).ok()).toBeTruthy();
await expect(page).toHaveURL(/\/write\/book\/[^/]+\/manage/);
const bookId = new URL(page.url()).pathname.split('/')[3];
const token = await page.evaluate(() => localStorage.getItem('wordweft_jwt'));
expect((await context.request.delete(`${baseURL}/api/books/${bookId}`, { headers: { Authorization: `Bearer ${token}` } })).ok()).toBeTruthy();
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
