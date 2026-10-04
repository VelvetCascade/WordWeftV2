import { chapterPath } from '../seo/metadata.mjs';
import { internalNavigationTrail, returnNavigationTarget, lastMatchingTrailIndex, type NavigationTrailEntry } from './navigationHistory';
import { flushHistoryState, readHistoryState, updateHistoryState } from './historyEntryState';
let navigationLock: { url: string; message: string } | null = null;
let pendingScroll: { x: number; y: number } | null = null;
let lastEntry: { url: string; state: Record<string, any> } | null = null;
export const consumeNavigationScroll = () => {
    const value = pendingScroll;
    pendingScroll = null;
    return value;
};
const recordScroll = () => updateHistoryState({ wordWeftScroll: { x: window.scrollX, y: window.scrollY } });
const saveScroll = () => { recordScroll(); flushHistoryState(); };

const currentUrl = () => window.location.pathname + window.location.search + window.location.hash;
const entryId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const trail = () => internalNavigationTrail(readHistoryState().wordWeftReturnTrail);
const rememberEntry = () => { lastEntry = { url: currentUrl(), state: readHistoryState() }; };
const ensureEntry = () => {
    if (!window.history.state?.wordWeftEntryId) {
        flushHistoryState();
        window.history.replaceState({ ...readHistoryState(), wordWeftEntryId: entryId(), wordWeftReturnTrail: [] }, '');
    }
};
const nextEntryState = (source: { url: string; state: Record<string, any> }) => ({
    wordWeftEntryId: entryId(),
    wordWeftReturnTrail: [...internalNavigationTrail(source.state.wordWeftReturnTrail),
        { url: source.url, id: source.state.wordWeftEntryId } as NavigationTrailEntry].slice(-40),
});

export const lockNavigation = (message: string) => {
    navigationLock = { url: currentUrl(), message };
    const beforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = message;
        return message;
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
        navigationLock = null;
        window.removeEventListener('beforeunload', beforeUnload);
    };
};

export const restoreLockedNavigation = () => {
    if (!navigationLock) return false;
    if (currentUrl() !== navigationLock.url) {
        window.history.replaceState(window.history.state, '', navigationLock.url);
    }
    window.dispatchEvent(new CustomEvent('wordweft:navigation-blocked', { detail: navigationLock.message }));
    return true;
};

