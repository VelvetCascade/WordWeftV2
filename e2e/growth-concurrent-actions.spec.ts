import { test, expect, type Page } from './fixtures';
import { writeFile } from 'node:fs/promises';
import type { Route } from '@playwright/test';
const challenges=['a','b'].map(id=>({id,title:`Synthetic challenge ${id.toUpperCase()}`,description:'A private reading goal.',metric:'chapters',target:5,progress:0,progressPercent:0,joined:false,completed:false}));
const events=['a','b'].map(id=>({id,title:`Synthetic event ${id.toUpperCase()}`,genre:'Fantasy',prompt:'A door opens.',description:'A local genre event.',startAt:'2026-01-01T00:00:00Z',endAt:'2027-01-01T00:00:00Z',timing:'active',stories:[]}));
const book={id:'synthetic-book',title:'Synthetic published story',genres:['Fantasy'],publicationStatus:'published'};
async function setup(page:Page){
 const requests:{kind:string;id:string;route:Route}[]=[];
 await page.addInitScript(()=>{localStorage.setItem('wordweft_jwt','synthetic-local-token');localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(/\.[cm]?[jt]sx?$/.test(path))return route.continue();
  const mutation=path.match(/^\/api\/growth\/(challenges|events)\/([^/]+)\/(join|submissions\/[^/]+)$/);
  if(mutation&&route.request().method()==='POST'){requests.push({kind:mutation[1],id:mutation[2],route});return;}
  if(path==='/api/users/me')return route.fulfill({json:{id:'growth-writer',username:'Synthetic Writer',email:'growth@example.test',avatarUrl:'/logo.svg',library:[],writtenBooks:[book]}});
  if(path==='/api/growth/challenges')return route.fulfill({json:challenges});if(path==='/api/growth/events')return route.fulfill({json:events});
  if(path==='/api/notifications/unread-count')return route.fulfill({json:0});if(path==='/api/notifications/stream')return route.fulfill({contentType:'text/event-stream',body:''});return route.fulfill({json:[]});
 });
 await page.goto('/events');await expect(page.getByRole('heading',{name:challenges[0].title,exact:true})).toBeVisible();return requests;
}
for(const width of [1440,390])test(`independent joins and submissions settle without duplicate requests ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1000});const requests=await setup(page);const observations:Record<string,unknown>={};
 const challenge=(id:string)=>page.locator('.wv-challenge-card').filter({has:page.getByRole('heading',{name:`Synthetic challenge ${id.toUpperCase()}`,exact:true})});
 const event=(id:string)=>page.locator('.wv-event-card').filter({has:page.getByRole('heading',{name:`Synthetic event ${id.toUpperCase()}`,exact:true})});
 const a=challenge('a').getByRole('button'),b=challenge('b').getByRole('button');
 await a.click();await expect.poll(()=>requests.length).toBe(1);await b.click();await expect.poll(()=>requests.length).toBe(2);
 if(!await a.isDisabled())await a.click();
 await page.waitForTimeout(150);observations.pendingJoins=requests.map(({kind,id})=>({kind,id}));observations.joinButtons=await page.locator('.wv-challenge-card button').evaluateAll(items=>items.map(item=>({text:item.textContent,disabled:(item as HTMLButtonElement).disabled})));
 if(process.env.AUDIT_PROOF_DIR){await page.locator('.wv-challenge-grid').scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/joins-${width}.png`});await writeFile(`${process.env.AUDIT_PROOF_DIR}/requests-${width}.json`,JSON.stringify(observations,null,2));}
 expect.soft(requests.filter(r=>r.kind==='challenges'&&r.id==='a')).toHaveLength(1);await expect.soft(a).toBeDisabled({timeout:500});await expect.soft(b).toBeDisabled({timeout:500});
 await requests.find(r=>r.kind==='challenges'&&r.id==='b')!.route.fulfill({status:503,json:{message:'Synthetic challenge B retry'}});await expect(page.getByRole('alert')).toContainText('Synthetic challenge B retry');
 await expect.soft(a).toBeDisabled({timeout:500});await expect(b).toBeEnabled();
 await requests.find(r=>r.kind==='challenges'&&r.id==='a')!.route.fulfill({json:{...challenges[0],joined:true}});await expect(challenge('a').getByRole('button')).toHaveCount(0);
 await b.click();await expect.poll(()=>requests.filter(r=>r.kind==='challenges'&&r.id==='b').length).toBe(2);await requests.filter(r=>r.kind==='challenges'&&r.id==='b')[1].route.fulfill({json:{...challenges[1],joined:true}});await expect(challenge('b').getByRole('button')).toHaveCount(0);
 const ea=event('a').getByRole('button',{name:/Submit story|Submitting/}),eb=event('b').getByRole('button',{name:/Submit story|Submitting/});
 await ea.click();await expect.poll(()=>requests.filter(r=>r.kind==='events').length).toBe(1);await eb.click();await expect.poll(()=>requests.filter(r=>r.kind==='events').length).toBe(2);if(!await ea.isDisabled())await ea.click();
 await page.waitForTimeout(150);observations.pendingSubmissions=requests.filter(r=>r.kind==='events').map(({kind,id})=>({kind,id}));
 if(process.env.AUDIT_PROOF_DIR){await event('a').scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/submissions-${width}.png`});await writeFile(`${process.env.AUDIT_PROOF_DIR}/requests-${width}.json`,JSON.stringify(observations,null,2));}
 expect.soft(requests.filter(r=>r.kind==='events'&&r.id==='a')).toHaveLength(1);await expect.soft(ea).toBeDisabled({timeout:500});await expect.soft(eb).toBeDisabled({timeout:500});
 const submitted={bookId:book.id,title:book.title,authorId:'growth-writer',authorName:'Synthetic Writer'};
 await requests.find(r=>r.kind==='events'&&r.id==='b')!.route.fulfill({json:{...events[1],stories:[submitted]}});await expect(event('b').getByRole('link',{name:new RegExp(book.title)})).toBeVisible();await expect.soft(ea).toBeDisabled({timeout:500});
 await requests.find(r=>r.kind==='events'&&r.id==='a')!.route.fulfill({status:503,json:{message:'Synthetic event A retry'}});await expect(page.getByRole('alert')).toContainText('Synthetic event A retry');await expect(ea).toBeEnabled();await expect(event('b').getByRole('link',{name:new RegExp(book.title)})).toBeVisible();
 const attemptsBeforeRetry=requests.filter(r=>r.kind==='events'&&r.id==='a').length;await ea.click();await expect.poll(()=>requests.filter(r=>r.kind==='events'&&r.id==='a').length).toBe(attemptsBeforeRetry+1);await requests.filter(r=>r.kind==='events'&&r.id==='a')[attemptsBeforeRetry].route.fulfill({json:{...events[0],stories:[submitted]}});await expect(event('a').getByRole('link',{name:new RegExp(book.title)})).toBeVisible();await expect(event('b').getByRole('link',{name:new RegExp(book.title)})).toBeVisible();
 observations.settled=requests.map(({kind,id})=>({kind,id}));if(process.env.AUDIT_PROOF_DIR)await writeFile(`${process.env.AUDIT_PROOF_DIR}/requests-${width}.json`,JSON.stringify(observations,null,2));
});
