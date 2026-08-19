
import React, { useEffect, useRef, useState } from 'react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WritingDemoModal } from '../components/WritingDemoModal';
import { SparklesIcon } from '../components/icons/Icons';

/* ═══════════════════════════════════════════════════════════════
   FEATURES PAGE — Warm earth-tone themed, immersive showcase
   ═══════════════════════════════════════════════════════════════ */

// ─── Intersection Observer hook for scroll-triggered animations ──
const useReveal = (): [React.RefObject<HTMLDivElement | null>, boolean] => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return [ref, visible];
};

// ─── Tiny helper icons (inline SVG) ──────────────────────────

const PenIcon = () => (
    <svg className="ft-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);
const BookOpenIcon = () => (
    <svg className="ft-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);
const RocketIcon = () => (
    <svg className="ft-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
);
const ArrowRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);

// ─── Mood Demo Component ──────────────────────────────────────
const MoodDemo: React.FC = () => {
    const moods = [
        { name: 'Romantic', color: 'linear-gradient(135deg, #C44D73, #8D6E63)' },
        { name: 'Tense', color: 'linear-gradient(135deg, #B71C1C, #5D4037)' },
        { name: 'Melancholy', color: 'linear-gradient(135deg, #5B86E5, #4E342E)' },
        { name: 'Triumphant', color: 'linear-gradient(135deg, #D4A017, #8D6E63)' },
        { name: 'Eerie', color: 'linear-gradient(135deg, #3E2723, #1B0E0A)' },
        { name: 'Serene', color: 'linear-gradient(135deg, #A1887F, #5D4037)' },
    ];
    const [active, setActive] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setActive(p => (p + 1) % moods.length), 2400);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="ft-mood-demo">
            <div className="ft-mood-preview" style={{ background: moods[active].color }}>
                <span className="ft-mood-label">{moods[active].name}</span>
                <p className="ft-mood-sample-text">
                    The golden light filtered through the ancient windows, casting long shadows across the stone floor...
                </p>
            </div>
            <div className="ft-mood-pills">
                {moods.map((m, i) => (
                    <button
                        key={m.name}
                        className={`ft-mood-pill ${i === active ? 'ft-mood-pill-active' : ''}`}
                        onClick={() => setActive(i)}
                    >
                        {m.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Spoiler Demo Component ──────────────────────────────────
const SpoilerDemo: React.FC = () => {
    const [revealed, setRevealed] = useState(false);
    return (
        <div className="ft-spoiler-demo">
            <p className="ft-demo-text">
                The hero walked to the edge of the cliff. &quot;
                <span
                    className={`ft-spoiler-word ${revealed ? 'ft-spoiler-revealed' : ''}`}
                    onClick={() => setRevealed(true)}
                    title="Click to reveal"
                >
                    He was the villain all along
                </span>
                ,&quot; she whispered into the darkness.
            </p>
            <button className="ft-demo-reset" onClick={() => setRevealed(false)}>
                {revealed ? 'Revealed \u2014 click to re-hide' : 'Click the blurred text to reveal'}
            </button>
        </div>
    );
};

// ─── Details Demo Component ─────────────────────────────────
const DetailsDemo: React.FC = () => {
    const [open, setOpen] = useState(false);
    return (
        <div className="ft-details-demo">
            <button className="ft-details-summary" onClick={() => setOpen(!open)}>
                <span className={`ft-details-arrow ${open ? 'ft-details-arrow-open' : ''}`}>&#9654;</span>
                <span className="ft-details-title">Author&apos;s Lore Notes: The Great War of Eldoria</span>
            </button>
            <div className={`ft-details-content ${open ? 'ft-details-open' : ''}`}>
                <p>
                    The Great War of Eldoria (1247&ndash;1251 AE) was a pivotal conflict between the Northern Alliance and the
                    Southern Dominion. The war began when the Archmage Veridon discovered the forbidden scroll of...
                </p>
                <p style={{ marginTop: '8px', color: '#A1887F', fontSize: '12px' }}>
                    This lore note is only visible when readers choose to expand it.
                </p>
            </div>
        </div>
    );
};

// ─── PullQuote Demo Component ───────────────────────────────
const PullQuoteDemo: React.FC = () => (
    <div className="ft-pullquote-demo">
        <div className="ft-pullquote-mark">&ldquo;</div>
        <p className="ft-pullquote-text">
            Not all those who wander are lost.
        </p>
        <cite className="ft-pullquote-cite">&mdash; J.R.R. Tolkien</cite>
        <div className="ft-pullquote-mark ft-pullquote-mark-end">&rdquo;</div>
    </div>
);

// ─── Reader Demo Component ──────────────────────────────────
const ReaderDemo: React.FC = () => {
    const themes = [
        { name: 'Light', bg: '#FBF9F6', text: '#3E2723' },
        { name: 'Sepia', bg: '#FBF0D9', text: '#5B4636' },
        { name: 'Dark', bg: '#261F1D', text: '#BCAAA4' },
    ];
    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(34);

    useEffect(() => {
        const t = setInterval(() => setProgress(p => p >= 90 ? 34 : p + 1), 120);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="ft-reader-demo">
            <div className="ft-reader-mockup" style={{ background: themes[active].bg, color: themes[active].text }}>
                <div className="ft-reader-progress-bar" style={{ width: `${progress}%` }} />
                <h4 className="ft-reader-chapter-title">Chapter 7: The Revelation</h4>
                <p className="ft-reader-sample" style={{ color: themes[active].text }}>
                    The morning sun cast golden rays across the library floor. Elara traced her fingers along the
                    spines of ancient tomes, each one whispering secrets of a forgotten age...
                </p>
            </div>
            <div className="ft-reader-themes">
                {themes.map((t, i) => (
                    <button
                        key={t.name}
                        className={`ft-reader-theme-btn ${i === active ? 'ft-reader-theme-active' : ''}`}
                        style={{ background: t.bg, color: t.text, border: i === active ? '2px solid #8D6E63' : '2px solid transparent' }}
                        onClick={() => setActive(i)}
                    >
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Character Demo Component ───────────────────────────────
const CharacterDemo: React.FC = () => {
    const [showCard, setShowCard] = useState(false);
    return (
        <div className="ft-char-demo">
            <p className="ft-demo-text">
                &quot;You can&apos;t be serious,&quot; said{' '}
                <span
                    className="ft-char-mention"
                    onMouseEnter={() => setShowCard(true)}
                    onMouseLeave={() => setShowCard(false)}
                >
                    @Elara Nightshade
                </span>
                , drawing her blade from its sheath.
            </p>
            <div className={`ft-char-card ${showCard ? 'ft-char-card-visible' : ''}`}>
                <div className="ft-char-card-avatar">EN</div>
                <div className="ft-char-card-info">
                    <h5>Elara Nightshade</h5>
                    <span className="ft-char-card-role">Protagonist</span>
                    <p>A scholar turned warrior, haunted by the prophecy she was born to fulfill.</p>
                </div>
            </div>
        </div>
    );
};

// ─── World Building Demo Component ──────────────────────────
const WorldBuildingDemo: React.FC = () => {
    const [tab, setTab] = useState<'characters' | 'scenes' | 'notes'>('characters');
    const tabContent = {
        characters: [
            { name: 'Elara Nightshade', role: 'Protagonist', desc: 'Scholar turned warrior' },
            { name: 'Kael Ironfist', role: 'Antagonist', desc: 'The exiled prince' },
            { name: 'Mira Silverleaf', role: 'Ally', desc: 'Elven healer and archivist' },
        ],
        scenes: [
            { name: 'The Crimson Library', role: 'Act I, Ch. 3', desc: 'Ancient library beneath the castle' },
            { name: 'Battle of Windhollow', role: 'Act II, Ch. 7', desc: 'The army clashes at dawn' },
        ],
        notes: [
            { name: 'Magic System Rules', role: 'Lore', desc: 'Three tiers of elemental magic...' },
            { name: 'Timeline of Eldoria', role: 'Reference', desc: 'Key historical dates' },
        ],
    };

    return (
        <div className="ft-world-demo">
            <div className="ft-world-sidebar">
                <div className="ft-world-header">World Building</div>
                <div className="ft-world-tabs">
                    {(['characters', 'scenes', 'notes'] as const).map(t => (
                        <button
                            key={t}
                            className={`ft-world-tab ${tab === t ? 'ft-world-tab-active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="ft-world-list">
                    {tabContent[tab].map(item => (
                        <div key={item.name} className="ft-world-item">
                            <div className="ft-world-item-avatar">{item.name.charAt(0)}</div>
                            <div>
                                <div className="ft-world-item-name">{item.name}</div>
                                <div className="ft-world-item-role">{item.role}</div>
                                <div className="ft-world-item-desc">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Search Demo Component ──────────────────────────────────
const SearchDemo: React.FC = () => {
    const [typing, setTyping] = useState('');
    const fullText = 'midnight';
    const results = [
        { type: 'book', title: 'Midnight Garden', author: 'Luna Evergreen', rating: '4.8', subtitle: '' },
        { type: 'book', title: 'The Midnight Express', author: 'Jack Thorne', rating: '4.5', subtitle: '' },
        { type: 'author', title: 'Midnight Quill', author: '', rating: '', subtitle: '23 books \u00b7 14k followers' },
    ];

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            i++;
            if (i <= fullText.length) {
                setTyping(fullText.slice(0, i));
            } else if (i > fullText.length + 20) {
                i = 0;
                setTyping('');
            }
        }, 200);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="ft-search-demo">
            <div className="ft-search-bar-demo">
                <svg className="ft-search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <span className="ft-search-typing">{typing}<span className="ft-search-cursor">|</span></span>
            </div>
            {typing.length >= 3 && (
                <div className="ft-search-results-demo">
                    {results.map((r, i) => (
                        <div key={i} className="ft-search-result-item" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className={`ft-search-result-badge ${r.type === 'author' ? 'ft-search-badge-author' : ''}`}>
                                {r.type === 'book' ? 'B' : 'A'}
                            </div>
                            <div>
                                <div className="ft-search-result-title">{r.title}</div>
                                <div className="ft-search-result-sub">{r.type === 'book' ? `by ${r.author} \u00b7 ${r.rating}` : r.subtitle}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Feature Section Wrapper ────────────────────────────────
interface FeatureSectionProps {
    id: string;
    badge: string;
    title: string;
    description: string;
    bullets: string[];
    children: React.ReactNode;
    reversed?: boolean;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ id, badge, title, description, bullets, children, reversed }) => {
    const [ref, visible] = useReveal();
    return (
        <section ref={ref} id={id} className={`ft-section ${visible ? 'ft-section-visible' : ''} ${reversed ? 'ft-section-reversed' : ''}`}>
            <div className="ft-section-inner">
                <div className="ft-section-text">
                    <span className="ft-section-badge">{badge}</span>
                    <h3 className="ft-section-title">{title}</h3>
                    <p className="ft-section-desc">{description}</p>
                    <ul className="ft-section-bullets">
                        {bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                </div>
                <div className="ft-section-demo">
                    {children}
                </div>
            </div>
        </section>
    );
};

// ─── Upcoming Feature Card ──────────────────────────────────
interface UpcomingCardProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    highlights: string[];
    delay: number;
}

const UpcomingCard: React.FC<UpcomingCardProps> = ({ icon, title, desc, highlights, delay }) => {
    const [ref, visible] = useReveal();
    return (
        <div ref={ref} className={`ft-upcoming-card ${visible ? 'ft-upcoming-card-visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
            <div className="ft-upcoming-icon">{icon}</div>
            <h4 className="ft-upcoming-title">{title}</h4>
            <p className="ft-upcoming-desc">{desc}</p>
            <ul className="ft-upcoming-highlights">
                {highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
        </div>
    );
};

// ─── SVG Icons for upcoming cards ───────────────────────────
const TrophyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);
const TargetIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const KanbanIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
        <path d="M3 9h6" /><path d="M3 15h6" /><path d="M9 9h6" /><path d="M15 9h6" />
    </svg>
);

// =============================================================
//  MAIN COMPONENT
// =============================================================
export const FeaturesPage: React.FC = () => {
    const [heroRef, heroVisible] = useReveal();
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('content', 'features_view'); }, []);

    return (
        <div className="ft-page">
            <WritingDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />

            {/* ── HERO ────────────────────────────────────────────── */}
            <section ref={heroRef} className={`ft-hero ${heroVisible ? 'ft-hero-visible' : ''}`}>
                {/* Floating ink blots / particles */}
                <div className="ft-hero-particles">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="ft-particle" style={{ '--i': i } as React.CSSProperties} />
                    ))}
                </div>

                <div className="ft-hero-layout">
                <div className="ft-hero-content">
                    <span className="ft-hero-eyebrow"><span className="ft-eyebrow-dot" /> A home for story people</span>
                    <h1 className="ft-hero-headline">
                        Stories deserve<br />
                        <span className="ft-hero-gradient-text">room to breathe.</span>
                    </h1>
                    <p className="ft-hero-sub">
                        A thoughtful reading and writing studio where atmosphere, characters, and craft live together
                        &mdash; without getting between you and the page.
                    </p>
                    <div className="ft-hero-ctas">
                        <button onClick={() => setIsDemoModalOpen(true)} className="ft-btn ft-btn-primary relative overflow-hidden group">
                            <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                            <SparklesIcon className="w-5 h-5 text-current relative z-10" />
                            <span className="relative z-10 font-bold">Try the writing tools</span>
                        </button>
                        <a href="#/category" className="ft-btn ft-btn-secondary">
                            <BookOpenIcon /> Browse stories
                        </a>
                    </div>
                    <p className="ft-hero-note">Free to begin · Keep ownership of your work · Read on any device</p>
                    <div className="ft-hero-stats">
                        <div className="ft-hero-stat"><strong>8+</strong><span>Craft tools</span></div>
                        <div className="ft-hero-stat-divider" />
                        <div className="ft-hero-stat"><strong>6</strong><span>Reading moods</span></div>
                        <div className="ft-hero-stat-divider" />
                        <div className="ft-hero-stat"><strong>&infin;</strong><span>Stories to tell</span></div>
                    </div>
                </div>
                <div className="ft-hero-stage" aria-label="A preview of WordWeft's immersive reader">
                    <div className="ft-stage-shadow-card ft-stage-shadow-card-one" />
                    <div className="ft-stage-shadow-card ft-stage-shadow-card-two" />
                    <div className="ft-stage-reader">
                        <div className="ft-stage-toolbar">
                            <span className="ft-stage-brand">W</span>
                            <span className="ft-stage-chapter">Chapter 07</span>
                            <span className="ft-stage-progress">68%</span>
                        </div>
                        <div className="ft-stage-paper">
                            <span className="ft-stage-kicker">The House Beyond the Pines</span>
                            <h2>The map remembered her.</h2>
                            <p>The ink shifted beneath Elara&rsquo;s fingertips, drawing a road that had not existed the night before.</p>
                            <blockquote>&ldquo;Some doors wait for the right story.&rdquo;</blockquote>
                            <div className="ft-stage-lines"><span /><span /><span /></div>
                        </div>
                        <div className="ft-stage-footer"><span>Aa</span><span>Light</span><span>•••</span></div>
                    </div>
                    <div className="ft-stage-float ft-stage-float-mood"><span>Atmosphere</span><strong>Quiet wonder</strong></div>
                    <div className="ft-stage-float ft-stage-float-character"><span className="ft-stage-avatar">EN</span><span><strong>Elara Nightshade</strong><small>Character note</small></span></div>
                </div>
                </div>
            </section>

            <section className="ft-audience-section">
                <div className="ft-audience-heading">
                    <span>One platform, two ways in</span>
                    <h2>Made for the person holding the pen<br />and the person turning the page.</h2>
                </div>
                <div className="ft-audience-grid">
                    <article className="ft-audience-card ft-audience-reader">
                        <div className="ft-audience-card-copy">
                            <span>For readers</span>
                            <h3>Settle into the story.</h3>
                            <p>A clean, adjustable reader with saved progress, thoughtful discussion, character context, and atmosphere that follows the prose.</p>
                            <a href="#/category">Find something to read <ArrowRightIcon /></a>
                        </div>
                        <div className="ft-audience-mini-reader"><i /><strong>The sea remembered every name.</strong><p>By dusk, the lighthouse had begun to answer.</p><span>42% read</span></div>
                    </article>
                    <article className="ft-audience-card ft-audience-writer">
                        <div className="ft-audience-card-copy">
                            <span>For writers</span>
                            <h3>Keep the whole world close.</h3>
                            <p>Draft chapters beside your characters, scenes, notes, and lore—then publish without surrendering the rhythm of your writing.</p>
                            <a href="#/auth">Open the writer studio <ArrowRightIcon /></a>
                        </div>
                        <div className="ft-audience-mini-studio"><span><i /> Drafting</span><h4>Chapter 12 · The Crossing</h4><div><b /><b /><b /><b /></div><small>1,842 words · saved</small></div>
                    </article>
                </div>
            </section>

            {/* ── FEATURE SECTIONS ─────────────────────────────────── */}

            <FeatureSection
                id="mood"
                badge="Atmosphere Engine"
                title="Set the Mood"
                description="Tag sections of your story with moods &mdash; romantic, tense, eerie, triumphant &mdash; and readers experience subtle, immersive color shifts that match the narrative's emotion."
                bullets={[
                    '6 handcrafted mood themes with unique palettes',
                    'Background, text, and accent colors shift automatically',
                    'Writers tag sections; readers feel the atmosphere',
                    'Works seamlessly in both light and dark mode',
                ]}
            >
                <MoodDemo />
            </FeatureSection>

            <FeatureSection
                id="spoiler"
                badge="Spoiler Guard"
                title="Hide Plot Twists"
                description="Blur sensitive text that readers reveal with a satisfying click. Perfect for reviews, fan theories, and plot-heavy chapters."
                bullets={[
                    'Writers mark text as spoiler with one click',
                    'Readers see a blurred haze \u2014 no accidental spoilers',
                    'Click-to-reveal with smooth unblur animation',
                    'Subtle dashed indicator in the editor',
                ]}
                reversed
            >
                <SpoilerDemo />
            </FeatureSection>

            <FeatureSection
                id="reader"
                badge="Immersive Reader"
                title="Your Reading Sanctuary"
                description="Three content themes, adjustable font sizes, auto-saved reading progress, paragraph-level commenting, and an inline table of contents. Reading has never felt this good."
                bullets={[
                    'Light, Sepia, and Dark reading themes',
                    'Font size adjustment from 12px to 32px',
                    'Auto-saved scroll position across devices',
                    'Comment on any paragraph to discuss with others',
                    'Chapter-level likes and bookmarking',
                ]}
            >
                <ReaderDemo />
            </FeatureSection>

            <FeatureSection
                id="characters"
                badge="Character Universe"
                title="Living Characters"
                description="@mention characters in your chapters &mdash; readers hover to see bios, roles, and portraits in a beautiful preview card. Characters become interactive entities, not just names."
                bullets={[
                    '@mention any character while writing',
                    'Readers hover/tap to see character profiles',
                    'Includes portrait, role, and bio preview',
                    'Seamlessly integrated into the reading flow',
                ]}
                reversed
            >
                <CharacterDemo />
            </FeatureSection>

            <FeatureSection
                id="worldbuilding"
                badge="World Building"
                title="Your Story Bible"
                description="Characters, scenes, and notes &mdash; all accessible in a slide-out sidebar while you write. Never lose track of your world's details again."
                bullets={[
                    'Three tabs: Characters, Scenes, Notes',
                    'Accessible directly from the editor',
                    'Track character bios, scene settings, and lore',
                    'Manage everything from book settings',
                ]}
            >
                <WorldBuildingDemo />
            </FeatureSection>

            <FeatureSection
                id="search"
                badge="Smart Search"
                title="Find Anything Instantly"
                description="Lightning-fast autocomplete for books and authors with rich previews &mdash; covers, ratings, genres, and follower counts. Press Ctrl+K from anywhere."
                bullets={[
                    'Real-time autocomplete as you type',
                    'Rich result cards with covers and ratings',
                    'Full keyboard navigation',
                    'Global Ctrl+K shortcut from any page',
                ]}
                reversed
            >
                <SearchDemo />
            </FeatureSection>

            <section className="ft-journey-section">
                <div className="ft-journey-heading"><span>A complete creative loop</span><h2>From the first sentence<br />to the reader who stays up late.</h2></div>
                <div className="ft-journey-steps">
                    <article><span>01</span><div><h3>Shape the world</h3><p>Keep characters, locations, scenes, and lore beside the manuscript—not scattered across tabs.</p></div></article>
                    <article><span>02</span><div><h3>Write in context</h3><p>Draft with the details you need, add atmosphere and interactive elements, and keep momentum.</p></div></article>
                    <article><span>03</span><div><h3>Publish beautifully</h3><p>Readers receive a composed, responsive experience that protects the words and remembers their place.</p></div></article>
                </div>
            </section>

            {/* ── FINAL CTA ────────────────────────────────────────── */}
            <section className="ft-cta-section">
                <div className="ft-cta-pattern" />
                <div className="ft-cta-content">
                    <h2 className="ft-cta-headline">Ready to Begin Your Story?</h2>
                    <p className="ft-cta-sub">
                        Join thousands of writers and readers on the most immersive storytelling platform.
                    </p>
                    <div className="ft-cta-buttons">
                        <a href="#/auth" className="ft-btn ft-btn-primary ft-btn-lg">
                            Start Writing Free <ArrowRightIcon />
                        </a>
                        <a href="#/category" className="ft-btn ft-btn-ghost ft-btn-lg">
                            Browse Stories <ArrowRightIcon />
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};
