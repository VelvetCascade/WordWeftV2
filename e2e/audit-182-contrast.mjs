import { expect } from '@playwright/test';
import { session, go, check, finish, browser } from './audit-contrast.mjs';

const populated = { users:24,verifiedUsers:21,newUsers7d:4,authors:7,stories:11,publishedStories:8,draftStories:3,newStories7d:2,publishedChapters:40,totalReads:128,pendingReports:0,applications:3,pendingApplications:0,activity:Array.from({length:7},(_,i)=>({day:`2026-10-${String(12+i).padStart(2,'0')}`,signups:i%3,stories:i%2})),generatedAt:'2026-10-18T12:00:00Z' };
const targets='.ac-kicker, .ac-as-of, .ac-metric small, .ac-chart-day > span, .ac-footer';
try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
  const { context, page } = await session(theme,width,'admin');
  let data=populated, failed=false, requests=0;
  await page.route('**/api/admin/console/overview',route=> { requests++;return route.fulfill({status:failed?503:200,json:failed?{message:'Synthetic overview unavailable'}:data}); });
  await go(page,'/admin');
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  await expect(page.locator('.ac-metric strong').first()).toHaveText('24');
  await check(page,targets,`${theme}-${width}-overview`);
  data={...populated,generatedAt:'2026-10-19T12:00:00Z'};
  await page.getByRole('button',{name:/Refresh/}).click();
  await expect(page.locator('.ac-as-of')).toContainText('19');
  await check(page,'.ac-as-of',`${theme}-${width}-updated`);
  failed=true;
  await page.getByRole('button',{name:/Refresh/}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic overview unavailable');
  await check(page,'.ac-intro .ac-kicker, .ac-as-of, .ac-footer',`${theme}-${width}-error`);
  failed=false;
  data={...populated,...Object.fromEntries(Object.entries(populated).filter(([,v])=>typeof v==='number').map(([k])=>[k,0])),activity:populated.activity.map(row=>({...row,signups:0,stories:0}))};
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.ac-metric strong').first()).toHaveText('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await check(page,targets,`${theme}-${width}-empty`);
  expect(requests).toBe(4);
  await context.close();
}
const {context,page}=await session('light',390,'reader');
await go(page,'/admin');
await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
await expect(page.locator('.ac-metric')).toHaveCount(0);
await context.close();
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
