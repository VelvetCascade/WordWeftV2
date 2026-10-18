import { chromium, request } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3024';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname), 'Use disposable local fixtures');
const before = process.env.AUDIT_BEFORE === '1';
const api = await request.newContext({ baseURL });
const session = await api.post('/api/auth/login', { data: { email: process.env.E2E_EMAIL || 'writer@example.test', password: process.env.E2E_PASSWORD || 'WordWeftLocal123!' } });
assert.ok(session.ok(), 'Start the disposable backend and writer fixture');
const { token } = await session.json();
const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox','--disable-dev-shm-usage'] });
const observations = [];
try {
 for (const width of [1280,390]) for (const entry of ['avatar','cover']) {
  console.log('Journey', entry, width);
  const context = await browser.newContext({ viewport: {width,height:900}, isMobile: width === 390, hasTouch: width === 390 });
  await context.addInitScript(token => {
   localStorage.setItem('wordweft_jwt',token); localStorage.setItem('ww_welcomeJourneyCompleted','true'); localStorage.setItem('hasSeenWhatsNewPopup_v1','true');
   const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); window.auditImageUrls = new Set();
   URL.createObjectURL = value => { const url = create(value); window.auditImageUrls.add(url); return url; };
   URL.revokeObjectURL = url => { window.auditImageUrls.delete(url); revoke(url); };
  },token);
  let uploadRequests = 0;
  await context.route('**/api/imagekit/**', route => { uploadRequests++; return route.abort(); });
  await context.route('https://upload.imagekit.io/**', route => { uploadRequests++; return route.abort(); });
  const page = await context.newPage();
  await page.goto(`${baseURL}/${entry === 'avatar' ? 'edit-profile' : 'write/book/create'}`, {waitUntil:'domcontentloaded',timeout:60000});
  const input = page.locator('input[type=file]').first(); await input.waitFor({state:'attached'});
  const extensions = before ? ['png'] : ['png','jpg','webp'];
  for (const ext of extensions) {
   const file = { name:`corrupt.${ext}`, mimeType:ext === 'jpg' ? 'image/jpeg' : `image/${ext}`, buffer:Buffer.from('not a decodable image') };
   await input.setInputFiles(file);
   const dialog = page.getByRole('dialog', { name:/Crop/ }); await dialog.waitFor();
   if (before) {
    await page.waitForTimeout(500);
    assert.equal(await dialog.getByText('Loading image…',{exact:true}).isVisible(),true);
   } else {
    await dialog.getByRole('alert').waitFor({timeout:5000});
    assert.match(await dialog.getByRole('alert').innerText(),/couldn’t read this image/i);
    assert.equal(await dialog.getByText('Loading image…',{exact:true}).count(),0);
    assert.equal(await dialog.getByRole('button',{name:'Use cropped image'}).isDisabled(),true);
    await page.waitForFunction(() => document.activeElement?.closest('[role=dialog]') !== null);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('[role=dialog]') !== null),true,'Tab stays inside the dialog');
   }
   if (ext === 'png') await page.screenshot({animations:'disabled',path:new URL(`${entry}-${before ? 'before':'after'}-${width}.png`,import.meta.url).pathname});
   if (!before && ext === 'png') {
    const chooserEvent = page.waitForEvent('filechooser');
    await dialog.getByRole('button',{name:'Choose another image',exact:true}).click();
    await (await chooserEvent).setFiles(file);
    await page.getByRole('dialog').getByRole('alert').waitFor();
   }
   await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
   assert.equal(await input.inputValue(),'','Cancel/reselect resets the input, including the same file');
   assert.equal(await page.evaluate(() => window.auditImageUrls.size),0,'Crop object URLs are revoked on cancel');
  }
  if (!before) {
   await input.setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from('not a decodable image')});
   const dialog = page.getByRole('dialog'); await dialog.getByRole('alert').waitFor();
   const validData = await page.evaluate(() => { const c=document.createElement('canvas'); c.width=240; c.height=360; const x=c.getContext('2d'); x.fillStyle='#a87b65'; x.fillRect(0,0,240,360); return c.toDataURL('image/png').split(',')[1]; });
   const chooserEvent=page.waitForEvent('filechooser'); await dialog.getByRole('button',{name:'Choose another image',exact:true}).click();
   await (await chooserEvent).setFiles({name:'valid.png',mimeType:'image/png',buffer:Buffer.from(validData,'base64')});
   await page.getByRole('button',{name:'Use cropped image'}).waitFor();
   await page.waitForFunction(() => !document.querySelector('.crop-modal-confirm-btn')?.disabled);
   assert.equal(await page.getByRole('dialog').getByRole('alert').count(),0);
   await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(() => window.auditImageUrls.size),0);
  }
  assert.equal(uploadRequests,0,'Unreadable images never reach upload authentication/provider');
  observations.push({width,entry,formats:extensions,loadingStuck:before,actionableError:!before,sameFileRetry:!before,validRetry:!before,objectUrlsRevoked:true,uploadRequests});
  await context.close();
 }
 await writeFile(new URL(`${before?'before':'after'}-observations.json`,import.meta.url),JSON.stringify(observations,null,2)+'\n');
 console.log(`PASS ${before?'baseline':'regression'}: avatar and story cover at desktop/mobile sizes`);
} finally { await browser.close(); await api.dispose(); }
