import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Heart, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { HookCard, User } from '../types';
import * as api from '../api/client';
import { appendSeenStory, toggleTasteGenre } from '../utils/hookFeed';
import { clearHookFeedJourney, readHookFeedJourney, writeHookFeedJourney, type HookFeedJourney } from '../utils/hookFeedJourney';
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

const HookExcerpt: React.FC<{ text: string }> = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const excerptRef = useRef<HTMLQuoteElement>(null);
    useEffect(() => {
        const element = excerptRef.current;
        if (!element) return;
        const measure = () => setHasMore(element.scrollHeight > parseFloat(getComputedStyle(element).lineHeight) * 6 + 2);
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        return () => observer.disconnect();
    }, [text]);
    return <div className="wv-hook-excerpt-wrap">
        <blockquote id="hook-opening" ref={excerptRef} className={`hook-feed-excerpt ${expanded ? 'is-expanded' : ''}`}>“{text}”</blockquote>
        {hasMore && <button type="button" className="wv-hook-expand" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="hook-opening">{expanded ? 'Show a shorter opening' : 'Read the full opening'}</button>}
    </div>;
};

export const HookFeedPage: React.FC<HookFeedPageProps> = ({ currentUser, onUserUpdate, onSignIn }) => {
    const [initialJourney] = useState(readHookFeedJourney);
    const [cards, setCards] = useState<HookCard[]>([]);
    const [index, setIndex] = useState(0);
    const [seen, setSeen] = useState<string[]>(readSeenStories);
    const [genres, setGenres] = useState<string[]>([]);
    const [appliedTaste, setAppliedTaste] = useState<string[]>(initialJourney?.taste ?? currentUser?.favoriteGenres ?? []);
    const [taste, setTaste] = useState<string[]>(appliedTaste);
    const [editingTaste, setEditingTaste] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingTaste, setSavingTaste] = useState(false);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [likingChapterId, setLikingChapterId] = useState<string | null>(null);

    const tasteDialog = useRef<HTMLDialogElement>(null);
    const tasteTrigger = useRef<HTMLButtonElement>(null);
    const cardRef = useRef<HTMLElement>(null);
    const previousChapter = useRef<string | undefined>(undefined);
    const journeyRef = useRef<HookFeedJourney | null>(initialJourney);
    const feedGenerationRef = useRef(0);

    const current = cards[index];
    const remaining = cards.length - index;
    const selectedTaste = appliedTaste;
    useEffect(() => {
        if (!current) return;
        if (previousChapter.current && previousChapter.current !== current.chapterId) {
            cardRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
        previousChapter.current = current.chapterId;
    }, [current?.chapterId]);

    const loadFeed = useCallback(async (excluded = seen, requestedTaste = selectedTaste, resume = journeyRef.current) => {
        const generation = ++feedGenerationRef.current;
        setLoading(true);
        setError('');
        try {
            const result = await api.getHookFeed(resume ? excluded.filter(id => id !== resume.card.bookId) : excluded, requestedTaste, 10);
            if (generation !== feedGenerationRef.current) return;
            let opening = resume && result.items.find(card => card.bookId === resume.card.bookId && card.chapterId === resume.card.chapterId);
            if (resume && !opening) {
                // The ranking can change after sign-in. Verify the original story
                // and chapter before retaining its already public excerpt.
                const book = await api.getBookById(resume.card.bookId);
                if (generation !== feedGenerationRef.current) return;
                const chapter = book?.chapters.find(item => item.id === resume.card.chapterId && item.status === 'published');
                if (!book || book.publicationStatus !== 'published' || !chapter) {
                    journeyRef.current = null;
                    clearHookFeedJourney();
                    setCards([]);
                    throw new Error('The opening you selected is no longer available. Try again to discover other stories.');
                }
                opening = { ...resume.card, title: book.title, chapterTitle: chapter.title, authorId: book.author.id, authorName: book.author.name, coverUrl: book.coverUrl, genres: book.genres, matchedGenres: book.genres.filter(genre => requestedTaste.some(tasteGenre => tasteGenre.toLowerCase() === genre.toLowerCase())), likesCount: chapter.likesCount, liked: chapter.isLiked };
            }
            const items = opening ? [opening, ...result.items.filter(card => card.chapterId !== opening!.chapterId)] : result.items;
            setCards(items);
            setLiked(new Set(result.items.filter(card => card.liked).map(card => card.chapterId)));
            if (opening?.liked) setLiked(previous => new Set(previous).add(opening!.chapterId));
            setIndex(0);
            if (resume?.pendingLike && currentUser && opening) {
                if (opening.liked) {
                    journeyRef.current = writeHookFeedJourney({ card: opening, taste: requestedTaste, pendingLike: false });
                } else {
                    setLikingChapterId(opening.chapterId);
                    try {
                        const updated = await api.toggleChapterLike(opening.bookId, opening.chapterId);
                        if (generation !== feedGenerationRef.current) return;
                        const chapter = updated.chapters.find(item => item.id === opening!.chapterId);
                        if (!chapter?.isLiked) throw new Error('The server could not confirm your like. Please retry.');
                        const confirmed = { ...opening, likesCount: chapter.likesCount, liked: true };
                        setCards(previous => previous.map(card => card.chapterId === confirmed.chapterId ? confirmed : card));
                        setLiked(previous => new Set(previous).add(confirmed.chapterId));
                        journeyRef.current = writeHookFeedJourney({ card: confirmed, taste: requestedTaste, pendingLike: false });
                    } catch (likeError) {
                        if (generation === feedGenerationRef.current) setError(`Your opening is ready, but the like could not be saved. ${likeError instanceof Error ? likeError.message : 'Please retry.'}`);
                    } finally {
                        if (generation === feedGenerationRef.current) setLikingChapterId(null);
                    }
                }
            }
        } catch (feedError) {
            if (generation === feedGenerationRef.current) setError(feedError instanceof Error ? feedError.message : 'The Hook Feed could not be loaded.');
        } finally {
            if (generation === feedGenerationRef.current) setLoading(false);
        }
    }, [seen, selectedTaste, currentUser?.id]);

    useEffect(() => {
        api.getGenres().then(setGenres).catch(() => setGenres([
            'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Science Fiction', 'Horror', 'Adventure', 'Literary Fiction'
        ]));
    }, []);

    useEffect(() => {
        void loadFeed();
        return () => { feedGenerationRef.current++; };
        // Taste saves reload explicitly; sign-in verifies the stored opening.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    useEffect(() => {
        if (!current || loading) return;
        const pendingLike = journeyRef.current?.pendingLike === true && journeyRef.current.card.chapterId === current.chapterId;
        journeyRef.current = writeHookFeedJourney({ card: { ...current, liked: liked.has(current.chapterId) }, taste: appliedTaste, pendingLike });
    }, [current, loading, liked, appliedTaste]);

    const rememberSeen = useCallback((bookId: string) => {
        setSeen(previous => {
            const next = appendSeenStory(previous, bookId);
            try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* Continue without persistent history when browser storage is unavailable. */ }
            return next;
        });
    }, []);

    const advance = useCallback(() => {
        if (!current) return;
        setError('');
        journeyRef.current = null;
        clearHookFeedJourney();
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
            setAppliedTaste(taste);
            journeyRef.current = null;
            clearHookFeedJourney();
            await loadFeed(seen, taste, null);
            return;
        }
        setSavingTaste(true);
        setError('');
        try {
            const saved = await api.saveReaderTaste(taste);
            onUserUpdate({ ...currentUser, favoriteGenres: saved });
            setAppliedTaste(saved);
            setEditingTaste(false);
            journeyRef.current = null;
            clearHookFeedJourney();
            await loadFeed(seen, saved, null);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Could not save your genres.');
        } finally {
            setSavingTaste(false);
        }
    };

    const toggleLike = async () => {
        if (!current || likingChapterId === current.chapterId) return;
        if (!currentUser) {
            journeyRef.current = writeHookFeedJourney({ card: current, taste: appliedTaste, pendingLike: true });
            onSignIn();
            return;
        }
        const wasLiked = liked.has(current.chapterId);
        const previousCount = current.likesCount;
        setError('');
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
            const updated = await api.toggleChapterLike(current.bookId, current.chapterId);
            const chapter = updated.chapters.find(item => item.id === current.chapterId);
            if (!chapter) throw new Error('The server could not confirm your reaction. Please retry.');
            setCards(previous => previous.map(card => card.chapterId === current.chapterId ? { ...card, likesCount: chapter.likesCount, liked: chapter.isLiked } : card));
            setLiked(previous => { const next = new Set(previous); chapter.isLiked ? next.add(current.chapterId) : next.delete(current.chapterId); return next; });
            journeyRef.current = writeHookFeedJourney({ card: { ...current, likesCount: chapter.likesCount, liked: chapter.isLiked }, taste: appliedTaste, pendingLike: false });
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
        journeyRef.current = null;
        clearHookFeedJourney();
        void loadFeed([], selectedTaste, null);
    };

    return (
        <div className="wv-support wv-hooks">
            <main className="wv-support-shell">
                <header className="wv-hook-header wv-pagehead">
                    <div><p className="wv-eyebrow">Hook Feed</p><h1>Find your next read.</h1><p className="wv-lead">Read a short opening, then open the story or move to the next one.</p></div>
                    <button type="button" ref={tasteTrigger} onClick={() => { setTaste(appliedTaste); setEditingTaste(true); }} className="wv-button"><SlidersHorizontal size={17} /> Tune my feed</button>
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
                {loading ? <section className="wv-hook-loading" role="status"><p>{likingChapterId ? 'Saving your like on the selected opening…' : 'Loading openings…'}</p><div className="wv-hook-loading-lines" aria-hidden="true"><span /><span /><span /></div></section> : current ? <article className="wv-hook-card" ref={cardRef}>
                    <div className="wv-hook-art">{current.coverUrl ? <ResilientImage src={current.coverUrl} alt={`Cover of ${current.title}`} fallbackLabel={current.title} variant="cover" className="wv-hook-cover" loading="eager" /> : <div className="wv-hook-art-empty"><BookOpen size={44} aria-hidden="true" /><span>Cover unavailable</span></div>}</div>
                    <div className="wv-hook-reading">
                        <div className="wv-hook-meta"><span>{current.chapterTitle}</span><span>{current.readingMinutes} min chapter</span></div>
                        <h2>{current.title}</h2><a className="wv-hook-author" href={`/author/${current.authorId}`}>by {current.authorName}</a>
                        {current.matchedGenres.length > 0 && <p className="wv-hook-match">Matched to {current.matchedGenres.join(' + ')}</p>}
                        <HookExcerpt key={current.chapterId} text={current.excerpt} />
                        <div className="wv-hook-bottom"><div className="wv-hook-tags"><div>{current.genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div><button type="button" disabled={likingChapterId === current.chapterId} onClick={() => void toggleLike()} className={`wv-hook-like ${liked.has(current.chapterId) ? 'is-liked' : ''}`} aria-pressed={liked.has(current.chapterId)} aria-label={liked.has(current.chapterId) ? 'Unlike this opening' : 'Like this opening'}><Heart size={17} fill={liked.has(current.chapterId) ? 'currentColor' : 'none'} /> {current.likesCount}</button></div>
                            <div className="wv-hook-actions"><button type="button" onClick={advance} className="wv-button"><X size={16} /> Not for me</button><button type="button" onClick={openStory} className="wv-button wv-button-primary">Open story <ArrowRight size={18} /></button></div><p className="wv-hook-keyboard">Keyboard: ← skip · → open</p>
                        </div>
                    </div>
                </article> : !error ? <section className="wv-empty wv-hook-empty"><RotateCcw size={30} aria-hidden="true" /><h2>No more openings for now.</h2><p>Reset your recent history to reshuffle the feed, or choose different genres.</p><div className="wv-actions"><button type="button" onClick={reshuffle} className="wv-button wv-button-primary">Reshuffle openings <RotateCcw size={16} /></button><a href="/category" className="wv-button">Browse stories</a></div></section> : null}
            </main><Footer />
        </div>
    );
};