export const isNavigationLocked = () => navigationLock !== null;
export const routePath = () => window.location.pathname + window.location.search;
export const navigatePath = (path: string, replace = false) => {
    if (isNavigationLocked()) {
        restoreLockedNavigation();
        return;
    }
    const target = new URL(path.replace(/^#/, ''), window.location.origin);
    if (target.origin !== window.location.origin) return;
    const next = target.pathname + target.search + target.hash;
    if (next === routePath() + window.location.hash) return;
    ensureEntry();
    saveScroll();
    pendingScroll = null;
    const state = replace ? readHistoryState() : nextEntryState({ url: currentUrl(), state: readHistoryState() });
    window.history[replace ? 'replaceState' : 'pushState'](state, '', next);
    rememberEntry();
    window.dispatchEvent(new Event('wordweft:navigate'));
};
/** Preserve old shared #/ links and editor actions while exposing crawlable URLs. */
export const installNavigation = () => {
    window.history.scrollRestoration = 'manual';
    const restoreScroll = (event: PopStateEvent) => {
        // Fragment navigation can create a history entry with no app state.
        // Keep its origin so policy contents still return to the correct task.
        if (!event.state?.wordWeftEntryId && lastEntry && !window.location.hash.startsWith('#/') &&
            currentUrl().split('#')[0] === lastEntry.url.split('#')[0]) {
            window.history.replaceState(nextEntryState(lastEntry), '');
        }
        const position = readHistoryState().wordWeftScroll;
        pendingScroll = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : { x: 0, y: 0 };
        if (!window.location.hash.startsWith('#/')) { ensureEntry(); rememberEntry(); }
    };
    // Capture every position in memory; coalesce native persistence instead of
    // consuming WebKit's shared history budget once per animation frame.
    window.addEventListener('scroll', recordScroll, { passive: true });
    window.addEventListener('pagehide', flushHistoryState);
    window.addEventListener('popstate', restoreScroll);
    const migrateHash = (initial = false) => {
        if (window.location.hash.startsWith('#/')) {
            const target = window.location.hash.slice(1);
            if (!target.startsWith('//')) {
                const state = !initial && lastEntry && lastEntry.url !== target ? nextEntryState(lastEntry) : readHistoryState();
                window.history.replaceState(state, '', target);
            }
        } else if (lastEntry && currentUrl() !== lastEntry.url && currentUrl().split('#')[0] === lastEntry.url.split('#')[0] &&
            window.history.state?.wordWeftEntryId === lastEntry.state.wordWeftEntryId) {
            window.history.replaceState(nextEntryState(lastEntry), '');
        }
        ensureEntry(); rememberEntry();
    };
    migrateHash(true);
    const handleHashChange = () => migrateHash();
    window.addEventListener('hashchange', handleHashChange);
    const click = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
        if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self') || anchor.dataset.nativeNavigation !== undefined) return;
        const raw = anchor.getAttribute('href') || '';
        if (raw.startsWith('#') && !raw.startsWith('#/')) return;
        const target = new URL(raw.replace(/^#\//, '/'), window.location.href);
        if (target.origin !== window.location.origin || /\.[a-z0-9]+$/i.test(target.pathname) || target.pathname.startsWith('/api/')) return;
        if (isNavigationLocked()) { event.preventDefault(); restoreLockedNavigation(); return; }
        event.preventDefault(); navigatePath(target.pathname + target.search + target.hash);
    };
    document.addEventListener('click', click);
    return () => {
        flushHistoryState();
        document.removeEventListener('click', click); window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('scroll', recordScroll); window.removeEventListener('popstate', restoreScroll);
        window.removeEventListener('pagehide', flushHistoryState);
    };
};
export const goBackOrReplace = (fallbackPath: string) => {
    const target = returnNavigationTarget(trail(), currentUrl());
    if (target && window.history.length > target.distance) { window.history.go(-target.distance); return; }
    navigatePath(fallbackPath, true);
};
export const getReturnNavigation = (fallbackPath = '/', fallbackLabel = 'Back to discover') => ({
    label: (typeof window !== 'undefined' ? returnNavigationTarget(trail(), currentUrl())?.label : undefined) || fallbackLabel,
    // Resolve on activation too: a native section anchor may have added entries.
    onClick: () => goBackOrReplace(fallbackPath),
});
export const replaceHash = (path: string) => navigatePath(path, true);
export const openReaderFromStory = (bookId: string, chapterIndex: number, chapterId?: string) => {
    navigatePath(chapterId ? chapterPath(bookId, chapterId) : `/read/book/${bookId}/chapter/${chapterIndex}`);
    updateHistoryState({ wordWeftReaderParent: bookId });
};
export const replaceReaderChapter = (bookId: string, chapterIndex: number, chapterId?: string) => {
    flushHistoryState();
    window.history.replaceState(readHistoryState(), '', chapterId ? chapterPath(bookId, chapterId) : `/read/book/${bookId}/chapter/${chapterIndex}`);
    rememberEntry();
};
export const returnToStory = (bookId: string) => {
    const entries = trail();
    const path = `/book/${encodeURIComponent(bookId)}`;
    const index = lastMatchingTrailIndex(entries, entry => entry.url.split('?')[0].split('#')[0] === path);
    const distance = entries.length - index;
    if (index >= 0 && window.history.length > distance) { window.history.go(-distance); return; }
    navigatePath(`/book/${encodeURIComponent(bookId)}`, true);
};
