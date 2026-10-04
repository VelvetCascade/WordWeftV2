import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
let token = '';
const bucket = `127.58.${Date.now() % 190 + 10}`;
async function setup(page: Page, theme = 'light', signedIn = true) {
 await page.addInitScript(({jwt, theme}) => {
  if (jwt) localStorage.setItem('wordweft_jwt', jwt); else localStorage.removeItem('wordweft_jwt');
  localStorage.setItem('theme', theme); localStorage.setItem('ww_userRole', 'reader');
  localStorage.setItem('ww_welcomeJourneyCompleted','true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true');
  sessionStorage.setItem('wordweft:recent-page-errors', JSON.stringify([{incidentId:'WW-quality-12345', message:'PRIVATE_ERROR_TEXT'}]));
 }, {jwt:signedIn ? token : '',theme});
}
test.setTimeout(90_000);
test.beforeAll(async ({request}) => {
 const response = await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'},headers:{'X-Forwarded-For':`${bucket}.1`}});
 expect(response.ok()).toBeTruthy(); token=(await response.json()).token;
});
test.beforeEach(async ({context,page}) => { await context.setExtraHTTPHeaders({'X-Forwarded-For':`${bucket}.2`}); page.on('pageerror', error => {throw error;}); });
for (const theme of ['light','dark']) for (const width of [390,1440]) {
 test(`reader account, privacy and support ${theme} ${width}`, async ({page},info) => {
  await setup(page,theme); await page.setViewportSize({width,height:width===390?844:1000});
  await page.goto('/profile'); await expect(page.getByRole('heading',{name:'Stories you choose to share'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Open writer studio'})).toHaveCount(0);
  await page.screenshot({path:info.outputPath('reader-profile.png'),fullPage:true});
  await page.goto('/edit-profile'); await page.getByRole('button',{name:'Privacy and security',exact:true}).click();
  await expect(page.getByLabel('Show reading statistics on my public profile')).not.toBeChecked();
  await page.getByLabel('Show reading statistics on my public profile').check();
  await expect(page.getByRole('button',{name:'Save profile changes'})).toBeEnabled();
  expect((await new AxeBuilder({page}).include('.ww-settings-panel').analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('privacy-controls.png'),fullPage:true});
  await page.getByRole('link',{name:'Notifications',exact:true}).click(); await page.getByRole('button',{name:'Back to settings',exact:true}).click();
  await expect(page.getByLabel('Show reading statistics on my public profile')).toBeChecked();
  await page.getByRole('button',{name:'Story preferences',exact:true}).click();
  await expect(page.getByText('Reading appearance',{exact:true})).toBeVisible();
  await page.goto('/contact'); await page.getByText('Why do I have to tap more than once?',{exact:true}).click();
  await expect(page.getByText(/Real-device touch issues are still being investigated/)).toBeVisible();
  await expect(page.getByLabel(/Include recent incident reference/)).not.toBeChecked();
  await page.getByLabel(/Include recent incident reference/).check();
  await expect(page.getByText('PRIVATE_ERROR_TEXT',{exact:true})).toHaveCount(0);
  expect((await new AxeBuilder({page}).include('.wv-contact-form').analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('help-form.png'),fullPage:true});
  await page.goto('/privacy'); await expect(page.locator('.ww-policy-badge').first()).toBeVisible(); expect((await new AxeBuilder({page}).include('.ww-policy-badge').analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('policy-contrast.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
}
test('mobile reset has separate branding, inbox confirmation and bounded resend',async ({page},info)=>{
 await setup(page,'light',false); await page.setViewportSize({width:390,height:844}); await page.goto('/auth');
 await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 const brand=await page.locator('.ww-account-brand').boundingBox(), back=await page.getByRole('button',{name:'Back to sign in'}).boundingBox();
 expect(back!.y).toBeGreaterThan(brand!.y+brand!.height);
 await page.getByLabel('Email Address',{exact:true}).fill('reader@example.test');
 await page.getByRole('button',{name:'Send reset link',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Check your inbox',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Resend available in/})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Return to sign in',exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).include('.ww-auth-form-shell').analyze()).violations).toEqual([]);
 await page.screenshot({path:info.outputPath('reset-inbox.png'),fullPage:true});
});
test('activity groups days, direct chapter links and updates unread before request resolves',async ({page},info)=>{
 await setup(page); let marked=0;
 const notices=[{id:'q1',type:'AUTHOR_NEW_CHAPTER',entityId:'local-story-spring-chapter-1',entityType:'CHAPTER',message:'published a chapter',metadata:{bookId:'local-story-spring',bookTitle:'星の物語 — The Lantern',chapterTitle:'First light'},createdAt:new Date().toISOString(),read:false}, {id:'q2',type:'COMMENT_REPLY',entityId:'local-story-spring-chapter-2',entityType:'CHAPTER',message:'replied to your comment',metadata:{bookId:'local-story-spring',bookTitle:'星の物語 — The Lantern',chapterId:'local-story-spring-chapter-2'},createdAt:new Date(Date.now()-86400000).toISOString(),read:false}];
 await page.route('**/api/notifications/stream?*',route=>route.fulfill({status:200,contentType:'text/event-stream',body:'event: unread-count\ndata: {"count":2}\n\n'}));
 await page.route('**/api/notifications?*',route=>route.fulfill({json:{notifications:notices,hasNext:false}}));
 await page.route('**/api/notifications/unread-count',route=>route.fulfill({json:{count:2}}));
 await page.route('**/api/notifications/q1/read',async route=>{marked++;await new Promise(resolve=>setTimeout(resolve,700));await route.fulfill({json:{success:true}});});
 await page.route('**/api/notifications/read-all', async route => { await new Promise(resolve=>setTimeout(resolve,700)); await route.fulfill({json:{success:true}}); });
 await page.goto('/notifications'); await expect(page.getByText('2 unread',{exact:true})).toBeVisible();
 await expect(page.locator('.ww-notification-day')).toHaveCount(2);
 await page.getByRole('button',{name:'Mark all read',exact:true}).click();
 await expect(page.locator('.ww-notification-row.unread')).toHaveCount(0);
 await expect(page.getByText('2 unread',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'All read',exact:true})).toBeDisabled();
 await page.screenshot({path:info.outputPath('grouped-activity.png'),fullPage:true});
 await page.getByRole('button',{name:/published a chapter/}).click();
 await expect(page).toHaveURL(/book\/local-story-spring\/chapter\/local-story-spring-chapter-1/); expect(marked).toBe(0);
 await expect(page.locator('.reader-chapter-intro h1')).toBeVisible();
 await page.screenshot({path:info.outputPath('activity-context.png'),fullPage:true});
});
test('public profile consent and shelf privacy persist through authenticated real APIs',async ({request})=>{
 const auth={Authorization:`Bearer ${token}`,'X-Forwarded-For':`${bucket}.5`};
 const original=await (await request.get('/api/users/me',{headers:auth})).json();
 const created:string[]=[];
 try {
  await request.put('/api/users/profile',{headers:auth,data:{publicReadingStats:false}});
  for(const headers of [{},auth]){
   const profile=await (await request.get('/api/users/local-reader/profile',{headers})).json();
   expect(profile.publicReadingStats).toBe(false);expect(profile).not.toHaveProperty('stats');expect(profile).not.toHaveProperty('library');expect(profile).not.toHaveProperty('email');
  }
  expect((await request.put('/api/users/profile',{data:{publicReadingStats:true}})).status()).toBe(401);
  await request.put('/api/users/profile',{headers:auth,data:{publicReadingStats:true}});
  expect(await (await request.get('/api/users/local-reader/profile')).json()).toHaveProperty('stats');
  for(const visibility of ['PUBLIC','PRIVATE']){
   const name=`Quality privacy ${visibility} ${Date.now()}`;
   const response=await request.post('/api/library/shelves',{headers:auth,data:{name,visibility}});expect(response.ok()).toBeTruthy();
   const shelf=(await response.json()).library.find((item:any)=>item.name===name);created.push(shelf.id);expect(shelf.visibility).toBe(visibility);
  }
  const profile=await (await request.get('/api/users/local-reader/profile')).json();
  expect(profile.publicShelves.map((shelf:any)=>shelf.id)).toContain(created[0]);expect(profile.publicShelves.map((shelf:any)=>shelf.id)).not.toContain(created[1]);
  await request.put(`/api/library/shelves/${created[0]}/visibility`,{headers:auth,data:{visibility:'PRIVATE'}});
  expect((await (await request.get('/api/users/local-reader/profile')).json()).publicShelves.map((shelf:any)=>shelf.id)).not.toContain(created[0]);
 } finally {
  await request.put('/api/users/profile',{headers:auth,data:{publicReadingStats:original.publicReadingStats===true}});
  for(const id of created){await request.put(`/api/library/shelves/${id}/visibility`,{headers:auth,data:{visibility:'PRIVATE'}});await request.delete(`/api/library/shelves/${id}`,{headers:auth});}
 }
});
for (const theme of ['light','dark']) test(`opened feedback controls remain clear in ${theme}`,async ({page},info)=>{
 await setup(page,theme);await page.setViewportSize({width:390,height:844});await page.goto('/feedback');
 await page.getByLabel('Allow us to contact you for clarification').check();
 await page.getByLabel('Email address',{exact:true}).fill('reader@example.test');
 await page.getByRole('radio',{name:'Sometimes',exact:true}).check();
 await page.getByLabel('Where did it happen?',{exact:false}).fill('Reader chapter opening');
 await page.getByLabel(/Include recent incident reference/).check();
 expect((await new AxeBuilder({page}).include('.wv-feedback-form').analyze()).violations).toEqual([]);
 await page.screenshot({path:info.outputPath('opened-feedback.png'),fullPage:true});
});
test('public preview shows only the shelf a reader explicitly chooses to share',async ({page,request},info)=>{
 const auth={Authorization:`Bearer ${token}`,'X-Forwarded-For':`${bucket}.8`};const bookId='local-story-spring';
 const original=await (await request.get('/api/users/me',{headers:auth})).json();
 const previousIds=original.library.filter((shelf:any)=>!['all','reading','toread','completed'].includes(shelf.id)&&shelf.books.some((book:any)=>book.id===bookId)).map((shelf:any)=>shelf.id);
 let shelfId='';const name=`Chosen favorites ${Date.now()}`;
 try {
  const response=await request.post('/api/library/shelves',{headers:auth,data:{name,visibility:'PUBLIC'}});expect(response.ok()).toBeTruthy();shelfId=(await response.json()).library.find((shelf:any)=>shelf.name===name).id;
  await request.post(`/api/library/books/${bookId}/shelves`,{headers:auth,data:{shelfIds:[...previousIds,shelfId]}});
  await request.put('/api/users/profile',{headers:auth,data:{publicReadingStats:false}});
  await setup(page,'dark');await page.setViewportSize({width:390,height:844});await page.goto('/author/local-reader');
  await expect(page.getByRole('heading',{name:`${name} · 1 story`,exact:true})).toBeVisible();
  await expect(page.locator(`[aria-label^="Open "][aria-label*=" by "]`).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'Reading Activity',exact:true})).toHaveCount(0);
  await expect(page.getByText('Public profile',{exact:true})).toBeVisible();
  expect((await new AxeBuilder({page}).include('.ww-author-page').analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('public-reader-preview.png'),fullPage:true});
 } finally {
  await request.post(`/api/library/books/${bookId}/shelves`,{headers:auth,data:{shelfIds:previousIds}});
  await request.put('/api/users/profile',{headers:auth,data:{publicReadingStats:original.publicReadingStats===true}});
  if(shelfId){await request.put(`/api/library/shelves/${shelfId}/visibility`,{headers:auth,data:{visibility:'PRIVATE'}});await request.delete(`/api/library/shelves/${shelfId}`,{headers:auth});}
 }
});
