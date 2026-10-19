import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3022',out=process.env.AUDIT_EVIDENCE;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const results=[];
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);const downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 let mode='hold';const held=[];const artwork='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#996633"/></svg>';
 const respond=r=>mode==='fail'?r.abort():r.fulfill({contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:artwork});
 await page.route('**/*',async r=>{if(r.request().resourceType()!=='image')return r.continue();if(mode==='hold'){held.push(r);return}return respond(r)});
 await page.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true})});
 await page.goto(base+'/author/local-writer',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Share author portfolio',exact:true}).click();await page.getByRole('button',{name:'Portfolio Card',exact:true}).click();
 const button=page.getByRole('button',{name:/Preparing card|Download Card|Generating/});const canvas=page.locator('canvas');await expect.poll(()=>held.length).toBeGreaterThan(0);await page.waitForTimeout(100);
 if(out){mkdirSync(out,{recursive:true});await page.screenshot({path:`${out}/${width}-pending.png`})}
 const pendingEnabled=await button.isEnabled();
 if(pendingEnabled&&process.env.AUDIT_BASELINE){const event=page.waitForEvent('download');await button.click();const d=await event;const data=readFileSync(await d.path());const blank=await canvas.evaluate(c=>!c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v));writeFileSync(`${out}/observations.json`,JSON.stringify({width,pendingEnabled,downloads,blankPNG:blank,pngBytes:data.length}));}
 assert.equal(pendingEnabled,false,'export must wait for finished portfolio rendering');
 await button.evaluate(e=>e.click());assert.equal(downloads.length,0,'pending canvas cannot export');
 // Discard the first render while assets are pending, then open a fresh card.
 await page.getByRole('button',{name:'Quick Share',exact:true}).click();await page.getByRole('button',{name:'Portfolio Card',exact:true}).click();await expect(button).toBeDisabled();
 mode='ready';await Promise.all(held.splice(0).map(respond));await expect(button).toBeEnabled();
 const preview=await canvas.evaluate(c=>c.toDataURL('image/png'));const alpha=await canvas.evaluate(c=>c.getContext('2d').getImageData(1,1,1,1).data[3]);assert.ok(alpha>240,'finished preview has painted background');
 const downloadEvent=page.waitForEvent('download');await button.click();const d=await downloadEvent;assert.deepEqual(readFileSync(await d.path()),Buffer.from(preview.split(',')[1],'base64'));
 if(out)await page.screenshot({path:`${out}/${width}-ready.png`});
 // Reopening with failed image requests must still yield the branded fallback.
 await page.keyboard.press('Escape');mode='fail';await page.getByRole('button',{name:'Share author portfolio',exact:true}).click();await page.getByRole('button',{name:'Portfolio Card',exact:true}).click();await expect(button).toBeEnabled();assert.ok(await canvas.evaluate(c=>c.getContext('2d').getImageData(1,1,1,1).data[3])>240);
 results.push({width,pending:'disabled, programmatic activation produces no file',revision:'tab switch discards pending draw',ready:'opaque branded card; downloaded bytes equal preview',failedAssets:'usable fallback after reopening'});await page.close();
}const stalled=await browser.newPage({viewport:{width:390,height:900}});await stalled.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});await stalled.route('**/*',r=>r.request().resourceType()==='image'?undefined:r.continue());await stalled.goto(base+'/author/local-writer',{waitUntil:'domcontentloaded'});await stalled.getByRole('button',{name:'Share author portfolio',exact:true}).click();await stalled.getByRole('button',{name:'Portfolio Card',exact:true}).click();const stalledExport=stalled.getByRole('button',{name:/Preparing card|Download Card/});await expect(stalledExport).toBeDisabled();await expect(stalledExport).toBeEnabled({timeout:20000});assert.ok(await stalled.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(1,1,1,1).data[3])>240);results.push({width:390,stalledAssets:'bounded timeout produces branded fallback'});await stalled.close();if(out)writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));}finally{await browser.close()}
