import { test } from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

// Exercise the real rendered component and API client across a delayed network boundary.
const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ReaderPassageTools} from './components/ReaderPassageTools'; import './styles/reader-v2.css'; const root=createRoot(document.getElementById('root')); window.renderTools=(overrides={})=>root.render(React.createElement(ReaderPassageTools,{open:true,onClose:()=>{},bookId:'hydration-book',chapterId:'chapter',chapters:[],userId:'reader',paragraphIndex:0,onNavigate:()=>{},onFind:()=>{},getParagraphs:()=>['Synthetic passage'],onSignIn:()=>{},...overrides})); window.renderTools();`, resolveDir: process.cwd(), loader:'tsx' }, bundle:true, write:false, outdir:'out', define:{'import.meta.env.VITE_API_BASE_URL':'"/api"'} });
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text;
const css=bundle.outputFiles.find(file=>file.path.endsWith('.css')).text;
const saved={id:'saved',bookId:'hydration-book',chapterId:'chapter',paragraphIndex:0,note:'Existing private writing',quote:'Synthetic passage'};
for (const width of [1440,390]) test(`private note hydration protects saved writing at ${width}px`, async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(5000);
 let release,fail=false,stored={...saved},writes=0;
 await page.route('http://wordweft.test/**',async route=>{
  const request=route.request();
  if(!request.url().includes('/api/')) return route.fulfill({contentType:'text/html',body:`<style>${css}</style><div id="root"></div><script>${js}</script>`});
  if(request.method()==='PUT'){writes++;stored={...stored,...request.postDataJSON()};return route.fulfill({json:stored});}
  await new Promise(resolve=>{release=resolve});
  return route.fulfill(fail?{status:503,json:{message:'Unavailable'}}:{json:[stored]});
 });
 await page.goto('http://wordweft.test');
 const save=page.getByRole('button',{name:'Save passage online',exact:true});
 await page.getByText('Loading your private passages…').waitFor();
 assert.equal(await save.isDisabled(),true,'saving must wait until existing notes are known');
 await page.locator('textarea').fill('Typed while loading'); release();
 await page.getByRole('button',{name:'Update saved passage',exact:true}).waitFor();
 assert.equal(await page.locator('textarea').inputValue(),'Typed while loading');
 await page.getByRole('button',{name:'Update saved passage',exact:true}).click();
 await page.getByText('Saved online · Only you can see this passage and note.').waitFor();
 assert.equal(stored.note,'Typed while loading');assert.equal(writes,1);
 await page.locator('textarea').fill('');await page.getByRole('button',{name:'Update saved passage',exact:true}).click();
 await page.getByText('Saved online · Only you can see this passage and note.').waitFor();assert.equal(stored.note,'');
 await page.evaluate(()=>window.renderTools({open:false}));await page.getByRole('dialog').waitFor({state:'hidden'});
 fail=true;await page.evaluate(()=>window.renderTools());await page.getByText('Loading your private passages…').waitFor();
 await page.locator('textarea').fill('Retry draft');release();await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('button',{name:'Update saved passage',exact:true}).isDisabled(),true);
 fail=false;await page.getByRole('button',{name:'Reload saved passages'}).click();await page.getByText('Loading your private passages…').waitFor();release();
 await page.getByText('Loading your private passages…').waitFor({state:'hidden'});assert.equal(await page.locator('textarea').inputValue(),'Retry draft');
 await page.evaluate(()=>window.renderTools({userId:'another-reader'}));await page.getByText('Loading your private passages…').waitFor();
 assert.equal(await page.getByRole('button',{name:'Save passage online',exact:true}).isDisabled(),true);release();
 await page.getByRole('button',{name:'Update saved passage',exact:true}).waitFor();assert.equal(await page.locator('textarea').inputValue(),'');
 if(process.env.AUDIT_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.AUDIT_SCREENSHOT_DIR}/hydration-${width}.png`});
 }finally{await browser.close();}
});
