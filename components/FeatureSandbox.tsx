import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from './icons/Icons';

type SandboxType = 'mention' | 'spoiler' | 'mood' | 'details' | 'pullquote' | 'reader' | 'characters' | 'search';

interface FeatureSandboxProps {
    isOpen: boolean;
    type: SandboxType;
    onClose: () => void;
}

// ─── Sandbox: Spoiler ──────────────────────────────────────────
const SpoilerSandbox: React.FC = () => {
    const [selectedText, setSelectedText] = useState('');
    const [spoilerApplied, setSpoilerApplied] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const sampleText = 'The hero walked to the edge of the cliff. He was the villain all along, she whispered into the darkness.';
    const spoilerPart = 'He was the villain all along';

    return (
        <div className="sandbox-inner">
            <div className="sandbox-step-label">
                {!spoilerApplied ? '1. Select the spoiler text below, then click "Mark as Spoiler"' : '2. Now click the blurred text to reveal it!'}
            </div>

            <div className="sandbox-editor-mock">
                <div className="sandbox-toolbar-mock">
                    <span className="sandbox-toolbar-label">Editor Toolbar</span>
                    <button
                        className={`sandbox-spoiler-btn ${selectedText ? 'sandbox-spoiler-btn-active' : ''}`}
                        onClick={() => {
                            if (selectedText) {
                                setSpoilerApplied(true);
                                setSelectedText('');
                            }
                        }}
                        disabled={!selectedText}
                    >
                        Mark as Spoiler
                    </button>
                </div>

                <div className="sandbox-text-area">
                    {!spoilerApplied ? (
                        <p>
                            The hero walked to the edge of the cliff. "
                            <span
                                className={`sandbox-selectable ${selectedText ? 'sandbox-selected' : ''}`}
                                onClick={() => setSelectedText(selectedText ? '' : spoilerPart)}
                            >
                                {spoilerPart}
                            </span>
                            ," she whispered into the darkness.
                        </p>
                    ) : (
                        <p>
                            The hero walked to the edge of the cliff. "
                            <span
                                className={`sandbox-spoiler-text ${revealed ? 'sandbox-spoiler-revealed' : ''}`}
                                onClick={() => setRevealed(!revealed)}
                            >
                                {spoilerPart}
                            </span>
                            ," she whispered into the darkness.
                        </p>
                    )}
                </div>
            </div>

            {spoilerApplied && revealed && (
                <div className="sandbox-success">
                    You've learned how spoilers work! Writers mark text, readers click to reveal.
                </div>
            )}
        </div>
    );
};

// ─── Sandbox: Mood ─────────────────────────────────────────────
const MoodSandbox: React.FC = () => {
    const moods = [
        { name: 'Romantic', emoji: '', bg: 'linear-gradient(135deg, #C44D73, #8D6E63)' },
        { name: 'Tense', emoji: '', bg: 'linear-gradient(135deg, #B71C1C, #5D4037)' },
        { name: 'Melancholy', emoji: '', bg: 'linear-gradient(135deg, #5B86E5, #4E342E)' },
        { name: 'Triumphant', emoji: '', bg: 'linear-gradient(135deg, #D4A017, #8D6E63)' },
        { name: 'Eerie', emoji: '', bg: 'linear-gradient(135deg, #3E2723, #1B0E0A)' },
        { name: 'Serene', emoji: '', bg: 'linear-gradient(135deg, #A1887F, #5D4037)' },
    ];
    const [active, setActive] = useState<number | null>(null);

    return (
        <div className="sandbox-inner">
            <div className="sandbox-step-label">
                Click a mood below to see how the reading atmosphere transforms
            </div>

            <div className="sandbox-mood-grid">
                {moods.map((m, i) => (
                    <button
                        key={m.name}
                        className={`sandbox-mood-card ${active === i ? 'sandbox-mood-card-active' : ''}`}
                        onClick={() => setActive(i)}
                    >
                        <span className="sandbox-mood-emoji">{m.emoji}</span>
                        <span className="sandbox-mood-name">{m.name}</span>
                    </button>
                ))}
            </div>

            <div
                className="sandbox-mood-preview"
                style={{
                    background: active !== null ? moods[active].bg : '#FBF9F6',
                    color: active !== null && (active === 4) ? '#BCAAA4' : active !== null ? '#FFF' : '#3E2723',
                }}
            >
                <h4 style={{ color: 'inherit' }}>Chapter 3: The Encounter</h4>
                <p>The golden light filtered through the ancient windows, casting long shadows across the stone floor. Her heart raced as footsteps echoed in the corridor...</p>
                {active !== null && (
                    <div className="sandbox-mood-label">{moods[active].emoji} {moods[active].name} Atmosphere Active</div>
                )}
            </div>
        </div>
    );
};

