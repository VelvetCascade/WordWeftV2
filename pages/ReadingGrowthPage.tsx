import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookMarked, CalendarDays, Check, Send, Sparkles, Target, Trophy } from 'lucide-react';
import type { Book, GenreEvent, ReadingChallenge, User } from '../types';
import * as api from '../api/client';
import { challengeStatusLabel, eventTimingLabel } from '../utils/readingGrowth';

interface ReadingGrowthPageProps {
    currentUser: User | null;
    onSignIn: () => void;
}

export const ReadingGrowthPage: React.FC<ReadingGrowthPageProps> = ({ currentUser, onSignIn }) => {
    const [challenges, setChallenges] = useState<ReadingChallenge[]>([]);
    const [events, setEvents] = useState<GenreEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState('');
    const [submitting, setSubmitting] = useState('');
    const [selectedStories, setSelectedStories] = useState<Record<string, string>>({});
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [publicEvents, personalChallenges] = await Promise.all([
                    api.getGenreEvents(),
                    currentUser ? api.getReadingChallenges() : Promise.resolve([]),
                ]);
                setEvents(publicEvents);
                setChallenges(personalChallenges);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Reading goals could not be loaded.');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [currentUser?.id]);

    const writtenBooks = useMemo(() => currentUser?.writtenBooks || [], [currentUser?.writtenBooks]);

    const eligibleBooks = (event: GenreEvent): Book[] => writtenBooks.filter(book =>
        book.publicationStatus === 'published'
        && book.genres.some(genre => genre.toLowerCase() === event.genre.toLowerCase())
        && !event.stories.some(story => story.bookId === book.id));

    const join = async (challengeId: string) => {
        if (!currentUser) { onSignIn(); return; }
        setJoining(challengeId);
        setError('');
        try {
            const updated = await api.joinReadingChallenge(challengeId);
            setChallenges(previous => previous.map(item => item.id === updated.id ? updated : item));
        } catch (joinError) {
            setError(joinError instanceof Error ? joinError.message : 'Could not join this challenge.');
        } finally {
            setJoining('');
        }
    };

    const submit = async (event: GenreEvent) => {
        if (!currentUser) { onSignIn(); return; }
        const bookId = selectedStories[event.id] || eligibleBooks(event)[0]?.id;
        if (!bookId) return;
        setSubmitting(event.id);
        setError('');
        try {
            const updated = await api.submitStoryToGenreEvent(event.id, bookId);
            setEvents(previous => previous.map(item => item.id === updated.id ? updated : item));
            setSelectedStories(previous => ({ ...previous, [event.id]: '' }));
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Could not submit this story.');
        } finally {
            setSubmitting('');
        }
    };

    return (
        <div className="min-h-screen bg-background px-4 py-10 dark:bg-dark-background sm:py-14">
            <div className="mx-auto max-w-6xl">
                <header className="rounded-[2rem] bg-gradient-to-br from-primary via-[#5b4038] to-accent px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"><Trophy className="h-4 w-4" /> Read with purpose</div>
                    <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold sm:text-6xl">Small goals. Fresh voices. More stories finished.</h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">Take on a private reading goal or explore a staff-curated genre event. Your pace and your progress stay yours.</p>
                </header>

                {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

                <section className="py-10" aria-labelledby="challenges-title">
                    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Just for you</p><h2 id="challenges-title" className="mt-1 font-serif text-3xl font-bold text-text-rich dark:text-dark-text-rich">Reading challenges</h2></div>{currentUser && <p className="hidden text-sm text-text-body dark:text-dark-text-body sm:block">Progress updates as you finish chapters.</p>}</div>
                    {!currentUser ? (
                        <div className="rounded-3xl border border-accent/20 bg-surface p-8 text-center dark:bg-dark-surface"><Target className="mx-auto h-9 w-9 text-accent" /><h3 className="mt-3 font-serif text-2xl font-bold text-text-rich dark:text-dark-text-rich">Keep a goal that travels with you</h3><p className="mx-auto mt-2 max-w-xl text-text-body dark:text-dark-text-body">Join WordWeft to track chapter, reading-time, and story-completion challenges automatically.</p><button onClick={onSignIn} className="mt-5 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-accent">Sign in to join</button></div>
                    ) : loading ? (
                        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="h-56 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />)}</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                            {challenges.map(challenge => (
                                <article key={challenge.id} className="flex flex-col rounded-3xl border border-gray-200 bg-surface p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                                    <div className="flex items-center justify-between"><span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">{challenge.metric}</span>{challenge.completed && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="h-4 w-4" /> Done</span>}</div>
                                    <h3 className="mt-5 font-serif text-2xl font-bold text-text-rich dark:text-dark-text-rich">{challenge.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-text-body dark:text-dark-text-body">{challenge.description}</p>
                                    <div className="mt-6"><div className="mb-2 flex justify-between text-xs font-semibold text-text-body dark:text-dark-text-body"><span>{challengeStatusLabel(challenge)}</span><span>{challenge.progressPercent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${challenge.progressPercent}%` }} /></div></div>
                                    {!challenge.joined && <button disabled={joining === challenge.id} onClick={() => void join(challenge.id)} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-accent disabled:opacity-50">{joining === challenge.id ? 'Joining…' : 'Join challenge'}</button>}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="pb-14" aria-labelledby="events-title">
                    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Curated by WordWeft</p><h2 id="events-title" className="mt-1 font-serif text-3xl font-bold text-text-rich dark:text-dark-text-rich">Genre events</h2><p className="mt-2 max-w-2xl text-text-body dark:text-dark-text-body">Time-bounded prompts help readers discover stories and give writers a clear moment to be found.</p></div>
                    {loading ? <div className="h-72 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" /> : events.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center dark:border-dark-border"><CalendarDays className="mx-auto h-9 w-9 text-accent" /><h3 className="mt-3 font-serif text-2xl font-bold text-text-rich dark:text-dark-text-rich">The next showcase is being curated.</h3><p className="mt-2 text-text-body dark:text-dark-text-body">Check back soon for a new genre prompt and story collection.</p></div>
                    ) : <div className="space-y-6">{events.map(event => {
                        const eligible = eligibleBooks(event);
                        const open = event.timing === 'active';
                        return <article key={event.id} className="overflow-hidden rounded-[2rem] border border-gray-200 bg-surface shadow-sm dark:border-dark-border dark:bg-dark-surface">
                            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{event.genre}</span><span className="text-xs font-semibold text-text-body dark:text-dark-text-body">{eventTimingLabel(event.startAt, event.endAt)}</span></div><h3 className="mt-4 font-serif text-3xl font-bold text-text-rich dark:text-dark-text-rich">{event.title}</h3>{event.prompt && <p className="mt-3 border-l-2 border-accent pl-4 font-serif text-xl italic text-text-rich dark:text-dark-text-rich">“{event.prompt}”</p>}<p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-body dark:text-dark-text-body">{event.description}</p></div><Sparkles className="hidden h-12 w-12 text-accent/50 lg:block" /></div>
                            {event.stories.length > 0 && <div className="border-t border-gray-100 px-6 py-6 dark:border-dark-border sm:px-8"><h4 className="mb-4 text-sm font-bold text-text-rich dark:text-dark-text-rich">Stories in this event</h4><div className="flex gap-4 overflow-x-auto pb-2">{event.stories.map(story => <button key={story.bookId} onClick={() => { window.location.hash = `/book/${story.bookId}`; }} className="group flex min-w-48 items-center gap-3 rounded-2xl border border-gray-200 p-3 text-left transition hover:border-accent dark:border-dark-border"><div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-accent/20">{story.coverUrl && <img src={story.coverUrl} alt="" className="h-full w-full object-cover" />}</div><div><p className="line-clamp-2 font-serif font-bold text-text-rich group-hover:text-accent dark:text-dark-text-rich">{story.title}</p><p className="mt-1 text-xs text-text-body dark:text-dark-text-body">{story.authorName}</p></div></button>)}</div></div>}
                            <div className="border-t border-gray-100 bg-background/60 px-6 py-5 dark:border-dark-border dark:bg-dark-background/40 sm:px-8">
                                {!currentUser ? <button onClick={onSignIn} className="inline-flex items-center gap-2 text-sm font-bold text-accent">Sign in to submit your story <ArrowRight className="h-4 w-4" /></button> : open && eligible.length > 0 ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><BookMarked className="hidden h-5 w-5 text-accent sm:block" /><select aria-label={`Story to submit to ${event.title}`} value={selectedStories[event.id] || eligible[0].id} onChange={value => setSelectedStories(previous => ({ ...previous, [event.id]: value.target.value }))} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-text-rich dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-rich">{eligible.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select><button disabled={submitting === event.id} onClick={() => void submit(event)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-accent disabled:opacity-50"><Send className="h-4 w-4" /> {submitting === event.id ? 'Submitting…' : 'Submit story'}</button></div> : <p className="text-sm text-text-body dark:text-dark-text-body">{open ? `Publish a ${event.genre} story to submit it here.` : event.timing === 'upcoming' ? 'Submissions open when the event begins.' : 'Submissions have closed.'}</p>}
                            </div>
                        </article>;
                    })}</div>}
                </section>
            </div>
        </div>
    );
};
