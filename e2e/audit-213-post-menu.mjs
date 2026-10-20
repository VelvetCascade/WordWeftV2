import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:3033';
if(!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname))throw Error('Use disposable local fixtures');
const output=process.env.AUDIT_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const baseline=process.env.AUDIT_BASELINE==='1';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const circle={id:'audit-circle',slug:'general',name:'The reading room',description:'A place for conversations about stories.',rules:[],accent:'teal',allowedPostTypes:['UPDATE'],memberCount:12,official:false,joined:false};
const post={id:'audit-menu',author:{id:'audit-author',name:'Alex Reader',avatarUrl:null,badges:[],following:false},circle,type:'UPDATE',title:'A quiet moment between chapters',body:'What story stayed with you after the final page?',attachment:null,contentWarnings:[],pollOptions:[],likeCount:2,commentCount:0,voteCount:0,pinned:false,locked:false,liked:false,saved:false,votedOptionId:null,canEdit:false,canModerate:false,status:'ACTIVE',createdAt:'2026-10-18T12:00:00Z',updatedAt:'2026-10-18T12:00:00Z'};
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390});
 await context.addInitScript(()=>{localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');localStorage.setItem('theme','light');});
 await context.route('**/api/community/circles',r=>r.fulfill({json:[circle]}));
 await context.route('**/api/community/feed?*',r=>r.fulfill({json:{items:[post],nextCursor:null}}));
 const page=await context.newPage();await page.goto(baseURL+'/community');
 const card=page.locator('.community-post').filter({hasText:post.title});const trigger=card.getByRole('button',{name:'Post actions',exact:true});const menu=card.locator('.community-menu');
 await trigger.click();await menu.getByRole('button',{name:'Report post',exact:true}).focus();await page.keyboard.press('Escape');
 if(output)await page.screenshot({path:path.join(output,`${width}-escape.png`)});
 const afterEscape=await menu.isVisible();
 if(!baseline){await expect(menu).toHaveCount(0);await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');}
 if(afterEscape)await trigger.click();
 await trigger.click();
 // A real adjacent control must still receive this click/tap.
 const neighbor=card.getByRole('button',{name:'Share discussion',exact:true});
 await page.evaluate(()=>{window.__shareClicks=0;document.querySelector('[aria-label="Share discussion"]').addEventListener('click',()=>window.__shareClicks++);});
 if(width===390)await neighbor.tap();else await neighbor.click();
 if(output)await page.screenshot({path:path.join(output,`${width}-outside.png`)});
 const afterOutside=await menu.isVisible();const adjacentClicks=await page.evaluate(()=>window.__shareClicks);
 expect(adjacentClicks).toBe(1);
 if(!baseline){
  await expect(menu).toHaveCount(0);await expect(trigger).toHaveAttribute('aria-expanded','false');
  await trigger.click();await page.keyboard.press('Tab');await expect(menu.getByRole('button',{name:'Report post',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(menu.getByRole('link',{name:'Open discussion',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(menu).toHaveCount(0);await expect(trigger).not.toBeFocused();
  await trigger.click();await page.keyboard.press('Shift+Tab');await expect(menu).toHaveCount(0);await expect(trigger).not.toBeFocused();
  await trigger.click();await menu.getByRole('button',{name:'Report post',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Sign in to join circles');await page.getByRole('button',{name:'Keep exploring',exact:true}).click();
  await trigger.click();await expect(menu.getByRole('link',{name:'Open discussion',exact:true})).toHaveAttribute('href','#/community/post/audit-menu');
  await menu.getByRole('link',{name:'Open discussion',exact:true}).click();await expect(page).toHaveURL(/\/community\/post\/audit-menu$/);
 }
 const measurements={width,afterEscape,afterOutside,adjacentClicks,keyboard:baseline?'baseline only':'Escape returns focus; Tab and Shift+Tab dismiss without trapping focus; report retains sign-in guard; discussion link navigates'};
 console.log(JSON.stringify(measurements));if(output)fs.writeFileSync(path.join(output,`${width}-measurements.json`),JSON.stringify(measurements,null,2));
 await context.close();
}
if(!baseline){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 let created;
 try{
  const login=await context.request.post(baseURL+'/api/auth/login',{data:{email:'admin@example.test',password:'WordWeftLocal123!'}});expect(login.ok()).toBeTruthy();const {token}=await login.json();
  const headers={Authorization:`Bearer ${token}`};
  const circlesResponse=await context.request.get(baseURL+'/api/community/circles',{headers});expect(circlesResponse.ok()).toBeTruthy();const circles=await circlesResponse.json();
  const creation=await context.request.post(baseURL+'/api/community/posts',{headers,data:{circleId:circles.find(c=>c.allowedPostTypes.includes('UPDATE')).id,type:'UPDATE',title:'Audit menu actions',body:'Synthetic local discussion for menu action verification.'}});expect(creation.ok()).toBeTruthy();created=await creation.json();
  expect(created.canEdit).toBe(true);expect(created.canModerate).toBe(true);
  await context.addInitScript(token=>{localStorage.setItem('wordweft_jwt',token);localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true');},token);
  await context.route('**/api/community/feed?*',r=>r.fulfill({json:{items:[created],nextCursor:null}}));
  const page=await context.newPage();const writes=[];page.on('request',r=>{if(r.url().includes('/api/community/posts/')&&r.method()!=='GET')writes.push(r.method());});
  await page.goto(baseURL+'/community');const card=page.locator('.community-post').filter({hasText:created.title});const trigger=card.getByRole('button',{name:'Post actions',exact:true});
  for(const [action,heading] of [['Edit post','Edit your post'],['Delete post','Delete this post?'],['Pin in circle','Pin post?'],['Lock discussion','Lock post?'],['Remove post','Remove post?']]){
   await trigger.click();await expect(card.getByRole('button',{name:'Report post',exact:true})).toHaveCount(0);
   await card.getByRole('button',{name:action,exact:true}).click();await expect(card.locator('.community-menu')).toHaveCount(0);
   const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
   if(action==='Edit post')await expect(dialog.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();else await expect(dialog.getByRole('heading',{name:heading,exact:true})).toBeVisible();
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
  }
  expect(writes).toEqual([]);console.log('Real local admin-owned post: edit, delete, pin, lock and remove open their original dialogs; Cancel sends no mutation; owner has no report action.');
 }finally{
  if(created){const login=await context.request.post(baseURL+'/api/auth/login',{data:{email:'admin@example.test',password:'WordWeftLocal123!'}});const {token}=await login.json();const cleanup=await context.request.delete(baseURL+'/api/community/posts/'+encodeURIComponent(created.id),{headers:{Authorization:`Bearer ${token}`}});expect(cleanup.ok()).toBeTruthy();}
  await context.close();
 }
}
}finally{await browser.close();}
