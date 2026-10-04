export function authorRating(books: ReadonlyArray<{rating?: number; reviewsCount?: number}>) {
    const rated = books.filter(book => Number.isFinite(book.rating) && book.rating! > 0 && book.rating! <= 5 && Number.isFinite(book.reviewsCount) && book.reviewsCount! > 0);
    const reviews = rated.reduce((sum, book) => sum + book.reviewsCount!, 0);
    return { average: reviews ? rated.reduce((sum, book) => sum + book.rating! * book.reviewsCount!, 0) / reviews : null, reviews };
}
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
    return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
