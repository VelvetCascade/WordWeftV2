import {test,expect,type Page} from './fixtures';
import {mkdir} from 'node:fs/promises';
const signIn=async(page:Page,token:string)=>{await page.addInitScript(jwt=>{if(!localStorage.getItem('wordweft_jwt'))localStorage.setItem('wordweft_jwt',jwt);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);};
for(const width of [1440,390])test(`browser Back and Forward retain the library entry at ${width}px`,async({page,request})=>{
 const response=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});expect(response.ok()).toBeTruthy();await signIn(page,(await response.json()).token);
 await page.setViewportSize({width,height:width===390?844:1000});await page.goto('/library');await expect(page.getByRole('heading',{name:'Your library',exact:true})).toBeVisible();
 await expect(page.getByText('Loading your reading place…',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^All stories/}).click();await page.getByRole('combobox',{name:'Shelf',exact:true}).selectOption('local-shelf-weekend');
 await page.getByRole('textbox',{name:'Search your library',exact:true}).fill('spring');await page.getByRole('combobox',{name:'Sort',exact:true}).selectOption('title');
 const story=page.locator('.ww-library-book-title').filter({hasText:'Spring'}).first();await expect(story).toBeVisible();await story.click();
 await expect(page).toHaveURL(/\/chapter\//);await page.goBack();
 await expect(page.getByText('Loading your reading place…',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Your library',exact:true})).toBeVisible();
 if(process.env.AUDIT_CAPTURE){await mkdir('.github/audit-fixes/205',{recursive:true});await page.screenshot({path:`.github/audit-fixes/205/${process.env.AUDIT_CAPTURE}-${width}.png`});}
 await expect(page.getByRole('textbox',{name:'Search your library',exact:true})).toHaveValue('spring');await expect(page.getByRole('combobox',{name:'Sort',exact:true})).toHaveValue('title');await expect(page.getByRole('combobox',{name:'Shelf',exact:true})).toHaveValue('local-shelf-weekend');await expect(page.getByRole('button',{name:/^All stories/})).toHaveAttribute('aria-pressed','true');
 await page.goForward();await expect(page).toHaveURL(/\/chapter\//);await page.goBack();await expect(page.getByRole('textbox',{name:'Search your library',exact:true})).toHaveValue('spring');
 // An intentional fresh navigation creates an independent Library entry.
 await page.getByRole('link',{name:'Discover stories',exact:true}).click();await page.locator('a[href="/library"]:visible').first().click();
 await expect(page.getByRole('textbox',{name:'Search your library',exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Sort',exact:true})).toHaveValue('recent');
});

test('a different account cannot restore the preceding account’s library entry',async({page,request})=>{
 const login=async(email:string)=>(await(await request.post('/api/auth/login',{data:{email,password:'WordWeftLocal123!'}})).json()).token;
 await signIn(page,await login('reader@example.test'));await page.goto('/library');await expect(page.getByRole('heading',{name:'Your library',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Search your library',exact:true}).fill('private reader search');await page.getByRole('combobox',{name:'Sort',exact:true}).selectOption('progress');
 const jwt=await login('writer@example.test');await page.evaluate(token=>localStorage.setItem('wordweft_jwt',token),jwt);await page.reload();
 await expect(page.getByRole('textbox',{name:'Search your library',exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Sort',exact:true})).toHaveValue('recent');
});

test('Back restores expanded results and scroll after progress loads, while empty filters stay empty',async({page,request})=>{
 const response=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});await signIn(page,(await response.json()).token);
 await page.route('**/api/users/me',async route=>{const response=await route.fetch();const user=await response.json();const book=user.library.flatMap((s:any)=>s.books).find((b:any)=>b.id==='local-story-spring');expect(book).toBeTruthy();const books=[...Array.from({length:25},(_,i)=>({...book,id:`synthetic-library-${i}`,title:`Spring ${String(i).padStart(2,'0')}`})),book];user.library=[{id:'all',name:'All Books',books}];await route.fulfill({response,json:user});});
 let returning=false;
 await page.route('**/api/reading/progress',async route=>{if(returning)await new Promise(resolve=>setTimeout(resolve,500));await route.continue();});
 await page.goto('/library');await expect(page.getByRole('heading',{name:'Your library',exact:true})).toBeVisible();await expect(page.getByText('Loading your reading place…',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:/^All stories/}).click();await page.getByRole('textbox',{name:'Search your library',exact:true}).fill('spring');await page.getByRole('combobox',{name:'Sort',exact:true}).selectOption('title');
 await expect(page.locator('.ww-library-book-v2')).toHaveCount(20);await page.getByRole('button',{name:'Show 20 more',exact:true}).click();await expect(page.locator('.ww-library-book-v2')).toHaveCount(26);
 const story=page.locator('.ww-library-book-title').filter({hasText:'The Last Spring in Bellweather'});await story.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);expect(scroll).toBeGreaterThan(500);await story.click();await expect(page).toHaveURL(/\/chapter\//);returning=true;await page.goBack();
 await expect(page.locator('.ww-library-book-v2')).toHaveCount(26);await expect.poll(()=>page.evaluate(y=>Math.abs(scrollY-y),scroll)).toBeLessThan(5);
 await page.getByRole('textbox',{name:'Search your library',exact:true}).fill('no synthetic stories match');await expect(page.getByRole('heading',{name:'No stories match your search.'})).toBeVisible();await page.getByRole('link',{name:'Discover stories',exact:true}).click();await page.goBack();await expect(page.getByRole('textbox',{name:'Search your library',exact:true})).toHaveValue('no synthetic stories match');await expect(page.getByRole('heading',{name:'No stories match your search.'})).toBeVisible();
});

test('story details return keeps the selected view and shelf without resetting the resume card',async({page,request})=>{
 const response=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'}});await signIn(page,(await response.json()).token);
 await page.route('**/api/reading/progress',route=>route.fulfill({json:{'local-story-spring':{bookId:'local-story-spring',overallProgress:20,lastReadTimestamp:'2026-10-01T10:00:00Z',chapters:{'local-story-spring-chapter-1':{progress:20,scrollPosition:100}}}}}));
 await page.goto('/library');await expect(page.getByRole('heading',{name:'Your library',exact:true})).toBeVisible();await expect(page.getByText('Loading your reading place…',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^All stories/}).click();await page.getByRole('combobox',{name:'Shelf',exact:true}).selectOption('local-shelf-weekend');await page.getByRole('combobox',{name:'Sort',exact:true}).selectOption('progress');
 await page.getByRole('link',{name:'Story details',exact:true}).click();await expect(page).toHaveURL(/\/book\/local-story-spring$/);await page.goBack();
 await expect(page.getByRole('combobox',{name:'Sort',exact:true})).toHaveValue('progress');await expect(page.getByRole('combobox',{name:'Shelf',exact:true})).toHaveValue('local-shelf-weekend');await expect(page.getByRole('button',{name:/^All stories/})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('region',{name:'Continue reading',exact:true})).toBeVisible();
});
