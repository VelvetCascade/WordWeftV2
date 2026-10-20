import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const circles=[{id:'circle-update',slug:'updates',name:'Synthetic Updates',description:'Reading updates.',rules:[],accent:'brown',allowedPostTypes:['UPDATE'],memberCount:1,official:true,joined:false},{id:'circle-questions',slug:'questions',name:'Synthetic Questions',description:'Thoughtful questions.',rules:[],accent:'brown',allowedPostTypes:['POLL','WORKSHOP','RELEASE','RECOMMENDATION'],memberCount:1,official:true,joined:false}];
async function composer(page:Page){
 await page.addInitScript(()=>{localStorage.setItem('wordweft_jwt','synthetic-local-token');localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(/\.[cm]?[jt]sx?$/.test(path))return route.continue();
  if(path==='/api/users/me')return route.fulfill({json:{id:'composer-reader',username:'Synthetic Reader',email:'composer@example.test',avatarUrl:'/logo.svg',library:[],writtenBooks:[]}});
  if(path==='/api/community/circles')return route.fulfill({json:circles});if(path==='/api/community/me')return route.fulfill({json:{interests:[],badges:[],canModerate:false,canAdmin:false,joinedCircleIds:[]}});
  if(path==='/api/community/feed')return route.fulfill({json:{items:[],nextCursor:null}});if(path==='/api/notifications/unread-count')return route.fulfill({json:0});if(path==='/api/notifications/stream')return route.fulfill({contentType:'text/event-stream',body:''});return route.fulfill({json:[]})});
 await page.goto('/community?compose=1');await expect(page.getByRole('dialog',{name:'Create a post'})).toBeVisible();
}

for(const theme of ['light','dark']) for(const width of [1440,390]) test(`actionable formats retain contrast and discovery ${theme} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1000});
 await page.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
 await composer(page);const group=page.getByRole('group',{name:'Post format',exact:true});
 const samples=await group.locator('button').evaluateAll(buttons=>buttons.map(button=>{
  const rgb=(v:string)=>v.match(/[\d.]+/g)!.map(Number);
  const over=(a:number[],b:number[],opacity=1)=>a.slice(0,3).map((v,i)=>v*(a[3]??1)*opacity+b[i]*(1-(a[3]??1)*opacity));
  const lum=(a:number[])=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  let bg=[255,255,255];const chain=[];for(let n:HTMLElement|null=button;n;n=n.parentElement)chain.unshift(n);
  for(const n of chain)bg=over(rgb(getComputedStyle(n).backgroundColor),bg);
  const style=getComputedStyle(button),fg=over(rgb(style.color),bg,Number(style.opacity));const l=lum(fg),b=lum(bg);
  return {label:button.textContent,ratio:(Math.max(l,b)+.05)/(Math.min(l,b)+.05),opacity:style.opacity,foreground:fg,background:bg};
 }));
 const axe=await new AxeBuilder({page}).include('.community-formats > div:first-of-type').withRules(['color-contrast']).analyze();
 if(process.env.AUDIT_PROOF_DIR){await group.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/${theme}-${width}.png`});await writeFile(`${process.env.AUDIT_PROOF_DIR}/${theme}-${width}.json`,JSON.stringify({samples,violations:axe.violations},null,2));}
 for(const sample of samples)expect.soft(sample.ratio,`${sample.label} rendered contrast`).toBeGreaterThanOrEqual(4.5);
 expect.soft(axe.violations).toEqual([]);
 const poll=group.getByRole('button',{name:'Poll',exact:true});await expect(poll).toBeEnabled();await poll.focus();await page.keyboard.press('Enter');await expect(group.getByRole('status')).toContainText('Choose a circle');
 await group.getByRole('button',{name:'Use Synthetic Questions'}).click();await expect(poll).toHaveAttribute('aria-pressed','true');
 await page.getByRole('combobox',{name:'Circle',exact:true}).selectOption('circle-update');await poll.click();await expect(group.getByRole('status')).toContainText('not available in Synthetic Updates');await expect(group.getByRole('button',{name:'Update',exact:true})).toHaveAttribute('aria-pressed','true');
 await group.getByRole('button',{name:'Use Synthetic Questions'}).click();await expect(poll).toHaveAttribute('aria-pressed','true');await expect(poll).toBeEnabled();
});

test.describe('touch discovery',()=>{
 test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('outlined format opens help and switches to a suitable circle',async({page})=>{
  await composer(page);const group=page.getByRole('group',{name:'Post format',exact:true});
  const poll=group.getByRole('button',{name:'Poll',exact:true});await poll.tap();await expect(group.getByRole('status')).toContainText('Choose a circle');
  await group.getByRole('button',{name:'Use Synthetic Questions'}).tap();await expect(poll).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('combobox',{name:'Circle',exact:true})).toHaveValue('circle-questions');
 });
});
