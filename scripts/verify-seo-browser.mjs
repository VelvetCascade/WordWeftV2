import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
// Optional browser verification dependency: npm install --no-save --package-lock=false playwright
// PLAYWRIGHT_MODULE may point to an existing Playwright ESM module (file:// URL).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.SEO_TEST_PORT || 4173);
const origin=`http://127.0.0.1:${port}`;
await mkdir('scratch/seo', { recursive: true });
const firstPreview='<p>The first lantern glowed beside the old stone bridge.</p><p>Mira opened her map and stepped into the mist.</p>';
const firstFull=firstPreview+'<p>At sunrise, the hidden city finally answered.</p>';
const secondFull='<p>Beyond the bridge, a door appeared in the mist.</p>';
const author={id:'writer', name:'Mira Rowan', username:'Mira Rowan', bio:'Stories about unexpected journeys and found family.', avatarUrl:origin+'/og-banner.jpg', followersCount:0, followingCount:0, joinDate:'2025-01-01', favoriteGenres:['Fantasy'], socials:{}};
const books=Array.from({length:30},(_,i)=>({id:'b'+String(i+1).padStart(2,'0'),title:'The Lantern Road '+String(i+1).padStart(2,'0'),author,authorId:author.id, summary:'A mapmaker follows a trail of lanterns into a forgotten city.',description:'<p>A mapmaker follows a trail of lanterns into a forgotten city.</p>',genres:['Fantasy'],tags:['found family'],category:'Fiction',publicationStatus:'published',ageRating:'ALL_AGES',isMature:false,readingStatus:'Ongoing',coverUrl:origin+'/og-banner.jpg',rating:0,reviewsCount:0,commentCount:0,isLiked:false,likesCount:0,viewCount:0,readCount:0,likes:[],publishedDate:'2026-09-01',contentWarnings:[],chapters:[{id:'c01',title:'The First Lantern',status:'published',access:'PREVIEW',accessLabel:'PREVIEW',wordCount:24,likesCount:0,commentCount:0,isLiked:false,viewCount:0,likes:[]},{id:'c02',title:'A Door in the Mist',status:'published',access:'AUTH_REQUIRED',accessLabel:'SIGN_IN',wordCount:11,likesCount:0,commentCount:0,isLiked:false,viewCount:0,likes:[]}]}));
const fixtureResult=(status,body)=>({__fixtureResult:true,status,body});
function fixture(url,headers={}){
 const u=new URL(url,origin),p=u.pathname.replace(/^\/api/,'');
 if(p.startsWith('/public/seo/')){
  const q=p.slice('/public/seo'.length),page=Number(u.searchParams.get('page')||1),slice=books.slice((page-1)*24,page*24);
  if(q==='/sitemap')return {books:30,chapters:60,authors:1,genres:1,tags:1};
  if(q.startsWith('/sitemap/')){const kind=q.split('/')[2]; return kind==='books'?books.map(b=>({path:'/book/'+b.id,lastmod:'2026-09-01'})):kind==='chapters'?books.flatMap(b=>b.chapters.map(c=>({path:`/book/${b.id}/chapter/${c.id}`}))):kind==='authors'?[{path:'/author/writer'}]:kind==='genres'?[{path:'/genre/Fantasy'}]:[{path:'/tag/found%20family'}];}
  if(q.startsWith('/book/')){
   const book=books.find(b=>b.id===q.split('/')[2]);
   if(!book)return null;
   const projection=structuredClone(book),chapterId=u.searchParams.get('chapterId');
   if(chapterId==='c01')projection.chapters[0].content=firstPreview;
   return projection;
  }
  if(q.startsWith('/author/'))return q==='/author/writer'?{author,books:slice,hasMore:page===1}:null;
  if(q==='/catalog')return {books:slice,hasMore:page===1};
 }
 if(p==='/auth/login')return {token:'LOCAL_FIXTURE_ONLY'};
 if(p==='/users/me')return headers.authorization==='Bearer LOCAL_FIXTURE_ONLY'?{...author,email:'fixture@example.test',hasSeenWritingDemo:true,writtenBooks:[],library:[]}:fixtureResult(401,{message:'Session expired.'});
 if(/^\/reading\/progress\/b\d\d$/.test(p))return headers.authorization==='Bearer LOCAL_FIXTURE_ONLY'?null:fixtureResult(401,{message:'Session expired.'});
 if(p==='/notifications/unread-count')return {count:0};
 if(p==='/notifications')return {notifications:[],hasNext:false,totalPages:0,totalElements:0,currentPage:0};
 if(p==='/books') {const page=Number(u.searchParams.get('page')||0),size=Number(u.searchParams.get('size')||12);return {content:books.slice(page*size,(page+1)*size),hasMore:(page+1)*size<30,totalElements:30,page};}
 if(p==='/books/author/writer')return books;
 if(p==='/users/writer/profile')return author;
 if(p==='/books/home-genres')return {Fantasy:books.slice(0,6)};
 if(p.includes('genres/ranked')||p.includes('genres-ranked'))return [{name:'Fantasy',bookCount:30,readCount:0}];
 if(p.endsWith('/genres'))return ['Fantasy'];
 const chapterContent=p.match(/^\/books\/(b\d\d)\/chapters\/(c0[12])\/content$/);
 if(chapterContent){
  const [,bookId,chapterId]=chapterContent,book=books.find(candidate=>candidate.id===bookId),chapter=book?.chapters.find(candidate=>candidate.id===chapterId);
  if(!book||!chapter)return fixtureResult(404,{message:'Story or chapter not found.'});
  const authenticated=headers.authorization==='Bearer LOCAL_FIXTURE_ONLY';
  if(!authenticated&&chapterId==='c02')return fixtureResult(401,{errorCode:'AUTH_REQUIRED',message:'Sign in to read this chapter.'});
  return {bookId,bookTitle:book.title,chapterId,chapterTitle:chapter.title,chapterIndex:chapterId==='c01'?0:1,access:authenticated?'FULL':'PREVIEW',content:authenticated?(chapterId==='c01'?firstFull:secondFull):firstPreview,previewWordCount:authenticated?(chapterId==='c01'?18:9):14,fullWordCount:chapterId==='c01'?18:9};
 }
 if(/^\/books\/b\d\d$/.test(p))return books.find(b=>b.id===p.split('/')[2])||null;
 if(p.includes('search'))return {books:[],authors:[],totalBooks:0,totalAuthors:0};
 return [];
}
const api=http.createServer((req,res)=>{const value=fixture(req.url,req.headers),result=value?.__fixtureResult?value:{status:value===null?404:200,body:value};res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));});
await new Promise(r=>api.listen(0,'127.0.0.1',r));
// Deliberate trailing slash exercises runtime normalization.
process.env.SEO_API_BASE_URL=`http://127.0.0.1:${api.address().port}/api/`;
const {default:handler}=await import('../.vercel/output/functions/render.func/handler.mjs');
const root=resolve('.vercel/output/static');
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{try {const path=resolve(root,'.'+new URL(req.url,origin).pathname);const file=path.startsWith(root)?await stat(path).catch(()=>null):null;if(file?.isFile()){res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(await readFile(path));}else await handler(req,res);}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({...(process.env.SEO_BROWSER_EXECUTABLE ? { executablePath: process.env.SEO_BROWSER_EXECUTABLE } : {}),headless:true});
const errors=[];
const setup=async(options={})=>{const ctx=await browser.newContext(options);await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.pathname.startsWith('/api/')){const value=fixture(req.url(),req.headers()),result=value?.__fixtureResult?value:{status:value===null?404:200,body:value};return route.fulfill({status:result.status,contentType:'application/json',body:JSON.stringify(result.body)});}if(u.origin===origin)return route.continue();return route.abort();}); const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return {ctx,page};};
const meta=async page=>({title:await page.title(),canonical:await page.locator('link[rel=canonical]').getAttribute('href'),robots:await page.locator('meta[name=robots]').getAttribute('content')});
try{
 const {ctx:nojs,page:n}=await setup({javaScriptEnabled:false,viewport:{width:390,height:844}});
 for(const path of ['/','/writing-tools','/read-online','/world-building-tools','/publish-stories','/wattpad-alternatives','/webnovel-alternatives','/royal-road-alternatives','/online-fiction-platform','/read-original-fiction-online','/book/b01','/book/b01/chapter/c01','/book/b01/chapter/c02','/author/writer?page=2','/genre/Fantasy?page=2']){
  const response=await n.goto(origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);assert.ok(await n.locator('h1').count(),path);assert.equal(await n.locator('link[rel=canonical]').count(),1);const m=await meta(n);assert.match(m.robots,/^index/);assert.equal(await n.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'mobile overflow '+path);
 }
 await n.goto(origin+'/writing-tools');await n.screenshot({path:'scratch/seo/writing-tools-mobile-nojs.png',fullPage:true});
 await n.goto(origin+'/wattpad-alternatives');await n.getByRole('heading',{name:'Looking for a Wattpad alternative? Start with what you need.'}).waitFor();await n.screenshot({path:'scratch/seo/wattpad-alternatives-mobile-nojs.png',fullPage:true});
 await n.goto(origin+'/book/b01/chapter/c01');await n.getByRole('heading',{name:'Sign in to keep reading'}).waitFor();assert.equal(await n.getByText('At sunrise, the hidden city finally answered.',{exact:true}).count(),0);await n.screenshot({path:'scratch/seo/reader-preview-mobile-nojs.png',fullPage:true});
 await n.goto(origin+'/book/b01/chapter/c02');await n.getByRole('heading',{name:'Sign in to read this chapter'}).waitFor();assert.equal(await n.getByText('Beyond the bridge, a door appeared in the mist.',{exact:true}).count(),0);await n.screenshot({path:'scratch/seo/reader-locked-mobile-nojs.png',fullPage:true});
 await nojs.close();
 console.log('PASS: 15 HTML-first public routes, both reader gates, manuscript privacy, metadata, and mobile widths with JavaScript disabled.');
 const {ctx,page}=await setup({viewport:{width:1440,height:1000}});
 await page.goto(origin+'/writing-tools');await page.getByRole('heading',{name:'A writing studio for the story you want to tell.'}).waitFor();
 await page.locator('a[href="/category"]').first().click();await page.waitForURL('**/category');await page.getByRole('heading',{name:'All Books',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));
 await page.locator('a[href="/book/b01"]').first().click();await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.getByText('Preview',{exact:true}).waitFor();await page.getByText('Sign in to read',{exact:true}).waitFor();
 await page.locator('a[href="/book/b01/chapter/c01"]').first().click();await page.waitForURL('**/book/b01/chapter/c01');await page.getByText('The first lantern glowed beside the old stone bridge.',{exact:true}).waitFor();await page.getByRole('heading',{name:'Sign in to keep reading'}).waitFor();assert.equal(await page.getByText('At sunrise, the hidden city finally answered.',{exact:true}).count(),0);assert.match((await meta(page)).canonical,/\/book\/b01\/chapter\/c01$/);
 await page.goBack();await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.goto(origin+'/author/writer?page=2');await page.getByRole('heading',{name:'The Lantern Road 25',exact:true}).waitFor();assert.match((await meta(page)).canonical,/\?page=2$/);assert.equal(await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).count(),0);
 await page.getByRole('link',{name:'Previous page',exact:true}).click();await page.waitForURL('**/author/writer');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();assert.equal((await meta(page)).canonical,'https://www.wordweftstudio.com/author/writer');
 await page.goto(origin+'/#/book/b01');await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.goto(origin+'/genre/Fantasy?page=2');await page.getByRole('heading',{name:'The Lantern Road 25',exact:true}).waitFor();assert.match((await meta(page)).canonical,/\?page=2$/);
 await page.goto(origin+'/home');await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).first().waitFor();
 await page.goto(origin+'/writing-tools');await page.getByRole('heading',{name:'A writing studio for the story you want to tell.'}).waitFor();await page.screenshot({path:'scratch/seo/writing-tools-desktop.png',fullPage:true});
 await page.goto(origin+'/wattpad-alternatives');await page.getByRole('heading',{name:'Looking for a Wattpad alternative? Start with what you need.'}).waitFor();await page.screenshot({path:'scratch/seo/wattpad-alternatives-desktop.png',fullPage:true});
 await page.goto(origin+'/writing-tools');await page.getByRole('heading',{name:'A writing studio for the story you want to tell.'}).waitFor();
 await page.getByRole('link',{name:'Open the writing studio',exact:true}).click();await page.waitForURL('**/auth');assert.match((await meta(page)).robots,/noindex/);await page.getByRole('button',{name:/sign in/i}).first().waitFor();
 await page.evaluate(()=>localStorage.setItem('ww_welcomeJourneyCompleted','true'));
 await page.getByLabel('Email Address',{exact:true}).fill('fixture@example.test');
 await page.locator('input[type=password]').fill('Fixture-only-123!');
 await page.locator('button[type=submit]').click();await page.waitForURL('**/write');
 await page.locator('h1').filter({hasText:'Your stories, in motion.'}).waitFor();
 await page.goto(origin+'/auth');await page.getByRole('button',{name:'Close sign in',exact:true}).click();await page.waitForURL(origin+'/');await page.locator('a[href="/writing-tools"]').first().click();await page.waitForURL('**/writing-tools');await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));

 console.log('PASS: client navigation, legacy hash migration, author/catalog pagination, chapter links/back, discovery-to-login, and metadata.');
 await ctx.close();
 const {ctx:readerCtx,page:reader}=await setup({viewport:{width:390,height:844}});
 await reader.goto(origin+'/book/b01/chapter/c02');await reader.getByRole('heading',{name:'Sign in to read this chapter'}).waitFor();assert.equal(await reader.getByText('Beyond the bridge, a door appeared in the mist.',{exact:true}).count(),0);await reader.screenshot({path:'scratch/seo/reader-locked-mobile.png',fullPage:true});
 await reader.getByRole('button',{name:'Sign in',exact:true}).click();await reader.waitForURL('**/auth');
 await reader.getByLabel('Email Address',{exact:true}).fill('fixture@example.test');await reader.locator('input[type=password]').fill('Fixture-only-123!');await reader.locator('button[type=submit]').click();
 await reader.waitForURL('**/book/b01/chapter/c02');await reader.getByText('Beyond the bridge, a door appeared in the mist.',{exact:true}).waitFor();await reader.getByText("You're signed in — keep reading",{exact:true}).waitFor();
 await reader.screenshot({path:'scratch/seo/reader-resume-mobile.png',fullPage:true});
 await reader.evaluate(()=>localStorage.setItem('wordweft_jwt','EXPIRED_FIXTURE_TOKEN'));
 await reader.evaluate(()=>{history.pushState(null,'','/book/b01/chapter/c01');window.dispatchEvent(new Event('wordweft:navigate'));});
 await reader.waitForURL('**/book/b01/chapter/c01');await reader.getByRole('heading',{name:'Sign in to keep reading'}).waitFor();
 await reader.getByRole('button',{name:'Next chapter'}).click();await reader.waitForURL('**/book/b01/chapter/c02');
 await reader.getByRole('heading',{name:'Sign in to read this chapter'}).waitFor();
 assert.equal(await reader.evaluate(()=>localStorage.getItem('wordweft_jwt')),null);
 await reader.screenshot({path:'scratch/seo/reader-expired-session-mobile.png',fullPage:true});await readerCtx.close();
 console.log('PASS: locked chapter sign-in resumes full content, and a later rejected token clears the stale account before gating.');
 const {ctx:previewResumeCtx,page:previewResume}=await setup({viewport:{width:390,height:844}});
 await previewResume.goto(origin+'/book/b01/chapter/c01');await previewResume.getByText('The first lantern glowed beside the old stone bridge.',{exact:true}).waitFor();await previewResume.getByRole('heading',{name:'Sign in to keep reading'}).waitFor();
 assert.equal(await previewResume.getByText('At sunrise, the hidden city finally answered.',{exact:true}).count(),0);
 await previewResume.getByRole('button',{name:'Sign in',exact:true}).click();await previewResume.waitForURL('**/auth');
 await previewResume.getByLabel('Email Address',{exact:true}).fill('fixture@example.test');await previewResume.locator('input[type=password]').fill('Fixture-only-123!');await previewResume.locator('button[type=submit]').click();
 await previewResume.waitForURL('**/book/b01/chapter/c01');await previewResume.getByText('At sunrise, the hidden city finally answered.',{exact:true}).waitFor();await previewResume.getByText("You're signed in — keep reading",{exact:true}).waitFor();
 assert.equal(await previewResume.getByRole('heading',{name:'Sign in to keep reading'}).count(),0);
 await previewResume.screenshot({path:'scratch/seo/reader-preview-resume-mobile.png',fullPage:true});await previewResumeCtx.close();
 console.log('PASS: first-chapter guest preview signs in and resumes the same URL with full content, without a repeated gate.');
 const {ctx:newUser,page:firstVisit}=await setup();
 await firstVisit.goto(origin+'/write/book/create');await firstVisit.waitForURL('**/auth');
 await firstVisit.getByLabel('Email Address',{exact:true}).fill('fixture@example.test');await firstVisit.locator('input[type=password]').fill('Fixture-only-123!');await firstVisit.locator('button[type=submit]').click();
 await firstVisit.getByRole('button',{name:'Skip',exact:true}).click();await firstVisit.waitForURL('**/write/book/create');await firstVisit.locator('h1').waitFor();assert.match((await meta(firstVisit)).robots,/noindex/);
 await newUser.close();console.log('PASS: new-user onboarding preserves the requested writing destination.');
 process.env.SEO_NOINDEX='true';
 const {ctx:preview,page:p}=await setup();await p.goto(origin+'/writing-tools');await p.locator('a[href="/category"]').first().click();await p.waitForURL('**/category');await p.getByRole('heading',{name:'All Books',exact:true}).waitFor();assert.match((await meta(p)).robots,/noindex/);await preview.close();delete process.env.SEO_NOINDEX;
 console.log('PASS: deployment noindex survives client navigation.');
 const invalid=await fetch(origin+'/not-a-real-page');assert.equal(invalid.status,404);
 const restricted=await fetch(origin+'/book/draft');assert.equal(restricted.status,404);
 const sitemap=await fetch(origin+'/sitemap.xml');assert.equal(sitemap.status,200);assert.match(await sitemap.text(),/sitemapindex/);
 const html=await (await fetch(origin+'/reset-password?token=PRIVATE_TEST')).text();assert.match(html,/noindex/);assert.doesNotMatch(html,/PRIVATE_TEST/);
 const smoke = spawn(process.execPath, ['scripts/verify-seo.mjs', origin], { stdio: 'inherit' });
 assert.equal(await new Promise((resolve, reject) => { smoke.once('error', reject); smoke.once('exit', resolve); }), 0, 'deployment smoke script');
 assert.deepEqual(errors,[]);console.log('PASS: HTTP statuses, sitemap runtime API URL normalization, token safety, and no browser JavaScript errors.');
}catch(error){console.error('Browser errors:',errors);console.error(error);process.exitCode=1;}finally{await browser.close();server.close();api.close();}
