import { test, expect, type APIRequestContext, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

let writer = '', reader = '';
const created: string[] = [];
const ip = '127.47.18.21';
async function api(request: APIRequestContext, path: string, data?: unknown, token = writer, method = data === undefined ? 'GET' : 'POST') {
  const response = await request.fetch(`/api${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Forwarded-For': ip }, ...(data === undefined ? {} : { data }) });
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}
async function open(page: Page, path: string, token = writer) {
  await page.addInitScript(value => {
    if (value) localStorage.setItem('wordweft_jwt', value); else localStorage.removeItem('wordweft_jwt');
    localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
    localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    localStorage.setItem('theme', 'light');
  }, token);
  await page.goto(path);
}
async function story(request: APIRequestContext, published = false) {
  const title = `Connected story tools ${crypto.randomUUID()}`;
  const account = await api(request, '/books', { title, description: 'Disposable connected story fixture.', genres: ['Fantasy'], ageRating: 'ALL_AGES', coverUrl: 'http://127.0.0.1:3000/design-v2/assets/met-53681.jpg' });
  const book = account.writtenBooks.find((item: any) => item.title === title); created.push(book.id);
  const chapters = ['The arrival', 'The discovery', 'The unwritten ending'].map(title => ({ id: crypto.randomUUID(), title }));
  for (const ch of chapters) await api(request, `/books/${book.id}/chapters/${ch.id}`, { data: { title: ch.title, content: '<p>Lyra waited beside the quiet river, uncertain who would return.</p>'.repeat(30) }, contentWarnings: [], status: 'preserve', expectedRevision: 0 }, writer, 'PATCH');
  if (published) {
    const impact = await api(request, `/books/${book.id}/chapters/${chapters[1].id}/publication-impact`);
    await api(request, `/books/${book.id}/chapters/${chapters[1].id}/publish-reviewed`, { reviewToken: impact.reviewToken });
  }
  const lyra = await api(request, '/characters', { bookId: book.id, name: 'Lyra', role: 'Navigator', description: 'A traveller.', goal: 'Private goal.' });
  const rowan = await api(request, '/characters', { bookId: book.id, name: 'Rowan', role: 'Keeper', description: 'A keeper.', goal: 'Private goal.' });
  return { ...book, chapters, lyra, rowan };
}
async function entry(request: APIRequestContext, book: any, title: string, visibility = 'PUBLIC', revealChapterId: string|null = null, kind = 'LORE') {
  return api(request, '/story-bible', { bookId: book.id, title, detail: `Detail of ${title}`, kind, visibility, revealChapterId, characterIds: [] });
}
async function accessibility(page: Page, selector: string) {
  const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
}
test.beforeAll(async ({ request }) => {
  for (const [email, assign] of [['writer@example.test', (token:string)=>writer=token], ['reader@example.test', (token:string)=>reader=token]] as const) {
    const response = await request.post('/api/auth/login', { headers: { 'X-Forwarded-For': ip }, data: { email, password: 'WordWeftLocal123!' } });
    expect(response.ok()).toBeTruthy(); assign((await response.json()).token);
  }
});
test.afterEach(async ({ request }) => {
  while (created.length) await request.delete(`/api/books/${created.pop()}`, { headers: { Authorization: `Bearer ${writer}`, 'X-Forwarded-For': ip } });
});

test('Story Bible defaults private, saves relationships and previews only published reveals on desktop and mobile', async ({ page, request }) => {
  const book = await story(request, true);
  await open(page, `/write/book/${book.id}/manage?tab=bible`);
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.getByLabel('Who can see it?')).toHaveValue('PRIVATE');
  await page.getByLabel('Entry type').selectOption('RELATIONSHIP');
  await page.getByLabel('Entry title').fill('An uneasy alliance');
  await page.getByLabel('Detail', { exact: false }).fill('Lyra and Rowan now depend on one another.');
  await page.locator('.ww-bible-cast').getByRole('button', { name: 'Lyra', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeDisabled();
  await page.locator('.ww-bible-cast').getByRole('button', { name: 'Rowan', exact: true }).click();
  await page.getByLabel('Who can see it?').selectOption('PUBLIC');
  await page.getByLabel('Reader reveal', { exact: true }).selectOption(book.chapters[1].id);
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Story Bible entry saved.' })).toBeVisible();
  const entries = await api(request, `/story-bible/book/${book.id}`);
  expect(entries[0].characterIds).toEqual([book.lyra.id, book.rowan.id]);
  await page.getByRole('button', { name: 'Preview what readers know', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Story Bible reader preview' });
  await expect(preview).not.toContainText('An uneasy alliance');
  await preview.getByLabel('Completed through').selectOption(book.chapters[1].id);
  await expect(preview).toContainText('An uneasy alliance');
  await accessibility(page, '.ww-bible-tool');
  await page.screenshot({ path: 'test-results/evidence/connected/bible-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'test-results/evidence/connected/bible-mobile.png', fullPage: true });
  await page.reload(); await expect(page.locator('.ww-bible-entry').first()).toContainText('An uneasy alliance');
  await page.getByRole('button',{name:'Open account and navigation'}).click();
  await page.getByRole('button',{name:'Use dark appearance',exact:true}).click();await page.getByRole('button',{name:'Close navigation',exact:true}).click();
  await accessibility(page,'.ww-bible-tool');
  await page.screenshot({path:'test-results/evidence/connected/bible-dark-mobile.png',fullPage:true});
});

test('Bible draft survives a failed save and duplicate submissions are prevented', async ({ page, request }) => {
  const book = await story(request);
  await open(page, `/write/book/${book.id}/manage?tab=bible`);
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await page.getByLabel('Entry type').selectOption('LORE');
  await page.getByLabel('Entry title').fill('The river oath'); await page.getByLabel('Detail', { exact: false }).fill('A keeper cannot cross the river at dusk.');
  await page.route('**/api/story-bible', route => route.fulfill({ status: 503, json: { message: 'Local save unavailable.' } }));
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Local save unavailable.');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.getByLabel('Entry title')).toHaveValue('The river oath');
  await page.unroute('**/api/story-bible');
  let release!:()=>void; const pending=new Promise<void>(resolve=>release=resolve); let submissions=0;
  await page.route('**/api/story-bible', async route => { if(route.request().method()==='POST'){submissions++;await pending;}await route.continue(); });
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByLabel('Entry title')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  release(); await expect(page.getByRole('status').filter({ hasText: 'Story Bible entry saved.' })).toBeVisible(); expect(submissions).toBe(1);
});

test('real API enforces completion, chapter context, private visibility, validation and writer ownership', async ({ request }) => {
  const book = await story(request, true);
  await entry(request, book, 'Known initial lore');
  await entry(request, book, 'Writer private secret', 'PRIVATE');
  await entry(request, book, 'First completed reveal', 'PUBLIC', book.chapters[0].id);
  const secret = await entry(request, book, 'Second secret', 'PUBLIC', book.chapters[1].id, 'SECRET');
  await entry(request, book, 'Draft reveal', 'PUBLIC', book.chapters[2].id);
  const path = `/story-bible/book/${book.id}`;
  expect((await api(request, `${path}?chapterId=${book.chapters[1].id}&readerView=true`, undefined, '')).map((item:any)=>item.title)).toEqual(['Known initial lore']);
  expect((await api(request, `${path}?chapterId=${book.chapters[1].id}&readerView=true`, undefined, reader)).map((item:any)=>item.title)).toEqual(['Known initial lore']);
  await api(request, '/reading/progress', { bookId:book.id, scrollPosition:0, chapterData:{ id:book.chapters[0].id, progress:100, scroll:0 } }, reader);
  expect((await api(request, path, undefined, reader)).map((item:any)=>item.title)).toEqual(['Known initial lore','First completed reveal']);
  await api(request, '/reading/progress', { bookId:book.id, scrollPosition:0, chapterData:{ id:book.chapters[1].id, progress:100, scroll:0 } }, reader);
  expect((await api(request, `${path}?chapterId=${book.chapters[0].id}`, undefined, reader)).map((item:any)=>item.title)).toEqual(['Known initial lore','First completed reveal']);
  expect((await api(request, path, undefined, reader)).map((item:any)=>item.title)).toEqual(['Known initial lore','First completed reveal','Second secret']);
  const response=await request.get(`/api${path}`,{headers:{Authorization:`Bearer ${reader}`}});
  expect(response.headers()['cache-control']).toContain('no-store');expect(response.headers()['vary']).toContain('Authorization');
  const foreign=await request.put(`/api/story-bible/${secret.id}`,{headers:{Authorization:`Bearer ${reader}`},data:secret});expect(foreign.status()).toBe(403);
  const invalid=await request.post('/api/story-bible',{headers:{Authorization:`Bearer ${writer}`},data:{...secret,id:null,title:'',kind:'UNKNOWN'}});expect(invalid.status()).toBe(400);
  const guestWrite=await request.post('/api/story-bible',{data:secret});expect(guestWrite.status()).toBe(401);
});

test('timeline connects chapter reveals, events and flashback chronology without changing chapter order', async ({ page, request }) => {
  const book = await story(request);
  const bible = await entry(request, book, 'The hidden motive', 'PRIVATE', book.chapters[1].id);
  await open(page, `/write/book/${book.id}/manage?tab=scenes&view=timeline`);
  const second = page.locator('.ww-timeline-chapter').filter({ has: page.getByRole('heading', { name: 'The discovery', exact: true }) });
  await expect(second).toContainText('The hidden motive');
  await second.getByRole('button', { name: 'Add scene', exact: true }).click();
  await expect(page.getByLabel('Chapter', { exact: false }).first()).toHaveValue(book.chapters[1].id);
  await page.getByLabel('Scene title', { exact: true }).fill('Before the river');
  await page.getByLabel('Story time position', { exact: false }).fill('-1');
  await page.getByRole('button', { name: 'Save scene', exact: true }).click();
  await expect(second).toContainText('Before the river');
  await page.getByRole('button', { name: 'Add event', exact: true }).click();
  await page.getByLabel('Event title', { exact: true }).fill('The oath is broken');
  await page.getByLabel('Story time position', { exact: false }).fill('4');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await page.getByRole('button', { name: 'Story chronology', exact: true }).click();
  await expect(page.locator('.ww-timeline-card h4')).toHaveText(['Before the river','The oath is broken']);
  await accessibility(page, '.ww-story-timeline');
  await page.screenshot({ path:'test-results/evidence/connected/timeline-desktop.png',fullPage:true });
  await page.setViewportSize({ width:390,height:844 });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.screenshot({ path:'test-results/evidence/connected/timeline-mobile.png',fullPage:true });
  await page.getByRole('button', { name: 'Chapter map', exact:true }).click();
  await second.getByRole('link', { name:'Open entry',exact:true }).click();
  await expect(page.getByLabel('Entry title')).toHaveValue(bible.title);
  const unchanged=await api(request,`/books/${book.id}`);expect(unchanged.chapters.map((ch:any)=>ch.id)).toEqual(book.chapters.map((ch:any)=>ch.id));
});

test('reader Story Bible is reachable from book and contents, with spoiler-safe secrets and keyboard focus', async ({ page, request }) => {
  const book=await story(request,true);
  await entry(request,book,'A known law');await entry(request,book,'A future secret','PUBLIC',book.chapters[1].id,'SECRET');
  await open(page,`/book/${book.id}`,reader);
  await page.getByRole('button',{name:'Story Bible',exact:true}).click();
  await expect(page.locator('.ww-bible-reader')).toContainText('A known law');await expect(page.locator('.ww-bible-reader')).not.toContainText('A future secret');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.goto(`/book/${book.id}/chapter/${book.chapters[0].id}`);
  await page.getByRole('button',{name:'Open contents',exact:true}).click();
  await page.getByRole('button',{name:'Open Story Bible',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Story Bible',exact:true});
  await expect(dialog).toContainText('A known law');await expect(dialog).not.toContainText('A future secret');
  await expect(page.getByRole('button',{name:'Close Story Bible',exact:true})).toBeFocused();
  await accessibility(page,'.ww-bible-panel');
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Open contents',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});

test('an open reader guide refreshes a reveal only after reading progress is saved online',async({page,request})=>{
  const book=await story(request,true);
  await entry(request,book,'A completed revelation','PUBLIC',book.chapters[0].id);
  await open(page,`/book/${book.id}/chapter/${book.chapters[0].id}`,reader);
  await expect(page.locator('.reader-copy')).toBeVisible();
  let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/reading/progress',async route=>{if(route.request().method()==='POST')await pending;await route.continue();});
  const saving=page.waitForRequest(request=>request.url().endsWith('/api/reading/progress')&&request.method()==='POST'&&request.postDataJSON().chapterData.progress>=90);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await saving;
  await page.getByRole('button',{name:'Open contents',exact:true}).click();await page.getByRole('button',{name:'Open Story Bible',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Story Bible',exact:true});
  await expect(dialog).toContainText('No new story details here yet.');await expect(dialog).not.toContainText('A completed revelation');
  release();await expect(dialog).toContainText('A completed revelation');
});

test('editor Story Bible can save a world entry without leaving or losing the manuscript',async({page,request})=>{
  const book=await story(request);
  await open(page,`/write/book/${book.id}/chapter/${book.chapters[0].id}/edit`);
  const manuscript=page.locator('.rte-content[contenteditable=true]');await expect(manuscript).toBeVisible();
  await manuscript.click();await page.keyboard.press('End');await page.keyboard.type(' A detail still in my manuscript.');
  await page.getByRole('button',{name:'Story guide',exact:true}).click();
  const guide=page.getByRole('dialog',{name:'Story guide',exact:true});
  await guide.getByRole('button',{name:'Story Bible',exact:true}).click();await guide.getByRole('button',{name:'Add entry',exact:true}).click();
  await guide.getByLabel('Entry type').selectOption('LORE');await guide.getByLabel('Entry title').fill('The orchard rule');await guide.getByLabel('Detail',{exact:false}).fill('Every blossom has a keeper.');
  await guide.getByRole('button',{name:'Save entry',exact:true}).click();await expect(guide.locator('.ww-bible-entry')).toContainText('The orchard rule');
  await page.setViewportSize({width:390,height:844});expect(await guide.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
  await accessibility(page,'.ww-bible-tool');await guide.getByRole('button',{name:'Close story guide',exact:true}).click();
  await expect(manuscript).toContainText('A detail still in my manuscript.');await expect(page).toHaveURL(new RegExp(`/chapter/${book.chapters[0].id}/edit`));
});

test('scene drafts saved before timeline fields existed recover without losing their content',async({page,request})=>{
  const book=await story(request);
  const account=await api(request,'/users/me');
  await open(page,`/write/book/${book.id}/manage?tab=scenes`);
  await page.evaluate(({owner,bookId})=>localStorage.setItem(`wordweft:form-draft:v1:${encodeURIComponent(owner)}:${encodeURIComponent(`scene:${bookId}:new`)}`,JSON.stringify({version:1,savedAt:Date.now(),value:{title:'A recovered old scene',description:'My older scene draft.',setting:'The orchard',time:'Dusk',chapterId:'',characterIds:[]}})),{owner:account.id,bookId:book.id});
  await page.getByRole('button',{name:'Add scene',exact:true}).click();
  await expect(page.getByLabel('Scene title',{exact:true})).toHaveValue('A recovered old scene');
  await expect(page.getByLabel('Story time position',{exact:false})).toHaveValue('');
  await page.getByRole('button',{name:'Save scene',exact:true}).click();await expect(page.locator('.ww-scenes-tool article')).toContainText('A recovered old scene');
});

test('Lamp Reading follows pointer behind prose, preserves selection and freezes motion when requested', async ({ page }) => {
  await open(page,'/book/local-story-spring/chapter/local-story-spring-chapter-1',reader);
  await page.getByRole('button',{name:'Reading appearance and themes',exact:true}).click();
  const preferences=page.getByRole('dialog',{name:'Reading preferences'});
  await preferences.getByRole('group',{name:'Lamp Reading',exact:true}).getByRole('button',{name:'Pointer',exact:true}).click();
  await preferences.getByRole('button',{name:'Close preferences',exact:true}).click();
  await expect(page.locator('.reader-experience')).toHaveClass(/reader-lamp/);
  await page.evaluate(()=>{const copy=document.querySelector('.reader-copy');if(copy)window.scrollTo(0,scrollY+copy.getBoundingClientRect().top-160);});
  const copy=await page.locator('.reader-copy').boundingBox();expect(copy).not.toBeNull();
  const initial=await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform);
  await page.mouse.move(copy!.x+100,copy!.y+120);await expect.poll(()=>page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform)).not.toBe(initial);const first=await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform);
  await page.mouse.move(copy!.x+250,copy!.y+240);await expect.poll(()=>page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform)).not.toBe(first);
  expect(await page.locator('.reader-lamp-layer').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await page.evaluate(()=>{const text=document.querySelector('.reader-copy p')?.firstChild;if(text){const range=document.createRange();range.selectNodeContents(text);window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);}});
  await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString().length||0)).toBeGreaterThan(10);
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const selected=await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform);
  await page.mouse.move(copy!.x+80,copy!.y+300);expect(await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform)).toBe(selected);
  await page.evaluate(()=>window.getSelection()?.removeAllRanges());await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>new Promise(requestAnimationFrame));
  const steady=await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform);await page.mouse.move(copy!.x+120,copy!.y+100);
  expect(await page.locator('.reader-lamp-light').evaluate(el=>(el as HTMLElement).style.transform)).toBe(steady);
  await page.screenshot({path:'test-results/evidence/connected/lamp-desktop.png'});
  await page.reload();await expect(page.locator('.reader-experience')).toHaveClass(/reader-lamp/);
  await page.getByRole('button',{name:'Reading appearance and themes',exact:true}).click();await preferences.getByRole('button',{name:'Sepia',exact:true}).click();await expect(page.locator('.reader-lamp-layer')).toHaveCount(0);
});

test('touch Lamp Reading keeps a stable reading band, scroll and reader controls at mobile widths', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  try {
    await open(page,'/book/local-story-spring/chapter/local-story-spring-chapter-1',reader);
    await page.getByRole('button',{name:'Open reading appearance settings',exact:true}).tap();
    const preferences=page.getByRole('dialog',{name:'Reading preferences'});
    await preferences.getByRole('group',{name:'Lamp Reading',exact:true}).getByRole('button',{name:'Reading position',exact:true}).tap();
    await accessibility(page,'.reader-settings-panel');
    await preferences.getByRole('button',{name:'Close preferences',exact:true}).tap();
    await expect(page.locator('.reader-lamp-layer')).toBeVisible();
    await page.evaluate(()=>window.scrollBy(0,450));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(400);
    await page.screenshot({path:'test-results/evidence/connected/lamp-mobile.png'});
    await page.getByRole('button',{name:'Open reading appearance settings',exact:true}).tap();await expect(preferences).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  } finally {await context.close();}
});
