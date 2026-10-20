import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const baseURL=process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
assert(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname),'Use disposable local fixtures');
const output=process.env.AUDIT_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const surfaces={book:{route:'/book/local-story-spring',button:'Share this book',dialog:'.ww-share-dialog'},chapter:{route:'/book/local-story-spring/chapter/local-story-spring-chapter-1',button:'Share chapter',dialog:'.ww-share-dialog'},author:{route:'/author/local-writer',button:'Share author portfolio',dialog:'.ww-author-share-dialog'}};
const names=['X','Facebook','WhatsApp','Telegram'];
const rows=[],failures=[];
try{
 for(const [surface,spec] of Object.entries(surfaces))for(const [width,theme] of [[320,'light'],[390,'light'],[390,'dark'],[1440,'light']]){
  const key=`${surface}-${theme}-${width}`,context=await browser.newContext({viewport:{width,height:width<760?844:1000}});
  await context.addInitScript(theme=>{localStorage.setItem('theme',theme);for(const k of ['ww_welcomeJourneyCompleted','hasSeenWhatsNewPopup_v1'])localStorage.setItem(k,'true');localStorage.setItem('ww_reader_coach_session','4');window.__shareDestinations=[];window.open=(url,target,features)=>{window.__shareDestinations.push({url,target,features});return null}},theme);
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.route(/googlesyndication|doubleclick/,r=>r.fulfill({status:200,body:''}));
  // The local fixture points at port 3000; serve its bundled artwork at any test port.
  await page.route('**/design-v2/assets/met-53681.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../public/design-v2/assets/met-53681.jpg',import.meta.url))}));
  await page.goto(baseURL+spec.route,{waitUntil:'domcontentloaded'});
  if(surface==='chapter'&&width<760)await page.getByRole('button',{name:'More reader actions',exact:true}).click();
  await page.getByRole('button',{name:spec.button,exact:true}).first().click();
  const dialog=page.locator(spec.dialog),grid=dialog.locator('.ww-share-channels'),buttons=grid.locator(':scope > button');await grid.waitFor();await page.waitForTimeout(350);
  const geometry=await grid.evaluate(el=>{const r=el.getBoundingClientRect();return{columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,left:r.left,right:r.right,buttons:[...el.children].map(b=>{const r=b.getBoundingClientRect(),label=b.querySelector('span'),s=label.getBoundingClientRect();return{name:label.textContent,x:r.x,y:r.y,width:r.width,height:r.height,labelWidth:s.width,labelFits:label.scrollWidth<=label.clientWidth}})}});
  const rowCounts=Object.values(geometry.buttons.reduce((a,b)=>{const y=Math.round(b.y);a[y]=(a[y]||0)+1;return a},{}));
  if(output&&((surface==='book'&&(width===320||width===1440))||(surface!=='book'&&width===390&&theme==='light')))await page.screenshot({path:`${output}/${key}.png`});
  await buttons.first().focus();for(let i=0;i<4;i++){await expect(buttons.nth(i)).toBeFocused();await page.keyboard.press('Space');if(i<3)await page.keyboard.press('Tab')}
  const destinations=await page.evaluate(()=>window.__shareDestinations);
  const link=await dialog.locator('input').inputValue();
  if(surface==='author'){await page.keyboard.press('Tab');await expect(buttons.nth(4)).toBeFocused();await page.keyboard.press('Space');await expect(dialog.locator('canvas')).toBeVisible()}
  rows.push({surface,width,theme,key,geometry,rowCounts,destinations,link});
  try{
   assert.deepEqual(geometry.buttons.map(b=>b.name),surface==='author'?[...names,'Instagram']:names);
   assert.deepEqual(rowCounts,width<760?(surface==='author'?[3,2]:[2,2]):[surface==='author'?5:4]);
   assert.equal(geometry.columns,width<760?(surface==='author'?3:2):(surface==='author'?5:4));
   assert.ok(geometry.buttons.every(b=>b.width>=48&&b.height>=48&&b.labelFits&&b.labelWidth<=b.width));assert.ok(geometry.left>=0&&geometry.right<=width);
   assert.equal(destinations.length,4);for(const [i,host] of ['twitter.com','www.facebook.com','api.whatsapp.com','t.me'].entries()){const d=destinations[i],url=new URL(d.url);assert.equal(url.hostname,host);assert.equal(d.target,'_blank');assert.equal(d.features,'noopener,noreferrer');assert.ok([...url.searchParams.values()].some(v=>v.includes(link)),'Share destination contains the actual public link')}
  }catch(error){failures.push({key,message:error.message})}
  await context.close();console.log(key,rowCounts,geometry.columns);
 }
 if(output)fs.writeFileSync(`${output}/grid.json`,JSON.stringify({rows,failures},null,2));assert.deepEqual(failures,[]);
}finally{await browser.close()}
