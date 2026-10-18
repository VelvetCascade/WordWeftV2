import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try {for(const [width,height] of [[390,844],[740,360],[1440,900]]) {
 const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(8000);
 await page.route('**/audit-schedule',route=>route.fulfill({contentType:'text/html',body:`<html><head><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module">import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import {ScheduleChapterDialog} from '/components/ScheduleChapterDialog.tsx';import '/index.css';function App(){const[open,setOpen]=React.useState(false);return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setOpen(true)},'Open schedule'),React.createElement(ScheduleChapterDialog,{isOpen:open,chapterTitle:'Synthetic chapter',onClose:()=>setOpen(false),onConfirm:()=>new Promise(resolve=>{window.finishSchedule=resolve})}))}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));</script></body></html>`}));
 await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:3022')+'/audit-schedule');
 await page.getByRole('button',{name:'Open schedule',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 const bounds=await page.locator('.ww-schedule-backdrop').evaluate(e=>e.getBoundingClientRect().toJSON());
 if(process.env.AUDIT_EVIDENCE){mkdirSync(process.env.AUDIT_EVIDENCE,{recursive:true});await page.screenshot({path:`${process.env.AUDIT_EVIDENCE}/${width}-schedule.png`});}
 assert.equal(bounds.bottom,height,'scheduling backdrop covers bottom');
 const dialog=page.getByRole('dialog');
 assert.ok(await dialog.evaluate(e=>e.getBoundingClientRect().height)<=height-32,'panel retains viewport cap');
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{value:200,configurable:true});window.visualViewport.dispatchEvent(new Event('resize'));});
 assert.ok(await dialog.evaluate(e=>e.getBoundingClientRect().height)<=168,'keyboard viewport cap applies to panel');
 assert.equal(await page.locator('.ww-schedule-backdrop').evaluate(e=>e.getBoundingClientRect().bottom),height,'keyboard cap never shrinks backdrop');
 await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));});
 const controls=dialog.locator('button:not([disabled]),input:not([disabled])');
 await controls.last().focus();await page.keyboard.press('Tab');assert.ok(await controls.first().evaluate(e=>e===document.activeElement),'Tab wraps');
 await page.getByRole('button',{name:'Schedule chapter',exact:true}).click();
 await page.getByRole('button',{name:'Scheduling…',exact:true}).waitFor();
 await page.keyboard.press('Escape');await page.mouse.click(1,height-1);
 assert.ok(await dialog.isVisible(),'pending scheduling cannot dismiss');
 await page.evaluate(()=>window.finishSchedule());
 await dialog.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Open schedule',exact:true}).click();
 await page.keyboard.press('Escape');
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.close();
}}finally{await browser.close();}
