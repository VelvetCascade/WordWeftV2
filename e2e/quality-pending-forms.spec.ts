import { test, expect } from './fixtures';

test.beforeEach(async ({page,request})=>{
  const response=await request.post('/api/auth/login',{data:{email:'writer@example.test',password:'WordWeftLocal123!'}});
  expect(response.ok()).toBeTruthy();const {token}=await response.json();
  await page.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
});

async function fillStory(page: import('@playwright/test').Page) {
  await page.goto('/write/book/create');
  await page.getByLabel('Story title',{exact:true}).fill('A submitted snapshot');
  await page.getByLabel('Synopsis',{exact:true}).fill('An introduction held safely during a slower server response.');
}

test('new story freezes submitted fields during a delayed save and retains them after failure',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let submitted:any;
  await page.route('**/api/books',async route=>{
    if(route.request().method()!=='POST')return route.continue();submitted=route.request().postDataJSON();await gate;
    await route.fulfill({status:503,json:{message:'A temporary save failure.'}});
  });
  await fillStory(page);await page.getByRole('button',{name:'Save as draft',exact:true}).click();
  await expect(page.getByLabel('Story title',{exact:true})).toBeDisabled();
  await expect(page.getByLabel('Synopsis',{exact:true})).toBeDisabled();
  await expect.poll(()=>submitted?.title).toBe('A submitted snapshot');release();
  await expect(page.getByLabel('Story title',{exact:true})).toBeEnabled();
  await expect(page.getByLabel('Story title',{exact:true})).toHaveValue('A submitted snapshot');
  await page.reload();await expect(page.getByLabel('Story title',{exact:true})).toHaveValue('A submitted snapshot');
});

test('community fields cannot gain unsent edits during publishing and recover after failure',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let submitted:any;
  await page.route('**/api/community/posts',async route=>{
    if(route.request().method()!=='POST')return route.continue();submitted=route.request().postDataJSON();await gate;
    await route.fulfill({status:503,json:{message:'A temporary publication failure.'}});
  });
  await page.goto('/community');await page.getByRole('button',{name:'Start a conversation',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Create a post'});const content=dialog.getByRole('textbox',{name:/^Your post/});
  await content.fill('A conversation that should remain safe while it is being published.');
  const circle=dialog.getByRole('combobox',{name:'Circle',exact:true});
  if(!await circle.inputValue()) {const value=await circle.locator('option').nth(1).getAttribute('value');await circle.selectOption(value!);}
  await dialog.getByRole('button',{name:'Publish post',exact:true}).click();
  await expect(content).toBeDisabled();await expect(circle).toBeDisabled();await expect.poll(()=>submitted?.body).toContain('remain safe');release();
  await expect(content).toBeEnabled();await expect(content).toHaveValue('A conversation that should remain safe while it is being published.');
  await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Start a conversation',exact:true}).first().click();
  await expect(page.getByRole('dialog',{name:'Create a post'}).getByRole('textbox',{name:/^Your post/})).toHaveValue('A conversation that should remain safe while it is being published.');
});

test('application fields remain the reviewed snapshot throughout a delayed upload',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/public/founding-writer-applications',async route=>{await gate;await route.fulfill({status:503,json:{message:'A temporary upload failure.'}});});
  await page.goto('/founding-writers');
  await page.getByRole('textbox',{name:/Country/}).fill('India');await page.getByRole('combobox',{name:/Primary genre/}).selectOption('Fantasy');
  await page.getByRole('textbox',{name:/Story title/}).fill('A reviewed application');await page.getByRole('textbox',{name:/Synopsis/}).fill('An original story about a lantern maker finding her way home.');
  await page.getByLabel('Chapter file',{exact:false}).setInputFiles({name:'three-chapters.txt',mimeType:'text/plain',buffer:Buffer.from('Chapter one\nChapter two\nChapter three')});
  await page.getByRole('spinbutton',{name:/Chapters already drafted/}).fill('3');await page.getByRole('spinbutton',{name:/Estimated total chapters/}).fill('12');
  await page.getByRole('combobox',{name:/Expected time/}).selectOption('TWO_TO_FOUR_MONTHS');
  for(const checkbox of await page.locator('.fw-form input[type="checkbox"]').all())await checkbox.check();
  await page.getByRole('button',{name:'Review application',exact:true}).click();await page.getByRole('button',{name:'Confirm and send application',exact:true}).click();
  await expect(page.getByRole('textbox',{name:/Story title/})).toBeDisabled();await expect(page.getByLabel('Chapter file',{exact:false})).toBeDisabled();
  release();await expect(page.getByRole('textbox',{name:/Story title/})).toBeEnabled();await expect(page.getByRole('textbox',{name:/Story title/})).toHaveValue('A reviewed application');
});

test('a late form response cannot restore an account after session invalidation',async({page,request})=>{
  const session=await request.post('/api/auth/login',{data:{email:'writer@example.test',password:'WordWeftLocal123!'}});const {token}=await session.json();
  const profile=await request.get('/api/users/me',{headers:{Authorization:`Bearer ${token}`}});const oldAccount=await profile.json();
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let reached=false;
  await page.route('**/api/books',async route=>{if(route.request().method()!=='POST')return route.continue();reached=true;await gate;await route.fulfill({json:oldAccount});});
  await fillStory(page);await page.getByRole('button',{name:'Save as draft',exact:true}).click();await expect.poll(()=>reached).toBe(true);
  await page.evaluate(()=>{localStorage.removeItem('wordweft_jwt');window.dispatchEvent(new Event('wordweft:session-invalid'));});await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();
  release();await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();
  await page.evaluate(()=>{window.location.hash='/founding-writers';});
  await expect(page.getByRole('textbox',{name:/Full name/})).toHaveValue('');
});
