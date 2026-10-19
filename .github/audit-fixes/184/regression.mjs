import { chromium, request } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:3024';
assert.ok(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname),'Use a disposable local runtime');
const before=process.env.AUDIT_BEFORE==='1';
const api=await request.newContext({baseURL});
const login=await api.post('/api/auth/login',{data:{email:process.env.E2E_EMAIL||'reader@example.test',password:process.env.E2E_PASSWORD||'WordWeftLocal123!'}});
assert.ok(login.ok(),'Start the disposable reader fixture');const {token}=await login.json();
const headers={Authorization:`Bearer ${token}`};const original=await (await api.get('/api/users/me',{headers})).json();
const executablePath=process.env.CHROMIUM_PATH||['/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const observations=[];
try {for(const width of [1280,390]) {
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 let requests=0,reject=false;
 await context.route('**/api/users/profile',async route=>{requests++;if(reject)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic save unavailable'})});return route.continue();});
 const page=await context.newPage();await page.goto(`${baseURL}/edit-profile`,{waitUntil:'domcontentloaded',timeout:60000});
 const twitter=page.getByLabel('X or Twitter profile URL',{exact:true});await twitter.fill('https://example.com/myprofile');
 await page.getByRole('button',{name:'Privacy and security',exact:true}).click();
 const privacy=page.getByRole('checkbox',{name:/Show reading statistics/});const previous=await privacy.isChecked();await privacy.setChecked(!previous);
 await page.getByRole('button',{name:'Save profile changes',exact:true}).click();
 if(before)assert.equal(await page.getByRole('alert').count(),0,'Baseline save is silently blocked');
 if(!before){assert.equal(await twitter.count(),1,'Saving must reveal the invalid profile field');await twitter.waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='X or Twitter profile URL');assert.equal(await twitter.getAttribute('aria-invalid'),'true');assert.equal(requests,0);assert.ok(await page.getByRole('alert').filter({hasText:/profile link/i}).count());}
 await page.screenshot({animations:'disabled',path:new URL(`${before?'before':'after'}-${width}.png`,import.meta.url).pathname});
 if(!before){
  await page.getByRole('button',{name:'Story preferences',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Save Changes',exact:true}).isEnabled(),true,'All tabs allow an attempted save with actionable validation');
  await page.getByRole('button',{name:/Review X or Twitter profile URL/}).focus();await page.keyboard.press('Enter');await twitter.waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='X or Twitter profile URL');
  await page.waitForTimeout(650);await page.reload({waitUntil:'domcontentloaded'});await twitter.waitFor();assert.equal(await twitter.inputValue(),'https://example.com/myprofile','Recovered draft retains invalid field');
  await page.getByRole('button',{name:'Privacy and security',exact:true}).click();assert.ok(await page.getByRole('alert').filter({hasText:/profile link/i}).count(),'Recovered draft validation stays visible across tabs');
  await page.getByRole('button',{name:/Review X or Twitter profile URL/}).click();await twitter.fill('https://x.com/wordweft');
  reject=true;await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('alert').filter({hasText:/Synthetic save unavailable/}).waitFor();assert.equal(await twitter.inputValue(),'https://x.com/wordweft');
  reject=false;await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('status').filter({hasText:'Profile updated successfully!'}).waitFor();
  const saved=await (await api.get('/api/users/me',{headers})).json();assert.equal(saved.socials.twitter,'https://x.com/wordweft');assert.equal(saved.publicReadingStats,!previous);
  await page.reload({waitUntil:'domcontentloaded'});await twitter.waitFor();assert.equal(await twitter.inputValue(),'https://x.com/wordweft');await page.getByRole('button',{name:'Privacy and security',exact:true}).click();assert.equal(await privacy.isChecked(),!previous);
 }
 observations.push({width,saveRequests:requests,invalidDraftBlockedRequest:true,visibleCrossTabFeedback:!before,firstInvalidFieldFocused:!before,recoveredDraft:!before,serverFailureRetry:!before,persistedSharedChanges:!before});await context.close();
 // Restore only this task's edited profile fields.
 if(!before){const restored=await api.put('/api/users/profile',{headers,data:{socials:original.socials||{},publicReadingStats:original.publicReadingStats||false}});assert.ok(restored.ok());}
}
await writeFile(new URL(`${before?'before':'after'}-observations.json`,import.meta.url),JSON.stringify(observations,null,2)+'\n');console.log(`PASS ${before?'baseline':'regression'} settings cross-tab validation desktop/mobile`);
} finally{await api.put('/api/users/profile',{headers,data:{socials:original.socials||{},publicReadingStats:original.publicReadingStats||false}});await browser.close();await api.dispose();}
