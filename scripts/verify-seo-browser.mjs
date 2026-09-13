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
const author={id:'writer', name:'Mira Rowan', username:'Mira Rowan', bio:'Stories about unexpected journeys and found family.', avatarUrl:origin+'/og-banner.jpg', followersCount:0, followingCount:0, joinDate:'2025-01-01', favoriteGenres:['Fantasy'], socials:{}};
const books=Array.from({length:30},(_,i)=>({id:'b'+String(i+1).padStart(2,'0'),title:'The Lantern Road '+String(i+1).padStart(2,'0'),author,authorId:author.id, summary:'A mapmaker follows a trail of lanterns into a forgotten city.',description:'<p>A mapmaker follows a trail of lanterns into a forgotten city.</p>',genres:['Fantasy'],tags:['found family'],category:'Fiction',publicationStatus:'published',ageRating:'ALL_AGES',isMature:false,readingStatus:'Ongoing',coverUrl:origin+'/og-banner.jpg',rating:0,reviewsCount:0,commentCount:0,isLiked:false,likesCount:0,viewCount:0,readCount:0,likes:[],publishedDate:'2026-09-01',contentWarnings:[],chapters:[{id:'c01',title:'The First Lantern',status:'published',content:'<p>The first lantern glowed beside the old stone bridge.</p><p>Mira opened her map and stepped into the mist.</p>',wordCount:24,likesCount:0,commentCount:0,isLiked:false,viewCount:0,likes:[]},{id:'c02',title:'A Door in the Mist',status:'published',content:'<p>Beyond the bridge, a door appeared in the mist.</p>',wordCount:11,likesCount:0,commentCount:0,isLiked:false,viewCount:0,likes:[]}]}));
function fixture(url){
 const u=new URL(url,origin),p=u.pathname.replace(/^\/api/,'');
 if(p.startsWith('/public/seo/')){
  const q=p.slice('/public/seo'.length),page=Number(u.searchParams.get('page')||1),slice=books.slice((page-1)*24,page*24);
  if(q==='/sitemap')return {books:30,chapters:60,authors:1,genres:1,tags:1};
  if(q.startsWith('/sitemap/')){const kind=q.split('/')[2]; return kind==='books'?books.map(b=>({path:'/book/'+b.id,lastmod:'2026-09-01'})):kind==='chapters'?books.flatMap(b=>b.chapters.map(c=>({path:`/book/${b.id}/chapter/${c.id}`}))):kind==='authors'?[{path:'/author/writer'}]:kind==='genres'?[{path:'/genre/Fantasy'}]:[{path:'/tag/found%20family'}];}
  if(q.startsWith('/book/'))return books.find(b=>b.id===q.split('/')[2])||null;
  if(q.startsWith('/author/'))return q==='/author/writer'?{author,books:slice,hasMore:page===1}:null;
  if(q==='/catalog')return {books:slice,hasMore:page===1};
 }
 if(p==='/auth/login')return {token:'LOCAL_FIXTURE_ONLY'};
 if(p==='/users/me')return {...author,email:'fixture@example.test',hasSeenWritingDemo:true,writtenBooks:[],library:[]};
 if(p==='/books') {const page=Number(u.searchParams.get('page')||0),size=Number(u.searchParams.get('size')||12);return {content:books.slice(page*size,(page+1)*size),hasMore:(page+1)*size<30,totalElements:30,page};}
 if(p==='/books/author/writer')return books;
 if(p==='/users/writer/profile')return author;
 if(p==='/books/home-genres')return {Fantasy:books.slice(0,6)};
 if(p.includes('genres/ranked')||p.includes('genres-ranked'))return [{name:'Fantasy',bookCount:30,readCount:0}];
 if(p.endsWith('/genres'))return ['Fantasy'];
 if(/^\/books\/b\d\d$/.test(p))return books.find(b=>b.id===p.split('/')[2])||null;
 if(p.includes('search'))return {books:[],authors:[],totalBooks:0,totalAuthors:0};
 return [];
}
const api=http.createServer((req,res)=>{const value=fixture(req.url);res.writeHead(value===null?404:200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));});
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
const setup=async(options={})=>{const ctx=await browser.newContext(options);await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.pathname.startsWith('/api/')){const value=fixture(req.url());return route.fulfill({status:value===null?404:200,contentType:'application/json',body:JSON.stringify(value)});}if(u.origin===origin)return route.continue();return route.abort();}); const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return {ctx,page};};
const meta=async page=>({title:await page.title(),canonical:await page.locator('link[rel=canonical]').getAttribute('href'),robots:await page.locator('meta[name=robots]').getAttribute('content')});
try{
 const {ctx:nojs,page:n}=await setup({javaScriptEnabled:false,viewport:{width:390,height:844}});
 for(const path of ['/','/writing-tools','/read-online','/world-building-tools','/publish-stories','/book/b01','/book/b01/chapter/c01','/author/writer?page=2','/genre/Fantasy?page=2']){
  const response=await n.goto(origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);assert.ok(await n.locator('h1').count(),path);assert.equal(await n.locator('link[rel=canonical]').count(),1);const m=await meta(n);assert.match(m.robots,/^index/);assert.equal(await n.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'mobile overflow '+path);
 }
 await n.goto(origin+'/writing-tools');await n.screenshot({path:'scratch/seo/writing-tools-mobile-nojs.png',fullPage:true});
 await nojs.close();
 console.log('PASS: 9 HTML-first public routes, metadata, and mobile widths with JavaScript disabled.');
 const {ctx,page}=await setup({viewport:{width:1440,height:1000}});
 await page.goto(origin+'/writing-tools');await page.getByRole('heading',{name:'A writing studio for the story you want to tell.'}).waitFor();
 await page.locator('a[href="/category"]').first().click();await page.waitForURL('**/category');await page.getByRole('heading',{name:'All Books',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));
 await page.locator('a[href="/book/b01"]').first().click();await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.locator('a[href="/book/b01/chapter/c01"]').first().click();await page.waitForURL('**/book/b01/chapter/c01');await page.getByText('The first lantern glowed beside the old stone bridge.',{exact:true}).waitFor();assert.match((await meta(page)).canonical,/\/book\/b01\/chapter\/c01$/);
 await page.goBack();await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.goto(origin+'/author/writer?page=2');await page.getByRole('heading',{name:'The Lantern Road 25',exact:true}).waitFor();assert.match((await meta(page)).canonical,/\?page=2$/);assert.equal(await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).count(),0);
 await page.getByRole('link',{name:'Previous page',exact:true}).click();await page.waitForURL('**/author/writer');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();assert.equal((await meta(page)).canonical,'https://wordweftstudio.com/author/writer');
 await page.goto(origin+'/#/book/b01');await page.waitForURL('**/book/b01');await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).last().waitFor();
 await page.goto(origin+'/genre/Fantasy?page=2');await page.getByRole('heading',{name:'The Lantern Road 25',exact:true}).waitFor();assert.match((await meta(page)).canonical,/\?page=2$/);
 await page.goto(origin+'/home');await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));await page.getByRole('heading',{name:'The Lantern Road 01',exact:true}).first().waitFor();
 await page.goto(origin+'/writing-tools');await page.getByRole('heading',{name:'A writing studio for the story you want to tell.'}).waitFor();await page.screenshot({path:'scratch/seo/writing-tools-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'Open the writing studio',exact:true}).click();await page.waitForURL('**/auth');assert.match((await meta(page)).robots,/noindex/);await page.getByRole('button',{name:/sign in/i}).first().waitFor();
 await page.evaluate(()=>localStorage.setItem('ww_welcomeJourneyCompleted','true'));
 await page.getByLabel('Email Address',{exact:true}).fill('fixture@example.test');
 await page.locator('input[type=password]').fill('Fixture-only-123!');
 await page.locator('button[type=submit]').click();await page.waitForURL('**/write');
 await page.locator('h1').filter({hasText:'Your stories, in motion.'}).waitFor();
 await page.goto(origin+'/auth');await page.getByRole('button',{name:'Close sign in',exact:true}).click();await page.waitForURL(origin+'/');await page.locator('a[href="/writing-tools"]').first().click();await page.waitForURL('**/writing-tools');await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index'));

 console.log('PASS: client navigation, legacy hash migration, author/catalog pagination, chapter links/back, discovery-to-login, and metadata.');
 await ctx.close();
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
