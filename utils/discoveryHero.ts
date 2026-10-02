import type { Book } from '../types';

export type DiscoveryHeroGroup = 'stories' | 'novels' | 'poems';
export type DiscoveryHeroGroups = Record<DiscoveryHeroGroup, Book[]>;
export const DISCOVERY_HERO_GROUPS: DiscoveryHeroGroup[] = ['stories', 'novels', 'poems'];

const format = (book: Book) => (book.category || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const novelFormats = new Set(['novel', 'web novel', 'light novel', 'graphic novel']);
const poemFormats = new Set(['poetry', 'poem', 'poems', 'poetry collection', 'collection of poems', 'poetry anthology']);
const nonStoryFormats = new Set(['guide', 'essay', 'essays', 'memoir', 'biography', 'self help', 'non fiction']);
const isNovel = (book: Book) => novelFormats.has(format(book));
const isPoem = (book: Book) => poemFormats.has(format(book)) || (!format(book) && (book.genres || []).some(genre => genre.trim().toLowerCase() === 'poetry'));
const isStory = (book: Book) => !isPoem(book) && !nonStoryFormats.has(format(book));
const displayable = (book: Book) => !!book?.id && !!book.title?.trim() && book.publicationStatus === 'published'
    && (book as Book & { isDiscoverable?: boolean }).isDiscoverable !== false;
const uniqueBooks = (books: Book[]) => {
    const seen = new Set<string>();
    return books.filter(book => {
        if (!displayable(book) || seen.has(book.id)) return false;
        seen.add(book.id);
        return true;
    });
};

/** The backend ranks each format across the catalog; this also supports SSR catalog snapshots. */
export function groupDiscoveryBooks(books: Book[]): DiscoveryHeroGroups {
    const catalog = uniqueBooks(books);
    const stories = catalog.filter(book => isStory(book) && !isNovel(book));
    return {
        stories: [...stories, ...catalog.filter(book => isStory(book) && isNovel(book))].slice(0, 3),
        novels: catalog.filter(isNovel).slice(0, 3),
        poems: catalog.filter(isPoem).slice(0, 3),
    };
}

export function normalizeDiscoveryGroups(groups: Partial<DiscoveryHeroGroups>): DiscoveryHeroGroups {
    return {
        stories: uniqueBooks(Array.isArray(groups.stories) ? groups.stories : []).filter(isStory).slice(0, 3),
        novels: uniqueBooks(Array.isArray(groups.novels) ? groups.novels : []).filter(isNovel).slice(0, 3),
        poems: uniqueBooks(Array.isArray(groups.poems) ? groups.poems : []).filter(isPoem).slice(0, 3),
    };
}

export function nextDiscoveryGroup(current: DiscoveryHeroGroup, groups: DiscoveryHeroGroups): DiscoveryHeroGroup {
    const available = DISCOVERY_HERO_GROUPS.filter(group => groups[group].length > 0);
    if (!available.length) return 'stories';
    return available[(available.indexOf(current) + 1) % available.length];
}
