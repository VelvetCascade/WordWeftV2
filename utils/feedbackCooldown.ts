
// Feedback Cooldown Manager
// Manages localStorage-based rate limiting for contextual feedback popups.

const STORAGE_KEYS = {
    LAST_SHOWN: 'ww_feedback_last_shown',
    WEEKLY_COUNT: 'ww_feedback_weekly_count',
    WEEK_START: 'ww_feedback_week_start',
    DISMISSED_TYPES: 'ww_feedback_dismissed',
    SESSION_DAYS: 'ww_feedback_session_days',
    SESSION_START: 'ww_feedback_session_start',
    BANNER_LAST_SHOWN: 'ww_feedback_banner_last',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function getNumber(key: string, fallback: number): number {
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : fallback;
}

function getArray(key: string): string[] {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
}

// --- Public API ---

/** Check if a feedback popup can be shown (1/day, 3/week max) */
export function canShowFeedback(): boolean {
    const now = Date.now();

    // Max 1 per day
    const lastShown = getNumber(STORAGE_KEYS.LAST_SHOWN, 0);
    if (now - lastShown < DAY_MS) return false;

    // Max 3 per week
    const weekStart = getNumber(STORAGE_KEYS.WEEK_START, 0);
    if (now - weekStart > WEEK_MS) {
        // Reset weekly counter
        localStorage.setItem(STORAGE_KEYS.WEEK_START, String(now));
        localStorage.setItem(STORAGE_KEYS.WEEKLY_COUNT, '0');
    }
    const weeklyCount = getNumber(STORAGE_KEYS.WEEKLY_COUNT, 0);
    if (weeklyCount >= 3) return false;

    return true;
}

/** Record that a feedback popup was shown */
export function recordShown(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SHOWN, String(Date.now()));
    const weeklyCount = getNumber(STORAGE_KEYS.WEEKLY_COUNT, 0);
    localStorage.setItem(STORAGE_KEYS.WEEKLY_COUNT, String(weeklyCount + 1));

    // Ensure week start is set
    if (!localStorage.getItem(STORAGE_KEYS.WEEK_START)) {
        localStorage.setItem(STORAGE_KEYS.WEEK_START, String(Date.now()));
    }
}

/** Record that a specific feedback type was dismissed */
export function recordDismissed(type: string): void {
    const dismissed = getArray(STORAGE_KEYS.DISMISSED_TYPES);
    if (!dismissed.includes(type)) {
        dismissed.push(type);
        localStorage.setItem(STORAGE_KEYS.DISMISSED_TYPES, JSON.stringify(dismissed));
    }
}

/** Check if a specific type was already dismissed */
export function wasDismissed(type: string): boolean {
    return getArray(STORAGE_KEYS.DISMISSED_TYPES).includes(type);
}

/** Record today as an active session day (for power user detection) */
export function recordSessionDay(): void {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const days = getArray(STORAGE_KEYS.SESSION_DAYS);
    if (!days.includes(today)) {
        days.push(today);
        // Keep only last 30 days
        const recent = days.slice(-30);
        localStorage.setItem(STORAGE_KEYS.SESSION_DAYS, JSON.stringify(recent));
    }
}

/** Get the number of unique session days */
export function getSessionDayCount(): number {
    return getArray(STORAGE_KEYS.SESSION_DAYS).length;
}

/** Mark session start time */
export function markSessionStart(): void {
    if (!sessionStorage.getItem(STORAGE_KEYS.SESSION_START)) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_START, String(Date.now()));
    }
}

/** Get session duration in minutes */
export function getSessionDurationMinutes(): number {
    const start = parseInt(sessionStorage.getItem(STORAGE_KEYS.SESSION_START) || '0', 10);
    if (!start) return 0;
    return (Date.now() - start) / 60000;
}

/** Check if banner can be shown (once per 3 days) */
export function canShowBanner(): boolean {
    const lastShown = getNumber(STORAGE_KEYS.BANNER_LAST_SHOWN, 0);
    return Date.now() - lastShown > 3 * DAY_MS;
}

/** Record banner shown */
export function recordBannerShown(): void {
    localStorage.setItem(STORAGE_KEYS.BANNER_LAST_SHOWN, String(Date.now()));
}

/** Generate a session ID for grouping feedback */
export function getSessionId(): string {
    const key = 'ww_feedback_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem(key, id);
    }
    return id;
}
