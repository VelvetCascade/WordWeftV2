import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { landingPages, staticPages } from '../seo/content.mjs';
import { parseRoute, metadataFor, renderHead, chapterPath, isPublicBook, safeImage } from '../seo/metadata.mjs';
import { buildResponse } from '../seo/render.mjs';

const template = '<html><head><!--SEO_HEAD--></head><body><div id="root"><!--SEO_BODY--></div></body></html>';
const author = { id: 'writer', name: 'A Writer', bio: 'Writes fantasy.' };
const book = { id: 'story', title: 'A & B', summary: 'An original fantasy adventure.', description: '<p>A traveller finds a door.</p>', publicationStatus: 'published', ageRating: 'ALL_AGES', isMature: false, author, genres: ['Fantasy'], tags: ['found family'], chapters: [{ id: 'first', title: 'The Beginning', status: 'published', access: 'PREVIEW', content: '<p>A new beginning.</p>', fullContent: 'FIRST_END_SECRET', wordCount: 700 }, { id: 'secret', title: 'Secret draft', status: 'draft', content: 'DO NOT PUBLISH' }, { id: 'second', title: 'A New Road', status: 'published', access: 'AUTH_REQUIRED', fullContent: 'SECOND_FULL_SECRET' }] };
const response = (url, options = {}) => buildResponse({ url, template, host: 'www.wordweftstudio.com', staticBodies: { '/': '<h1>Read and write</h1>' }, fetchJson: async path => path.startsWith('/book/') ? book : { books: [book], author, hasMore: false }, ...options });

