import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3022';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const observations=[];
try {for(const width of [390,1440]){
 console.log(`Checking chapter channels at ${width}px`);
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);
 await page.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');window.shareProof={native:[],copies:[],social:[]};Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.shareProof.native.push(payload)}});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.shareProof.copies.push(text)}}});window.open=url=>{window.shareProof.social.push(url);return null};});
 const path='/book/local-story-spring/chapter/local-story-spring-chapter-1';
 await page.goto(base+path,{waitUntil:'domcontentloaded'});
 await page.locator('.reader-copy').waitFor();
 const more=page.getByRole('button',{name:'More reader actions',exact:true});if(await more.isVisible())await more.click();
 await page.getByRole('button',{name:'Share chapter',exact:true}).click();
 const expected=base+path;
 const link=page.getByLabel('Story link',{exact:true});
 if(process.env.AUDIT_EVIDENCE){mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true});await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-chapter.png`});}
 assert.equal(await link.inputValue(),expected,'Share Chapter must retain chapter ID');
 await page.getByRole('button',{name:'Copy story link',exact:true}).click();
 await page.getByRole('button',{name:'Share via...',exact:true}).click();
 for(const name of ['X','Facebook','WhatsApp','Telegram'])await page.getByRole('button',{name,exact:true}).click();
 const proof=await page.evaluate(()=>window.shareProof);
 assert.deepEqual(proof.copies,[expected]);assert.equal(proof.native[0].url,expected);
 assert.equal(new URL(proof.social[0]).searchParams.get('url'),expected);
 assert.equal(new URL(proof.social[1]).searchParams.get('u'),expected);
 assert.ok(new URL(proof.social[2]).searchParams.get('text').endsWith(expected));
 assert.equal(new URL(proof.social[3]).searchParams.get('url'),expected);
 await page.keyboard.press('Escape');
 await page.locator('.reader-copy p').first().evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);range.setEnd(e.firstChild,Math.min(90,e.firstChild.textContent.length));getSelection().removeAllRanges();getSelection().addRange(range)});
 await page.locator('.reader-manuscript').dispatchEvent('mouseup');await page.getByRole('button',{name:'Share as Quote',exact:true}).click();
 await page.getByRole('button',{name:'Quick Share',exact:true}).click();assert.equal(await link.inputValue(),expected,'selected quote retains chapter URL');
 await page.keyboard.press('Escape');
 await page.goto(base+'/book/local-story-spring',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Share this book',exact:true}).click();assert.equal(await link.inputValue(),base+'/book/local-story-spring','book sharing remains book-level');
 console.log(`Checking signed-out recipient at ${width}px`);const recipient=await browser.newPage({viewport:{width,height:900}});recipient.setDefaultTimeout(15000);await recipient.goto(expected,{waitUntil:'domcontentloaded'});await recipient.locator('.reader-copy').waitFor();assert.equal(new URL(recipient.url()).pathname,path);await recipient.goto(base+'/book/local-story-spring/chapter/local-story-spring-chapter-2',{waitUntil:'domcontentloaded'});await recipient.getByText('Sign in to read',{exact:true}).first().waitFor();await recipient.close();
 observations.push({width,chapter:path,channels:'native, clipboard, X, Facebook, WhatsApp, Telegram',quote:'chapter URL',book:'book URL'});
 await page.close();
}
for(const role of ['reader','writer']){
 console.log(`Checking ${role} recipient`);const recipient=await browser.newPage({viewport:{width:1440,height:900}});recipient.setDefaultTimeout(15000);
 const login=await recipient.request.post(base+'/api/auth/login',{data:{email:process.env[`E2E_${role.toUpperCase()}_EMAIL`]||`${role}@example.test`,password:process.env.E2E_PASSWORD||'WordWeftLocal123!'}});assert.equal(login.status(),200,'local fixture login succeeds');const {token}=await login.json();
 await recipient.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 const path='/book/local-story-spring/chapter/local-story-spring-chapter-2';await recipient.goto(base+path,{waitUntil:'domcontentloaded'});await recipient.locator('.reader-copy').waitFor();assert.equal(new URL(recipient.url()).pathname,path);assert.equal(await recipient.getByText('Sign in to read',{exact:true}).count(),0);
 if(role==='writer'){
  await recipient.goto(base+'/write/book/local-story-spring/manage',{waitUntil:'domcontentloaded'});await recipient.getByLabel('Actions for The First Light',{exact:true}).click();const chapterShare=recipient.getByRole('button',{name:'Share',exact:true}).first();await chapterShare.click();assert.match(await recipient.getByLabel('Story link',{exact:true}).inputValue(),/\/chapter\/local-story-spring-chapter-/);
 }
 observations.push({role,recipient:'chapter 2 ID retained; authenticated content available',manage:role==='writer'?'chapter share link retained':undefined});await recipient.close();
}
if(process.env.AUDIT_EVIDENCE)writeFileSync(`${process.env.AUDIT_EVIDENCE}/channels.json`,JSON.stringify(observations,null,2));
}finally{await browser.close();}
