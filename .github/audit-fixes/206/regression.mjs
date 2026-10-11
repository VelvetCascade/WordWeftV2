import {chromium} from '/workspace/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {for(const width of [1280,390]) {
const context=await browser.newContext({viewport:{width,height:844}});
await context.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});
await context.route('**/api/auth/login',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Email not verified'})}));
let release;let requests=0;let fail=false;
await context.route('**/api/auth/resend-otp',async r=>{requests++;await new Promise(resolve=>release=resolve);await r.fulfill({status:fail?400:200,contentType:'text/plain',body:fail?'Please retry':'Verification email resent'});});
const page=await context.newPage();await page.goto('http://127.0.0.1:3024/auth');await page.locator('#email').fill('audit@example.test');await page.locator('#password').fill('AuditPassword123!');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.locator('#otp').waitFor();
await page.getByRole('button',{name:'Resend Code',exact:true}).click();await page.waitForTimeout(100);
assert.equal(await page.getByRole('button',{name:/Sending|Resend/}).isDisabled(),true,'Resend is disabled while delivery is pending');
await page.locator('button').filter({hasText:/Sending|Resend/}).evaluate(el=>{el.click();el.click()});assert.equal(requests,1);
await page.screenshot({path:new URL(`pending-${width}.png`,import.meta.url).pathname});fail=true;release();await page.getByRole('button',{name:'Resend Code',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Resend Code',exact:true}).isEnabled(),true);fail=false;await page.getByRole('button',{name:'Resend Code',exact:true}).click();await page.waitForTimeout(100);assert.equal(requests,2);release();await page.getByRole('button',{name:/Resend code in/}).waitFor();assert.equal(await page.getByRole('button',{name:/Resend code in/}).isDisabled(),true);await context.close();
} }finally{await browser.close()}
