import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Heart, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { HookCard, User } from '../types';
import * as api from '../api/client';
import { appendSeenStory, toggleTasteGenre } from '../utils/hookFeed';
import { Footer } from '../components/Footer';
import { ResilientImage } from '../components/ResilientImage';
import '../styles/support-v2.css';

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
    const [editingTaste, setEditingTaste] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingTaste, setSavingTaste] = useState(false);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [likingChapterId, setLikingChapterId] = useState<string | null>(null);

    const tasteDialog = useRef<HTMLDialogElement>(null);
    const tasteTrigger = useRef<HTMLButtonElement>(null);

    const current = cards[index];
    const remaining = cards.length - index;
    const selectedTaste = currentUser?.favoriteGenres?.length ? currentUser.favoriteGenres : taste;

    const loadFeed = useCallback(async (excluded = seen, requestedTaste = selectedTaste) => {
        setLoading(true);
        setError('');
        try {
            const result = await api.getHookFeed(excluded, requestedTaste, 10);
            setCards(result.items);
            setLiked(new Set(result.items.filter(card => card.liked).map(card => card.chapterId)));
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
            try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* Continue without persistent history when browser storage is unavailable. */ }
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
            if (target?.closest('input, textarea, select, button, a') || target?.isContentEditable) return;
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
        if (!current || likingChapterId === current.chapterId) return;
        if (!currentUser) { onSignIn(); return; }
        const wasLiked = liked.has(current.chapterId);
        const previousCount = current.likesCount;
        setLikingChapterId(current.chapterId);
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
        } catch (likeError) {
            setLiked(previous => {
                const next = new Set(previous);
                wasLiked ? next.add(current.chapterId) : next.delete(current.chapterId);
                return next;
            });
            setCards(previous => previous.map(card => card.chapterId === current.chapterId
                ? { ...card, likesCount: previousCount }
                : card));
            setError(likeError instanceof Error ? likeError.message : 'Could not update your like. Please retry.');
        } finally {
            setLikingChapterId(null);
        }
    };

    const catalog = useMemo(() => genres, [genres]);

    useEffect(() => {
        if (!editingTaste || !tasteDialog.current) return;
        const dialog = tasteDialog.current;
        dialog.showModal();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { dialog.close(); document.body.style.overflow = previousOverflow; tasteTrigger.current?.focus(); };
    }, [editingTaste]);

    const reshuffle = () => {
        try { localStorage.removeItem(SEEN_KEY); } catch { /* History still resets in this session. */ }
        setSeen([]);
        void loadFeed([], selectedTaste);
    };

    return (
        <div className="wv-support wv-hooks">
            <main className="wv-support-shell">
                <header className="wv-hook-header wv-pagehead">
                    <div><p className="wv-eyebrow">Hook Feed</p><h1>Find your next read.</h1><p className="wv-lead">Read a short opening, then open the story or move to the next one.</p></div>
                    <button type="button" ref={tasteTrigger} onClick={() => { setTaste(currentUser?.favoriteGenres || taste); setEditingTaste(true); }} className="wv-button"><SlidersHorizontal size={17} /> Tune my feed</button>
                </header>
                {editingTaste && <dialog ref={tasteDialog} className="wv-taste-dialog" aria-labelledby="taste-heading" role="dialog" aria-modal="true" onCancel={event => { event.preventDefault(); setEditingTaste(false); }} onClick={event => { if (event.target === event.currentTarget) setEditingTaste(false); }}>
                    <section className="wv-taste-panel">
                        <div className="wv-taste-header"><div><p className="wv-eyebrow">Your reading taste</p><h2 id="taste-heading">Choose genres</h2><p>Pick up to eight. You can change these any time.</p></div><button type="button" onClick={() => setEditingTaste(false)} aria-label="Close taste settings" className="wv-icon-button"><X size={21} /></button></div>
                        <div className="wv-taste-genres">{catalog.map(genre => { const selected = taste.some(value => value.toLowerCase() === genre.toLowerCase()); return <button type="button" key={genre} onClick={() => setTaste(previous => toggleTasteGenre(previous, genre))} aria-pressed={selected}>{genre}</button>; })}</div>
                        <div className="wv-taste-footer"><span>{taste.length}/8 selected</span><button type="button" disabled={!taste.length || savingTaste} onClick={() => void saveTaste()} className="wv-button wv-button-primary">{savingTaste ? 'Saving…' : currentUser ? 'Save my taste' : 'Use these genres'}</button></div>
                        {error && <p className="wv-error" role="alert">{error}</p>}
                    </section>
                </dialog>}
                {error && <div role="alert" className="wv-error wv-hook-error">{error}<button type="button" className="wv-button" onClick={() => void loadFeed()}>Try again</button></div>}
                {loading ? <section className="wv-hook-loading" role="status"><p>Loading openings…</p><div className="wv-hook-loading-lines" aria-hidden="true"><span /><span /><span /></div></section> : current ? <article className="wv-hook-card">
                    <div className="wv-hook-art">{current.coverUrl ? <ResilientImage src={current.coverUrl} alt={`Cover of ${current.title}`} fallbackLabel={current.title} variant="cover" className="wv-hook-cover" loading="eager" /> : <div className="wv-hook-art-empty"><BookOpen size={44} aria-hidden="true" /><span>Cover unavailable</span></div>}</div>
                    <div className="wv-hook-reading">
                        <div className="wv-hook-meta"><span>{current.chapterTitle}</span><span>{current.readingMinutes} min chapter</span></div>
                        <h2>{current.title}</h2><a className="wv-hook-author" href={`/author/${current.authorId}`}>by {current.authorName}</a>
                        {current.matchedGenres.length > 0 && <p className="wv-hook-match">Matched to {current.matchedGenres.join(' + ')}</p>}
                        <blockquote className="hook-feed-excerpt">“{current.excerpt}”</blockquote>
                        <div className="wv-hook-bottom"><div className="wv-hook-tags"><div>{current.genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div><button type="button" disabled={likingChapterId === current.chapterId} onClick={() => void toggleLike()} className={`wv-hook-like ${liked.has(current.chapterId) ? 'is-liked' : ''}`} aria-pressed={liked.has(current.chapterId)} aria-label={liked.has(current.chapterId) ? 'Unlike this opening' : 'Like this opening'}><Heart size={17} fill={liked.has(current.chapterId) ? 'currentColor' : 'none'} /> {current.likesCount}</button></div>
                            <div className="wv-hook-actions"><button type="button" onClick={advance} className="wv-button"><X size={16} /> Not for me</button><button type="button" onClick={openStory} className="wv-button wv-button-primary">Open story <ArrowRight size={18} /></button></div><p className="wv-hook-keyboard">Keyboard: ← skip · → open</p>
                        </div>
                    </div>
                </article> : !error ? <section className="wv-empty wv-hook-empty"><RotateCcw size={30} aria-hidden="true" /><h2>No more openings for now.</h2><p>Reset your recent history to reshuffle the feed, or choose different genres.</p><div className="wv-actions"><button type="button" onClick={reshuffle} className="wv-button wv-button-primary">Reshuffle openings <RotateCcw size={16} /></button><a href="/category" className="wv-button">Browse stories</a></div></section> : null}
            </main><Footer />
        </div>
    );
};
