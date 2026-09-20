import { SITE_ORIGIN, staticPages, primaryDiscoveryLinks } from './content.mjs';
import { escapeHtml as h, plainText, excerpt, safeImage, serializeJson, parseRoute, metadataFor, renderHead, bookPath, chapterPath, authorPath, segment, isPublicBook, publicChapters } from './metadata.mjs';

const navigation = `<nav class="seo-public-nav" aria-label="Main navigation"><a href="/">WordWeft</a><a href="/category">Browse stories</a><a href="/writing-tools">Writing tools</a><a href="/features">Features</a><a href="/auth">Sign in</a></nav>`;
const footer = `<footer class="seo-related">${primaryDiscoveryLinks.map(link => `<a href="${link.href}">${h(link.label)}</a>`).join('')}<a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/safety">Safety</a></footer>`;
export const wrapPublic = body => navigation + `<main class="seo-landing">${body}</main>` + footer;
const paragraphs = text => String(text || '').split(/<\/(?:p|h[1-6]|div|li|blockquote)>|<br\s*\/?\s*>|\n\s*\n/gi).map(plainText).filter(Boolean).map(line => `<p>${h(line)}</p>`).join('');
const links = (values, kind) => (values || []).filter(Boolean).map(value => `<a href="/${kind}/${segment(value)}">${h(value)}</a>`).join(' ');
const bookCards = books => `<div class="seo-book-grid">${books.map(book => `<article><a href="${bookPath(book.id)}"><img src="${h(safeImage(book.coverUrl))}" alt="${h(`Cover of ${book.title}`)}" width="200" height="300" loading="lazy"><h2>${h(book.title)}</h2></a><a href="${authorPath(book.author.id)}">${h(book.author.name)}</a><p>${h(excerpt(book.summary || book.description))}</p><div class="seo-tags">${links(book.genres, 'genre')}</div></article>`).join('')}</div>`;
const pagination = (route, data) => `<nav class="seo-pagination" aria-label="Pagination">${route.page > 1 ? `<a rel="prev" href="${h(route.path + (route.page > 2 ? `?page=${route.page - 1}` : ''))}">Previous page</a>` : ''}${data.hasMore ? `<a rel="next" href="${h(route.path)}?page=${route.page + 1}">Next page</a>` : ''}</nav>`;
const readerGate = (book, chapters, locked) => `<section class="reader-sign-in-gate" aria-labelledby="reader-sign-in-heading"><p>Continue reading on WordWeft</p><h2 id="reader-sign-in-heading">${locked ? 'Sign in to read this chapter' : 'Sign in to keep reading'}</h2><p>${locked ? `Continue ${h(book.title)} by signing in. Your place in the story will be kept for you.` : 'Sign in to finish this chapter and continue through the story. Your place will be kept for you.'}</p><p><a href="/auth">Sign in</a> <a href="/auth?view=signup">Create account</a></p>${locked && chapters[0] ? `<a href="${chapterPath(book.id, chapters[0].id)}">Read the preview</a>` : ''}</section>`;

