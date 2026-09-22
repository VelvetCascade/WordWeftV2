import { SITE_ORIGIN, SITE_NAME, DEFAULT_IMAGE, staticPages, landingPages } from './content.mjs';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const plainText = value => String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
export const excerpt = (value, max = 160) => { const text = plainText(value); return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`; };
export const safeImage = value => { if (typeof value !== 'string' || !value.trim()) return DEFAULT_IMAGE; try { const url = new URL(value, SITE_ORIGIN); return ['https:', 'http:'].includes(url.protocol) ? url.href : DEFAULT_IMAGE; } catch { return DEFAULT_IMAGE; } };
export const serializeJson = data => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const segment = value => encodeURIComponent(String(value));
export const bookPath = id => `/book/${segment(id)}`;
export const chapterPath = (bookId, chapterId) => `${bookPath(bookId)}/chapter/${segment(chapterId)}`;
export const authorPath = id => `/author/${segment(id)}`;
export const isPublicBook = book => book?.publicationStatus === 'published' && !book.isMature && [undefined, null, 'ALL_AGES', 'TEEN_13'].includes(book.ageRating);
export const publicChapters = book => (book?.chapters || []).filter(ch => ch.status === 'published');

export function parseRoute(input) {
  try {
    const url = new URL(input, SITE_ORIGIN);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const parts = path.split('/').slice(1).map(decodeURIComponent);
    if (parts.some(p => /[\\/\u0000-\u001f]/.test(p))) return { kind: 'missing', path };
    const rawPage = url.searchParams.get('page') || '1';
    const page = /^[1-9]\d{0,5}$/.test(rawPage) && Number(rawPage) <= 100000 ? Number(rawPage) : 0;
    if (staticPages[path]) return { kind: 'static', path };
    if (parts.length === 2 && parts[0] === 'book') return { kind: 'book', path, id: parts[1] };
    if (parts.length === 4 && parts[0] === 'book' && parts[2] === 'chapter') return { kind: 'chapter', path, id: parts[1], chapterId: parts[3] };
    if (parts.length === 5 && parts[0] === 'read' && parts[1] === 'book' && parts[3] === 'chapter' && /^\d+$/.test(parts[4])) return { kind: 'legacy-chapter', path, id: parts[2], index: Number(parts[4]) };
    if (parts.length === 2 && parts[0] === 'author') return { kind: 'author', path, id: parts[1], page };
    if (parts.length === 2 && ['genre', 'tag'].includes(parts[0])) return { kind: 'catalog', path, filter: parts[0], value: parts[1], page };
    if (path === '/category' || path === '/home') return { kind: 'catalog', path, page };
    if (/^\/(auth|reset-password|profile|library|edit-profile|notifications|search|feedback|hooks|events|challenges|community|admin)(\/|$)/.test(path) || /^\/write(?:\/|$)/.test(path)) return { kind: 'private', path };
    return { kind: 'missing', path };
  } catch { return { kind: 'missing', path: '/' }; }
}

const breadcrumbs = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_ORIGIN + path })) });
const website = { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: SITE_NAME, alternateName: 'WordWeft Studio', url: SITE_ORIGIN + '/' };

export function metadataFor(route, data = null) {
  // These two routes intentionally display the same public feature showcase.
  if (route.kind === 'static' && route.path === '/features') return metadataFor({ kind: 'static', path: '/' });
  let title = 'WordWeft', description = 'Read and write stories on WordWeft.', image = DEFAULT_IMAGE, type = 'website', index = true;
  let path = route.path + (['catalog', 'author'].includes(route.kind) && route.page > 1 ? `?page=${route.page}` : ''), graph = [];
  if (route.kind === 'static') {
    ({ title, description } = staticPages[path]);
    const landing = landingPages[path];
    graph = path === '/' ? [website, { '@type': 'Organization', '@id': `${SITE_ORIGIN}/#organization`, name: 'WordWeft Studio', url: SITE_ORIGIN + '/', logo: `${SITE_ORIGIN}/logo.svg` }] : [
      { '@type': 'WebPage', '@id': `${SITE_ORIGIN + path}#webpage`, name: title, headline: landing?.heading || title.split(' | ')[0], description, url: SITE_ORIGIN + path, inLanguage: 'en', isPartOf: { '@id': website['@id'] } },
      breadcrumbs([['Home', '/'], [title.split(' | ')[0], path]]),
      ...(landing?.faqs?.length ? [{ '@type': 'FAQPage', '@id': `${SITE_ORIGIN + path}#faq`, url: SITE_ORIGIN + path, mainEntity: landing.faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) }] : []),
    ];
  } else if ((route.kind === 'book' || route.kind === 'chapter') && data) {
    const book = data;
    const author = book.author || { name: 'WordWeft writer' };
    title = `${book.title} by ${author.name} | WordWeft`;
    description = excerpt(book.summary || book.description || `Read ${book.title} by ${author.name} on WordWeft.`);
    image = safeImage(book.coverUrl); type = 'book'; index = isPublicBook(book) && publicChapters(book).length > 0;
    const entity = { '@type': 'Book', '@id': SITE_ORIGIN + bookPath(book.id) + '#book', name: book.title, description, url: SITE_ORIGIN + bookPath(book.id), image, author: { '@type': 'Person', name: author.name, url: SITE_ORIGIN + authorPath(author.id || book.authorId) }, genre: book.genres || [], keywords: (book.tags || []).join(', '), ...(book.publishedDate ? { datePublished: book.publishedDate } : {}) };
    const crumbs = [['Home', '/'], ['Stories', '/category'], [book.title, bookPath(book.id)]];
    if (route.kind === 'chapter') {
      const chapter = publicChapters(book).find(ch => ch.id === route.chapterId);
      if (!chapter) return metadataFor({ kind: 'missing', path });
      title = `${chapter.title} — ${book.title} | WordWeft`;
      // Use the synopsis for snippets so chapter spoilers aren't used as the description.
      description = excerpt(`Read ${chapter.title} from ${book.title} by ${author.name}. ${plainText(book.summary)}`);
      type = 'article';
      graph = [{
        '@type': 'Chapter',
        name: chapter.title,
        url: SITE_ORIGIN + path,
        isPartOf: entity,
        author: entity.author,
        isAccessibleForFree: false,
        hasPart: { '@type': 'WebPageElement', cssSelector: '.reader-sign-in-gate', isAccessibleForFree: false },
        ...(chapter.wordCount > 0 ? { wordCount: chapter.wordCount } : {}),
      }];
      crumbs.push([chapter.title, path]);
    } else graph = [entity];
    graph.push(breadcrumbs(crumbs));
  } else if (route.kind === 'author' && data) {
    const author = data.author || data;
    title = `${author.name} — Stories & Author Profile | WordWeft`;
    description = excerpt(author.bio || `Read published stories by ${author.name} on WordWeft.`);
    image = safeImage(author.avatarUrl); type = 'profile';
    index = (data.books || []).some(isPublicBook);
    graph = [{ '@type': 'ProfilePage', url: SITE_ORIGIN + path, mainEntity: { '@type': 'Person', name: author.name, description, url: SITE_ORIGIN + authorPath(author.id), image } }, breadcrumbs([['Home', '/'], [author.name, authorPath(author.id)]])];
  } else if (route.kind === 'catalog') {
    const label = route.value || 'Original';
    title = route.value ? `${label} Stories & Novels to Read Online | WordWeft` : route.path === '/home' ? 'Discover Stories & Independent Writers | WordWeft' : 'Browse Stories & Novels by Genre | WordWeft';
    description = route.filter === 'tag' ? `Explore published stories tagged ${label} on WordWeft. Browse book descriptions, meet their authors, and open a chapter to start reading.` : `Read ${label.toLowerCase()} stories online on WordWeft. Discover novels and fiction from independent writers and explore their published chapters.`;
    index = !!data?.books?.length;
    graph = [{ '@type': 'CollectionPage', name: title, url: SITE_ORIGIN + path, mainEntity: { '@type': 'ItemList', itemListElement: (data?.books || []).map((book, i) => ({ '@type': 'ListItem', position: (route.page - 1) * 24 + i + 1, url: SITE_ORIGIN + bookPath(book.id), name: book.title })) } }, breadcrumbs([['Home', '/'], [route.value || 'Stories', route.path]])];
  } else {
    index = false;
    title = route.kind === 'missing' ? 'Page Not Found | WordWeft' : route.path.startsWith('/search') ? 'Search Stories & Authors | WordWeft' : route.path.startsWith('/write') ? 'Writing Studio | WordWeft' : 'Your WordWeft';
    description = route.kind === 'missing' ? 'This page is unavailable. Explore published stories and writing tools on WordWeft.' : 'Sign in or explore WordWeft’s reading and writing community.';
  }
  if (['catalog', 'author'].includes(route.kind) && route.page > 1) { title = title.replace(' | WordWeft', ` — Page ${route.page} | WordWeft`); }
  return { title, description, canonical: SITE_ORIGIN + path, image, imageAlt: image === DEFAULT_IMAGE ? 'WordWeft — read and write stories' : title, type, index, graph };
}

export function renderHead(meta, noindex = false) {
  const tag = (key, value) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}">`;
  return `<title>${escapeHtml(meta.title)}</title>${tag('description', meta.description)}<link rel="canonical" href="${escapeHtml(meta.canonical)}">${tag('robots', noindex || !meta.index ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1')}${tag('og:site_name', SITE_NAME)}${tag('og:locale', 'en_US')}${tag('og:title', meta.title)}${tag('og:description', meta.description)}${tag('og:type', meta.type)}${tag('og:url', meta.canonical)}${tag('og:image', meta.image)}${tag('og:image:alt', meta.imageAlt)}${tag('twitter:card', 'summary_large_image')}${tag('twitter:title', meta.title)}${tag('twitter:description', meta.description)}${tag('twitter:image', meta.image)}${tag('twitter:image:alt', meta.imageAlt)}${meta.image === DEFAULT_IMAGE ? tag('og:image:width', '1200') + tag('og:image:height', '630') : ''}<script id="ww-seo-schema" type="application/ld+json">${serializeJson({ '@context': 'https://schema.org', '@graph': meta.index ? meta.graph : [] })}</script>`;
}
