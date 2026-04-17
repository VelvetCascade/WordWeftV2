import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeJourneyProps {
    userName: string;
    onComplete: (role: 'reader' | 'writer' | 'both') => void;
}

const STORAGE_KEY = 'ww_welcomeJourneyCompleted';

// ─── Animated Particles ────────────────────────────────────────
const FloatingParticles: React.FC = () => (
    <div className="wj-particles">
        {Array.from({ length: 20 }).map((_, i) => (
            <div
                key={i}
                className="wj-particle"
                style={{
                    '--i': i,
                    '--x': `${Math.random() * 100}%`,
                    '--y': `${Math.random() * 100}%`,
                    '--size': `${Math.random() * 6 + 2}px`,
                    '--duration': `${Math.random() * 8 + 6}s`,
                    '--delay': `${Math.random() * 4}s`,
                } as React.CSSProperties}
            />
        ))}
    </div>
);

// ─── Step 1: Welcome Screen ────────────────────────────────────
const WelcomeScreen: React.FC<{ userName: string }> = ({ userName }) => (
    <motion.div
        className="wj-screen wj-screen-welcome"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
    >
        <div className="wj-welcome-glow" />
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="wj-welcome-content"
        >
            <div className="wj-welcome-logo">
                <span className="wj-welcome-logo-emoji">📖</span>
            </div>
            <h1 className="wj-welcome-title">
                Welcome to <span className="wj-welcome-brand">WordWeft</span>
            </h1>
            <p className="wj-welcome-name">
                Hi, <strong>{userName}</strong>! We're thrilled to have you.
            </p>
            <p className="wj-welcome-sub">
                Let us show you the powerful tools that make storytelling magical on WordWeft.
            </p>
        </motion.div>
    </motion.div>
);

// ─── Step 2: Role Selection ────────────────────────────────────
const RoleSelection: React.FC<{ onSelect: (role: 'reader' | 'writer' | 'both') => void }> = ({ onSelect }) => (
    <motion.div
        className="wj-screen wj-screen-role"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.5 }}
    >
        <h2 className="wj-role-title">What brings you here?</h2>
        <p className="wj-role-sub">Choose your path — you can always explore both later.</p>
        <div className="wj-role-cards">
            <motion.button
                className="wj-role-card"
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('reader')}
            >
                <div className="wj-role-card-icon">📖</div>
                <h3>I'm a Reader</h3>
                <p>Discover immersive stories with mood atmospheres, character profiles, and more.</p>
                <span className="wj-role-card-cta">Explore Reading →</span>
            </motion.button>

            <motion.button
                className="wj-role-card"
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('writer')}
            >
                <div className="wj-role-card-icon">✍️</div>
                <h3>I'm a Writer</h3>
                <p>Powerful tools: @mentions, mood engine, world building, spoilers & more.</p>
                <span className="wj-role-card-cta">Start Writing →</span>
            </motion.button>

            <motion.button
                className="wj-role-card wj-role-card-both"
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('both')}
            >
                <div className="wj-role-card-icon">🌟</div>
                <h3>Both!</h3>
                <p>I read and write — show me everything!</p>
                <span className="wj-role-card-cta">Show Me All →</span>
            </motion.button>
        </div>
    </motion.div>
);

