import { expect } from '@playwright/test';
import { session, go, check, finish, browser } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'reader');
await go(page,'/features');
await check(page,'.wv-feature-section li',`${theme}-${width}-features`);
await page.route('**/api/growth/challenges',route=>route.fulfill({json:['chapters','minutes','books'].map((metric,i)=>({id:`contrast-${metric}`,title:`${metric} goal`,description:'A synthetic reading goal.',metric,target:10,progress:i===0?10:0,progressPercent:i===0?100:0,joined:i===0,completed:i===0}))}));
await go(page,'/events');
await expect(page.locator('.wv-challenge-card')).toHaveCount(3);
await expect(page.locator('.wv-challenge-meta')).toContainText(['chapters','minutes','books']);
await expect(page.getByRole('button',{name:'Join challenge',exact:true})).toHaveCount(2);
await check(page,'.wv-challenge-meta > span',`${theme}-${width}-challenges`);
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
