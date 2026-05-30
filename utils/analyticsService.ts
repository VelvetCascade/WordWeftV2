
// Analytics Service — Core engine for tracking user events
// Events are batched and sent to the backend API, which forwards them to Google Sheets

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const JWT_KEY = 'wordweft_jwt';
const BATCH_INTERVAL_MS = 30000; // Flush every 30 seconds
const MAX_BATCH_SIZE = 20;       // Flush when 20 events accumulated

// --- Types ---

export interface AnalyticsEvent {
    sessionId: string;
    category: string;
    action: string;
    label?: string;
    value?: number;
    pagePath: string;
    referrerPage?: string;
    deviceType: string;
    browser: string;
    screenSize: string;
    os: string;
    metadata?: Record<string, any>;
}

export interface SessionInfo {
    sessionId: string;
    startTime: string;
    endTime?: string;
    pageCount: number;
    eventCount: number;
    entryPage: string;
    exitPage: string;
    deviceType: string;
    browser: string;
    os: string;
}

export interface AnalyticsBatch {
    events: AnalyticsEvent[];
    session: SessionInfo;
}

// --- Device Detection Utilities ---

function getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
}

function getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'Firefox ' + (ua.match(/Firefox\/(\d+)/)?.[1] || '');
    if (ua.includes('Edg/')) return 'Edge ' + (ua.match(/Edg\/(\d+)/)?.[1] || '');
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome ' + (ua.match(/Chrome\/(\d+)/)?.[1] || '');
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari ' + (ua.match(/Version\/(\d+)/)?.[1] || '');
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
    return 'Other';
}

function getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    return 'Other';
}

function getScreenSize(): string {
    return `${window.innerWidth}x${window.innerHeight}`;
}

