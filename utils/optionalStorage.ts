type OptionalTipKey = 'ww_reader_coach_session' | 'ww_reader_coach_dismissed' | `ww_sparkle_dismissed_${string}`;

// Only discovery tips use this fallback. Their state can remain in this tab when
// browser storage is blocked or full, without interrupting the reading controls.
const tabTipState = new Map<string, string>();
const sessionFallback = new Map<string, string>();

export function readOptionalSessionValue(key: string): string | null {
    if (sessionFallback.has(key)) return sessionFallback.get(key)!;
    try { return window.sessionStorage.getItem(key); } catch { return null; }
}
export function writeOptionalSessionValue(key: string, value: string): void {
    try { window.sessionStorage.setItem(key, value); sessionFallback.delete(key); }
    catch { sessionFallback.set(key, value); }
}

/** Optional UI preferences must never block reading, writing or navigation. */
export function readOptionalValue(key: string): string | null {
    if (tabTipState.has(key)) return tabTipState.get(key)!;
    try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeOptionalValue(key: string, value: string): void {
    try { window.localStorage.setItem(key, value); tabTipState.delete(key); }
    catch { tabTipState.set(key, value); }
}

export function removeOptionalValue(key: string): void {
    tabTipState.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* Optional preference only. */ }
}

export function readOptionalTip(key: OptionalTipKey): string | null {
    return readOptionalValue(key);
}

export function writeOptionalTip(key: OptionalTipKey, value: string): void {
    writeOptionalValue(key, value);
}
