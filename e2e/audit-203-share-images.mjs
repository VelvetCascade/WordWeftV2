import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const baseURL=process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
assert(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname),'Use disposable local fixtures');
const output=process.env.AUDIT_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" fill="#735244"/><circle cx="60" cy="70" r="30" fill="#dfc99d"/></svg>';
const surfaces={book:{route:'/book/local-story-spring',button:'Share this book',dialog:'.ww-share-dialog',variant:'cover'},chapter:{route:'/book/local-story-spring/chapter/local-story-spring-chapter-1',button:'Share chapter',dialog:'.ww-share-dialog',variant:'cover'},author:{route:'/author/local-writer',button:'Share author portfolio',dialog:'.ww-author-share-dialog',variant:'avatar'}};
const cases=[];
for(const surface of Object.keys(surfaces)){
 for(const theme of ['light','dark'])cases.push({surface,theme,width:390,mode:'failed'});
 for(const mode of ['missing','empty','valid','slow'])cases.push({surface,theme:'light',width:1440,mode});
}
const rows=[],failures=[];
try{
 for(const c of cases.filter(c=>!process.env.AUDIT_CASE||c.mode===process.env.AUDIT_CASE)){
  const spec=surfaces[c.surface],key=`${c.surface}-${c.theme}-${c.width}-${c.mode}`;
  const context=await browser.newContext({viewport:{width:c.width,height:c.width===390?844:1000}});
  await context.addInitScript(theme=>{localStorage.setItem('theme',theme);for(const k of ['ww_welcomeJourneyCompleted','hasSeenWhatsNewPopup_v1'])localStorage.setItem(k,'true');localStorage.setItem('ww_reader_coach_session','4')},c.theme);
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.route(/googlesyndication|doubleclick/,r=>r.fulfill({status:200,body:''}));
  let release;const held=new Promise(r=>release=r);
  await page.route('**/__audit/share-artwork.svg',async route=>{
   if(c.mode==='slow')await held;
   if(c.mode==='valid')await route.fulfill({contentType:'image/svg+xml',body:svg});else await route.fulfill({status:404,body:''});
  });
  await page.route('**/api/**',async route=>{
   if(/\.[cm]?[jt]sx?$/.test(new URL(route.request().url()).pathname)||route.request().method()!=='GET')return route.continue();
   const response=await route.fetch();if(!(response.headers()['content-type']||'').includes('json'))return route.fulfill({response});
   const data=await response.json();
   const visit=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(key==='coverUrl'||key==='avatarUrl'){if(c.mode==='missing')delete value[key];else value[key]=c.mode==='empty'?'':`${baseURL}/__audit/share-artwork.svg`}else visit(value[key])}};
   visit(data);await route.fulfill({response,json:data});
  });
  await page.goto(baseURL+spec.route,{waitUntil:'domcontentloaded'});
  if(c.surface==='chapter'&&c.width===390)await page.getByRole('button',{name:'More reader actions',exact:true}).click();
  await page.getByRole('button',{name:spec.button,exact:true}).first().click();
  const dialog=page.locator(spec.dialog),preview=dialog.locator('.flex.items-center.gap-4').first();
  await preview.waitFor();
  const initialBox=await preview.locator('img,[role="img"]').first().boundingBox();
  if(c.mode==='slow'){await page.waitForTimeout(350);const pendingBox=await preview.locator('img,[role="img"]').first().boundingBox();assert.equal(pendingBox.width,64);assert.equal(pendingBox.height,spec.variant==='cover'?96:64);release()}
  if(c.mode==='valid')await expect(preview.locator('img')).toHaveJSProperty('naturalWidth',120);else await page.waitForTimeout(500);
  const state=await preview.evaluate(el=>{const image=el.querySelector('img,[role="img"]');const r=image.getBoundingClientRect();return {tag:image.tagName,role:image.getAttribute('role'),label:image.getAttribute('aria-label')||image.getAttribute('alt'),fallback:image.className.includes('resilient-image-fallback'),broken:image.tagName==='IMG'&&image.complete&&image.naturalWidth===0,width:r.width,height:r.height}});
  rows.push({...c,key,initialBox,state});if(output&&c.mode==='failed')await page.screenshot({path:`${output}/${key}.png`});
  try{assert.equal(state.broken,false,'No browser broken-image icon');assert.equal(state.width,64);assert.equal(state.height,spec.variant==='cover'?96:64);assert.equal(state.fallback,c.mode!=='valid','Failed/empty/missing assets use established fallback; valid artwork remains');assert.ok(!['Cover','Avatar',''].includes(state.label),'Preview image has meaningful accessible text')}catch(error){failures.push({key,message:error.message})}
  await context.close();console.log(key,state);
 }
 if(output)fs.writeFileSync(`${output}/images.json`,JSON.stringify({rows,failures},null,2));assert.deepEqual(failures,[]);
}finally{await browser.close()}
