import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
try {
 for (const [width,height] of [[390,844],[740,360],[1440,900]]) {
  const page = await browser.newPage({viewport:{width,height}});
  await page.addInitScript(() => {localStorage.setItem('ww_welcomeJourneyCompleted','true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true');});
  for(const [path,trigger,panel] of [['/author/local-writer','Share author portfolio','.ww-author-share-dialog'],['/book/local-story-spring','Share this book','.ww-share-dialog']]) {
   await page.goto((process.env.AUDIT_URL || 'http://127.0.0.1:3022')+path);
   await page.getByRole('button',{name:trigger,exact:true}).click();
   const dialog=page.getByRole('dialog');
   const bounds=await page.locator(panel).evaluate(e=>({panel:e.getBoundingClientRect().toJSON(),backdrop:e.parentElement.getBoundingClientRect().toJSON()}));
   if(process.env.AUDIT_EVIDENCE) {mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true}); await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-${panel.includes('author')?'author':'book'}.png`});}
   assert.equal(bounds.backdrop.bottom,height,'backdrop must cover viewport bottom');
   assert.ok(bounds.panel.height <= height-32,'panel retains viewport cap');
   await page.mouse.click(20,height-5);
   assert.equal(new URL(page.url()).pathname,path,'background navigation cannot activate');
   await page.getByRole('button',{name:trigger,exact:true}).click();
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
   await page.getByRole('button',{name:trigger,exact:true}).click();
   await page.getByRole('button',{name:'Close share dialog',exact:true}).click();
   await dialog.waitFor({state:'hidden'});
  }
  await page.close();
 }
} finally {await browser.close();}