test('public URLs preserve meaningful queries and reject malformed routes', () => {
  assert.equal(parseRoute('/genre/Fantasy?page=2').page, 2);
  assert.equal(parseRoute('/genre/Fantasy?page=-1').page, 0);
  assert.equal(parseRoute('/genre/Fantasy?page=100001').page, 0);
  assert.equal(parseRoute('/book/a/chapter/stable-id').chapterId, 'stable-id');
  for (const path of ['/book/%E0%A4%A', '/book/x%2Fy', '/features-made-up', '/book/a/extra']) assert.equal(parseRoute(path).kind, 'missing');
  assert.equal(parseRoute('/search?q=writing+tools').kind, 'private');
});
test('useful acquisition pages cover both reader and writer search intent', () => {
  const titles = new Set();
  for (const [path, page] of Object.entries(landingPages)) {
    assert.ok(page.sections.length >= 3); assert.ok(page.steps.length >= 3);
    assert.equal(metadataFor(parseRoute(path)).index, true);
    assert.ok(!titles.has(page.title)); titles.add(page.title);
  }
});
test('comparison and discovery hubs provide substantial, honest decision support', () => {
  const expected = ['/wattpad-alternatives', '/webnovel-alternatives', '/royal-road-alternatives', '/online-fiction-platform', '/read-original-fiction-online'];
  for (const path of expected) {
    const page = landingPages[path];
    assert.ok(page, `${path} should exist`);
    assert.ok(page.sections.length >= 4);
    assert.ok(page.criteria.length >= 4);
    assert.ok(page.faqs.length >= 4);
    assert.ok(page.related.length >= 3);
    assert.doesNotMatch(`${page.title} ${page.description} ${page.intro}`, /guaranteed|#1|best platform/i);
  }
  assert.match(landingPages['/wattpad-alternatives'].sections.flat().join(' '), /does not promise an instant audience/i);
});
test('visible landing-page FAQs are represented in structured data', () => {
  const meta = metadataFor(parseRoute('/wattpad-alternatives'));
  const faq = meta.graph.find(item => item['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, landingPages['/wattpad-alternatives'].faqs.length);
  assert.equal(faq.mainEntity[0].name, landingPages['/wattpad-alternatives'].faqs[0][0]);
  assert.match(renderHead(meta), /max-snippet:-1/);
});
test('book HTML contains public content, links, metadata and no unpublished chapters', async () => {
  const result = await response('/book/story?utm_source=test');
  assert.equal(result.status, 200);
  assert.match(result.body, /<title>A &amp; B by A Writer/);
  assert.match(result.body, /href="https:\/\/www.wordweftstudio.com\/book\/story"/);
  assert.match(result.body, /href="\/book\/story\/chapter\/first"/);
  assert.match(result.body, /href="\/tag\/found%20family"/);
  assert.doesNotMatch(result.body, /Secret draft|DO NOT PUBLISH|\/chapter\/secret/);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
test('chapter URLs use IDs and survive chapter reorder', async () => {
  const result = await response(chapterPath('story', 'first'));
  assert.equal(result.status, 200); assert.match(result.body, /A new beginning/);
  assert.match(result.body, /"@type":"Chapter"/);
  assert.match(result.body, /Sign in to keep reading/);
  assert.doesNotMatch(result.body, /FIRST_END_SECRET/);
  assert.match(result.body, /"isAccessibleForFree":false/);
  assert.match(result.body, /"cssSelector":"\.reader-sign-in-gate"/);
  const reordered = await response(chapterPath('story', 'first'), { fetchJson: async () => ({ ...book, chapters: [...book.chapters].reverse() }) });
  assert.match(reordered.body, /A new beginning/);
  const old = await response('/read/book/story/chapter/1');
  assert.equal(old.status, 308); assert.equal(old.headers.Location, '/book/story/chapter/second');
});
test('later chapter SEO keeps context and sign-in actions without manuscript text', async () => {
  const result = await response(chapterPath('story', 'second'));
  assert.equal(result.status, 200);
  assert.match(result.body, /Sign in to read this chapter/);
  assert.match(result.body, />Sign in</);
  assert.match(result.body, />Create account</);
  assert.match(result.body, /Read the preview/);
  assert.doesNotMatch(result.body, /SECOND_FULL_SECRET|The next day/);
});
test('drafts, scheduled chapters, restricted and deleted content stay out of public HTML', async () => {
  for (const changes of [{ publicationStatus: 'draft' }, { ageRating: 'MATURE_18' }, { isMature: true }, { chapters: [] }]) {
    const result = await response('/book/story', { fetchJson: async () => ({ ...book, ...changes }) });
    assert.equal(result.status, 404); assert.match(result.headers['X-Robots-Tag'], /noindex/); assert.doesNotMatch(result.body, /A traveller/);
  }
  assert.equal((await response('/book/story/chapter/secret')).status, 404);
  assert.equal((await response('/book/missing', { fetchJson: async () => null })).status, 404);
  assert.equal(isPublicBook({ ...book, ageRating: 'ADULT_21' }), false);
});
test('server errors remain retryable, rather than becoming missing content', async () => {
  const result = await response('/book/story', { fetchJson: async () => { throw new Error('offline'); } });
  assert.equal(result.status, 503); assert.equal(result.headers['Retry-After'], '60');
});
test('account pages are noindex without exposing query tokens', async () => {
  for (const path of ['/auth', '/write/book/private/manage', '/profile', '/library', '/edit-profile', '/notifications', '/search?q=secret', '/reset-password?token=PRIVATE_TOKEN']) {
    const result = await response(path);
    assert.equal(result.status, 200); assert.match(result.headers['X-Robots-Tag'], /noindex/);
    assert.doesNotMatch(result.body, /PRIVATE_TOKEN/);
  }
});
test('unknown URLs return 404 and aliases redirect permanently', async () => {
  assert.equal((await response('/not-a-route')).status, 404);
  assert.equal((await response('/share/book/story')).headers.Location, '/book/story');
  assert.equal((await response('/features/')).headers.Location, '/features');
  assert.equal((await response('/book/story', { host: 'wordweftstudio.com' })).headers.Location, 'https://www.wordweftstudio.com/book/story');
});
test('preview host and preview environment always send noindex', async () => {
  for (const options of [{ host: 'preview.vercel.app' }, { preview: true }]) {
    const result = await response('/book/story', options);
    assert.match(result.headers['X-Robots-Tag'], /noindex/); assert.match(result.body, /name="robots" content="noindex, follow"/);
  }
});
test('metadata and server body escape hostile user content without executable markup', async () => {
  const malicious = { ...book, title: '</title><script>alert(1)</script>', summary: '<img src=x onerror=alert(2)>A summary', coverUrl: 'javascript:alert(3)' };
  const result = await response('/book/story', { fetchJson: async () => malicious });
  assert.doesNotMatch(result.body, /<script>alert|<img src=x|src="javascript:/);
  const schema = result.body.match(/<script id="ww-seo-schema" type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.doesNotThrow(() => JSON.parse(schema));
});
test('pagination has self canonical URLs and real next/previous links', async () => {
  const result = await response('/genre/Fantasy?page=2', { fetchJson: async () => ({ books: [book], hasMore: true }) });
  assert.match(result.body, /href="https:\/\/www.wordweftstudio.com\/genre\/Fantasy\?page=2"/);
  assert.match(result.body, /rel="prev" href="\/genre\/Fantasy"/);
  assert.match(result.body, /rel="next" href="\/genre\/Fantasy\?page=3"/);
  assert.equal((await response('/genre/Empty', { fetchJson: async () => ({ books: [], hasMore: false }) })).status, 404);
});
test('thin tags remain browsable but cannot be indexed', async () => {
  assert.match((await response('/tag/found%20family')).headers['X-Robots-Tag'], /noindex/);
  assert.equal((await response('/tag/found%20family', { fetchJson: async () => ({ books: [book, book, book], hasMore: false }) })).headers['X-Robots-Tag'], undefined);
});
test('sitemap index partitions content, contains clean URLs and escapes XML', async () => {
  const index = await response('/sitemap.xml', { fetchJson: async () => ({ books: 1001, chapters: 2000, authors: 1, tags: 0, genres: 1 }) });
  assert.equal(index.status, 200); assert.match(index.headers['Content-Type'], /application\/xml/);
  assert.match(index.body, /books-2.xml/); assert.doesNotMatch(index.body, /tags-1.xml|priority|changefreq|#\//);
  const staticMap = await response('/sitemaps/static.xml');
  for (const path of Object.keys(landingPages)) assert.ok(staticMap.body.includes(path));
  assert.doesNotMatch(staticMap.body, /\/auth|\/profile|\/search/);
  const map = await response('/sitemaps/books-1.xml', { fetchJson: async () => [{ path: '/book/a&b', lastmod: '2026-09-13T00:00:00Z' }] });
  assert.match(map.body, /a&amp;b/); assert.match(map.body, /<lastmod>2026-09-13/);
});
test('metadata never invents ratings or a Google book-actions integration', () => {
  const html = renderHead(metadataFor(parseRoute('/book/story'), book));
  assert.doesNotMatch(html, /aggregateRating|ReadAction|BorrowAction/);
});
test('robots allows AI search retrieval while maintaining model-training opt-outs', () => {
  const robots = readFileSync('public/robots.txt', 'utf8');
  assert.match(robots, /User-agent: GPTBot\r?\nDisallow: \//);
  for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User']) {
    assert.match(robots, new RegExp(`User-agent: ${agent}\\r?\\nAllow: /\\r?\\nDisallow: /api/`));
  }
  assert.doesNotMatch(robots, /User-agent: (?:ChatGPT-User|PerplexityBot)\r?\nDisallow: \//);
  assert.doesNotMatch(robots, /Disallow: \/(?:auth|profile|write)/);
  assert.match(robots, /Sitemap: https:\/\/www.wordweftstudio.com\/sitemap.xml/);
});


test('pagination schema and canonical identify the same individual page', () => {
  for (const path of ['/genre/Fantasy?page=2', '/author/writer?page=2']) {
    const meta = metadataFor(parseRoute(path), { books: [book], author });
    assert.equal(meta.graph[0].url, meta.canonical);
  }
});

test('missing images use a real fallback with truthful dimensions', () => {
  for (const value of [undefined, null, '', '   ', 'javascript:alert(1)']) assert.equal(safeImage(value), 'https://www.wordweftstudio.com/og-banner.jpg');
  const head = renderHead(metadataFor(parseRoute('/')));
  assert.match(head, /property="og:image:width" content="1200"/);
  assert.match(head, /property="og:image:height" content="630"/);
});

test('only deployment noindex persists across client navigation', async () => {
  for (const path of ['/auth', '/not-a-page', '/book/story']) {
    const production = await response(path);
    assert.doesNotMatch(production.body, /name="ww-indexing-policy"/);
    const preview = await response(path, { preview: true });
    assert.match(preview.body, /name="ww-indexing-policy" content="noindex"/);
  }
});


test('only production static pages use shared caching', async () => {
  assert.match((await response('/')).headers['Cache-Control'], /s-maxage=3600/);
  assert.equal((await response('/', { preview: true })).headers['Cache-Control'], 'private, no-store');
  assert.equal((await response('/book/story')).headers['Cache-Control'], 'private, no-store');
});
