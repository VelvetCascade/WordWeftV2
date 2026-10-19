import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : existsSync('/usr/bin/chromium') ? {executablePath:'/usr/bin/chromium'}:{}), args:['--no-sandbox'] });
const phase=process.env.AUDIT_PHASE||'after', dir=process.env.AUDIT_EVIDENCE_DIR, records=[];
mkdirSync(dir,{recursive:true});
for (const [width,height] of [[390,844],[740,360],[1440,1000]]) {
const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
await page.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');localStorage.setItem('ww_reader_coach_session','0');});
await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;if(/\.[cm]?[jt]sx?$/.test(path))return route.continue();if(path==='/api/books/coach-story')return route.fulfill({json:{id:'coach-story',title:'Quiet reading',genres:['Fantasy'],tags:[],author:{id:'writer',name:'Fixture Writer',avatarUrl:'/favicon.svg'},coverUrl:'/favicon.svg',chapters:[{id:'chapter',title:'An ordinary chapter',status:'published',wordCount:500}],readingStatus:'Ongoing'}});if(path.endsWith('/content'))return route.fulfill({json:{bookId:'coach-story',chapterId:'chapter',chapterIndex:0,content:'<p>A quiet chapter for reading preferences and passage tools.</p>'.repeat(20),access:'FULL',obfuscated:false,fullWordCount:500,visibleWordCount:500}});return route.fulfill({json:[]});});
await page.route(/^https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//,r=>r.fulfill({body:'',contentType:'application/javascript'}));
await page.goto(`${process.env.E2E_BASE_URL}/book/coach-story/chapter/chapter`);await page.locator('.reader-copy').waitFor();
await page.getByRole('button',{name:'Reading appearance and themes',exact:true}).click();await page.waitForTimeout(4000);
await page.screenshot({path:`${dir}/${phase}-preferences-${width}.png`});records.push({width,surface:'preferences',count:await page.locator('.reader-coach-nudge').count()});
await page.keyboard.press('Escape');if(phase==='after')await page.getByRole('button',{name:'Dismiss tip',exact:true}).waitFor();
await page.keyboard.press('f');await page.waitForTimeout(200);
const control=page.getByRole('button',{name:'Dismiss tip',includeHidden:true});if(await control.count())await control.first().focus();
records.push({width,surface:'focus',count:await control.count(),focus:await page.evaluate(()=>({label:document.activeElement?.getAttribute('aria-label'),tipOpacity:document.querySelector('.reader-coach-nudge')?getComputedStyle(document.querySelector('.reader-coach-nudge')).opacity:null}))});
await page.screenshot({path:`${dir}/${phase}-focus-${width}.png`});await page.close();
}writeFileSync(`${dir}/${phase}-measurements.json`,JSON.stringify(records,null,2));await browser.close();
