import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

const artifactDir = process.env.WORDWEFT_PLANNING_ARTIFACT_DIR || 'test-results/planning-artifacts';
let token='';
const createdBooks:string[]=[];
const headers=()=>({Authorization:`Bearer ${token}`,'X-Forwarded-For':'127.7.45.23'});
async function api(request:APIRequestContext,path:string,data?:unknown,method=data===undefined?'GET':'POST') {
    const response=await request.fetch(`/api${path}`,{method,headers:headers(),...(data===undefined?{}:{data})});
    expect(response.ok(),`${method} ${path} ${response.status()} ${await response.text()}`).toBeTruthy();
    return response.status()===204?null:response.json();
}
/** Keep the real API write pending while checking that newer input cannot be discarded. */
async function delayedSave(page:Page,path:string,scope:string,save:()=>Promise<unknown>) {
    let release!:()=>void;
    const pending=new Promise<void>(resolve=>{release=resolve;});
    let finish!:()=>void;const forwarded=new Promise<void>(resolve=>{finish=resolve;});
    const pattern=`**/api${path}`;
    await page.route(pattern,async route=>{if(['POST','PUT'].includes(route.request().method())){await pending;try{await route.continue();}finally{finish();}}else await route.continue();});
    const started=page.waitForRequest(request=>request.url().endsWith(`/api${path}`)&&['POST','PUT'].includes(request.method()));
    try {
        await save();await started;
        const form=page.locator(scope);
        for(const field of await form.locator('input,textarea,select,button').all())await expect(field).toBeDisabled();
        await expect(form).toBeVisible();
    } finally {release();await forwarded;await page.unroute(pattern);}
}
async function story(request:APIRequestContext) {
    const title=`Planning local test ${Date.now()}`;
    const user=await api(request,'/books',{title,description:'A disposable local planning fixture.',genres:['Fantasy'],ageRating:'ALL_AGES',coverUrl:'http://127.0.0.1:3008/design-v2/assets/met-53681.jpg'});
    const book=user.writtenBooks.find((item:any)=>item.title===title);createdBooks.push(book.id);return book;
}
test.beforeAll(async({request})=>{const response=await request.post('/api/auth/login',{data:{email:'writer@example.test',password:'WordWeftLocal123!'},headers:{'X-Forwarded-For':'127.7.45.23'}});expect(response.ok()).toBeTruthy();token=(await response.json()).token;await mkdir(artifactDir,{recursive:true});});
test.beforeEach(async({page},testInfo)=>{await page.context().setExtraHTTPHeaders({'X-Forwarded-For':`127.7.46.${testInfo.line%250+1}`});await page.addInitScript(token=>{if(!['localhost','127.0.0.1'].includes(location.hostname))return;localStorage.setItem('wordweft_jwt',localStorage.getItem('planning_test_token')||token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');localStorage.setItem('theme','light');},token);});
test.afterEach(async({request})=>{while(createdBooks.length)await request.delete(`/api/books/${createdBooks.pop()}`,{headers:headers()});});

test('opened character form is named, Cancel preserves the saved character, and private fields stay out of preview',async({page,request})=>{
    const book=await story(request);
    const character=await api(request,'/characters',{bookId:book.id,name:'Lyra',role:'Navigator',description:'A public background.',goal:'A private plan.'});
    await page.goto(`/write/book/${book.id}/manage?tab=characters`);
    await page.locator('.ww-characters-tool').getByRole('button',{name:'Edit',exact:true}).click();
    await page.getByRole('textbox',{name:/^Name/}).fill('Changed in unsaved draft');
    await page.getByLabel('Background visibility').selectOption('PRIVATE');
    await page.getByLabel('Goal visibility').selectOption('PRIVATE');
    await page.getByText('Public reader preview',{exact:true}).click();
    const preview=page.locator('.ww-planning-preview');
    await expect(preview).not.toContainText('A private plan.');await expect(preview).not.toContainText('A public background.');
    const axe=await new AxeBuilder({page}).include('.ww-planning-form').withTags(['wcag2a','wcag2aa']).analyze();
    expect(axe.violations.filter(item=>['label','select-name'].includes(item.id))).toEqual([]);
    await page.screenshot({path:`${artifactDir}/character-open-desktop.png`,fullPage:true});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(page.locator('.ww-characters-tool article').first()).toContainText('Lyra');
    await expect(page.locator('.ww-characters-tool article').first()).not.toContainText('Changed in unsaved draft');
    await page.locator('.ww-characters-tool').getByRole('button',{name:'Edit',exact:true}).click();
    await expect(page.getByRole('textbox',{name:/^Name/})).toHaveValue('Changed in unsaved draft');
    await page.getByRole('textbox',{name:/^Name/}).fill('Lyra saved');
    await delayedSave(page,`/characters/${character.id}`,'.ww-planning-form',()=>page.getByRole('button',{name:'Save character',exact:true}).click());
    await expect(page.getByRole('status').filter({hasText:'Character saved online.'})).toBeVisible();
    await page.reload();await expect(page.locator('.ww-characters-tool article').first()).toContainText('Lyra saved');
});

test('scene and private note edits remain local on failure and survive closing and reopening',async({page,request})=>{
    const book=await story(request);
    const scene=await api(request,'/scenes',{bookId:book.id,title:'At the station',description:'Original scene',setting:'Station',time:'Dusk',characterIds:[]});
    const note=await api(request,'/notes',{bookId:book.id,title:'Continuity',content:'Original note'});
    await page.goto(`/write/book/${book.id}/manage?tab=scenes`);
    await page.locator('.ww-scenes-tool').getByRole('button',{name:'Edit',exact:true}).click();
    await page.getByLabel('Scene title',{exact:true}).fill('The returning train');
    await page.getByLabel('Description',{exact:true}).fill('The conflict changes.');
    const axe=await new AxeBuilder({page}).include('.ww-planning-form').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations.filter(item=>['label','select-name'].includes(item.id))).toEqual([]);
    await delayedSave(page,`/scenes/${scene.id}`,'.ww-planning-form',()=>page.getByRole('button',{name:'Save scene',exact:true}).click());await expect(page.getByText('Scene saved online.',{exact:true})).toBeVisible();
    expect((await api(request,`/scenes/${scene.id}`)).title).toBe('The returning train');
    await page.goto(`/write/book/${book.id}/manage?tab=notes`);
    await page.locator('.ww-notes-tool').getByRole('button',{name:'Edit',exact:true}).click();
    await page.getByLabel('Private note content',{exact:true}).fill('A recoverable private idea.');
    await page.route(`**/api/notes/${note.id}`,route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'A test save interruption.'})}):route.continue());
    await page.getByRole('button',{name:'Save note',exact:true}).click();await expect(page.getByRole('alert')).toContainText('test save interruption');
    await expect(page.getByLabel('Private note content',{exact:true})).toHaveValue('A recoverable private idea.');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('.ww-notes-tool article').first()).toContainText('Original note');
    await page.reload();await page.locator('.ww-notes-tool').getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Private note content',{exact:true})).toHaveValue('A recoverable private idea.');
    await page.unroute(`**/api/notes/${note.id}`);await delayedSave(page,`/notes/${note.id}`,'.ww-planning-form',()=>page.getByRole('button',{name:'Save note',exact:true}).click());await expect(page.getByText('Private note saved online.',{exact:true})).toBeVisible();expect((await api(request,`/notes/${note.id}`)).content).toBe('A recoverable private idea.');
});

