import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:3000';
if(!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname))throw Error('Use disposable local fixtures');
const output=process.env.AUDIT_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const notice=(id,message,read=true,type='SYSTEM_UPDATE',createdAt='2026-10-18T12:00:00Z')=>({id,userId:'local-reader',actorId:null,type,entityType:'SYSTEM',entityId:id,message,read,createdAt,metadata:{}});
const first=Array.from({length:20},(_,i)=>notice(`recent-${i}`,`Recent read update ${i}`));
const older=notice('older','Older unread announcement',false,'NEW_FOLLOWER','2026-10-15T12:00:00Z');
const arriving=notice('arriving','Live arriving update',false,'SYSTEM_UPDATE','2026-10-19T12:00:00Z');
try {
for(const width of [1440,390])for(const filter of ['Unread','Social','Search']) {
 const context=await browser.newContext({viewport:{width,height:1000}});
 const login=await context.request.post(baseURL+'/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});expect(login.ok()).toBeTruthy();const {token}=await login.json();
 await context.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');window.__notificationStreams=[];window.EventSource=class extends EventTarget{constructor(){super();window.__notificationStreams.push(this);}close(){}};},token);
 let pages=[], fail=filter==='Unread', pending;
 await context.route('**/api/notifications/unread-count',route=>route.fulfill({json:{count:1}}));
 await context.route('**/api/notifications?*',async route=>{const p=Number(new URL(route.request().url()).searchParams.get('page'));pages.push(p);if(p===1&&fail){fail=false;await route.fulfill({status:503,json:{message:'Synthetic page unavailable'}});return;}if(p===1){await new Promise(resolve=>pending=resolve);}await route.fulfill({json:{notifications:p===0?first:[first[19],older,arriving],currentPage:p,totalPages:2,totalElements:23,hasNext:p===0}});});
 const page=await context.newPage();await page.goto(baseURL+'/notifications');await expect(page.locator('.ww-notification-row')).toHaveCount(20);
 if(filter==='Search')await page.getByRole('textbox',{name:'Search notifications'}).fill('Older unread');else await page.getByRole('tab',{name:filter,exact:true}).click();
 await expect(page.locator('.ww-notification-row')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);
 if(output)await page.screenshot({path:path.join(output,`${width}-${filter}-empty.png`)});
 if(process.env.AUDIT_BASELINE==='1'){console.log(width,filter,'requested pages',pages,'load controls',await page.getByRole('button',{name:'Load more',exact:true}).count());await context.close();continue;}
 await expect(page.getByText('No matches in loaded notifications',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Load more',exact:true}).click();
 if(filter==='Unread'){await expect(page.getByRole('alert')).toContainText('could not be loaded');await page.getByRole('button',{name:'Try again',exact:true}).click();}
 await expect.poll(()=>typeof pending).toBe('function');
 // A live row arrives before an overlapping older page finishes.
 await page.evaluate(arriving=>window.__notificationStreams.at(-1).dispatchEvent(new MessageEvent('notification',{data:JSON.stringify(arriving)})),arriving);
 pending();await expect(page.getByText('Older unread announcement',{exact:true})).toBeVisible();
 if(filter==='Search')await expect(page.getByRole('textbox',{name:'Search notifications'})).toHaveValue('Older unread');else await expect(page.getByRole('tab',{name:filter,exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('button',{name:'Load more',exact:true})).toHaveCount(0);
 if(output)await page.screenshot({path:path.join(output,`${width}-${filter}-found.png`)});
 // Exhausted filtered history has a truthful empty state.
 await page.getByRole('textbox',{name:'Search notifications'}).fill('No such notification');await expect(page.getByText('No matching notifications',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Search notifications'}).fill('');await page.getByRole('tab',{name:'All',exact:true}).click();
 await expect(page.locator('.ww-notification-row')).toHaveCount(22);
 await expect(page.getByText('Live arriving update',{exact:true})).toHaveCount(1);
 await expect(page.locator('.ww-notification-row').first()).toContainText('Live arriving update');
 await expect(page.locator('.ww-notification-row').last()).toContainText('Older unread announcement');
 await expect(page.getByText('2 unread',{exact:true})).toBeVisible();
 expect(pages).toEqual(filter==='Unread'?[0,1,1]:[0,1]);
 console.log(width,filter,'pages',pages,'22 unique chronological rows; live arrival retained; count 2; filter retained');
 if(output)fs.writeFileSync(path.join(output,`${width}-${filter}-requests.json`),JSON.stringify({requestedPages:pages,uniqueRows:22,unreadCount:2,filterRetained:true},null,2));
 await context.close();
}
}finally{await browser.close();}
