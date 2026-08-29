export function toggleTasteGenre(current: string[], genre: string, max = 8): string[] {
    const existing = current.findIndex(value => value.localeCompare(genre, undefined, { sensitivity: 'accent' }) === 0);
    if (existing >= 0) return current.filter((_, index) => index !== existing);
    if (current.length >= max) return current;
    return [...current, genre];
}

export function appendSeenStory(current: string[], bookId: string, max = 60): string[] {
    const unique = current.filter(id => id !== bookId);
    return [...unique, bookId].slice(-Math.max(1, max));
}
