import { test, expect } from './fixtures';
let token='';
test.beforeAll(async({request})=>{
 const response=await request.post('/api/auth/login',{data:{email:'writer@example.test',password:'WordWeftLocal123!'},headers:{'X-Forwarded-For':'127.24.2.3'}});expect(response.ok()).toBeTruthy();token=(await response.json()).token;
});
test.beforeEach(async({page,context},info)=>{
 await context.setExtraHTTPHeaders({'X-Forwarded-For':`127.24.${Date.now()%180+10}.${info.testId.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%180+10}`});
 await page.addInitScript(value=>{if(!['localhost','127.0.0.1'].includes(location.hostname))return;localStorage.setItem('wordweft_jwt',value);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');localStorage.setItem('theme','light');},token);
});

test('wide writer workspace uses the screen and shared navigation',async({page})=>{
 await page.setViewportSize({width:1920,height:1000});
 for(const route of ['/category','/write','/write/book/create','/write/book/local-story-spring/manage','/write/analytics']){
  await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();
  const nav=page.getByRole('navigation',{name:'Main navigation',exact:true});await expect(nav).toBeVisible();
  const box=await nav.boundingBox();expect(box).toBeTruthy();expect(Math.abs(box!.x+box!.width/2-960)).toBeLessThan(2);expect(box!.width).toBe(1872);expect(box!.height).toBe(66);
  if(route.startsWith('/write')) {const workspace=await page.locator('.ww-writer-shell').boundingBox();expect(Math.abs(workspace!.x+workspace!.width/2-960)).toBeLessThan(2);expect(workspace!.width).toBe(box!.width);}
 }
});

test('writer mobile navigation keeps global destinations and reachable local views',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/write');
 await expect(page.getByRole('navigation',{name:'Main navigation',exact:true})).toBeVisible();
 const global=page.getByRole('navigation',{name:'Mobile navigation',exact:true});await expect(global).toBeVisible();
 const local=page.getByRole('navigation',{name:'Writer studio',exact:true});await expect(local).toBeVisible();
 const localBox=await local.boundingBox(),globalBox=await global.boundingBox();expect(localBox!.y+localBox!.height).toBeLessThan(globalBox!.y);
 await local.getByRole('button',{name:'More',exact:true}).click();await expect(page.getByRole('dialog',{name:'More studio destinations'})).toBeVisible();await page.keyboard.press('Escape');
 await global.getByRole('link',{name:'Explore',exact:true}).click();await expect(page).toHaveURL(/\/category$/);
});

test('studio keyboard search and account actions match the rest of the app',async({page})=>{
 await page.goto('/write');await expect(page.locator('h1').first()).toBeVisible();
 const trigger=page.getByRole('button',{name:'Search WordWeft',exact:true});await trigger.focus();await page.keyboard.press('Control+k');
 await expect(page.getByRole('dialog',{name:'Search WordWeft',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.getByRole('button',{name:'Open account and navigation',exact:true}).click();const menu=page.getByRole('dialog');await expect(menu.getByRole('link',{name:'Account settings',exact:true})).toBeVisible();await expect(menu.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
});

for(const width of [320,390,768,1440])test(`notification preview stays inside the viewport and restores focus at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 const trigger=page.getByRole('button',{name:'Notifications',exact:true});await trigger.click();
 const preview=page.getByRole('dialog',{name:'Notification preview',exact:true});await expect(preview).toBeVisible();expect(await preview.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');const box=await preview.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(844);
 await expect(preview.getByRole('button',{name:'View all notifications',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(preview).not.toBeVisible();await expect(trigger).toBeFocused();
});

test('profile avatar fallbacks use the same circular frame as images',async({page})=>{
 for(const route of ['/profile','/author/local-writer']){await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();const avatar=page.locator('.ww-profile-avatar > .resilient-image-fallback,.ww-author-avatar > .resilient-image-fallback').first();await expect(avatar).toBeVisible();expect(await avatar.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('50%');}
});

test('story guide tabs name the current task and keep chapter actions in Chapters',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/write/book/local-story-spring/manage');
 await page.getByRole('navigation',{name:'Story workspace',exact:true}).getByRole('button',{name:'Characters',exact:true}).click();
 await expect(page.getByRole('heading',{level:1,name:'Characters',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'New chapter',exact:true})).toHaveCount(0);
 const tabs=page.getByRole('navigation',{name:'Story workspace',exact:true});expect(await tabs.evaluate(el=>getComputedStyle(el).flexWrap)).toBe('nowrap');
 await tabs.getByRole('button',{name:/^Chapters/}).click();await expect(page.getByRole('button',{name:'New chapter',exact:true})).toBeVisible();
});

test('reader uses the screen with a readable manuscript and persistent chapter outline',async({page})=>{
 await page.setViewportSize({width:1920,height:1000});await page.goto('/book/local-story-spring/chapter/local-story-spring-chapter-1');await expect(page.locator('.reader-copy')).toBeVisible();
 const box=await page.locator('.reader-header').boundingBox();expect(box!.width).toBe(1872);expect(Math.abs(box!.x+box!.width/2-960)).toBeLessThan(2);expect(box!.height).toBe(66);
 await expect(page.getByRole('navigation',{name:'Chapter outline',exact:true})).toBeVisible();
 const copy=await page.locator('.reader-copy').boundingBox();expect(copy!.width).toBeLessThanOrEqual(880);
 await page.getByRole('navigation',{name:'Chapter outline',exact:true}).getByRole('button').first().click();await expect(page.locator('.reader-copy')).toBeVisible();
});

test('public genre shelves use the configured API and display published stories',async({page})=>{
 await page.goto('/genre/Fantasy');await expect(page.getByRole('heading',{level:1,name:'Fantasy stories'})).toBeVisible();await expect(page.locator('.wv-catalog-grid article').first()).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});

for(const width of [320,390,1440])test(`search results preserve cover and title space at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/search?q=Bellweather');const card=page.locator('.search-book-card').first();await expect(card).toBeVisible();
 const layout=await card.evaluate(el=>{const cover=el.querySelector('.search-book-card-cover-wrapper')!.getBoundingClientRect();const info=el.querySelector('.search-book-card-info')!.getBoundingClientRect();return {cover:{width:cover.width,bottom:cover.bottom},info:{width:info.width,top:info.top},width:el.getBoundingClientRect().width};});
 expect(layout.info.top).toBeGreaterThanOrEqual(layout.cover.bottom);expect(layout.info.width).toBeGreaterThanOrEqual(layout.width-1);expect(layout.cover.width).toBeGreaterThan(110);
 await card.click();await expect(page.getByRole('heading',{level:1,name:'The Last Spring in Bellweather',exact:true})).toBeVisible();
});

test('story details and action menus close with Escape and return focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/write/book/local-story-spring/manage');
 const trigger=page.getByLabel('Story actions',{exact:true});await trigger.click();const menu=page.locator('.ww-manage-workspace-toolbar .ww-studio-story-menu');await expect(menu).toHaveAttribute('open','');await page.keyboard.press('Escape');await expect(menu).not.toHaveAttribute('open','');await expect(trigger).toBeFocused();
 const details=page.getByRole('navigation',{name:'Story workspace'}).getByRole('button',{name:'Story details',exact:true});await details.click();const dialog=page.getByRole('dialog',{name:'Story details',exact:true});await expect(dialog.getByLabel('Title',{exact:true})).toHaveValue('The Last Spring in Bellweather');
 await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'))).toBeTruthy();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(details).toBeFocused();
 await trigger.click();await page.getByRole('button',{name:'Edit story details',exact:true}).click();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});

test('chapter actions near the bottom of a phone open inside the visible workspace',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/write/book/local-story-spring/manage');const trigger=page.getByLabel('Actions for A Door Left Open',{exact:true});await trigger.scrollIntoViewIfNeeded();await trigger.click();
 const menu=page.locator('.ww-manage-chapter-menu[open] > div');await expect(menu).toBeVisible();const box=await menu.boundingBox();const nav=await page.getByRole('navigation',{name:'Mobile navigation'}).boundingBox();expect(box!.y).toBeGreaterThanOrEqual(80);expect(box!.y+box!.height).toBeLessThanOrEqual(nav!.y);await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});

test('wide settings show a live public preview and keep the back action on screen',async({page})=>{
 await page.setViewportSize({width:1920,height:1000});await page.goto('/edit-profile');const preview=page.getByRole('complementary',{name:'Public profile preview'});await expect(preview).toBeVisible();
 await page.getByLabel('Display Name',{exact:true}).fill('A different public name');await expect(preview.getByRole('heading',{name:'A different public name'})).toBeVisible();await expect(page.locator('.ww-settings-photo-initials')).toHaveText('A');await expect(preview.locator('.ww-settings-preview-avatar')).toHaveText('A');const back=await page.getByRole('button',{name:'Back to your profile'}).boundingBox();expect(back!.x).toBeGreaterThanOrEqual(0);
});

test('notification filters adapt their orientation and support arrow keys',async({page})=>{
 await page.setViewportSize({width:1920,height:1000});await page.goto('/notifications');const filters=page.getByRole('tablist',{name:'Notification filters'});await expect(filters).toHaveAttribute('aria-orientation','vertical');await filters.getByRole('tab',{name:'All',exact:true}).focus();await page.keyboard.press('ArrowDown');await expect(filters.getByRole('tab',{name:'Unread',exact:true})).toHaveAttribute('aria-selected','true');await page.setViewportSize({width:390,height:844});await expect(filters).toHaveAttribute('aria-orientation','horizontal');
});


test('Hook Feed keeps its full opening reachable and brings the next story into view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/hooks');const opening=page.locator('.hook-feed-excerpt');await expect(opening).toBeVisible();const initial=await opening.textContent();
 const expand=page.getByRole('button',{name:'Read the full opening',exact:true});if(await expand.isVisible()){await expand.click();await expect(page.getByRole('button',{name:'Show a shorter opening',exact:true})).toHaveAttribute('aria-expanded','true');await expect(opening).toHaveText(initial!);await page.getByRole('button',{name:'Show a shorter opening',exact:true}).click();}
 const title=await page.locator('.wv-hook-reading h2').textContent();await page.getByRole('button',{name:'Not for me',exact:true}).click();await expect(page.locator('.wv-hook-reading h2')).not.toHaveText(title!);await expect.poll(async()=>Math.round((await page.locator('.wv-hook-card').boundingBox())!.y)).toBe(112);
});

for(const width of [320,390])test(`circle heading keeps words intact and clear of artwork at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/community/circle/reader-recommendations');const heading=page.getByRole('heading',{level:1,name:'Reader Recommendations',exact:true});await expect(heading).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 expect(await heading.evaluate(el=>{const node=el.firstChild!;const range=document.createRange();range.setStart(node,node.textContent!.indexOf('Recommendations'));range.setEnd(node,node.textContent!.length);return range.getClientRects().length;})).toBe(1);
 const title=await heading.boundingBox(),art=await page.locator('.community-circle-art').boundingBox();expect(art!.y).toBeGreaterThanOrEqual(title!.y+title!.height);
});

test('wide analytics identify each story and keep all statistic columns visible',async({page})=>{
 await page.setViewportSize({width:1920,height:1000});await page.goto('/write/analytics');const table=page.getByRole('region',{name:'Chapter reader statistics'});await expect(table).toBeVisible();await expect(table.locator('.ww-funnel-story').first()).toBeVisible();
 expect(await table.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByLabel('Story',{exact:true}).selectOption('local-story-spring');await expect(table.locator('tbody tr')).toHaveCount(2);await expect(table.locator('.ww-funnel-story')).toHaveCount(0);
});
