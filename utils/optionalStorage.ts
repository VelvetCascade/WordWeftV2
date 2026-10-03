type OptionalTipKey = 'ww_reader_coach_session' | 'ww_reader_coach_dismissed' | `ww_sparkle_dismissed_${string}`;

// Only discovery tips use this fallback. Their state can remain in this tab when
// browser storage is blocked or full, without interrupting the reading controls.
const tabTipState = new Map<OptionalTipKey, string>();

export function readOptionalTip(key: OptionalTipKey): string | null {
    if (tabTipState.has(key)) return tabTipState.get(key)!;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function writeOptionalTip(key: OptionalTipKey, value: string): void {
    try {
        window.localStorage.setItem(key, value);
        tabTipState.delete(key);
    } catch {
        tabTipState.set(key, value);
    }
}
