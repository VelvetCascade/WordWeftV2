const PRODUCTION_ORIGIN = 'https://www.wordweftstudio.com';

const normalizedOrigin = (origin?: string) => {
    const value = origin || (typeof window !== 'undefined' ? window.location.origin : PRODUCTION_ORIGIN);
    return value.replace(/\/$/, '');
};

/**
 * Canonical public pages include social metadata in the initial HTML.
 * The hosting layer permanently redirects older /share/ links to these paths.
 */
export const storyShareUrl = (bookId: string, origin?: string) =>
    `${normalizedOrigin(origin)}/book/${encodeURIComponent(bookId)}`;

export const authorShareUrl = (authorId: string, origin?: string) =>
    `${normalizedOrigin(origin)}/author/${encodeURIComponent(authorId)}`;

export const storyCanonicalUrl = (bookId: string) =>
    `${PRODUCTION_ORIGIN}/book/${encodeURIComponent(bookId)}`;

export const authorCanonicalUrl = (authorId: string) =>
    `${PRODUCTION_ORIGIN}/author/${encodeURIComponent(authorId)}`;
