export interface AvailableGenre { name: string; bookCount: number; readCount: number }
const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function availableGenreShortcuts(rows: AvailableGenre[], preferences: string[] = [], limit = 6): AvailableGenre[] {
    const favorites = new Set(preferences.map(normalize));
    return rows.filter(row => row.bookCount > 0 && row.name.trim()).slice().sort((a, b) =>
        Number(favorites.has(normalize(b.name))) - Number(favorites.has(normalize(a.name))) ||
        (b.bookCount * 100 + b.readCount) - (a.bookCount * 100 + a.readCount) || a.name.localeCompare(b.name)
    ).slice(0, limit);
}

export function searchGenreCatalog(catalog: string[], selected: string[], query: string): string[] {
    const labels = new Map<string, string>();
    [...selected, ...catalog].forEach(value => { if (value.trim() && !labels.has(normalize(value))) labels.set(normalize(value), value); });
    return [...labels.values()].filter(value => normalize(value).includes(normalize(query)));
}

function editDistance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
        previous = next;
    }
    return previous[b.length];
}

export function searchRecovery(query: string, rows: AvailableGenre[]): { genres: AvailableGenre[]; queries: string[] } {
    const value = normalize(query).slice(0, 200);
    const relevant = rows.filter(row => row.bookCount > 0 && (normalize(row.name).includes(value) ||
        value.includes(normalize(row.name)) || (value.length >= 4 && editDistance(value, normalize(row.name)) <= 2)));
    const genres = availableGenreShortcuts(relevant.length ? relevant : rows, [], 3);
    const queries = [...new Set(value.split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 3 && word !== value))].slice(0, 3);
    return { genres, queries };
}
