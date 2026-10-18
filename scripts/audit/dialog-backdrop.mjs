import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync } from 'node:fs';
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args:['--no-sandbox']});
try {
 for (const [width,height] of [[390,844],[740,360],[1440,900]]) {
  const page = await browser.newPage({viewport:{width,height}});
  await page.addInitScript(() => {localStorage.setItem('ww_welcomeJourneyCompleted','true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true');});
  for(const [path,trigger,panel] of [['/author/local-writer','Share author portfolio','.ww-author-share-dialog'],['/book/local-story-spring','Share this book','.ww-share-dialog']]) {
   await page.goto((process.env.E2E_BASE_URL || 'http://127.0.0.1:3022')+path,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:trigger,exact:true}).click();
   const dialog=page.getByRole('dialog');
   const bounds=await page.locator(panel).evaluate(e=>({panel:e.getBoundingClientRect().toJSON(),backdrop:e.parentElement.getBoundingClientRect().toJSON()}));
   if(process.env.AUDIT_EVIDENCE) {mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true}); await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-${panel.includes('author')?'author':'book'}.png`});}
   assert.equal(bounds.backdrop.bottom,height,'backdrop must cover viewport bottom');
   assert.ok(bounds.panel.height <= height-32,'panel retains viewport cap');
   const scroller=dialog.locator('.overflow-y-auto');
   assert.ok(await scroller.evaluate(e=>{e.scrollTop=e.scrollHeight;return e.scrollHeight<=e.clientHeight||e.scrollTop>0}),'dialog content remains scrollable');
   const controls=dialog.locator('button:not([disabled]),input:not([disabled]),a[href]');
   await controls.last().focus(); await page.keyboard.press('Tab'); assert.ok(await controls.first().evaluate(e=>e===document.activeElement),'Tab wraps to first control');
   await controls.first().focus(); await page.keyboard.press('Shift+Tab'); assert.ok(await controls.last().evaluate(e=>e===document.activeElement),'Shift Tab wraps to last control');
   await page.mouse.click(20,height-5);
   assert.equal(new URL(page.url()).pathname,path,'background navigation cannot activate');
   await page.getByRole('button',{name:trigger,exact:true}).click();
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
   assert.ok(await page.getByRole('button',{name:trigger,exact:true}).evaluate(e=>e===document.activeElement),'Escape restores trigger focus');
   await page.getByRole('button',{name:trigger,exact:true}).click();
   await page.getByRole('button',{name:'Close share dialog',exact:true}).click();
   await dialog.waitFor({state:'hidden'});
  }
  if(width===740)await page.setViewportSize({width:390,height});
  const chapterPath='/book/local-story-spring/chapter/local-story-spring-chapter-1';
  await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:3022')+chapterPath,{waitUntil:'domcontentloaded'});
  await page.locator('.reader-copy').waitFor();
  const more=page.getByRole('button',{name:'More reader actions',exact:true});
  if(await more.isVisible())await more.click();
  await page.getByRole('button',{name:'Share chapter',exact:true}).click();
  if(width===740)await page.setViewportSize({width,height});
  assert.equal(await page.locator('.ww-share-dialog').evaluate(e=>e.parentElement.getBoundingClientRect().bottom),height);
  if(process.env.AUDIT_EVIDENCE)await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-chapter.png`});
  await page.keyboard.press('Escape');
  await page.locator('.reader-copy p').first().evaluate(e=>{const range=document.createRange();range.setStart(e.firstChild,0);range.setEnd(e.firstChild,Math.min(100,e.firstChild.textContent.length));getSelection().removeAllRanges();getSelection().addRange(range)});
  await page.locator('.reader-manuscript').dispatchEvent('mouseup');
  await page.getByRole('button',{name:'Share as Quote',exact:true}).click();
  assert.equal(await page.locator('.ww-share-dialog').evaluate(e=>e.parentElement.getBoundingClientRect().bottom),height);
  if(process.env.AUDIT_EVIDENCE)await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-quote.png`});
  await page.keyboard.press('Escape');
  await page.close();
 }
} finally {await browser.close();}
