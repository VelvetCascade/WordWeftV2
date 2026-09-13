// Run after deploying the backend, then frontend: node scripts/verify-seo.mjs https://www.wordweftstudio.com
import assert from 'node:assert/strict';
const origin = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const get = path => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
for (const path of ['/', '/read-online', '/writing-tools', '/publish-stories', '/world-building-tools']) {
    const response = await get(path), html = await response.text();
    assert.equal(response.status, 200, `${path}: status`);
    assert.match(html, /<h1[ >]/, `${path}: initial HTML heading`);
    assert.match(html, /<link rel="canonical"/);
    if (new URL(origin).hostname === 'www.wordweftstudio.com') {
        assert.match(html, /name="robots" content="index, follow/);
        assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/);
    }
    assert.doesNotMatch(html, /cdn.tailwindcss.com|<!--SEO_BODY-->|<!--SEO_HEAD-->/);
    for (const script of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(script[1]);
    console.log(`PASS ${path}: public HTML and metadata`);
}
for (const path of ['/auth', '/profile', '/write', '/search?q=fiction']) {
    const response = await get(path); assert.match(response.headers.get('x-robots-tag') || '', /noindex/); console.log(`PASS ${path}: noindex`);
}
assert.equal((await get('/this-page-does-not-exist-seo-check')).status, 404);
assert.equal((await get('/share/book/example')).status, 308);
const sitemap = await get('/sitemap.xml'); assert.equal(sitemap.status, 200, 'Deploy the new backend SEO endpoints before the frontend.');
const xml = await sitemap.text(); assert.match(xml, /<sitemapindex/);
const bookMap = xml.match(/<loc>[^<]*(\/sitemaps\/books-\d+\.xml)<\/loc>/);
if (bookMap) {
    const response = await get(bookMap[1]); assert.equal(response.status, 200);
    const bookXml = await response.text(); const firstBook = bookXml.match(/<loc>[^<]*(\/book\/[^<]+)<\/loc>/);
    if (firstBook) {
        const book = await get(firstBook[1]), html = await book.text(); assert.equal(book.status, 200); assert.match(html, /"@type":"Book"/);
        const chapter = html.match(/href="(\/book\/[^"?]+\/chapter\/[^"?]+)"/);
        if (chapter) { const response = await get(chapter[1]); assert.equal(response.status, 200); assert.match(await response.text(), /"@type":"Chapter"/); }
    }
}
console.log('PASS sitemap and published content checks');
