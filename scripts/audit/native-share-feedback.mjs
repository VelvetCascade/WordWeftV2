import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3022';const observations=[];
try{for(const width of [390,1440]){const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);
 await page.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');window.nativeCalls=0;window.nativeMode='failure';window.copies=[];window.shareMock=async()=>{window.nativeCalls++;if(window.nativeMode==='success')return;if(window.nativeMode==='pending')return new Promise((resolve,reject)=>{window.finishNative=resolve;window.rejectNative=()=>reject(new DOMException('Synthetic late outcome','NotAllowedError'))});throw new DOMException('Synthetic share outcome',window.nativeMode==='cancel'?'AbortError':'NotAllowedError')};Object.defineProperty(navigator,'share',{configurable:true,value:window.shareMock});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.clipboardDenied)throw new DOMException('Synthetic clipboard denial','NotAllowedError');window.copies.push(text)}}});});
 for(const [name,path,trigger] of [['book','/book/local-story-spring','Share this book'],['author','/author/local-writer','Share author portfolio'],['chapter','/book/local-story-spring/chapter/local-story-spring-chapter-1','Share chapter']]){
  console.log(`Checking ${name} native-share outcomes at ${width}px`);
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  if(name==='chapter'){await page.locator('.reader-copy').waitFor();const more=page.getByRole('button',{name:'More reader actions',exact:true});if(await more.isVisible())await more.click()}
  const open=()=>page.getByRole('button',{name:trigger,exact:true}).click();await open();
  const native=page.getByRole('button',{name:/Share via/});await native.click();
  const alert=page.getByRole('alert');await alert.waitFor({timeout:2000}).catch(()=>{});
  if(process.env.AUDIT_EVIDENCE){mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true});await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-${name}-failure.png`})}
  assert.equal(await alert.count(),1,'native failures must announce recovery');assert.match(await alert.innerText(),/copy|select/i);
  const link=page.getByRole('textbox');const expected=await link.inputValue();assert.ok(expected);await link.focus();assert.deepEqual(await link.evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,expected.length],'manual link selection remains available');
  const copy=page.getByRole('button',{name:/^Copy (story|author) link$/});await copy.click();assert.equal(await page.evaluate(()=>window.copies.at(-1)),expected,'copy recovery works');assert.equal(await alert.count(),0);
  await page.evaluate(()=>window.nativeMode='success');await native.click();assert.equal(await alert.count(),0,'retry success clears feedback');
  const copiesBefore=await page.evaluate(()=>window.copies.length);await page.evaluate(()=>window.nativeMode='cancel');await native.click();assert.equal(await alert.count(),0,'cancellation stays quiet');assert.equal(await page.evaluate(()=>window.copies.length),copiesBefore,'cancellation has no clipboard side effects');
  await page.evaluate(()=>window.nativeMode='pending');const before=await page.evaluate(()=>window.nativeCalls);await native.click();assert.ok(await native.isDisabled(),'pending share disables duplicate activation');await native.evaluate(e=>e.click());assert.equal(await page.evaluate(()=>window.nativeCalls),before+1);
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});if(name==='chapter'&&width===390)await page.getByRole('button',{name:'More reader actions',exact:true}).click();await open();
  await page.evaluate(()=>window.rejectNative());assert.equal(await alert.count(),0,'late failure from a closed dialog cannot affect the reopened dialog');assert.equal(await native.isDisabled(),false);
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});if(name==='chapter'&&width===390)await page.getByRole('button',{name:'More reader actions',exact:true}).click();await open();assert.equal(await native.count(),0,'unsupported native share keeps copy/manual recovery');
  await page.evaluate(()=>window.clipboardDenied=true);await copy.click();await alert.waitFor();assert.match(await alert.innerText(),/select|manually/i);await link.focus();assert.deepEqual(await link.evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,expected.length]);
  observations.push({width,entry:name,visibleFailure:'Copy/select-link live alert',retry:'success',cancel:'quiet; no copy side effect',pending:'one request',lateFailure:'ignored after close/reopen',unsupported:'copy/manual controls retained',clipboardDenied:'manual selection available'});await page.keyboard.press('Escape');
 }
 await page.close();
}if(process.env.AUDIT_EVIDENCE)writeFileSync(`${process.env.AUDIT_EVIDENCE}/observations.json`,JSON.stringify(observations,null,2));}finally{await browser.close()}