for(const dark of [false,true])test(`phone essentials precede optional cover and opened planning fields fit ${dark?'dark':'light'}`,async({page,request})=>{
    await page.setViewportSize({width:393,height:852});
    await page.goto('/write/book/create');
    if(dark)await page.evaluate(()=>{document.documentElement.classList.add('dark');localStorage.setItem('theme','dark');});
    const title=await page.getByLabel('Story title',{exact:true}).boundingBox();const format=await page.getByLabel('Format',{exact:true}).boundingBox();const synopsis=await page.getByLabel('Synopsis',{exact:true}).boundingBox();const cover=await page.getByRole('heading',{name:/^Cover/}).boundingBox();
    expect(title!.y).toBeLessThan(cover!.y);expect(format!.y).toBeLessThan(cover!.y);expect(synopsis!.y).toBeLessThan(cover!.y);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await page.screenshot({path:`${artifactDir}/create-phone-${dark?'dark':'light'}.png`,fullPage:true});
    const book=await story(request);await page.goto(`/write/book/${book.id}/manage?tab=scenes`);
    if(dark)await page.evaluate(()=>document.documentElement.classList.add('dark'));
    await page.getByRole('button',{name:'Add scene',exact:false}).click();
    await expect(page.getByLabel('Scene title',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await page.screenshot({path:`${artifactDir}/scene-open-phone-${dark?'dark':'light'}.png`,fullPage:true});
});

test('writer inbox filters and passage links preserve account-scoped replies across return and update locally',async({page,request})=>{
    const book=await story(request);const chapterId=crypto.randomUUID();
    await api(request,`/books/${book.id}/chapters/${chapterId}`,{data:{title:'The returning train',content:'<p>First passage.</p><p>Second passage.</p>',contentWarnings:[],disclaimerNote:''},status:'draft'},'PATCH');
    await api(request,`/books/${book.id}/status`,{status:'published',chapterIds:[chapterId]},'PATCH');
    const login=await request.post('/api/auth/login',{data:{email:'reader@example.test',password:'WordWeftLocal123!'},headers:{'X-Forwarded-For':'127.7.45.24'}});expect(login.ok()).toBeTruthy();const readerToken=(await login.json()).token;
    const post=await request.post(`/api/books/${book.id}/chapters/${chapterId}/comments`,{headers:{Authorization:`Bearer ${readerToken}`,'X-Forwarded-For':'127.7.45.24'},data:{paragraphIndex:0,parentId:null,content:'This first passage stayed with me.'}});expect(post.ok()).toBeTruthy();
    await page.goto('/write?view=comments');
    await page.getByRole('combobox',{name:'Story',exact:true}).selectOption(book.id);
    const card=page.locator('.ww-studio-comment');await expect(card).toHaveCount(1);
    await expect(card.getByRole('link',{name:'Open passage 1',exact:true})).toHaveAttribute('href',`/book/${book.id}/chapter/${chapterId}?paragraph=0`);
    await page.getByRole('button',{name:'Unanswered',exact:true}).click();await expect(card).toHaveCount(1);
    await card.getByRole('button',{name:'Reply',exact:true}).click();await card.getByLabel('Your reply',{exact:true}).fill('Thank you for noticing that detail.');
    await card.getByRole('button',{name:'Cancel',exact:true}).click();await card.getByRole('button',{name:'Reply',exact:true}).click();await expect(card.getByLabel('Your reply',{exact:true})).toHaveValue('Thank you for noticing that detail.');
    await page.goto('/write?view=stories');await page.goto('/write?view=comments');
    await page.getByRole('combobox',{name:'Story',exact:true}).selectOption(book.id);
    await card.getByRole('button',{name:'Reply',exact:true}).click();await expect(card.getByLabel('Your reply',{exact:true})).toHaveValue('Thank you for noticing that detail.');
    await page.evaluate(readerToken=>localStorage.setItem('planning_test_token',readerToken),readerToken);await page.reload();
    await expect(page.getByRole('heading',{name:'Reader comments',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Your reply',exact:true})).toHaveCount(0);await expect(page.locator('body')).not.toContainText('Thank you for noticing that detail.');
    await page.evaluate(()=>localStorage.removeItem('planning_test_token'));await page.reload();
    await page.getByRole('combobox',{name:'Story',exact:true}).selectOption(book.id);await page.getByRole('button',{name:'Unanswered',exact:true}).click();
    await card.getByRole('button',{name:'Reply',exact:true}).click();await expect(card.getByLabel('Your reply',{exact:true})).toHaveValue('Thank you for noticing that detail.');
    const axe=await new AxeBuilder({page}).include('.ww-studio-comments').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations.filter(item=>['label','select-name'].includes(item.id))).toEqual([]);
    await page.screenshot({path:`${artifactDir}/inbox-open-reply-desktop.png`,fullPage:true});
    await page.setViewportSize({width:393,height:852});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.screenshot({path:`${artifactDir}/inbox-open-reply-phone.png`,fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    let reloads=0;page.on('request',request=>{if(request.method()==='GET'&&request.url().endsWith(`/chapters/${chapterId}/comments`))reloads++;});
    await delayedSave(page,`/books/${book.id}/chapters/${chapterId}/comments`,'.ww-studio-comment form',()=>card.getByRole('button',{name:'Post reply',exact:true}).click());await expect(card).toHaveCount(0);
    await page.getByRole('button',{name:'Replied',exact:true}).click();await expect(card).toHaveCount(1);await expect(card).toContainText('Thank you for noticing that detail.');
    await expect(page.getByText('Loading reader conversations…',{exact:true})).not.toBeVisible();expect(reloads).toBe(0);
    const replies=await api(request,`/books/${book.id}/chapters/${chapterId}/comments`);expect(replies.some((reply:any)=>reply.content==='Thank you for noticing that detail.'&&reply.parentId)).toBeTruthy();
});
