import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Heart, RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { HookCard, User } from '../types';
import * as api from '../api/client';
import { appendSeenStory, toggleTasteGenre } from '../utils/hookFeed';

const SEEN_KEY = 'ww_hook_feed_seen';

interface HookFeedPageProps {
    currentUser: User | null;
    onUserUpdate: (user: User) => void;
    onSignIn: () => void;
}

function readSeenStories(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string').slice(-60) : [];
    } catch {
        return [];
    }
}

export const HookFeedPage: React.FC<HookFeedPageProps> = ({ currentUser, onUserUpdate, onSignIn }) => {
    const [cards, setCards] = useState<HookCard[]>([]);
    const [index, setIndex] = useState(0);
    const [seen, setSeen] = useState<string[]>(readSeenStories);
    const [genres, setGenres] = useState<string[]>([]);
    const [taste, setTaste] = useState<string[]>(currentUser?.favoriteGenres || []);
    const [editingTaste, setEditingTaste] = useState((currentUser?.favoriteGenres?.length || 0) === 0);
    const [loading, setLoading] = useState(true);
    const [savingTaste, setSavingTaste] = useState(false);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState<Set<string>>(new Set());

    const current = cards[index];
    const remaining = cards.length - index;
    const selectedTaste = currentUser?.favoriteGenres?.length ? currentUser.favoriteGenres : taste;

    const loadFeed = useCallback(async (excluded = seen, requestedTaste = selectedTaste) => {
        setLoading(true);
        setError('');
        try {
            const result = await api.getHookFeed(excluded, requestedTaste, 10);
            setCards(result.items);
            setIndex(0);
        } catch (feedError) {
            setError(feedError instanceof Error ? feedError.message : 'The Hook Feed could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [seen, selectedTaste]);

    useEffect(() => {
        api.getGenres().then(setGenres).catch(() => setGenres([
            'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Science Fiction', 'Horror', 'Adventure', 'Literary Fiction'
        ]));
    }, []);

    useEffect(() => {
        void loadFeed();
        // The feed reloads after an explicit taste save; seen items are advanced locally.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.favoriteGenres?.join('|')]);

    const rememberSeen = useCallback((bookId: string) => {
        setSeen(previous => {
            const next = appendSeenStory(previous, bookId);
            localStorage.setItem(SEEN_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const advance = useCallback(() => {
        if (!current) return;
        rememberSeen(current.bookId);
        if (remaining > 1) {
            setIndex(value => value + 1);
        } else {
            const nextSeen = appendSeenStory(seen, current.bookId);
            void loadFeed(nextSeen);
        }
    }, [current, loadFeed, rememberSeen, remaining, seen]);

    const openStory = useCallback(() => {
        if (!current) return;
        rememberSeen(current.bookId);
        window.location.hash = `/book/${current.bookId}`;
    }, [current, rememberSeen]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (editingTaste || !current) return;
            const target = event.target as HTMLElement | null;
            if (target?.matches('input, textarea, select, button')) return;
            if (event.key === 'ArrowLeft') { event.preventDefault(); advance(); }
            if (event.key === 'ArrowRight' || event.key === 'Enter') { event.preventDefault(); openStory(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [advance, current, editingTaste, openStory]);

    const saveTaste = async () => {
        if (!taste.length) return;
        if (!currentUser) {
            setEditingTaste(false);
            await loadFeed(seen, taste);
            return;
        }
        setSavingTaste(true);
        setError('');
        try {
            const saved = await api.saveReaderTaste(taste);
            onUserUpdate({ ...currentUser, favoriteGenres: saved });
            setEditingTaste(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Could not save your genres.');
        } finally {
            setSavingTaste(false);
        }
    };

    const toggleLike = async () => {
        if (!current) return;
        if (!currentUser) { onSignIn(); return; }
        const wasLiked = liked.has(current.chapterId);
        setLiked(previous => {
            const next = new Set(previous);
            wasLiked ? next.delete(current.chapterId) : next.add(current.chapterId);
            return next;
        });
        setCards(previous => previous.map(card => card.chapterId === current.chapterId
            ? { ...card, likesCount: Math.max(0, card.likesCount + (wasLiked ? -1 : 1)) }
            : card));
        try {
            await api.toggleChapterLike(current.bookId, current.chapterId);
        } catch {
            setLiked(previous => {
                const next = new Set(previous);
                wasLiked ? next.add(current.chapterId) : next.delete(current.chapterId);
                return next;
            });
        }
    };

    const catalog = useMemo(() => genres.slice(0, 24), [genres]);

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top,_rgba(141,110,99,0.13),_transparent_38%)] px-4 py-8 sm:py-12">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            <Sparkles className="h-3.5 w-3.5" /> Opening lines, not algorithms
                        </div>
                        <h1 className="font-serif text-4xl font-bold text-text-rich dark:text-dark-text-rich sm:text-5xl">Find your next obsession.</h1>
                        <p className="mt-2 max-w-2xl text-text-body dark:text-dark-text-body">Read the opening before you judge the cover. Skip freely; open a story when the writing catches you.</p>
                    </div>
                    <button onClick={() => { setTaste(currentUser?.favoriteGenres || taste); setEditingTaste(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-surface px-4 py-2.5 text-sm font-semibold text-text-rich transition hover:border-accent dark:bg-dark-surface dark:text-dark-text-rich">
                        <SlidersHorizontal className="h-4 w-4" /> Tune my feed
                    </button>
                </header>

                {editingTaste && (
                    <section className="mb-7 rounded-3xl border border-accent/20 bg-surface p-5 shadow-sm dark:bg-dark-surface sm:p-7" aria-labelledby="taste-heading">
                        <div className="flex items-start justify-between gap-4">
                            <div><h2 id="taste-heading" className="font-serif text-2xl font-bold text-text-rich dark:text-dark-text-rich">What do you reach for?</h2><p className="mt-1 text-sm text-text-body dark:text-dark-text-body">Pick up to eight. This is the only signal used to personalize your Hook Feed.</p></div>
                            {(currentUser?.favoriteGenres?.length || 0) > 0 && <button onClick={() => setEditingTaste(false)} aria-label="Close taste settings" className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {catalog.map(genre => {
                                const selected = taste.some(value => value.toLowerCase() === genre.toLowerCase());
                                return <button key={genre} onClick={() => setTaste(previous => toggleTasteGenre(previous, genre))} aria-pressed={selected} className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${selected ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-background text-text-body hover:border-accent/60 dark:border-dark-border dark:bg-dark-background dark:text-dark-text-body'}`}>{genre}</button>;
                            })}
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-text-body dark:text-dark-text-body">{taste.length}/8 selected</span><button disabled={!taste.length || savingTaste} onClick={() => void saveTaste()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">{savingTaste ? 'Saving…' : currentUser ? 'Save my taste' : 'Use these genres'}</button></div>
                    </section>
                )}

                {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

                {loading ? (
                    <div className="flex min-h-[430px] items-center justify-center rounded-[2rem] border border-gray-200 bg-surface dark:border-dark-border dark:bg-dark-surface" role="status"><div className="flex items-center gap-2 text-text-body dark:text-dark-text-body"><Sparkles className="h-5 w-5 animate-pulse text-accent" /> Gathering strong openings…</div></div>
                ) : current ? (
                    <article className="overflow-hidden rounded-[2rem] border border-gray-200 bg-surface shadow-xl shadow-black/5 dark:border-dark-border dark:bg-dark-surface md:grid md:grid-cols-[280px_1fr]">
                        <div className="relative min-h-64 bg-gradient-to-br from-primary via-accent to-amber-700 md:min-h-[520px]">
                            {current.coverUrl && <img src={current.coverUrl} alt={`Cover of ${current.title}`} className="absolute inset-0 h-full w-full object-cover" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 p-6 text-white"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{current.chapterTitle}</p><h2 className="mt-2 font-serif text-3xl font-bold leading-tight">{current.title}</h2><p className="mt-2 text-sm text-white/80">by {current.authorName}</p></div>
                        </div>
                        <div className="flex min-h-[520px] flex-col p-6 sm:p-9">
                            <div className="flex flex-wrap gap-2">
                                {current.matchedGenres.length > 0 && <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Matched: {current.matchedGenres.join(' + ')}</span>}
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-text-body dark:bg-white/10 dark:text-dark-text-body">{current.readingMinutes} min chapter</span>
                            </div>
                            <blockquote className="my-auto py-8 font-serif text-2xl leading-relaxed text-text-rich dark:text-dark-text-rich sm:text-[1.72rem]">“{current.excerpt}”</blockquote>
                            <div className="border-t border-gray-100 pt-5 dark:border-dark-border">
                                <div className="mb-5 flex items-center justify-between"><div className="flex flex-wrap gap-1.5">{current.genres.slice(0, 3).map(genre => <span key={genre} className="text-xs text-text-body dark:text-dark-text-body">#{genre.replace(/\s+/g, '')}</span>)}</div><button onClick={() => void toggleLike()} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${liked.has(current.chapterId) ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`} aria-label="Like this opening"><Heart className={`h-4 w-4 ${liked.has(current.chapterId) ? 'fill-current' : ''}`} /> {current.likesCount}</button></div>
                                <div className="grid grid-cols-2 gap-3"><button onClick={advance} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-text-body transition hover:border-accent hover:text-accent dark:border-dark-border dark:text-dark-text-body"><X className="h-4 w-4" /> Not for me</button><button onClick={openStory} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-white transition hover:bg-accent"><BookOpen className="h-4 w-4" /> Open story <ArrowRight className="h-4 w-4" /></button></div>
                                <p className="mt-3 text-center text-[11px] text-text-body/60 dark:text-dark-text-body/60">Keyboard: ← skip · → open</p>
                            </div>
                        </div>
                    </article>
                ) : (
                    <div className="rounded-[2rem] border border-gray-200 bg-surface px-6 py-20 text-center dark:border-dark-border dark:bg-dark-surface"><RotateCcw className="mx-auto h-9 w-9 text-accent" /><h2 className="mt-4 font-serif text-2xl font-bold text-text-rich dark:text-dark-text-rich">You caught every opening in this stack.</h2><p className="mx-auto mt-2 max-w-md text-text-body dark:text-dark-text-body">Reset your recent history to reshuffle the feed, or tune your genres for a different shelf.</p><button onClick={() => { localStorage.removeItem(SEEN_KEY); setSeen([]); void loadFeed([], selectedTaste); }} className="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-accent">Reshuffle openings</button></div>
                )}
            </div>
        </div>
    );
};
