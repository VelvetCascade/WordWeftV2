
import React, { useEffect, useRef } from 'react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';

/* ─── Reusable primitives ─────────────────────────────────────────────────── */

const Blob: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
);

const SectionTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block text-xs font-sans font-semibold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
        {children}
    </span>
);

const Divider: React.FC = () => (
    <div className="w-12 h-0.5 bg-accent/40 rounded-full my-6" />
);

/* ─── Pillar card (What we built) ─────────────────────────────────────────── */
interface PillarCardProps {
    icon: string;
    heading: string;
    body: string;
    delay?: string;
}
const PillarCard: React.FC<PillarCardProps> = ({ icon, heading, body, delay = '0ms' }) => (
    <div
        className="relative flex flex-col gap-4 p-6 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border shadow-sm hover:shadow-md dark:hover:shadow-dark-border/40 transition-all duration-300 hover:-translate-y-1"
        style={{ animationDelay: delay }}
    >
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
            {icon}
        </div>
        <div>
            <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich mb-2">{heading}</h3>
            <p className="text-sm text-text-body dark:text-dark-text-body leading-relaxed">{body}</p>
        </div>
    </div>
);

/* ─── "Who this is for" audience row ─────────────────────────────────────── */
interface AudienceRowProps {
    label: string;
    text: string;
}
const AudienceRow: React.FC<AudienceRowProps> = ({ label, text }) => (
    <div className="flex items-start gap-4 group">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mt-0.5 group-hover:bg-accent/20 transition-colors duration-200">
            <span className="text-accent text-xs font-bold font-sans">{label}</span>
        </div>
        <p className="text-text-body dark:text-dark-text-body leading-relaxed pt-1.5">
            {text}
        </p>
    </div>
);

/* ─── Stat chip ───────────────────────────────────────────────────────────── */
interface StatChipProps {
    value: string;
    label: string;
}
const StatChip: React.FC<StatChipProps> = ({ value, label }) => (
    <div className="flex flex-col items-center gap-1 px-6 py-4">
        <span className="font-sans font-extrabold text-3xl text-text-rich dark:text-dark-text-rich tracking-tight">{value}</span>
        <span className="text-xs text-text-body dark:text-dark-text-body uppercase tracking-widest font-sans">{label}</span>
    </div>
);