export function renderPublicBody(route, data) {
  if (route.kind === 'catalog') {
    const label = route.value ? `${route.value} stories` : 'Stories and novels';
    return wrapPublic(`<header class="seo-hero"><p class="ww-page-eyebrow">Read online</p><h1>${h(label)}</h1><p>${h(metadataFor(route, data).description)}</p><p>Browse published stories, meet their authors, and find a chapter to begin.</p></header>${bookCards(data.books)}${data.books.length ? '' : '<p>There are no published stories here yet.</p>'}${pagination(route, data)}`);
  }
  if (route.kind === 'author') {
    return wrapPublic(`<header class="seo-hero"><p class="ww-page-eyebrow">Author on WordWeft</p><h1>${h(data.author.name)}</h1>${paragraphs(data.author.bio)}</header><h2>Published stories</h2>${bookCards(data.books)}${pagination(route, data)}`);
  }
  const book = data, chapters = publicChapters(book);
  if (route.kind === 'chapter') {
    const chapter = chapters.find(ch => ch.id === route.chapterId), index = chapters.indexOf(chapter);
    const warnings = [...(book.contentWarnings || []), ...(chapter.contentWarnings || [])];
    const preview = chapter.access === 'PREVIEW';
    return wrapPublic(`<a href="${bookPath(book.id)}">${h(book.title)}</a><header class="seo-hero"><p>Chapter ${index + 1} · by <a href="${authorPath(book.author.id)}">${h(book.author.name)}</a></p><h1>${h(chapter.title)}</h1></header>${warnings.length ? `<aside>Content notes: ${h(warnings.join(', '))}</aside>` : ''}${paragraphs(book.customDisclaimer)}${paragraphs(chapter.disclaimerNote)}${preview ? `<article class="seo-manuscript">${paragraphs(chapter.content)}</article>` : ''}${readerGate(book, chapters, !preview)}<nav class="seo-pagination" aria-label="Chapters">${index > 0 ? `<a href="${chapterPath(book.id, chapters[index - 1].id)}">Previous chapter</a>` : ''}<a href="${bookPath(book.id)}">All chapters</a>${index < chapters.length - 1 ? `<a href="${chapterPath(book.id, chapters[index + 1].id)}">Next chapter</a>` : ''}</nav>`);
  }
  return wrapPublic(`<header class="seo-book-header"><img src="${h(safeImage(book.coverUrl))}" alt="${h(`Cover of ${book.title}`)}" width="240" height="360"><div><p class="ww-page-eyebrow">${h(book.category || 'Original fiction')}</p><h1>${h(book.title)}</h1><p>By <a href="${authorPath(book.author.id)}">${h(book.author.name)}</a></p><p>${h(book.readingStatus || 'Ongoing')} · ${chapters.length} published chapters</p><p>${h(book.ageRating || 'ALL_AGES').replaceAll('_', ' ')}</p><div class="seo-tags">${links(book.genres, 'genre')}</div><p>${h(book.summary)}</p>${chapters.length ? `<a class="seo-cta" href="${chapterPath(book.id, chapters[0].id)}">Start reading →</a>` : ''}</div></header><section><h2>About this story</h2>${paragraphs(book.description || book.summary)}</section>${book.tags?.length ? `<section class="seo-tags"><h2>Story tags</h2>${links(book.tags, 'tag')}</section>` : ''}<section><h2>Published chapters</h2><ol class="seo-chapters">${chapters.map((ch, index) => `<li><a href="${chapterPath(book.id, ch.id)}">${h(ch.title)}</a> <span>${index === 0 ? 'Preview' : 'Sign in to read'}</span></li>`).join('')}</ol></section>`);
}

export function documentHtml(template, meta, body, { noindex = false, persistNoindex = false } = {}) {
  return template.replace('<!--SEO_HEAD-->', renderHead(meta, noindex) + (persistNoindex ? '<meta name="ww-indexing-policy" content="noindex">' : '')).replace('<!--SEO_BODY-->', body);
}

const xml = (entries, index = false) => `<?xml version="1.0" encoding="UTF-8"?>\n<${index ? 'sitemapindex' : 'urlset'} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(entry => `<${index ? 'sitemap' : 'url'}><loc>${h(SITE_ORIGIN + entry.path)}</loc>${entry.lastmod ? `<lastmod>${h(entry.lastmod)}</lastmod>` : ''}</${index ? 'sitemap' : 'url'}>`).join('')}</${index ? 'sitemapindex' : 'urlset'}>`;

