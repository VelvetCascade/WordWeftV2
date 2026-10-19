import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3022',out=process.env.AUDIT_EVIDENCE,results=[];
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);await page.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});await page.goto(base+'/book/local-story-spring/chapter/local-story-spring-chapter-1');const prose=page.locator('.reader-copy');await prose.waitFor();await prose.locator('p').first().scrollIntoViewIfNeeded();
 const select=async count=>prose.locator('p').first().evaluate((p,count)=>{const text=p.firstChild;const range=document.createRange();range.setStart(text,0);range.setEnd(text,Math.min(count,text.length));getSelection().removeAllRanges();getSelection().addRange(range)},count);
 await select(80);await page.keyboard.press('Shift+ArrowRight');await page.waitForTimeout(150);const quote=page.getByRole('button',{name:'Share as Quote',exact:true});
 if(out){mkdirSync(out,{recursive:true});await page.screenshot({path:`${out}/${width}-keyboard-selection.png`});writeFileSync(`${out}/observations.json`,JSON.stringify({width,keyboardSelectionLength:await page.evaluate(()=>getSelection().toString().length),quoteControls:await quote.count()}))}
 assert.equal(await quote.count(),1,'keyboard selection exposes one quote action');await page.keyboard.press('Tab');await expect(quote).toBeFocused();await page.keyboard.press('Enter');await page.locator('canvas').waitFor();if(out)await page.screenshot({path:`${out}/${width}-keyboard-dialog.png`});await page.keyboard.press('Escape');assert.ok(await prose.evaluate(p=>p.contains(document.activeElement)),'dialog returns focus to selected passage');
 await page.evaluate(()=>getSelection().removeAllRanges());await expect(quote).toHaveCount(0);
 await prose.evaluate(p=>{const range=document.createRange();range.selectNodeContents(p);getSelection().addRange(range)});await page.getByRole('status').filter({hasText:/10.*280/}).waitFor();await expect(quote).toHaveCount(0);
 await select(90);await page.locator('.reader-manuscript').dispatchEvent('mouseup');await expect(quote).toHaveCount(1);await quote.click();await expect(page.locator('canvas')).toHaveCount(1);await page.keyboard.press('Escape');
 // Selection outside the story cannot reuse the previous quote.
 await page.locator('.reader-chapter-intro h1').evaluate(h=>{const r=document.createRange();r.selectNodeContents(h);getSelection().removeAllRanges();getSelection().addRange(r)});await expect(quote).toHaveCount(0);
 await select(90);await expect(quote).toHaveCount(1);await page.getByRole('button',{name:'Next chapter',exact:true}).click();await expect(quote).toHaveCount(0);await expect(page.locator('canvas')).toHaveCount(0);
 results.push({width,navigation:'chapter change clears quote and dialog',keyboard:'selection change → one action → Tab → Enter opens quote',focus:'returns to passage',invalid:'cleared/too long/outside prose do not retain quote',pointer:'one action and one quote dialog'});await page.close();
}if(out)writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));}finally{await browser.close()}
