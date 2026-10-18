import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3022';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(20000);
 const login=await page.request.post(base+'/api/auth/login',{data:{email:process.env.E2E_WRITER_EMAIL||'writer@example.test',password:process.env.E2E_PASSWORD||'WordWeftLocal123!'}});assert.equal(login.status(),200);const {token}=await login.json();
 const headers={Authorization:`Bearer ${token}`};const userResponse=await page.request.get(base+'/api/users/me',{headers});assert.equal(userResponse.status(),200);const user=await userResponse.json();
 const chapterApi=base+'/api/books/local-story-spring/chapters/local-story-spring-chapter-1';
 const sessionResponse=await page.request.get(chapterApi+'/edit-session',{headers});assert.equal(sessionResponse.status(),200);const draft=await sessionResponse.json();
 let saves=0,publishes=0;
 // Simulate save/release responses so the real editor success/share UI can be checked without publishing or modifying the shared fixture.
 await page.route(chapterApi,route=>{assert.equal(route.request().method(),'PATCH');saves++;return route.fulfill({json:user,headers:{'X-Chapter-Revision':String(draft.editRevision||1)}})});
 await page.route(chapterApi+'/publication-impact?*',route=>route.fulfill({json:{reviewToken:'synthetic-share-proof',storyBecomesPublic:false,resultingAgeRating:'GENERAL',chapters:[{id:draft.id,number:1,title:draft.title,status:'published',contentWarnings:[],wordCount:427,complete:true,changeType:'UPDATE'}]}}));
 await page.route(chapterApi+'/comparison?*',route=>route.fulfill({json:{baseline:draft,draft,live:true,editRevision:draft.editRevision||1}}));
 await page.route(chapterApi+'/publish-reviewed',route=>{assert.equal(route.request().method(),'POST');publishes++;return route.fulfill({json:user})});
 await page.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
 await page.goto(base+'/write/book/local-story-spring/chapter/local-story-spring-chapter-1/edit');
 await page.getByRole('button',{name:'Publish updates',exact:true}).click();
 await page.getByRole('checkbox',{name:'I approve every chapter, visibility change, rating and schedule change listed above.',exact:true}).check();
 await page.getByRole('checkbox',{name:'Artwork in this story is mine or used with permission.',exact:true}).check();
 await page.getByRole('button',{name:'Publish this release',exact:true}).click();
 await page.getByRole('button',{name:'Share this Chapter',exact:true}).click();
 assert.equal(await page.getByLabel('Story link',{exact:true}).inputValue(),base+'/book/local-story-spring/chapter/local-story-spring-chapter-1');assert.equal(saves,1);assert.equal(publishes,1);
 if(process.env.AUDIT_EVIDENCE){mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true});await page.screenshot({path:process.env.AUDIT_EVIDENCE+'/1440-editor-share.png'})}
 console.log('Editor publication success → Share this Chapter retains chapter ID; save/release responses simulated, no fixture mutation.');
}finally{await browser.close()}