function generateSessionId(): string {
    return 's_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// --- Analytics Service Class ---

class AnalyticsServiceImpl {
    private eventQueue: AnalyticsEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private sessionId: string;
    private sessionStartTime: string;
    private pageCount: number = 0;
    private eventCount: number = 0;
    private entryPage: string = '';
    private currentPage: string = '';
    private previousPage: string = '';
    private lastPageTimestamp: number = Date.now();
    private deviceType: string;
    private browser: string;
    private os: string;
    private initialized: boolean = false;

    constructor() {
        // Initialize session from sessionStorage or create new
        const existingSessionId = sessionStorage.getItem('ww_analytics_session');
        if (existingSessionId) {
            this.sessionId = existingSessionId;
            this.sessionStartTime = sessionStorage.getItem('ww_analytics_session_start') || new Date().toISOString();
            this.pageCount = parseInt(sessionStorage.getItem('ww_analytics_page_count') || '0', 10);
            this.eventCount = parseInt(sessionStorage.getItem('ww_analytics_event_count') || '0', 10);
            this.entryPage = sessionStorage.getItem('ww_analytics_entry_page') || '';
        } else {
            this.sessionId = generateSessionId();
            this.sessionStartTime = new Date().toISOString();
            sessionStorage.setItem('ww_analytics_session', this.sessionId);
            sessionStorage.setItem('ww_analytics_session_start', this.sessionStartTime);
        }

        this.deviceType = getDeviceType();
        this.browser = getBrowser();
        this.os = getOS();
    }

    /**
     * Initialize the analytics service — start batch timer and page tracking
     */
    init(): void {
        if (this.initialized) return;
        this.initialized = true;

        // Set entry page
        this.currentPage = window.location.hash || '#/';
        if (!this.entryPage) {
            this.entryPage = this.currentPage;
            sessionStorage.setItem('ww_analytics_entry_page', this.entryPage);
        }

        // Start batch flush timer
        this.flushTimer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);

        // Listen for hash changes (page navigation)
        window.addEventListener('hashchange', this.handleHashChange);

        // Flush on page unload
        window.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * Shutdown the analytics service
     */
    destroy(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        window.removeEventListener('hashchange', this.handleHashChange);
        window.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        this.flush(); // Send remaining events
        this.initialized = false;
    }

    // --- Event Tracking ---

    /**
     * Track a custom analytics event
     */
    trackEvent(
        category: string,
        action: string,
        label?: string,
        value?: number,
        metadata?: Record<string, any>
    ): void {
        try {
            const event: AnalyticsEvent = {
                sessionId: this.sessionId,
                category,
                action,
                label,
                value,
                pagePath: this.currentPage,
                referrerPage: this.previousPage,
                deviceType: this.deviceType,
                browser: this.browser,
                screenSize: getScreenSize(),
                os: this.os,
                metadata,
            };

            this.eventQueue.push(event);
            this.eventCount++;
            sessionStorage.setItem('ww_analytics_event_count', String(this.eventCount));

            // Auto-flush if batch is full
            if (this.eventQueue.length >= MAX_BATCH_SIZE) {
                this.flush();
            }
        } catch (e) {
            // Analytics should never break the app
            console.warn('[Analytics] Failed to track event:', e);
        }
    }

    /**
     * Track a page view (called automatically on hash change)
     */
    trackPageView(pagePath: string, previousPage?: string): void {
        const now = Date.now();
        const timeOnPreviousPage = Math.round((now - this.lastPageTimestamp) / 1000);
        this.lastPageTimestamp = now;
        this.pageCount++;
        sessionStorage.setItem('ww_analytics_page_count', String(this.pageCount));

        this.trackEvent('navigation', 'page_view', pagePath, undefined, {
            previousPage: previousPage || this.previousPage,
            timeOnPreviousPage,
        });
    }

    // --- Internal Handlers ---

    private handleHashChange = (): void => {
        try {
            const newPage = window.location.hash || '#/';
            if (newPage !== this.currentPage) {
                this.previousPage = this.currentPage;
                this.currentPage = newPage;
                this.trackPageView(this.currentPage, this.previousPage);
            }
        } catch (e) {
            console.warn('[Analytics] Hash change tracking error:', e);
        }
    };

    private handleVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            this.flush();
        }
    };

    private handleBeforeUnload = (): void => {
        // Track session end
        this.trackEvent('session', 'session_end', undefined, undefined, {
            duration: Math.round((Date.now() - new Date(this.sessionStartTime).getTime()) / 1000),
            pageCount: this.pageCount,
            eventCount: this.eventCount,
        });
        this.flushSync();
    };

    // --- Flush Logic ---

    /**
     * Send queued events to the backend asynchronously
     */
    async flush(): Promise<void> {
        if (this.eventQueue.length === 0) return;

        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];

        try {
            const token = localStorage.getItem(JWT_KEY);
            if (!token) return; // Don't send analytics if user is not authenticated

            const batch: AnalyticsBatch = {
                events: eventsToSend,
                session: this.getSessionInfo(),
            };

            await fetch(`${API_BASE_URL}/analytics/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(batch),
            });
        } catch (e) {
            // On failure, push events back to queue for retry
            this.eventQueue.unshift(...eventsToSend);
            console.warn('[Analytics] Flush failed, events re-queued:', e);
        }
    }

    /**
     * Synchronous flush using sendBeacon (for page unload)
     */
    private flushSync(): void {
        if (this.eventQueue.length === 0) return;

        try {
            const token = localStorage.getItem(JWT_KEY);
            if (!token) return;

            const batch: AnalyticsBatch = {
                events: [...this.eventQueue],
                session: this.getSessionInfo(),
            };

            const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });

            // sendBeacon doesn't support custom headers, so we append token as query param
            // The backend should also support token via query param for this endpoint
            navigator.sendBeacon(`${API_BASE_URL}/analytics/events?token=${token}`, blob);

            this.eventQueue = [];
        } catch (e) {
            console.warn('[Analytics] Sync flush failed:', e);
        }
    }

    private getSessionInfo(): SessionInfo {
        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            endTime: new Date().toISOString(),
            pageCount: this.pageCount,
            eventCount: this.eventCount,
            entryPage: this.entryPage,
            exitPage: this.currentPage,
            deviceType: this.deviceType,
            browser: this.browser,
            os: this.os,
        };
    }
}

// --- Singleton Export ---
export const analytics = new AnalyticsServiceImpl();
