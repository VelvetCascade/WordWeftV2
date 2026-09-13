import { metadataFor, parseRoute, renderHead } from '../seo/metadata.mjs';

export function applyMetadata(meta: ReturnType<typeof metadataFor>) {
    const preview = !!document.querySelector('meta[name="ww-indexing-policy"][content="noindex"]') || typeof window !== 'undefined' && !['wordweftstudio.com', 'www.wordweftstudio.com', 'localhost', '127.0.0.1'].includes(window.location.hostname);
    document.head.querySelectorAll('title, meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]').forEach(node => node.remove());
    const template = document.createElement('template');
    template.innerHTML = renderHead(meta, preview);
    document.head.appendChild(template.content);
}

export function updateRouteMetadata() {
    const route = parseRoute(window.location.pathname + window.location.search);
    if (['book', 'chapter', 'legacy-chapter', 'author', 'catalog'].includes(route.kind)) {
        // Keep correct initial server metadata while the public content loads.
        const current = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
        if (current === `https://wordweftstudio.com${window.location.pathname}${window.location.search}`) return;
    }
    applyMetadata(metadataFor(route));
}