// ─── Sandbox: Mentions ─────────────────────────────────────────
const MentionSandbox: React.FC = () => {
    const [typed, setTyped] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [inserted, setInserted] = useState(false);

    useEffect(() => {
        let i = 0;
        const target = '@Elar';
        const timer = setInterval(() => {
            if (i <= target.length) {
                setTyped(target.slice(0, i));
                if (i === target.length) setShowPopup(true);
                i++;
            } else { clearInterval(timer); }
        }, 200);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="sandbox-inner">
            <div className="sandbox-step-label">
                Watch: Type @ followed by a character name to mention them
            </div>

            <div className="sandbox-editor-mock">
                <div className="sandbox-text-area sandbox-mention-area">
                    <p>"I need your help," said <span className="sandbox-mention-typed">{typed}<span className="wj-cursor">|</span></span></p>
                </div>

                <AnimatePresence>
                    {showPopup && !inserted && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="sandbox-mention-popup"
                        >
                            <button
                                className="sandbox-mention-item"
                                onClick={() => { setInserted(true); setShowPopup(false); }}
                            >
                                <div className="sandbox-mention-avatar" />
                                <div>
                                    <strong>Elara Nightshade</strong>
                                    <span>Protagonist</span>
                                </div>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {inserted && (
                <div className="sandbox-success">
                    Character linked! Readers will see a clickable mention with a preview card.
                </div>
            )}
        </div>
    );
};

// ─── Sandbox: Details / Collapsible ────────────────────────────
const DetailsSandbox: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <div className="sandbox-inner">
            <div className="sandbox-step-label">
                Click the collapsible block below to expand/collapse lore notes
            </div>

            <div className="sandbox-details-block">
                <button className="sandbox-details-summary" onClick={() => setOpen(!open)}>
                    <span className={`sandbox-details-arrow ${open ? 'sandbox-details-arrow-open' : ''}`}>▶</span>
                    <span>Author's Lore Notes: The Great War of Eldoria</span>
                </button>
                <div className={`sandbox-details-content ${open ? 'sandbox-details-open' : ''}`}>
                    <p>The Great War of Eldoria (1247–1251 AE) was a pivotal conflict between the Northern Alliance and the Southern Dominion. The war began when the Archmage Veridon discovered the forbidden scroll...</p>
                    <p className="sandbox-details-meta">This content is hidden by default — readers expand it when they want more lore!</p>
                </div>
            </div>
        </div>
    );
};

// ─── Sandbox: Pull Quote ───────────────────────────────────────
const PullQuoteSandbox: React.FC = () => (
    <div className="sandbox-inner">
        <div className="sandbox-step-label">
            Pull quotes turn memorable lines into beautiful typographic anchors
        </div>

        <div className="sandbox-pullquote">
            <div className="sandbox-pq-mark">"</div>
            <p className="sandbox-pq-text">Not all those who wander are lost.</p>
            <cite className="sandbox-pq-cite">— J.R.R. Tolkien</cite>
            <div className="sandbox-pq-mark sandbox-pq-mark-end">"</div>
        </div>

        <div className="sandbox-success" style={{ marginTop: '16px' }}>
            Use the Pull Quote button in the editor toolbar to create these beautiful epigraphs!
        </div>
    </div>
);

// ─── Sandbox Map ───────────────────────────────────────────────
const SANDBOX_MAP: Record<SandboxType, { title: string; Component: React.FC }> = {
    mention: { title: '@Character Mentions', Component: MentionSandbox },
    spoiler: { title: 'Spoiler / Hidden Text', Component: SpoilerSandbox },
    mood: { title: 'Mood Atmospheres', Component: MoodSandbox },
    details: { title: 'Collapsible Blocks', Component: DetailsSandbox },
    pullquote: { title: 'Pull Quotes', Component: PullQuoteSandbox },
    reader: { title: 'Reading Themes', Component: MoodSandbox },
    characters: { title: 'Character Profiles', Component: MentionSandbox },
    search: { title: 'Smart Search', Component: MentionSandbox },
};

// ─── Main Sandbox Modal ────────────────────────────────────────
export const FeatureSandbox: React.FC<FeatureSandboxProps> = ({ isOpen, type, onClose }) => {
    if (!isOpen) return null;

    const config = SANDBOX_MAP[type];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="sandbox-overlay"
            >
                <motion.div
                    initial={{ scale: 0.92, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.92, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="sandbox-modal"
                >
                    <div className="sandbox-header">
                        <div>
                            <span className="sandbox-badge">Try It Live</span>
                            <h3 className="sandbox-title">{config.title}</h3>
                        </div>
                        <button className="sandbox-close" onClick={onClose}>
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="sandbox-body">
                        <config.Component />
                    </div>

                    <div className="sandbox-footer">
                        <button className="sandbox-done-btn" onClick={onClose}>
                            Got It!
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
