import { expect } from '@playwright/test';
import { session, go, check, finish, browser } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'writer');
let scenario = 'actual';
await page.route(/\/api\/writer\/analytics(?:\?|$)/, async route => {
 const response = await route.fetch(); const data = await response.json();
 if (scenario !== 'actual') {
  const value = scenario === 'high' ? 1000 : scenario === 'low' ? 2 : 0;
  data.dailyTrend = [{ date: new Date().toISOString().slice(0,10), readers: value, views: value }];
 }
 await route.fulfill({ response, json: data });
});
await go(page,'/write/analytics');
await page.locator('.ww-writer-analytics[aria-busy=false]').waitFor();
await check(page,'.ww-trend-axis > span',`${theme}-${width}-axis`);
const select=page.getByLabel('Story',{exact:true});
const options=await select.locator('option').count();
if(options>1){await select.selectOption({index:1}); await page.locator('.ww-writer-analytics[aria-busy=false]').waitFor(); await check(page,'.ww-trend-axis > span',`${theme}-${width}-filtered`);}
for (const next of ['empty','low','high']) {
 scenario = next;
 const response = page.waitForResponse(r => r.url().includes('/api/writer/analytics'));
 await page.getByRole('button',{name:'Refresh statistics',exact:true}).click();
 await response;
 await page.locator('.ww-writer-analytics[aria-busy=false]').waitFor();
 await expect(page.locator('.ww-trend-axis > span').first()).toHaveText(next === 'high' ? '1,000' : '4');
 await check(page,'.ww-trend-axis > span',`${theme}-${width}-${next}`);
}
const geometry = await page.locator('.ww-trend-axis').evaluate(axis => {
 const labels = [...axis.children].map(label => { const r=label.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,right:r.right}; });
 return {labels, bars:[...axis.nextElementSibling.querySelectorAll('.ww-trend-bars > i')].map(bar => { const r=bar.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}; }).filter(bar => bar.height > 0)};
});
expect(geometry.labels.every((label,index) => geometry.bars.every(bar => label.right <= bar.left || label.top >= bar.bottom || label.bottom <= bar.top) && (!index || label.top >= geometry.labels[index-1].bottom))).toBeTruthy();
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
