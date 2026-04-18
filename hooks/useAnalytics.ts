import { useEffect, useRef } from 'react';
import type { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';
const ANALYTICS_ENDPOINT = `${API_BASE_URL}/analytics/events`;

// ------------------------------------------------------------------
// Generates a unique session ID, persisted for the browser session
// ------------------------------------------------------------------
function getOrCreateSessionId(): string {
    let sid = sessionStorage.getItem('ww_session_id');
    if (!sid) {
        sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem('ww_session_id', sid);
    }
    return sid;
}

function getDeviceType(): string {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
}

function getScreenSize(): string {
    return `${window.screen.width}x${window.screen.height}`;
}

function getPageName(hash: string): string {
    const h = hash.replace('#/', '').split('?')[0];
    if (!h || h === '' || h === '/') return 'home';
    if (h.startsWith('book/')) return 'book-details';
    if (h.startsWith('author/')) return 'author';
    if (h.startsWith('read/book/')) return 'reader';
    if (h.startsWith('write/book/create')) return 'writer-create-book';
    if (h.startsWith('write/book/') && h.includes('/manage')) return 'writer-manage-book';
    if (h.startsWith('write/book/') && h.includes('/edit')) return 'writer-edit-chapter';
    if (h.startsWith('write/analytics')) return 'writer-analytics';
    if (h.startsWith('write/settings')) return 'writer-settings';
    if (h.startsWith('write')) return 'writer-dashboard';
    if (h.startsWith('genre/')) return 'genre-page';
    if (h.startsWith('search')) return 'search';
    if (h.startsWith('reset-password')) return 'reset-password';
    return h.split('/')[0] || 'home';
}

// Fire-and-forget beacon to the backend. Uses sendBeacon for page-exit events.
function sendEvents(
    events: Array<{ sheet: string; row: string[] }>,
    userId: string,
    timeSpentSeconds: number,
    useBeacon = false
) {
    const payload = JSON.stringify({ events, userId, timeSpentSeconds });
    if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
        fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        }).catch(() => { /* silently swallow — analytics must never surface errors */ });
    }
}

// ------------------------------------------------------------------
// The hook — call once in App.tsx: useAnalytics(currentUser)
// ------------------------------------------------------------------
export function useAnalytics(currentUser: User | null) {
    const sessionId = useRef(getOrCreateSessionId());
    const pageEnteredAt = useRef<number>(Date.now());
    const currentPageRef = useRef<string>(getPageName(window.location.hash));
    const referrerPageRef = useRef<string>('');
    const hasLoggedSession = useRef(false);

    const userId = currentUser?.id ?? 'anon';

    // ── Session Start (fires once per tab) ──────────────────────────
    useEffect(() => {
        if (hasLoggedSession.current) return;
        hasLoggedSession.current = true;

        sendEvents([{
            sheet: 'Sessions',
            row: [
                new Date().toISOString(),
                userId,
                sessionId.current,
                getDeviceType(),
                getScreenSize(),
            ],
        }], userId, 0);
    }, [userId]);

    // ── Page View + Time-on-Page tracking ───────────────────────────
    useEffect(() => {
        const logPageView = (pageName: string, path: string, referrer: string) => {
            sendEvents([{
                sheet: 'PageViews',
                row: [
                    new Date().toISOString(),
                    userId,
                    pageName,
                    path,
                    sessionId.current,
                    referrer,
                    getDeviceType(),
                ],
            }], userId, 0);
        };

        const logTimeOnPage = (pageName: string, path: string, durationSeconds: number, useBeacon = false) => {
            if (durationSeconds < 2) return; // ignore flash navigations
            sendEvents([{
                sheet: 'TimeOnPage',
                row: [
                    new Date().toISOString(),
                    userId,
                    pageName,
                    path,
                    String(Math.round(durationSeconds)),
                    sessionId.current,
                ],
            }], userId, Math.round(durationSeconds), useBeacon);
        };

        // Log the initial page view
        const initialPage = getPageName(window.location.hash);
        const initialPath = window.location.hash || '#/';
        logPageView(initialPage, initialPath, '');
        currentPageRef.current = initialPage;
        pageEnteredAt.current = Date.now();

        const handleHashChange = () => {
            const now = Date.now();
            const prevPage = currentPageRef.current;
            const prevPath = window.location.hash;
            const durationSeconds = (now - pageEnteredAt.current) / 1000;

            // Log time spent on the page we're leaving
            logTimeOnPage(prevPage, prevPath, durationSeconds);

            // Update state for the new page
            const newPage = getPageName(window.location.hash);
            referrerPageRef.current = prevPage;
            currentPageRef.current = newPage;
            pageEnteredAt.current = now;

            // Log the new page view
            logPageView(newPage, window.location.hash, prevPage);
        };

        // Capture time on page when user leaves / closes tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const durationSeconds = (Date.now() - pageEnteredAt.current) / 1000;
                logTimeOnPage(currentPageRef.current, window.location.hash, durationSeconds, true);
                pageEnteredAt.current = Date.now(); // Reset for when they come back
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [userId]); // Re-register when userId changes (e.g., after login)
}
