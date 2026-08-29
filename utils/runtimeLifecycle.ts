export type ReaderContentTheme = 'light' | 'dark' | 'sepia';
export type ReaderFontPreference = 'literary' | 'modern';
export type ReaderWidthPreference = 'narrow' | 'standard' | 'wide';
export type ReaderLineHeight = 1.65 | 1.85 | 2.05;

export interface ReaderPreferences {
    fontSize: number;
    contentTheme: ReaderContentTheme;
    readerFont: ReaderFontPreference;
    readerWidth: ReaderWidthPreference;
    lineHeight: ReaderLineHeight;
}

const contentThemes: ReaderContentTheme[] = ['light', 'dark', 'sepia'];
const readerFonts: ReaderFontPreference[] = ['literary', 'modern'];
const readerWidths: ReaderWidthPreference[] = ['narrow', 'standard', 'wide'];
const lineHeights: ReaderLineHeight[] = [1.65, 1.85, 2.05];

export function readReaderPreferences(
    storedValue: string | null,
    siteTheme: 'light' | 'dark',
): ReaderPreferences {
    const defaults: ReaderPreferences = {
        fontSize: 18,
        contentTheme: siteTheme,
        readerFont: 'literary',
        readerWidth: 'standard',
        lineHeight: 1.85,
    };

    if (!storedValue) return defaults;

    try {
        const saved = JSON.parse(storedValue) as Partial<ReaderPreferences>;
        return {
            fontSize: typeof saved.fontSize === 'number' && Number.isFinite(saved.fontSize)
                ? Math.min(32, Math.max(12, saved.fontSize))
                : defaults.fontSize,
            contentTheme: contentThemes.includes(saved.contentTheme as ReaderContentTheme)
                ? saved.contentTheme as ReaderContentTheme
                : defaults.contentTheme,
            readerFont: readerFonts.includes(saved.readerFont as ReaderFontPreference)
                ? saved.readerFont as ReaderFontPreference
                : defaults.readerFont,
            readerWidth: readerWidths.includes(saved.readerWidth as ReaderWidthPreference)
                ? saved.readerWidth as ReaderWidthPreference
                : defaults.readerWidth,
            lineHeight: lineHeights.includes(saved.lineHeight as ReaderLineHeight)
                ? saved.lineHeight as ReaderLineHeight
                : defaults.lineHeight,
        };
    } catch {
        return defaults;
    }
}

export function createLatestRequestGate() {
    let latestRequest = 0;

    return {
        begin: () => ++latestRequest,
        isLatest: (request: number) => request === latestRequest,
        invalidate: () => { latestRequest += 1; },
    };
}

export function createReconnectController(reconnect: () => void, delayMs = 5000) {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    return {
        schedule: () => {
            if (disposed) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                if (!disposed) reconnect();
            }, delayMs);
        },
        dispose: () => {
            disposed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = null;
        },
    };
}
