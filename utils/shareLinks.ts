const PRODUCTION_ORIGIN = 'https://wordweftstudio.com';

const normalizedOrigin = (origin?: string) => {
    const value = origin || (typeof window !== 'undefined' ? window.location.origin : PRODUCTION_ORIGIN);
    return value.replace(/\/$/, '');
};

/**
 * Social networks do not receive the hash portion of a URL. These routes are
 * resolved by the hosting layer to small public preview pages with story- or
 * author-specific Open Graph metadata, then forward people to the SPA.
 */
export const storyShareUrl = (bookId: string, origin?: string) =>
    `${normalizedOrigin(origin)}/share/book/${encodeURIComponent(bookId)}`;

export const authorShareUrl = (authorId: string, origin?: string) =>
    `${normalizedOrigin(origin)}/share/author/${encodeURIComponent(authorId)}`;

export const storyCanonicalUrl = (bookId: string) =>
    `${PRODUCTION_ORIGIN}/book/${encodeURIComponent(bookId)}`;

export const authorCanonicalUrl = (authorId: string) =>
    `${PRODUCTION_ORIGIN}/author/${encodeURIComponent(authorId)}`;
