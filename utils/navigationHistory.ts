export interface NavigationTrailEntry { url: string; id: string }

export function internalNavigationTrail(value: unknown): NavigationTrailEntry[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is NavigationTrailEntry => !!entry && typeof entry.url === 'string' &&
        entry.url.startsWith('/') && !entry.url.startsWith('//') && typeof entry.id === 'string').slice(-40);
}

const pathOf = (url: string) => url.split('#')[0];
export const lastMatchingTrailIndex = (trail: NavigationTrailEntry[], predicate: (entry: NavigationTrailEntry) => boolean) => {
    for (let index = trail.length - 1; index >= 0; index--) if (predicate(trail[index])) return index;
    return -1;
};
const labels: Record<string, string> = {
    '/edit-profile': 'Back to settings', '/profile': 'Back to your profile', '/library': 'Back to your library',
    '/category': 'Back to stories', '/home': 'Back to discover', '/': 'Back to discover',
    '/community': 'Back to community', '/write': 'Back to your studio', '/contact': 'Back to help', '/feedback': 'Back to your feedback',
};

/** A return target is an entry created by this app, never arbitrary browser history. */
export function returnNavigationTarget(trail: NavigationTrailEntry[], current: string) {
    const currentPath = pathOf(current);
    const contextual = /^\/(notifications|privacy|terms|safety|safety-rules|contact|feedback)(?:\?|$)/.test(currentPath);
    let index = -1;
    if (contextual) index = lastMatchingTrailIndex(trail, entry => pathOf(entry.url).split('?')[0] === '/edit-profile');
    if (index < 0) index = lastMatchingTrailIndex(trail, entry => pathOf(entry.url) !== currentPath);
    if (index < 0) return null;
    const target = trail[index];
    const path = pathOf(target.url).split('?')[0];
    return { url: target.url, distance: trail.length - index, label: labels[path] || (path.startsWith('/book/') ? 'Back to the story' : 'Back') };
}