// ─── Step 3: Writer Features ───────────────────────────────────
const WriterFeatures: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const features = [
        {
            icon: '📝',
            title: '@Character Mentions',
            desc: 'Type @ in the editor to mention characters. They become clickable links with preview cards that show bios and portraits.',
            demo: 'writer-mentions',
        },
        {
            icon: '🎭',
            title: 'Mood Atmospheres',
            desc: 'Tag sections with moods — romantic, tense, eerie — and readers experience immersive color shifts matching the narrative emotion.',
            demo: 'writer-moods',
        },
        {
            icon: '🗺️',
            title: 'World Building Sidebar',
            desc: 'Access your characters, scenes, and lore notes in a slide-out sidebar without leaving the editor.',
            demo: 'writer-worldbuilding',
        },
    ];

    useEffect(() => {
        const timer = setInterval(() => setActiveFeature(f => (f + 1) % features.length), 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            className="wj-screen wj-screen-features"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5 }}
        >
            <span className="wj-features-badge">Writer Tools</span>
            <h2 className="wj-features-title">Your Writing Superpowers</h2>

            <div className="wj-features-showcase">
                <div className="wj-features-tabs">
                    {features.map((f, i) => (
                        <button
                            key={i}
                            className={`wj-features-tab ${i === activeFeature ? 'wj-features-tab-active' : ''}`}
                            onClick={() => setActiveFeature(i)}
                        >
                            <span className="wj-features-tab-icon">{f.icon}</span>
                            <span className="wj-features-tab-title">{f.title}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35 }}
                        className="wj-features-demo"
                    >
                        <div className={`wj-demo-card wj-demo-${features[activeFeature].demo}`}>
                            {features[activeFeature].demo === 'writer-mentions' && <WriterMentionDemo />}
                            {features[activeFeature].demo === 'writer-moods' && <WriterMoodDemo />}
                            {features[activeFeature].demo === 'writer-worldbuilding' && <WriterWorldDemo />}
                        </div>
                        <p className="wj-features-desc">{features[activeFeature].desc}</p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// ─── Step 4: Reader Features ───────────────────────────────────
const ReaderFeatures: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const features = [
        {
            icon: '🎨',
            title: 'Reading Themes',
            desc: 'Switch between Light, Sepia, and Dark modes, adjust font sizes, and enjoy a distraction-free reading experience.',
            demo: 'reader-themes',
        },
        {
            icon: '🔮',
            title: 'Spoiler Reveals',
            desc: 'Authors can blur plot-sensitive text. Click to reveal spoilers with a satisfying animation — no accidental reveals!',
            demo: 'reader-spoilers',
        },
        {
            icon: '✨',
            title: 'Character Profiles',
            desc: 'Tap highlighted character names to see their portrait, role, and bio in a beautiful preview card.',
            demo: 'reader-characters',
        },
    ];

    useEffect(() => {
        const timer = setInterval(() => setActiveFeature(f => (f + 1) % features.length), 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            className="wj-screen wj-screen-features"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5 }}
        >
            <span className="wj-features-badge wj-features-badge-reader">Reader Experience</span>
            <h2 className="wj-features-title">Immersive Reading</h2>

            <div className="wj-features-showcase">
                <div className="wj-features-tabs">
                    {features.map((f, i) => (
                        <button
                            key={i}
                            className={`wj-features-tab ${i === activeFeature ? 'wj-features-tab-active' : ''}`}
                            onClick={() => setActiveFeature(i)}
                        >
                            <span className="wj-features-tab-icon">{f.icon}</span>
                            <span className="wj-features-tab-title">{f.title}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35 }}
                        className="wj-features-demo"
                    >
                        <div className={`wj-demo-card wj-demo-${features[activeFeature].demo}`}>
                            {features[activeFeature].demo === 'reader-themes' && <ReaderThemeDemo />}
                            {features[activeFeature].demo === 'reader-spoilers' && <ReaderSpoilerDemo />}
                            {features[activeFeature].demo === 'reader-characters' && <ReaderCharacterDemo />}
                        </div>
                        <p className="wj-features-desc">{features[activeFeature].desc}</p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// ─── Step 5: Ready Screen ──────────────────────────────────────
const ReadyScreen: React.FC<{ role: string }> = ({ role }) => (
    <motion.div
        className="wj-screen wj-screen-ready"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
    >
        <div className="wj-ready-glow" />
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="wj-ready-content"
        >
            <div className="wj-ready-icon">🎉</div>
            <h2 className="wj-ready-title">You're Ready!</h2>
            <p className="wj-ready-sub">
                {role === 'reader'
                    ? 'Dive into thousands of stories with immersive features.'
                    : role === 'writer'
                    ? 'Your toolkit is ready. Create something amazing.'
                    : 'Read, write, and explore everything WordWeft has to offer.'}
            </p>
            <p className="wj-ready-hint">
                💡 Look for <span className="wj-ready-sparkle-demo">✨ sparkle indicators</span> around the platform — they'll guide you to hidden features!
            </p>
        </motion.div>
    </motion.div>
);

// ─── Mini Demo Components ──────────────────────────────────────
const WriterMentionDemo: React.FC = () => {
    const [typed, setTyped] = useState('');
    const [showSuggestion, setShowSuggestion] = useState(false);

    useEffect(() => {
        const target = '@Elar';
        let i = 0;
        const timer = setInterval(() => {
            if (i <= target.length) {
                setTyped(target.slice(0, i));
                if (i === target.length) setShowSuggestion(true);
                i++;
            } else { clearInterval(timer); }
        }, 180);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="wj-mini-demo wj-mini-mention">
            <div className="wj-mini-editor">
                <p>The hero spoke quietly. "My name is <span className="wj-mention-text">{typed}<span className="wj-cursor">|</span></span>"</p>
            </div>
            <AnimatePresence>
                {showSuggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="wj-mention-popup"
                    >
                        <div className="wj-mention-item">
                            <div className="wj-mention-avatar" />
                            <div><strong>Elara Nightshade</strong><br /><small>Protagonist</small></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const WriterMoodDemo: React.FC = () => {
    const moods = [
        { name: 'Romantic', bg: 'linear-gradient(135deg, #C44D73, #8D6E63)', emoji: '🌹' },
        { name: 'Tense', bg: 'linear-gradient(135deg, #B71C1C, #5D4037)', emoji: '⚡' },
        { name: 'Serene', bg: 'linear-gradient(135deg, #A1887F, #5D4037)', emoji: '🍃' },
    ];
    const [active, setActive] = useState(0);

    return (
        <div className="wj-mini-demo wj-mini-mood">
            <div className="wj-mood-preview" style={{ background: moods[active].bg }}>
                <span className="wj-mood-emoji">{moods[active].emoji}</span>
                <span className="wj-mood-name">{moods[active].name}</span>
                <p className="wj-mood-text">The golden light filtered through ancient windows...</p>
            </div>
            <div className="wj-mood-pills">
                {moods.map((m, i) => (
                    <button
                        key={m.name}
                        className={`wj-mood-pill ${i === active ? 'wj-mood-pill-active' : ''}`}
                        onClick={() => setActive(i)}
                    >
                        {m.emoji} {m.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const WriterWorldDemo: React.FC = () => (
    <div className="wj-mini-demo wj-mini-world">
        <div className="wj-world-sidebar-demo">
            <div className="wj-world-header-demo">📚 World Building</div>
            {['Characters', 'Scenes', 'Notes'].map(tab => (
                <div key={tab} className="wj-world-tab-demo">{tab}</div>
            ))}
            <div className="wj-world-items">
                {['Elara Nightshade', 'Kael Ironfist', 'The Crimson Library'].map(item => (
                    <div key={item} className="wj-world-item-demo">
                        <div className="wj-world-item-avatar">{item[0]}</div>
                        <span>{item}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ReaderThemeDemo: React.FC = () => {
    const themes = [
        { name: 'Light', bg: '#FBF9F6', text: '#3E2723' },
        { name: 'Sepia', bg: '#FBF0D9', text: '#5B4636' },
        { name: 'Dark', bg: '#261F1D', text: '#BCAAA4' },
    ];
    const [active, setActive] = useState(0);

    return (
        <div className="wj-mini-demo wj-mini-theme">
            <div className="wj-theme-preview" style={{ background: themes[active].bg, color: themes[active].text }}>
                <h4 style={{ color: themes[active].text }}>Chapter 7: The Revelation</h4>
                <p>The morning sun cast golden rays across the library floor...</p>
            </div>
            <div className="wj-theme-buttons">
                {themes.map((t, i) => (
                    <button
                        key={t.name}
                        className={`wj-theme-btn ${i === active ? 'wj-theme-btn-active' : ''}`}
                        style={{ background: t.bg, color: t.text }}
                        onClick={() => setActive(i)}
                    >
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ReaderSpoilerDemo: React.FC = () => {
    const [revealed, setRevealed] = useState(false);
    return (
        <div className="wj-mini-demo wj-mini-spoiler">
            <p className="wj-spoiler-text">
                The hero finally confessed: "
                <span
                    className={`wj-spoiler-word ${revealed ? 'wj-spoiler-revealed' : ''}`}
                    onClick={() => setRevealed(!revealed)}
                >
                    He was the villain all along
                </span>
                ," she whispered.
            </p>
            <small className="wj-spoiler-hint">
                {revealed ? '✓ Revealed! Click again to re-hide' : '← Click the blurred text to reveal'}
            </small>
        </div>
    );
};

const ReaderCharacterDemo: React.FC = () => {
    const [showCard, setShowCard] = useState(false);
    return (
        <div className="wj-mini-demo wj-mini-character">
            <p className="wj-char-text">
                "You can't be serious," said{' '}
                <span
                    className="wj-char-mention"
                    onMouseEnter={() => setShowCard(true)}
                    onMouseLeave={() => setShowCard(false)}
                    onClick={() => setShowCard(!showCard)}
                >
                    @Elara Nightshade
                </span>
                , drawing her blade.
            </p>
            <AnimatePresence>
                {showCard && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="wj-char-card"
                    >
                        <div className="wj-char-card-avatar">EN</div>
                        <div>
                            <strong>Elara Nightshade</strong>
                            <span className="wj-char-card-role">Protagonist</span>
                            <p>A scholar turned warrior, haunted by prophecy.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <small className="wj-char-hint">Hover or tap the character name above</small>
        </div>
    );
};

// ─── Main Journey Component ────────────────────────────────────
export const WelcomeJourney: React.FC<WelcomeJourneyProps> = ({ userName, onComplete }) => {
    const [step, setStep] = useState(0);
    const [role, setRole] = useState<'reader' | 'writer' | 'both'>('both');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY)) {
            setIsVisible(false);
        }
    }, []);

    if (!isVisible) return null;

    const handleRoleSelect = (selectedRole: 'reader' | 'writer' | 'both') => {
        setRole(selectedRole);
        setStep(2);
    };

    const handleComplete = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem('ww_userRole', role);
        setIsVisible(false);
        onComplete(role);
    };

    // Determine total steps based on role
    const getSteps = () => {
        if (role === 'reader') return [0, 1, 3, 4]; // welcome, role, reader features, ready
        if (role === 'writer') return [0, 1, 2, 4]; // welcome, role, writer features, ready
        return [0, 1, 2, 3, 4]; // all
    };

    const stepSequence = getSteps();
    const currentStepInSequence = stepSequence.indexOf(step);
    const isLast = currentStepInSequence === stepSequence.length - 1;
    const isFirst = currentStepInSequence === 0;

    const goNext = () => {
        if (isLast) {
            handleComplete();
        } else {
            setStep(stepSequence[currentStepInSequence + 1]);
        }
    };

    const goBack = () => {
        if (!isFirst) {
            setStep(stepSequence[currentStepInSequence - 1]);
        }
    };

    return (
        <div className="wj-overlay">
            <FloatingParticles />
            <div className="wj-container">
                {/* Content */}
                <div className="wj-content">
                    <AnimatePresence mode="wait">
                        {step === 0 && <WelcomeScreen key="welcome" userName={userName} />}
                        {step === 1 && <RoleSelection key="role" onSelect={handleRoleSelect} />}
                        {step === 2 && <WriterFeatures key="writer" />}
                        {step === 3 && <ReaderFeatures key="reader" />}
                        {step === 4 && <ReadyScreen key="ready" role={role} />}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="wj-nav">
                    <div className="wj-nav-dots">
                        {stepSequence.map((s, i) => (
                            <span
                                key={s}
                                className={`wj-nav-dot ${i === currentStepInSequence ? 'wj-nav-dot-active' : ''} ${i < currentStepInSequence ? 'wj-nav-dot-done' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="wj-nav-buttons">
                        {step !== 1 && (
                            <button className="wj-nav-skip" onClick={handleComplete}>
                                Skip
                            </button>
                        )}
                        <div className="wj-nav-arrows">
                            {!isFirst && step !== 1 && (
                                <button className="wj-nav-back" onClick={goBack}>
                                    ← Back
                                </button>
                            )}
                            {step !== 1 && (
                                <button className="wj-nav-next" onClick={goNext}>
                                    {isLast ? "Let's Go! 🚀" : 'Next →'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
