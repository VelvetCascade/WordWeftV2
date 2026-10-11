import { expect } from '@playwright/test';
import { session, go, check, finish } from './audit-contrast.mjs';

try {
for (const theme of ['light','dark']) for (const width of [1440,390]) {
const { context, page } = await session(theme,width,'writer');
let rating=4.7;
await page.route(/\/api\/search(?:\?|\/autocomplete)/, async route => {
 const response=await route.fetch(); const data=await response.json();
 const books=Array.isArray(data.books)?data.books:data.books.items;
 for(const book of books) book.rating=rating;
 await route.fulfill({response,json:data});
});
await go(page, '/search?q=spring');
await page.locator('.search-book-card-rating').first().waitFor();
await check(page,'.search-book-card-rating',`${theme}-${width}-rating`);
await page.getByRole('button',{name:'Search WordWeft',exact:true}).click();
await page.locator('.search-overlay-input').fill('spring');
await page.locator('.search-overlay-item-subtitle').first().waitFor();
await check(page,'.search-overlay-item-subtitle > span:not(.search-overlay-rating)',`${theme}-${width}-suggestions`);
await page.keyboard.press('ArrowDown');
await check(page,'.search-overlay-item-active .search-overlay-item-subtitle > span',`${theme}-${width}-selected`);
await page.locator('.search-overlay-item').first().hover();
await check(page,'.search-overlay-item-active .search-overlay-item-subtitle > span',`${theme}-${width}-hover`);
rating=0;
await go(page,'/search?q=spring');
await page.locator('.search-book-card').first().waitFor();
await expect(page.locator('.search-book-card-rating')).toHaveCount(0);
await page.getByRole('button',{name:'Search WordWeft',exact:true}).click();
await page.locator('.search-overlay-input').fill('spring');
await page.locator('.search-overlay-item-subtitle').first().waitFor();
await expect(page.locator('.search-overlay-rating')).toHaveCount(0);
await context.close();
}
await finish();
} catch (error) { console.error(error); process.exitCode=1; process.exit(1); }
