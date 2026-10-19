import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:3000';
if(!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname)) throw Error('Use disposable local fixtures');
const output=process.env.AUDIT_OUTPUT;
if(output) fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try {
for(const width of [1440,390]) {
 const context=await browser.newContext({viewport:{width,height:1000}});
 const login=await context.request.post(baseURL+'/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});
 expect(login.ok()).toBeTruthy(); const {token}=await login.json();
 await context.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 const page=await context.newPage();
 await page.goto(baseURL+'/edit-profile');
 const input=page.getByRole('textbox',{name:'Threads profile URL'});
 await input.fill('https://www.threads.com/@wordweft');
 await input.scrollIntoViewIfNeeded();
 await page.evaluate(()=>document.fonts.ready);
 if(output) await page.screenshot({path:path.join(output,`${width}-threads-current.png`)});
 if(process.env.AUDIT_BASELINE==='1') { console.log(width,'current-domain rejected:',await page.getByText('Invalid threads URL format',{exact:true}).count()); await context.close(); continue; }
 await expect(page.getByText('Invalid threads URL format',{exact:true})).toHaveCount(0);
 for(const url of ['https://threads.net/@wordweft','https://www.threads.net/@word.weft','https://threads.com/@wordweft','https://www.threads.com/@wordweft/']) {
   await input.fill(url); await expect(page.getByText('Invalid threads URL format',{exact:true})).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Save Changes',exact:true})).toBeEnabled();
 }
 for(const url of ['https://threads.com.evil.test/@wordweft','https://evilthreads.com/@wordweft','https://threads.com/@wordweft/post/123','https://threads.com/wordweft','http://threads.com/@wordweft','https://wordweft@threads.com/@wordweft','https://threads.com/@wordweft?next=evil','https://threads.com/@wordweft#post']) {
   await input.fill(url); await expect(page.getByText('Invalid threads URL format',{exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Save Changes',exact:true})).toBeDisabled();
 }
 await input.fill('https://www.threads.com/@wordweft');
 let saved;
 await page.route('**/api/users/profile',async route=>{saved=route.request().postDataJSON(); await route.fulfill({json:{...saved,id:'local-reader',name:'Local Reader',email:'reader@example.test',role:'USER'}});});
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(()=>saved?.socials?.threads).toBe('https://www.threads.com/@wordweft');
 console.log(width,'accepted current+legacy hosts; rejected lookalikes/malformed URLs; profile PUT carries accepted link');
 if(output) fs.writeFileSync(path.join(output,`${width}-save-request.json`),JSON.stringify({method:'PUT',path:'/api/users/profile',threads:saved.socials.threads},null,2));
 await context.close();
}
} finally {await browser.close();}