/* ─── Main page ───────────────────────────────────────────────────────────── */
export const AboutPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        trackEvent('content', 'page_view', 'about');
        window.scrollTo(0, 0);
    }, []);

    /* Subtle parallax on hero blobs */
    useEffect(() => {
        const onScroll = () => {
            if (!heroRef.current) return;
            const y = window.scrollY;
            const blobs = heroRef.current.querySelectorAll<HTMLElement>('[data-blob]');
            blobs.forEach((b, i) => {
                b.style.transform = `translateY(${y * (i % 2 === 0 ? 0.12 : -0.1)}px)`;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="bg-background dark:bg-dark-background">

            {/* ══════════════════════════════════════════════════════════════
                HERO
            ══════════════════════════════════════════════════════════════ */}
            <section
                ref={heroRef}
                className="relative overflow-hidden bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border"
            >
                {/* Decorative blobs */}
                <Blob data-blob="1" className="top-0 left-1/2 w-[700px] h-[700px] bg-accent/6 -translate-x-1/2 -translate-y-1/2" />
                <Blob data-blob="2" className="bottom-0 left-0 w-80 h-80 bg-primary/5 translate-y-1/2 -translate-x-1/4" />
                <Blob data-blob="3" className="top-0 right-0 w-64 h-64 bg-accent/8 -translate-y-1/3 translate-x-1/3" />

                <div className="container mx-auto px-6 py-20 md:py-28 relative z-10 text-center max-w-4xl">
                    {/* Label */}
                    <SectionTag>About WordWeft Studio</SectionTag>

                    {/* Headline */}
                    <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight leading-[1.1] mb-6">
                        We didn't build this because{' '}
                        <span className="relative inline-block">
                            <span className="relative z-10 text-accent">we love stories.</span>
                            <span className="absolute inset-x-0 bottom-1 h-2 bg-accent/15 -skew-x-3 rounded" aria-hidden />
                        </span>
                    </h1>

                    {/* Sub */}
                    <p className="text-text-body dark:text-dark-text-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-4">
                        Everyone says that. It means nothing.
                    </p>
                    <p className="text-text-body dark:text-dark-text-body text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
                        We built WordWeft because we watched writers build entire audiences on platforms that quietly own
                        everything — the followers, the algorithm, the data, the relationship. One policy change, one
                        shadowban, one "platform pivot," and years of work evaporate. The writer owns nothing. The
                        platform owns the writer. <strong className="text-text-rich dark:text-dark-text-rich">That's not a story problem. That's a power problem.</strong> And we got tired
                        of watching it happen to people who deserved better.
                    </p>

                    {/* Divider */}
                    <div className="flex justify-center mt-8">
                        <Divider />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                NOT WRITERS
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative overflow-hidden py-20">
                <Blob className="top-1/2 right-0 w-96 h-96 bg-primary/4 translate-x-1/3 -translate-y-1/2" />

                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        {/* Text */}
                        <div>
                            <SectionTag>The founders</SectionTag>
                            <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight mb-5">
                                We're not writers.{' '}
                                <span className="text-accent">That's the point.</span>
                            </h2>
                            <div className="space-y-4 text-text-body dark:text-dark-text-body leading-relaxed">
                                <p>
                                    WordWeft wasn't started by a novelist with a manifesto about "the future of fiction." It was
                                    started by a reader — someone who fell down the rabbit hole of online fiction the way
                                    millions of people do, scrolling for the next chapter at 1am, and got{' '}
                                    <em>angry on writers' behalf</em> instead of her own.
                                </p>
                                <p>
                                    That distance matters. We're not trying to relive our own writing dreams through a platform.
                                    We're trying to fix what we saw broken from the outside: writers pouring themselves into work
                                    that disappears into an algorithm's mood, readers treated like engagement metrics instead of
                                    people who actually feel things when they read.
                                </p>
                                <p>
                                    So we built something different — not because we're storytellers, but because we're not, and
                                    that gave us permission to ask uncomfortable questions nobody inside the industry was asking.
                                </p>
                            </div>
                        </div>

                        {/* Pull-quote card */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 rounded-3xl blur-2xl" />
                            <blockquote className="relative bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border rounded-2xl p-8 shadow-sm">
                                <div className="text-accent text-5xl font-serif leading-none mb-3 select-none">"</div>
                                <p className="font-sans text-xl font-semibold text-text-rich dark:text-dark-text-rich leading-snug mb-4">
                                    We'd rather get this right for a hundred people than get it wrong for a hundred thousand.
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold font-sans">W</div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-rich dark:text-dark-text-rich font-sans">WordWeft Studio</p>
                                        <p className="text-xs text-text-body dark:text-dark-text-body">Building deliberately</p>
                                    </div>
                                </div>
                            </blockquote>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                NO PASSPORT
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative py-20 bg-white dark:bg-dark-surface border-y border-gray-200/80 dark:border-dark-border overflow-hidden">
                <Blob className="top-0 left-1/2 w-[600px] h-[400px] bg-accent/5 -translate-x-1/2 -translate-y-2/3" />

                <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
                    <SectionTag>Global by default</SectionTag>
                    <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight mb-6">
                        Stories don't have a passport.
                    </h2>

                    <p className="text-text-body dark:text-dark-text-body text-lg leading-relaxed max-w-3xl mx-auto mb-10">
                        Fiction doesn't belong to one market. A reader chasing heartbreak at 1am is the same reader whether
                        they're in São Paulo, Manila, or Toronto. Most platforms still build like the internet has a home
                        country and everywhere else is an expansion plan. We didn't.
                    </p>
                    <p className="text-text-body dark:text-dark-text-body text-lg leading-relaxed max-w-3xl mx-auto">
                        WordWeft was built from day one for readers and writers anywhere English fiction lives — without a
                        "global version" bolted on as an afterthought, and without assuming any one region's habits are the
                        default everyone else has to adapt to.
                    </p>

                    {/* City chips */}
                    <div className="flex flex-wrap justify-center gap-3 mt-10">
                        {['São Paulo', 'Manila', 'Toronto', 'Lagos', 'Nairobi', 'Dhaka', 'London', 'Jakarta'].map(city => (
                            <span
                                key={city}
                                className="inline-block bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body text-sm px-4 py-1.5 rounded-full border border-gray-200/80 dark:border-dark-border"
                            >
                                {city}
                            </span>
                        ))}
                        <span className="inline-block bg-accent/10 text-accent text-sm px-4 py-1.5 rounded-full border border-accent/20 font-semibold font-sans">
                            + Everywhere
                        </span>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                WHAT WE BUILT — Pillars
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative py-20 overflow-hidden">
                <Blob className="bottom-0 left-0 w-96 h-96 bg-primary/5 -translate-x-1/3 translate-y-1/3" />

                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="text-center mb-12">
                        <SectionTag>What we actually built</SectionTag>
                        <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight">
                            Rethinking the defaults.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PillarCard
                            icon="🌙"
                            heading="Mood-first, not genre-first"
                            body="Nobody opens a book because it's tagged 'literary fiction.' They open it because they want to feel something specific — heartbreak, comfort, chaos, nostalgia. WordWeft is built around how readers actually choose, not how catalogs are filed."
                            delay="0ms"
                        />
                        <PillarCard
                            icon="🪞"
                            heading="Characters as the entry point"
                            body="Fiction on most platforms is a wall of text you scroll past. We treat characters as the entry point readers actually care about — because readers don't fall in love with plots, they fall in love with people."
                            delay="80ms"
                        />
                        <PillarCard
                            icon="💸"
                            heading="Revenue that's actually real"
                            body="Not vanity metrics. Not 'exposure.' An actual revenue split, built so writers see where the money comes from and where it goes — because writers have been asked to trust opaque systems for too long."
                            delay="160ms"
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                WHO IT'S FOR
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative py-20 bg-white dark:bg-dark-surface border-y border-gray-200/80 dark:border-dark-border overflow-hidden">
                <Blob className="top-1/2 right-0 w-80 h-80 bg-accent/6 translate-x-1/3 -translate-y-1/2" />

                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-12">
                        <SectionTag>Who this is for</SectionTag>
                        <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight">
                            You know who you are.
                        </h2>
                    </div>

                    <div className="space-y-6 max-w-2xl mx-auto">
                        <AudienceRow
                            label="01"
                            text="If you've built an audience somewhere else and watched a platform decide that audience wasn't yours to keep — this is for you."
                        />
                        <AudienceRow
                            label="02"
                            text="If you're a reader who wants fiction that meets you where your mood actually is, not where a genre tag puts it — this is for you."
                        />
                        <AudienceRow
                            label="03"
                            text="If you want a platform that tells you the truth about how it works instead of burying it in terms nobody reads — this is for you too. That's not an accident. It's the whole point."
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                WHERE WE ARE
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative py-20 overflow-hidden">
                <Blob className="top-0 left-1/2 w-[500px] h-[300px] bg-primary/4 -translate-x-1/2 -translate-y-1/2" />

                <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
                    <SectionTag>Where we are right now</SectionTag>
                    <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight mb-6">
                        We're early. We're not pretending otherwise.
                    </h2>

                    <p className="text-text-body dark:text-dark-text-body text-lg leading-relaxed mb-6">
                        There's no fake "trusted by thousands" banner here. We're a small team building deliberately,
                        writer by writer, because we'd rather get this right for a hundred people than get it wrong for a
                        hundred thousand.
                    </p>
                    <p className="text-text-body dark:text-dark-text-body text-lg leading-relaxed mb-10">
                        If that sounds like a platform worth being early on, you know where to find us.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="#/"
                            className="inline-flex items-center gap-2 bg-accent text-white font-sans font-semibold px-8 py-3.5 rounded-xl hover:bg-primary transition-colors shadow-sm hover:shadow-md"
                        >
                            Start reading
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                        </a>
                        <a
                            href="#/write"
                            className="inline-flex items-center gap-2 bg-white dark:bg-dark-surface text-text-rich dark:text-dark-text-rich font-sans font-semibold px-8 py-3.5 rounded-xl border border-gray-200/80 dark:border-dark-border hover:border-accent dark:hover:border-accent transition-colors shadow-sm hover:shadow-md"
                        >
                            Start writing
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                CLOSING TAGLINE BANNER
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative overflow-hidden bg-gradient-to-br from-accent via-primary to-accent/80 py-16">
                {/* Decorative noise texture feel */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                }} />

                <div className="relative z-10 container mx-auto px-6 text-center">
                    <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-white/70 mb-3">WordWeft Studio</p>
                    <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
                        Your story. Your ownership. Your readers.
                    </h2>
                </div>
            </section>

            <Footer />
        </div>
    );
};
