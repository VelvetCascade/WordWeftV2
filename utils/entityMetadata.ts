import type { Author, Book } from '../types';
import { authorCanonicalUrl, storyCanonicalUrl } from './shareLinks';

const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.querySelector<HTMLMetaElement>(selector);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }
    element.content = content;
};
const setCanonical = (href: string) => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
    }
    link.href = href;
};

const setStructuredData = (id: string, data: object) => {
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => script.remove();
};

export const applyBookMetadata = (book: Book) => {
    const title = `${book.title} by ${book.author.name} | WordWeft`;
    const description = (book.summary || book.description || `Read ${book.title} on WordWeft`).slice(0, 240);
    const canonical = storyCanonicalUrl(book.id);
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'book');
    setMeta('meta[property="og:image"]', 'property', 'og:image', book.coverUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', book.coverUrl);
    setCanonical(canonical);
    return setStructuredData('ww-entity-schema', {
        '@context': 'https://schema.org', '@type': 'Book', name: book.title,
        image: book.coverUrl, description, url: canonical,
        author: { '@type': 'Person', name: book.author.name, url: authorCanonicalUrl(book.author.id) },
        genre: book.genres,
    });
};

export const applyAuthorMetadata = (author: Author, books: Book[]) => {
    const title = `${author.name} — Author Portfolio | WordWeft`;
    const description = (author.bio || `Explore ${author.name}'s published stories on WordWeft.`).slice(0, 240);
    const canonical = authorCanonicalUrl(author.id);
    const image = books[0]?.coverUrl || author.avatarUrl;
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'profile');
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setCanonical(canonical);
    return setStructuredData('ww-entity-schema', {
        '@context': 'https://schema.org', '@type': 'Person', name: author.name,
        description, image: author.avatarUrl, url: canonical,
        sameAs: Object.values(author.socials || {}).filter(Boolean),
        mainEntityOfPage: canonical,
        subjectOf: books.map(book => ({ '@type': 'Book', name: book.title, url: storyCanonicalUrl(book.id) })),
    });
};
