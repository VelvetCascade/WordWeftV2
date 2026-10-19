import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseURL=process.env.E2E_BASE_URL || 'http://127.0.0.1:3024';
assert.ok(['127.0.0.1','localhost'].includes(new URL(baseURL).hostname),'Use a local disposable runtime');
const before=process.env.AUDIT_BEFORE==='1';
const executablePath=process.env.CHROMIUM_PATH || ['/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const books=Array.from({length:12},(_,i)=>({id:i===0?'local-story-spring':`local-story-${i}`,title:`Spring story ${i+1}`,coverUrl:'/logo.svg',genres:['Fantasy'],rating:4,author:{id:'local-writer',name:'Local Writer'}}));
const authors=Array.from({length:3},(_,i)=>({id:i===0?'local-writer':`local-person-${i}`,name:`Spring writer ${i+1}`,avatarUrl:'/logo.svg',bio:'Synthetic search fixture',followersCount:0}));
const observations=[];
try {for (const width of [1280,390]) {
 console.log('Journey',width);
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');});
 let release;
 await context.route('**/api/search/autocomplete?*',async route=>{
  const query=new URL(route.request().url()).searchParams.get('q');
  if(query==='slow') await new Promise(resolve=>{release=resolve;});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(query==='spring'?{books,authors}:{books:[],authors:[]})});
 });
 const page=await context.newPage();await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:60000});
 const trigger=page.getByRole('button',{name:'Search WordWeft',exact:true});await trigger.click();
 const input=page.getByLabel('Search stories and people',{exact:true});await input.fill('spring');
 await page.locator('.search-overlay-item').last().waitFor(); await input.press('ArrowDown');
 const activeId=await input.getAttribute('aria-activedescendant');
 if(!before) {
  assert.equal(await input.getAttribute('role'),'combobox');assert.equal(await input.getAttribute('aria-expanded'),'true');
  assert.ok(activeId,'Arrow selection must expose a live active descendant');
  assert.equal(await page.locator(`[id="${activeId}"]`).getAttribute('role'),'option');
  assert.equal(await page.locator(`[id="${activeId}"]`).getAttribute('aria-selected'),'true');
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
 }
 await page.screenshot({animations:'disabled',path:new URL(`${before?'before':'after'}-${width}.png`,import.meta.url).pathname});
 if(!before) {
  for(let i=0;i<12;i++) await input.press('ArrowDown');
  const authorId=await input.getAttribute('aria-activedescendant');
  assert.match(await page.locator(`[id="${authorId}"]`).innerText(),/Spring writer 1/);
  const visible=await page.locator(`[id="${authorId}"]`).evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.search-overlay-results').getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1;});
  assert.equal(visible,true,'Arrow-selected author scrolls into the results viewport');
  await input.press('ArrowUp');assert.match(await page.locator(`[id="${await input.getAttribute('aria-activedescendant')}"]`).innerText(),/Spring story 12/);
  await input.press('ArrowDown');await input.press('Enter');await page.waitForURL('**/author/local-writer');
  await trigger.click();await input.fill('spring');await page.locator('.search-overlay-item').last().waitFor();
  await input.press('ArrowDown');
  const currentUrl=page.url();await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});assert.equal(page.url(),currentUrl,'Composition Enter must not activate a suggestion');
  await input.fill('slow');await page.waitForTimeout(300);
  assert.equal(await input.getAttribute('aria-activedescendant'),null,'Pending results must not reference an old option');
  await input.press('ArrowDown');assert.equal(await input.getAttribute('aria-activedescendant'),null);
  assert.ok(release);release();await page.getByText('No quick suggestions for "slow"',{exact:true}).waitFor();
  assert.equal(await input.getAttribute('aria-expanded'),'false');assert.equal(await input.getAttribute('aria-activedescendant'),null);
  await input.fill('spring');await page.locator('.search-overlay-item').last().waitFor();await input.press('ArrowDown');
  await input.press('Tab');assert.equal(await page.getByRole('button',{name:'Close search',exact:true}).evaluate(el=>el===document.activeElement),true,'Tab moves to the next overlay control');
  await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Search WordWeft',exact:true}).waitFor({state:'hidden'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Escape returns focus to Search');
  await trigger.click();await input.fill('no-match');await page.getByText('No quick suggestions for "no-match"',{exact:true}).waitFor();await input.press('Enter');await page.waitForURL('**/search?q=no-match');
 }
 observations.push({width,activeId,focusedInput:true,semanticSelection:!before,mixedAuthorActivation:!before,scrollIntoView:!before,pendingAndEmptyClearActive:!before,compositionGuard:!before,tabAndEscape:!before,fullSearchFallback:!before});await context.close();
}
await writeFile(new URL(`${before?'before':'after'}-observations.json`,import.meta.url),JSON.stringify(observations,null,2)+'\n');console.log(`PASS ${before?'baseline':'regression'} desktop/mobile search selection`);
} finally {await browser.close();}
