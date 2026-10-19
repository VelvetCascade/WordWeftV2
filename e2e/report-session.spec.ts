import { test, expect } from './fixtures';
import { mkdir } from 'node:fs/promises';

for (const width of [1440, 390]) {
 test(`pending reports keep every dismissal route closed and retain their receipt at ${width}px`, async ({page,request}) => {
  const login=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});
  expect(login.ok()).toBeTruthy();
  const {token}=await login.json();
  await page.addInitScript(jwt=>{localStorage.setItem('wordweft_jwt',jwt);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
  await page.setViewportSize({width,height:width===390?844:1000});
  let release!:()=>void;
  const held=new Promise<void>(resolve=>release=resolve);
  let requests=0;
  await page.route('**/api/reports',async route=>{requests++;await held;await route.fulfill({json:{ticketNumber:'LOCAL-REPORT-188'}});});
  await page.goto('/book/local-story-spring');
  await page.getByRole('button',{name:'Report this book'}).click();
  await page.getByRole('radio',{name:/Spam or scam/}).check();
  await page.getByRole('button',{name:'Submit report',exact:true}).click();
  await expect.poll(()=>requests).toBe(1);
  const close=page.getByRole('button',{name:'Close report form'});
  const cancel=page.getByRole('button',{name:'Cancel',exact:true});
  if(process.env.AUDIT_CAPTURE){await mkdir('.github/audit-fixes/188',{recursive:true});await page.screenshot({path:`.github/audit-fixes/188/${process.env.AUDIT_CAPTURE}-${width}.png`});}
  await expect(close).toBeDisabled();
  await expect(cancel).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('.report-modal-backdrop').click({position:{x:2,y:2},force:true});
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button',{name:'Sending…'})).toBeDisabled();
  release();
  await expect(page.getByText('LOCAL-REPORT-188',{exact:true})).toBeVisible();
  await expect(close).toBeEnabled();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('button',{name:'Report this book'})).toBeFocused();
  await page.getByRole('button',{name:'Report this book'}).click();
  await expect(page.getByRole('button',{name:'Submit report',exact:true})).toBeDisabled();
  await expect(page.getByText('LOCAL-REPORT-188',{exact:true})).toHaveCount(0);
  expect(requests).toBe(1);
 });
}

test('failed reports keep the draft available for a single retry',async({page,request})=>{
 const login=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});
 const {token}=await login.json();
 await page.addInitScript(jwt=>{localStorage.setItem('wordweft_jwt',jwt);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 let attempts=0;
 await page.route('**/api/reports',route=>++attempts===1?route.fulfill({status:500,json:{message:'Try the report again.'}}):route.fulfill({json:{ticketNumber:'LOCAL-RETRY-188'}}));
 await page.goto('/book/local-story-spring');await page.getByRole('button',{name:'Report this book'}).click();
 await page.getByRole('radio',{name:/Spam or scam/}).check();await page.getByRole('textbox').fill('Synthetic local context');
 await page.getByRole('button',{name:'Submit report',exact:true}).click();await expect(page.getByText('Try the report again.',{exact:true})).toBeVisible();
 await expect(page.getByRole('textbox')).toHaveValue('Synthetic local context');
 await expect(page.getByRole('button',{name:'Close report form'})).toBeEnabled();
 await page.getByRole('button',{name:'Submit report',exact:true}).click();await expect(page.getByText('LOCAL-RETRY-188',{exact:true})).toBeVisible();expect(attempts).toBe(2);
});

for(const outcome of ['success','failure'])test(`parent replaces target while old ${outcome} is pending`,async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);let requested=false;
 await page.route('**/api/reports',async route=>{requested=true;await held;await route.fulfill(outcome==='success'?{json:{ticketNumber:'OLD-RECEIPT'}}:{status:500,json:{message:'Old target failed'}});});
 await page.goto('/e2e/report-harness.html');
 await page.getByRole('radio',{name:/Spam or scam/}).check();await page.getByRole('button',{name:'Submit report',exact:true}).click();await expect.poll(()=>requested).toBe(true);
 await page.evaluate(()=>window.postMessage('replace',location.origin));await expect(page.getByText('second',{exact:true})).toBeVisible();
 release();await page.waitForResponse(response=>response.url().endsWith('/api/reports'));
 await expect(page.getByText('OLD-RECEIPT',{exact:true})).toHaveCount(0);await expect(page.getByText('Old target failed',{exact:true})).toHaveCount(0);
 await page.getByRole('radio',{name:/Spam or scam/}).check();await expect(page.getByRole('button',{name:'Submit report',exact:true})).toBeEnabled();
 await page.evaluate(()=>window.postMessage('close',location.origin));await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.evaluate(()=>window.postMessage('open',location.origin));await expect(page.getByRole('button',{name:'Submit report',exact:true})).toBeDisabled();
});
