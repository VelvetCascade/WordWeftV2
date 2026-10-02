import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookMarked, BookOpen, CalendarDays, Check, RefreshCw, Send, Target } from 'lucide-react';
import type { Book, GenreEvent, ReadingChallenge, User } from '../types';
import * as api from '../api/client';
import { challengeStatusLabel, eventTimingLabel } from '../utils/readingGrowth';
import { Footer } from '../components/Footer';
import '../styles/support-v2.css';

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
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
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
    }, [currentUser?.id, reload]);

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
        <div className="wv-support wv-reading-growth">
            <main className="wv-support-shell">
                <header className="wv-pagehead"><p className="wv-eyebrow">Read at your own pace</p><h1>A little direction.<br />A new story to discover.</h1><p className="wv-lead">Choose a private reading goal or explore a curated genre event. Your pace and your progress stay yours.</p></header>
                <nav className="wv-growth-nav" aria-label="Reading goals and events"><a href="#challenges-title"><Target size={17} /> Reading challenges</a><a href="#events-title"><CalendarDays size={17} /> Genre events</a><a href="/hooks">Read an opening <ArrowRight size={16} /></a></nav>
                {error && <div className="wv-error wv-growth-error" role="alert"><span>{error}</span><button type="button" className="wv-button" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={15} /> Try again</button></div>}
                <section className="wv-growth-section" aria-labelledby="challenges-title">
                    <div className="wv-growth-sectionhead"><div><p className="wv-eyebrow">Just for you</p><h2 id="challenges-title">Reading challenges</h2></div>{currentUser && <p>Progress updates as you finish chapters.</p>}</div>
                    {!currentUser ? <div className="wv-growth-signin"><Target size={29} aria-hidden="true" /><div><h3>Keep a goal that travels with you.</h3><p>Sign in to track chapter, reading-time and story-completion challenges automatically.</p></div><button type="button" onClick={onSignIn} className="wv-button wv-button-primary">Sign in to join <ArrowRight size={17} /></button></div> : loading ? <div className="wv-challenge-loading" role="status"><p>Loading your challenges…</p><div className="wv-challenge-grid" aria-hidden="true">{[0, 1, 2].map(item => <div key={item} />)}</div></div> : challenges.length ? <div className="wv-challenge-grid">{challenges.map(challenge => <article key={challenge.id} className="wv-challenge-card">
                        <div className="wv-challenge-meta"><span>{challenge.metric}</span>{challenge.completed && <span><Check size={14} /> Completed</span>}</div><h3>{challenge.title}</h3><p>{challenge.description}</p>
                        <div className="wv-challenge-progress"><div><span>{challengeStatusLabel(challenge)}</span><span>{challenge.progressPercent}%</span></div><progress max={100} value={Math.min(100, Math.max(0, challenge.progressPercent))} aria-label={`${challenge.title}: ${challengeStatusLabel(challenge)}`} /></div>
                        {!challenge.joined && <button type="button" disabled={joining === challenge.id} onClick={() => void join(challenge.id)} className="wv-button wv-button-primary">{joining === challenge.id ? 'Joining…' : 'Join challenge'}</button>}
                    </article>)}</div> : !error ? <div className="wv-empty"><h3>No reading challenges available yet.</h3><p>You can explore stories and return when a new goal is available.</p><a href="/category" className="wv-button">Browse stories <ArrowRight size={17} /></a></div> : null}
                </section>
                <section className="wv-growth-section" aria-labelledby="events-title">
                    <div className="wv-growth-sectionhead"><div><p className="wv-eyebrow">Curated by WordWeft</p><h2 id="events-title">Genre events</h2><p>A prompt and a collection of stories, with a clear moment for writers to share their work.</p></div></div>
                    {loading ? <div className="wv-event-loading" role="status">Loading genre events…</div> : events.length === 0 ? !error && <div className="wv-empty"><CalendarDays size={30} aria-hidden="true" /><h3>No genre events are open here yet.</h3><p>Check back for new prompts and story collections.</p><a href="/category" className="wv-button">Explore stories <ArrowRight size={17} /></a></div> : <div className="wv-event-list">{events.map(event => {
                        const eligible = eligibleBooks(event);
                        const open = event.timing === 'active';
                        return <article key={event.id} className="wv-event-card"><header><div className="wv-event-meta"><span>{event.genre}</span><span>{eventTimingLabel(event.startAt, event.endAt)}</span></div><h3>{event.title}</h3>{event.prompt && <blockquote>“{event.prompt}”</blockquote>}<p>{event.description}</p></header>
                            {event.stories.length > 0 && <section className="wv-event-stories" aria-label={`Stories in ${event.title}`}><h4>Stories in this event</h4><div>{event.stories.map(story => <a key={story.bookId} href={`/book/${story.bookId}`}><div className="wv-event-cover">{story.coverUrl ? <img src={story.coverUrl} alt={`Cover of ${story.title}`} loading="lazy" /> : <BookOpen size={22} aria-hidden="true" />}</div><div><h5>{story.title}</h5><p>{story.authorName}</p></div></a>)}</div></section>}
                            <footer className="wv-event-submit">{!currentUser ? <button type="button" onClick={onSignIn} className="wv-button wv-button-plain">Sign in to submit your story <ArrowRight size={17} /></button> : open && eligible.length > 0 ? <div><label htmlFor={`event-story-${event.id}`}><BookMarked size={17} /> Choose your published story</label><div><select id={`event-story-${event.id}`} value={selectedStories[event.id] || eligible[0].id} onChange={value => setSelectedStories(previous => ({ ...previous, [event.id]: value.target.value }))}>{eligible.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select><button type="button" disabled={submitting === event.id} onClick={() => void submit(event)} className="wv-button wv-button-primary"><Send size={16} /> {submitting === event.id ? 'Submitting…' : 'Submit story'}</button></div></div> : <p>{open ? `Publish a ${event.genre} story to submit it here.` : event.timing === 'upcoming' ? 'Submissions open when the event begins.' : 'Submissions have closed.'}</p>}</footer>
                        </article>;
                    })}</div>}
                </section>
            </main><Footer />
        </div>
    );
};
