import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3024';
assert.ok(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname));
const api = await request.newContext({baseURL,extraHTTPHeaders:{'X-Forwarded-For':`127.194.${Math.floor(Math.random()*200)+1}.2`}});
const login=await api.post('/api/auth/login',{data:{email:process.env.E2E_EMAIL || 'reader@example.test',password:process.env.E2E_PASSWORD || 'WordWeftLocal123!'}}); assert.ok(login.ok()); const {token}=await login.json();
const profile=await (await api.get('/api/users/me',{headers:{Authorization:`Bearer ${token}`}})).json();
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const observations=[];
try { for (const width of [1280,390]) {
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 await context.route(/^https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 let release; let requests=0;
 await context.route('**/api/library/shelves',async r=>{if(r.request().method()!=='POST')return r.continue();requests++;await new Promise(resolve=>release=resolve);await r.fulfill({json:profile});});
 const page=await context.newPage();await page.goto(`${baseURL}/library`,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'New shelf',exact:true}).click(); const dialog=page.getByRole('dialog');
 await dialog.getByRole('textbox',{name:'Shelf name'}).fill('Original shelf');await dialog.getByRole('button',{name:'Create shelf',exact:true}).click();
 await dialog.getByRole('button',{name:'Creating…',exact:true}).waitFor();
 assert.equal(await dialog.getByRole('button',{name:'Close create shelf dialog'}).isEnabled(),true);
 await dialog.getByRole('button',{name:'Close create shelf dialog'}).click();await page.getByRole('button',{name:'New shelf',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Shelf name'}).fill('My next shelf draft');
 await page.screenshot({path:new URL(`before-${width}.png`,import.meta.url).pathname});
 release();await dialog.waitFor({state:'hidden'});await page.getByRole('button',{name:'New shelf',exact:true}).click();
 const recovered=await dialog.getByRole('textbox',{name:'Shelf name'}).inputValue();assert.equal(recovered,'');
 observations.push({width,requests,reopenedDraft:'My next shelf draft',returnedDraft:recovered,previousResponseClosedNewDialog:true});await context.close();
} await writeFile(new URL('before-observations.json',import.meta.url),JSON.stringify(observations,null,2)+'\n'); console.log('PASS baseline reproduces pending close/reopen and unsent draft loss');
} finally {await browser.close();await api.dispose();}
