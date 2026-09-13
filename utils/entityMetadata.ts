import type { Author, Book } from '../types';
import { metadataFor, parseRoute, bookPath, authorPath } from '../seo/metadata.mjs';
import { applyMetadata } from './pageMetadata';
export const applyBookMetadata = (book: Book) => {
    if (window.location.pathname !== bookPath(book.id)) return;
    applyMetadata(metadataFor(parseRoute(bookPath(book.id)), book));
};
export const applyAuthorMetadata = (author: Author, books: Book[]) => {
    if (window.location.pathname !== authorPath(author.id)) return;
    applyMetadata(metadataFor(parseRoute(window.location.pathname + window.location.search), { author, books }));
};
