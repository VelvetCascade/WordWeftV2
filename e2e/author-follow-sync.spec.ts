import {test,expect,type Page,type APIRequestContext} from './fixtures';
import {mkdir} from 'node:fs/promises';
const authorId='local-writer';
async function setup(page:Page,request:APIRequestContext){
 const response=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});expect(response.ok()).toBeTruthy();const {token}=await response.json();const headers={Authorization:`Bearer ${token}`};
 const me=await(await request.get('/api/users/me',{headers})).json();const followed=me.following.includes(authorId);
 expect((await request.post(`/api/users/${authorId}/unfollow`,{headers})).ok()).toBeTruthy();
 await page.addInitScript(jwt=>{localStorage.setItem('wordweft_jwt',jwt);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 return {headers,restore:async()=>{expect((await request.post(`/api/users/${authorId}/${followed?'follow':'unfollow'}`,{headers})).ok()).toBeTruthy();},me:async()=>await(await request.get('/api/users/me',{headers})).json()};
}
async function profile(page:Page){await page.getByRole('button',{name:'Open account and navigation',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Your profile',exact:true}).click();await expect(page.locator('.ww-profile-stats')).toBeVisible();}
const summary=(page:Page)=>page.locator('.ww-profile-stats').getByRole('button',{name:/Following/});
for(const width of [1440,390])test(`author follow and unfollow reconcile the own-profile count at ${width}px`,async({page,request})=>{
 const fixture=await setup(page,request);try{
 await page.setViewportSize({width,height:width===390?844:1000});await page.goto(`/author/${authorId}`);await page.getByRole('button',{name:'Follow',exact:true}).click();await expect(page.getByRole('button',{name:'Following',exact:true})).toBeEnabled();
 const followed=await fixture.me();expect(followed.following).toContain(authorId);await profile(page);
 if(process.env.AUDIT_CAPTURE){await mkdir('.github/audit-fixes/214',{recursive:true});await summary(page).scrollIntoViewIfNeeded();await page.screenshot({path:`.github/audit-fixes/214/${process.env.AUDIT_CAPTURE}-${width}.png`});}
 await expect(summary(page)).toHaveText(`${followed.followingCount}Following`);
 await summary(page).click();await expect(page.getByRole('dialog',{name:'Following',exact:true}).locator('.ww-connection-row')).toHaveCount(followed.followingCount);await page.getByRole('button',{name:'Close connections',exact:true}).click();
 await page.goBack();await page.getByRole('button',{name:'Following',exact:true}).click();await expect(page.getByRole('button',{name:'Follow',exact:true})).toBeEnabled();await profile(page);const unfollowed=await fixture.me();expect(unfollowed.following).not.toContain(authorId);await expect(summary(page)).toHaveText(`${unfollowed.followingCount}Following`);
 }finally{await fixture.restore();}
});

test('an older follow response cannot overwrite a later unfollow after route changes',async({page,request})=>{
 const fixture=await setup(page,request);let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);let serverDone=false;
 try{
 await page.route(`**/api/users/${authorId}/follow`,async route=>{const response=await route.fetch();serverDone=true;await held;await route.fulfill({response});});
 await page.goto(`/author/${authorId}`);await page.getByRole('button',{name:'Follow',exact:true}).click();await expect.poll(()=>serverDone).toBe(true);await profile(page);await page.goBack();await page.getByRole('button',{name:'Following',exact:true}).click();await expect(page.getByRole('button',{name:'Follow',exact:true})).toBeEnabled();
 const received=page.waitForResponse(response=>response.url().endsWith(`/users/${authorId}/follow`));release();await received;await profile(page);const me=await fixture.me();expect(me.following).not.toContain(authorId);await expect(summary(page)).toHaveText(`${me.followingCount}Following`);
 }finally{release?.();await fixture.restore();}
});

test('failed author follow restores the author action and leaves the account count unchanged',async({page,request})=>{
 const fixture=await setup(page,request);try{
 const initial=await fixture.me();await page.route(`**/api/users/${authorId}/follow`,route=>route.fulfill({status:500,json:{message:'Synthetic follow failed'}}));await page.goto(`/author/${authorId}`);await page.getByRole('button',{name:'Follow',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic follow failed');await expect(page.getByRole('button',{name:'Follow',exact:true})).toBeEnabled();await profile(page);await expect(summary(page)).toHaveText(`${initial.followingCount}Following`);
 }finally{await fixture.restore();}
});

test('a failed later unfollow does not discard an earlier successful follow',async({page,request})=>{
 const fixture=await setup(page,request);let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);let serverDone=false;
 try{
 await page.route(`**/api/users/${authorId}/follow`,async route=>{const response=await route.fetch();serverDone=true;await held;await route.fulfill({response});});
 await page.route(`**/api/users/${authorId}/unfollow`,route=>route.fulfill({status:500,json:{message:'Synthetic unfollow failed'}}));
 await page.goto(`/author/${authorId}`);await page.getByRole('button',{name:'Follow',exact:true}).click();await expect.poll(()=>serverDone).toBe(true);await profile(page);await page.goBack();await page.getByRole('button',{name:'Following',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic unfollow failed');
 const received=page.waitForResponse(response=>response.url().endsWith(`/users/${authorId}/follow`));release();await received;await profile(page);const me=await fixture.me();expect(me.following).toContain(authorId);await expect(summary(page)).toHaveText(`${me.followingCount}Following`);
 }finally{release?.();await fixture.restore();}
});
