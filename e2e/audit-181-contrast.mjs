import { expect } from '@playwright/test';
import { session, go, check, finish, browser } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'guest');
await go(page,'/founding-writers');
await check(page,'.fw-form-heading p, .fw-field small, .fw-field em, .fw-submit-row p',`${theme}-${width}-helpers`);
const sample=page.locator('.fw-field textarea').last();
const text='An isolated sample for character counting.';
await sample.fill(text);
await expect(page.locator('.fw-field em')).toHaveText(`${text.length}/1,000`);
await check(page,'.fw-field em',`${theme}-${width}-counter`);
await page.getByLabel('Full name').fill('Contrast Fixture');
await page.getByLabel('Email address').fill('contrast@example.test');
await page.getByLabel('Country',{exact:false}).fill('United Kingdom');
await page.getByLabel('Primary genre').selectOption('Fantasy');
await page.getByLabel('Story title',{exact:false}).fill('A synthetic manuscript');
await page.getByLabel('Chapters already drafted').fill('3');
await page.getByLabel('Estimated total chapters').fill('6');
await page.getByLabel('Expected time to complete the story').selectOption('LESS_THAN_2_MONTHS');
for(const checkbox of await page.locator('.fw-form input[type=checkbox]').all()) await checkbox.check();
let attempts=0;
await page.route('**/api/public/founding-writer-applications',route=>{ attempts++; return route.fulfill({status:attempts===1?503:200,json:attempts===1?{message:'Synthetic retry response'}:{success:true,message:'Received'}}); });
await page.locator('#fw-chapter-file').setInputFiles({name:'invalid.exe',mimeType:'application/octet-stream',buffer:Buffer.from('Invalid attachment')});
await page.getByRole('button',{name:'Review application',exact:true}).click();
await expect(page.locator('.fw-form-error')).toContainText('Upload a non-empty PDF, DOCX or TXT');
expect(attempts).toBe(0);
await page.locator('#fw-chapter-file').setInputFiles({name:'three-chapters.txt',mimeType:'text/plain',buffer:Buffer.from('Chapter 1. Chapter 2. Chapter 3.')});
await expect(page.locator('#fw-upload-help')).toContainText('three-chapters.txt');
await page.getByRole('button',{name:'Review application',exact:true}).click();
await expect(page.getByRole('heading',{name:'Review your application',exact:true})).toBeVisible();
await page.getByRole('button',{name:'Confirm and send application',exact:true}).click();
await expect(page.locator('.fw-form-error')).toHaveText('Synthetic retry response');
await page.getByRole('button',{name:'Confirm and send application',exact:true}).click();
await expect(page.getByRole('heading',{name:'Application received',exact:true})).toBeVisible();
expect(attempts).toBe(2);
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
