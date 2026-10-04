import {test,expect} from './fixtures';
test('late notifications from the previous account cannot enter the new account',async ({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordweft_jwt','one'));
 await page.route('**/api/notifications/stream?*',route=>route.fulfill({contentType:'text/event-stream',body:': keepalive\n\n'}));
 await page.route('**/api/notifications?*',async route=>{const old=route.request().headers().authorization==='Bearer one';if(old)await new Promise(r=>setTimeout(r,700));await route.fulfill({json:{notifications:[{id:old?'old':'new',message:old?'Old private activity':'Current activity',read:false,type:'SYSTEM_UPDATE',createdAt:new Date().toISOString()}],hasNext:false}});});
 await page.route('**/api/notifications/unread-count',async route=>{const old=route.request().headers().authorization==='Bearer one';if(old)await new Promise(r=>setTimeout(r,700));await route.fulfill({json:{count:old?9:1}});});
 await page.goto('/e2e/notification-harness.html');await page.getByRole('button',{name:'Switch account'}).click();
 await expect(page.getByTestId('notice')).toContainText('Current activity');
 await page.waitForTimeout(900);
 await expect(page.getByText('Old private activity',{exact:false})).toHaveCount(0);
 await expect(page.getByTestId('unread')).toHaveText('1');
});
test('marking read is immediate, prevents duplicate decrements and rolls back failed writes',async ({page})=>{
 await page.route('**/api/notifications/stream?*',route=>route.fulfill({contentType:'text/event-stream',body:': keepalive\n\n'}));
 await page.route('**/api/notifications?*',route=>route.fulfill({json:{notifications:[{id:'one',message:'Activity',read:false,type:'SYSTEM_UPDATE',createdAt:new Date().toISOString()}],hasNext:false}}));
 await page.route('**/api/notifications/unread-count',route=>route.fulfill({json:{count:1}}));
 let releaseWrite!: () => void; const writeGate = new Promise<void>(resolve => { releaseWrite = resolve; });
 let writes=0;await page.route('**/api/notifications/one/read',async route=>{writes++;await writeGate;await route.fulfill({status:503,json:{message:'Unavailable'}});});
 await page.goto('/e2e/notification-harness.html');await expect(page.getByTestId('unread')).toHaveText('1');
 await page.getByRole('button',{name:'Mark one',exact:true}).dblclick();
 await expect(page.getByTestId('unread')).toHaveText('0');
 await expect(page.getByTestId('notice')).toContainText('Activity read');
 releaseWrite();
 await expect(page.getByRole('alert')).toContainText('could not be marked');
 await expect(page.getByTestId('unread')).toHaveText('1');expect(writes).toBe(1);
});
test('switching an already loaded account clears old activity while the next account loads',async ({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordweft_jwt','one'));
 await page.route('**/api/notifications/stream?*',route=>route.fulfill({contentType:'text/event-stream',body:': keepalive\n\n'}));
 let releaseNext!:()=>void;const nextGate=new Promise<void>(resolve=>{releaseNext=resolve;});
 await page.route('**/api/notifications?*',async route=>{const old=route.request().headers().authorization==='Bearer one';if(!old)await nextGate;await route.fulfill({json:{notifications:[{id:old?'old':'new',message:old?'Old private activity':'Current activity',read:false,type:'SYSTEM_UPDATE',createdAt:new Date().toISOString()}],hasNext:false}});});
 await page.route('**/api/notifications/unread-count',route=>route.fulfill({json:{count:1}}));
 await page.goto('/e2e/notification-harness.html');await expect(page.getByTestId('notice')).toContainText('Old private activity');
 await page.getByRole('button',{name:'Switch account'}).click();await expect(page.getByTestId('notice')).toHaveCount(0);
 releaseNext();await expect(page.getByTestId('notice')).toContainText('Current activity');
});