export async function buildResponse({ url: input, host = '', template, staticBodies = {}, fetchJson, preview = false }) {
  const url = new URL(input, SITE_ORIGIN), route = parseRoute(url.href);
  const noindex = preview || (!!host && host !== new URL(SITE_ORIGIN).host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1'));
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...(noindex ? { 'X-Robots-Tag': 'noindex, follow' } : {}) };
  const redirect = path => ({ status: 308, headers: { ...headers, Location: path }, body: '' });
  const error = (status, title, message) => ({ status, headers: { ...headers, 'X-Robots-Tag': 'noindex, follow', ...(status === 503 ? { 'Retry-After': '60' } : {}) }, body: documentHtml(template, { ...metadataFor({ kind: 'missing', path: route.path }), title }, wrapPublic(`<h1>${h(title)}</h1><p>${h(message)}</p><a href="/category">Browse stories</a>`), { noindex: true, persistNoindex: noindex }) });
  if (!['http:', 'https:'].includes(url.protocol)) return error(404, 'Page not found', 'This address is unavailable.');
  if (host === 'wordweftstudio.com') return redirect(SITE_ORIGIN + url.pathname + url.search);
  if (url.pathname.length > 1 && /\/$/.test(url.pathname)) return redirect(url.pathname.replace(/\/+$/, '') + url.search);
  if (url.pathname === '/index.html') return redirect('/' + url.search);
  if (url.pathname === '/challenges') return redirect('/events' + url.search);
  const share = url.pathname.match(/^\/share\/(book|author)\/([^/]+)$/);
  if (share) return redirect(`/${share[1]}/${share[2]}`);
  try {
    if (url.pathname === '/sitemap.xml') {
      const counts = await fetchJson('/sitemap');
      const entries = [{ path: '/sitemaps/static.xml' }];
      for (const [kind, count] of Object.entries(counts)) for (let page = 1; page <= Math.ceil(Number(count) / 1000); page++) entries.push({ path: `/sitemaps/${kind}-${page}.xml` });
      if (entries.length > 50000) throw new Error('Sitemap index requires partitioning');
      return { status: 200, headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' }, body: xml(entries, true) };
    }
    if (url.pathname === '/sitemaps/static.xml') return { status: 200, headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' }, body: xml(Object.keys(staticPages).filter(path => metadataFor(parseRoute(path)).canonical === SITE_ORIGIN + path).map(path => ({ path }))) };
    const sitemap = url.pathname.match(/^\/sitemaps\/(books|chapters|authors|genres|tags)-([1-9]\d{0,5})\.xml$/);
    if (sitemap) {
      const entries = await fetchJson(`/sitemap/${sitemap[1]}?page=${sitemap[2]}`);
      if (!entries?.length) return error(404, 'Sitemap not found', 'This sitemap page does not exist.');
      return { status: 200, headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' }, body: xml(entries) };
    }
    if (route.kind === 'missing' || route.page === 0) return error(404, 'Page not found', 'This page is unavailable.');
    if (route.kind === 'static') return { status: 200, headers: { ...headers, ...(!noindex ? { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } : {}) }, body: documentHtml(template, metadataFor(route), staticBodies[route.path] || '', { noindex, persistNoindex: noindex }) };
    if (route.kind === 'private') return { status: 200, headers: { ...headers, 'X-Robots-Tag': 'noindex, follow' }, body: documentHtml(template, metadataFor(route), wrapPublic('<h1>WordWeft</h1><p>Open the reading and writing community, or sign in to your account.</p><a href="/auth">Sign in</a>'), { noindex: true, persistNoindex: noindex }) };
    let data;
    if (['book', 'chapter', 'legacy-chapter'].includes(route.kind)) {
      data = await fetchJson(`/book/${segment(route.id)}${route.kind === 'chapter' ? `?chapterId=${segment(route.chapterId)}` : ''}`);
      if (!data || !isPublicBook(data) || !publicChapters(data).length) return error(404, 'Story unavailable', 'This story is not publicly available.');
      if (route.kind === 'legacy-chapter') {
        const chapter = publicChapters(data)[route.index];
        return chapter ? redirect(chapterPath(data.id, chapter.id)) : error(404, 'Chapter unavailable', 'This chapter is not publicly available.');
      }
      if (route.kind === 'chapter' && !publicChapters(data).some(ch => ch.id === route.chapterId)) return error(404, 'Chapter unavailable', 'This chapter is not publicly available.');
    } else if (route.kind === 'author') {
      data = await fetchJson(`/author/${segment(route.id)}?page=${route.page}`);
      if (!data || (route.page > 1 && !data.books?.length)) return error(404, 'Author page unavailable', 'This author page is unavailable.');
    } else {
      data = await fetchJson(`/catalog?page=${route.page}${route.filter ? `&${route.filter}=${segment(route.value)}` : ''}`);
      if (!data || (!data.books?.length && (route.value || route.page > 1))) return error(404, 'No stories at this address', 'Explore the library to find published stories.');
    }
    const meta = metadataFor(route, data);
    // Thin, arbitrary tag pages can be browsed, but only tags shared by >=3 stories are indexable.
    if (route.filter === 'tag' && route.page === 1 && data.books.length < 3) meta.index = false;
    return { status: 200, headers: { ...headers, ...(!meta.index ? { 'X-Robots-Tag': 'noindex, follow' } : {}) }, body: documentHtml(template, meta, renderPublicBody(route, data), { noindex, persistNoindex: noindex }) };
  } catch (failure) {
    if (failure?.status === 404 || failure?.status === 403) return error(404, 'Page unavailable', 'This content is not publicly available.');
    // An upstream outage is not a missing/deleted story. Preserve the URL with a retryable status.
    return error(503, 'WordWeft is temporarily unavailable', 'Please try again shortly. Your story may still be available.');
  }
}
