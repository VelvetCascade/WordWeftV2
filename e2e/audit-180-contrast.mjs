import { expect } from '@playwright/test';
import { session, go, check, finish, browser } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'writer');
await go(page,'/profile');
await check(page,'.ww-profile-genres button',`${theme}-${width}-genres`);
const genre=page.locator('.ww-profile-genres button').first();
const name=await genre.innerText();
await genre.hover(); await check(page,'.ww-profile-genres button',`${theme}-${width}-hover`);
await genre.focus(); await check(page,'.ww-profile-genres button',`${theme}-${width}-focus`);
await genre.hover(); await page.mouse.down(); await check(page,'.ww-profile-genres button',`${theme}-${width}-pressed`); await page.mouse.up(); await expect(page).toHaveURL(new RegExp('/genre/'+encodeURIComponent(name)));
await go(page,'/safety');
await check(page,'.wv-legal-header .rounded-full > span:first-child',`${theme}-${width}-safety`);
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; } finally { await browser.close(); }
