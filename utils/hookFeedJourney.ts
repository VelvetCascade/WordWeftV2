import type { HookCard } from '../types';

export const HOOK_JOURNEY_KEY = 'ww_hook_feed_journey';
const MAX_AGE_MS = 60 * 60 * 1000;

export interface HookFeedJourney {
    updatedAt: number;
    taste: string[];
    card: HookCard;
    pendingLike: boolean;
}

/** Keep the public opening and its unfinished action in this tab only. */
export function readHookFeedJourney(): HookFeedJourney | null {
    try {
        const value = JSON.parse(sessionStorage.getItem(HOOK_JOURNEY_KEY) || 'null');
        const card = value?.card;
        const strings = (items: unknown) => Array.isArray(items) && items.length <= 60 && items.every(item => typeof item === 'string' && item.length <= 200);
        const identifier = (item: unknown) => typeof item === 'string' && item.length > 0 && item.length <= 200 && !/[\s/\\\u0000-\u001f]/.test(item);
        if (!value || !Number.isFinite(value.updatedAt) || value.updatedAt < Date.now() - MAX_AGE_MS || value.updatedAt > Date.now() + 60_000
            || !strings(value.taste) || value.taste.length > 8 || !card || !identifier(card.bookId) || !identifier(card.chapterId)
            || !identifier(card.authorId) || typeof card.title !== 'string' || typeof card.chapterTitle !== 'string'
            || typeof card.authorName !== 'string' || typeof card.excerpt !== 'string' || card.excerpt.length > 5000
            || !strings(card.genres) || !strings(card.matchedGenres) || !Number.isFinite(card.likesCount) || card.likesCount < 0
            || !Number.isFinite(card.readingMinutes) || !Number.isFinite(card.wordCount) || typeof card.liked !== 'boolean') {
            clearHookFeedJourney();
            return null;
        }
        return { updatedAt: value.updatedAt, taste: value.taste, card, pendingLike: value.pendingLike === true };
    } catch {
        return null;
    }
}

export function writeHookFeedJourney(journey: Omit<HookFeedJourney, 'updatedAt'>): HookFeedJourney {
    const value = { ...journey, updatedAt: Date.now() };
    try { sessionStorage.setItem(HOOK_JOURNEY_KEY, JSON.stringify(value)); } catch { /* Keep the current session usable when storage is unavailable. */ }
    return value;
}

export function clearHookFeedJourney() {
    try { sessionStorage.removeItem(HOOK_JOURNEY_KEY); } catch { /* The live feed can still advance. */ }
}
