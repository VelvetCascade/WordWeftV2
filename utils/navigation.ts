import { chapterPath } from '../seo/metadata.mjs';
let navigationLock: { url: string; message: string } | null = null;
let pendingScroll: { x: number; y: number } | null = null;
export const consumeNavigationScroll = () => {
    const value = pendingScroll;
    pendingScroll = null;
    return value;
};
const saveScroll = () => window.history.replaceState({ ...window.history.state, wordWeftScroll: { x: window.scrollX, y: window.scrollY } }, '');

const currentUrl = () => window.location.pathname + window.location.search + window.location.hash;

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
    saveScroll();
    pendingScroll = null;
    window.history[replace ? 'replaceState' : 'pushState'](replace ? window.history.state : null, '', next);
    window.dispatchEvent(new Event('wordweft:navigate'));
};
/** Preserve old shared #/ links and editor actions while exposing crawlable URLs. */
export const installNavigation = () => {
    window.history.scrollRestoration = 'manual';
    const restoreScroll = (event: PopStateEvent) => {
        const position = event.state?.wordWeftScroll;
        pendingScroll = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : { x: 0, y: 0 };
    };
    // A legacy hash action creates its history entry before hashchange fires.
    // Capture the outgoing place while scrolling, so browser Back still resumes it.
    let scrollFrame = 0;
    const recordScroll = () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(saveScroll);
    };
    window.addEventListener('scroll', recordScroll, { passive: true });
    window.addEventListener('popstate', restoreScroll);
    const migrateHash = () => {
        if (window.location.hash.startsWith('#/')) {
            const target = window.location.hash.slice(1);
            if (!target.startsWith('//')) window.history.replaceState(window.history.state, '', target);
        }
    };
    migrateHash();
    window.addEventListener('hashchange', migrateHash);
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
        cancelAnimationFrame(scrollFrame);
        document.removeEventListener('click', click); window.removeEventListener('hashchange', migrateHash);
        window.removeEventListener('scroll', recordScroll); window.removeEventListener('popstate', restoreScroll);
    };
};
export const goBackOrReplace = (fallbackPath: string) => {
    if (window.history.length > 1) { window.history.back(); return; }
    navigatePath(fallbackPath, true);
};
export const replaceHash = (path: string) => navigatePath(path, true);
export const openReaderFromStory = (bookId: string, chapterIndex: number, chapterId?: string) => {
    navigatePath(chapterId ? chapterPath(bookId, chapterId) : `/read/book/${bookId}/chapter/${chapterIndex}`);
    window.history.replaceState({ ...window.history.state, wordWeftReaderParent: bookId }, '');
};
export const replaceReaderChapter = (bookId: string, chapterIndex: number, chapterId?: string) => {
    window.history.replaceState(window.history.state, '', chapterId ? chapterPath(bookId, chapterId) : `/read/book/${bookId}/chapter/${chapterIndex}`);
};
export const returnToStory = (bookId: string) => {
    if (window.history.state?.wordWeftReaderParent === bookId && window.history.length > 1) { window.history.back(); return; }
    navigatePath(`/book/${encodeURIComponent(bookId)}`, true);
};
