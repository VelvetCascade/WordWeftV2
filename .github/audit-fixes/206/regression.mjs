import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const before=process.env.AUDIT_BEFORE==='1'; const observations=[];
const baseURL=process.env.E2E_BASE_URL || 'http://127.0.0.1:3024';
assert.ok(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname), 'Use a disposable local runtime');
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try {for(const width of [1280,390]) {
const context=await browser.newContext({viewport:{width,height:844}});
await context.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});
await context.route('**/api/auth/login',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Email not verified'})}));
await context.route('**/api/auth/verify-otp',r=>r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:width===390?'Code expired':'Invalid verification code'})}));
const releases=[];const release=()=>releases.splice(0).forEach(resolve=>resolve());let requests=0;let fail=false;
await context.route('**/api/auth/resend-otp',async r=>{requests++;await new Promise(resolve=>releases.push(resolve));await r.fulfill({status:fail?400:200,contentType:'text/plain',body:fail?'Please retry':'Verification email resent'});});
const page=await context.newPage();await page.goto(baseURL+'/auth');await page.locator('#email').fill('audit@example.test');await page.locator('#password').fill('AuditPassword123!');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.locator('#otp').waitFor();await page.locator('#otp').fill('123456');await page.getByRole('button',{name:'Verify',exact:true}).click();await page.getByRole('alert').waitFor();
await page.getByRole('button',{name:'Resend Code',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');await page.waitForTimeout(100);
if(before){
 await page.locator('button').filter({hasText:/Sending|Resend/}).evaluate(el=>{el.click();el.click()});await page.waitForTimeout(100);
 assert.ok(requests>1);await page.screenshot({path:new URL(`before-${width}.png`,import.meta.url).pathname});observations.push({width,pendingEnabled:true,concurrentRequests:requests});release();await context.close();continue;
}
assert.equal(await page.getByRole('button',{name:/Sending|Resend/}).isDisabled(),true,'Resend is disabled while delivery is pending');
await page.locator('button').filter({hasText:/Sending|Resend/}).evaluate(el=>{el.click();el.click()});assert.equal(requests,1);
await page.screenshot({path:new URL(`pending-${width}.png`,import.meta.url).pathname});fail=true;release();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Please retry/);await page.getByRole('button',{name:'Resend Code',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Resend Code',exact:true}).isEnabled(),true);fail=false;await page.getByRole('button',{name:'Resend Code',exact:true}).click();await page.waitForTimeout(100);assert.equal(requests,2);release();await page.getByRole('button',{name:/Resend code in/}).waitFor();assert.equal(await page.getByRole('button',{name:/Resend code in/}).isDisabled(),true);observations.push({width,pendingEnabled:false,concurrentRequests:1,totalRequests:requests,deliveryFailureRecovered:true,cooldownAfterAcceptance:true});await context.close();
} await writeFile(new URL(`${before?'before':'after'}-observations.json`,import.meta.url),JSON.stringify(observations,null,2)+'\n');console.log('PASS OTP resend desktop/mobile '+(before?'baseline concurrent reproduction':'pending/retry/cooldown regression')); }finally{await browser.close()}
