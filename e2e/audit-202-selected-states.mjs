import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {session,go,check,finish,browser,output} from './audit-contrast.mjs';
const results=[];
try{
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  const {context,page}=await session(theme,width,'guest');let exports=0;page.on('download',()=>exports++);await go(page,'/book/local-story-spring/chapter/local-story-spring-chapter-1');
  await page.locator('.reader-copy p').first().evaluate(p=>{const r=document.createRange();r.setStart(p.firstChild,0);r.setEnd(p.firstChild,90);getSelection().removeAllRanges();getSelection().addRange(r)});await page.locator('.reader-manuscript').dispatchEvent('mouseup');await page.getByRole('button',{name:'Share as Quote',exact:true}).click();
  const quick=page.getByRole('button',{name:'Quick Share',exact:true}),quote=page.getByRole('button',{name:'Quote Card',exact:true});
  await check(page,'.ww-share-dialog > div:nth-child(2) button',`${theme}-${width}-tabs`);
  await check(page,'.ww-share-content .flex.gap-2.mb-4 button',`${theme}-${width}-themes`);
  await quick.focus();await page.keyboard.press('Space');await expect(page.locator('canvas')).toHaveCount(0);const quickState=[await quick.getAttribute('aria-pressed'),await quote.getAttribute('aria-pressed')];
  await quote.focus();await page.keyboard.press('Space');await expect(page.locator('canvas')).toHaveCount(1);
  const choices=[];
  for(const name of ['Obsidian','Espresso','Linen','Rosewood','Gallery']){const button=page.getByRole('button',{name,exact:true});await button.focus();await page.keyboard.press('Space');const states=await page.locator('.ww-share-content .flex.gap-2.mb-4 button').evaluateAll(bs=>bs.map(b=>({name:b.textContent,pressed:b.getAttribute('aria-pressed')})));choices.push({name,states});await expect(button).toBeFocused()}
  results.push({theme,width,quickState,quoteState:[await quick.getAttribute('aria-pressed'),await quote.getAttribute('aria-pressed')],choices,exports});await context.close();
 }
 if(output)fs.writeFileSync(`${output}/selected-states.json`,JSON.stringify(results,null,2));
 await finish();
 for(const row of results){assert.equal(row.exports,0);assert.deepEqual(row.quickState,['true','false']);assert.deepEqual(row.quoteState,['false','true']);for(const choice of row.choices){assert.deepEqual(choice.states.filter(s=>s.pressed==='true').map(s=>s.name),[choice.name]);assert.ok(choice.states.every(s=>s.pressed==='true'||s.pressed==='false'))}}
}catch(error){console.error(error);await browser.close();process.exitCode=1}
