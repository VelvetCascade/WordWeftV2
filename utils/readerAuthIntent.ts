export type ReaderAuthView = 'login' | 'signup';
export type ReaderGateSource = 'preview' | 'locked_chapter';

export interface ReaderAuthIntent {
    returnPath: string;
    bookId: string;
    chapterId: string;
    chapterIndex: number;
    source: ReaderGateSource;
    authView: ReaderAuthView;
    scrollY: number;
    createdAt: number;
    completed: boolean;
}

export interface ReaderAuthIntentInput {
    returnPath: string;
    bookId: string;
    chapterId: string;
    chapterIndex?: number;
    source?: ReaderGateSource;
    authView?: ReaderAuthView;
    scrollY?: number;
    now?: number;
}

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

const STORAGE_KEY = 'ww_reader_auth_intent';
const MAX_AGE_MS = 30 * 60_000;

export const readerChapterPath = (bookId: string, chapterId: string) =>
    `/book/${encodeURIComponent(bookId)}/chapter/${encodeURIComponent(chapterId)}`;

export function createReaderAuthIntent(input: ReaderAuthIntentInput): ReaderAuthIntent | null {
    if (!input.bookId || !input.chapterId) return null;
    const returnPath = readerChapterPath(input.bookId, input.chapterId);
    if (input.returnPath !== returnPath) return null;

    return {
        returnPath,
        bookId: input.bookId,
        chapterId: input.chapterId,
        chapterIndex: finiteNonNegativeInteger(input.chapterIndex),
        source: input.source === 'locked_chapter' ? 'locked_chapter' : 'preview',
        authView: input.authView === 'signup' ? 'signup' : 'login',
        scrollY: finiteNonNegativeInteger(input.scrollY),
        createdAt: Number.isFinite(input.now) ? Number(input.now) : Date.now(),
        completed: false,
    };
}

export function isReaderAuthIntentFresh(intent: ReaderAuthIntent, now = Date.now()): boolean {
    return Number.isFinite(intent.createdAt)
        && intent.createdAt <= now
        && now - intent.createdAt <= MAX_AGE_MS
        && intent.returnPath === readerChapterPath(intent.bookId, intent.chapterId);
}

export function saveReaderAuthIntent(
    input: ReaderAuthIntentInput,
    storage: StorageLike | null = browserSessionStorage(),
): ReaderAuthIntent | null {
    const intent = createReaderAuthIntent(input);
    if (!intent || !storage) return intent;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(intent));
    } catch {
        // Authentication still works when session storage is unavailable.
    }
    return intent;
}

export function readReaderAuthIntent(
    storage: StorageLike | null = browserSessionStorage(),
    now = Date.now(),
): ReaderAuthIntent | null {
    if (!storage) return null;
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<ReaderAuthIntent>;
        const normalized = createReaderAuthIntent({
            returnPath: typeof value.returnPath === 'string' ? value.returnPath : '',
            bookId: typeof value.bookId === 'string' ? value.bookId : '',
            chapterId: typeof value.chapterId === 'string' ? value.chapterId : '',
            chapterIndex: value.chapterIndex,
            source: value.source,
            authView: value.authView,
            scrollY: value.scrollY,
            now: value.createdAt,
        });
        if (!normalized || !isReaderAuthIntentFresh(normalized, now)) {
            storage.removeItem(STORAGE_KEY);
            return null;
        }
        normalized.completed = value.completed === true;
        return normalized;
    } catch {
        try { storage.removeItem(STORAGE_KEY); } catch { /* best effort */ }
        return null;
    }
}

export function markReaderAuthComplete(storage: StorageLike | null = browserSessionStorage()): ReaderAuthIntent | null {
    const intent = readReaderAuthIntent(storage);
    if (!intent || !storage) return intent;
    intent.completed = true;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(intent)); } catch { /* best effort */ }
    return intent;
}

export function consumeReaderResumeIntent(
    bookId: string,
    chapterId: string,
    storage: StorageLike | null = browserSessionStorage(),
): ReaderAuthIntent | null {
    const intent = readReaderAuthIntent(storage);
    if (!intent || !storage) return null;
    if (!intent.completed || intent.bookId !== bookId || intent.chapterId !== chapterId) {
        try { storage.removeItem(STORAGE_KEY); } catch { /* best effort */ }
        return null;
    }
    try { storage.removeItem(STORAGE_KEY); } catch { /* best effort */ }
    return intent;
}

export function clearReaderAuthIntent(storage: StorageLike | null = browserSessionStorage()): void {
    try { storage?.removeItem(STORAGE_KEY); } catch { /* best effort */ }
}

function finiteNonNegativeInteger(value: number | undefined): number {
    return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function browserSessionStorage(): StorageLike | null {
    try {
        return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
        return null;
    }
}
