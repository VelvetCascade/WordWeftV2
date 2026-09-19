import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoachNudge {
    id: string;
    session: number;
    icon: string;
    message: string;
    targetSelector?: string;
    position: 'top-right' | 'bottom-center' | 'right-center' | 'bottom-right';
    delayMs: number;
    durationMs: number;
    requiresFeature?: string;
}

const NUDGES: CoachNudge[] = [
    // Session 1
    {
        id: 'theme-switcher',
        session: 1,
        icon: 'Aa',
        message: 'Choose light, sepia, or dark in reading settings.',
        position: 'right-center',
        delayMs: 3000,
        durationMs: 8000,
    },
    {
        id: 'font-size',
        session: 1,
        icon: 'A+',
        message: 'Adjust text size and spacing in reading settings.',
        position: 'right-center',
        delayMs: 12000,
        durationMs: 7000,
    },
    // Session 2
    {
        id: 'paragraph-comment',
        session: 2,
        icon: '+',
        message: 'Select a paragraph to leave a comment.',
        position: 'bottom-center',
        delayMs: 5000,
        durationMs: 8000,
    },
    {
        id: 'chapter-like',
        session: 2,
        icon: '♥',
        message: 'Use the heart at the end to like this chapter.',
        position: 'top-right',
        delayMs: 15000,
        durationMs: 7000,
    },
    // Session 3
    {
        id: 'character-mention',
        session: 3,
        icon: '@',
        message: 'Select a highlighted character name to open their profile.',
        position: 'bottom-center',
        delayMs: 4000,
        durationMs: 8000,
        requiresFeature: 'mentions',
    },
    {
        id: 'spoiler-reveal',
        session: 3,
        icon: '…',
        message: 'Select blurred text when you are ready to reveal it.',
        position: 'bottom-center',
        delayMs: 10000,
        durationMs: 8000,
        requiresFeature: 'spoilers',
    },
];

const STORAGE_KEY = 'ww_reader_coach_session';
const DISMISSED_KEY = 'ww_reader_coach_dismissed';

interface ReaderDiscoveryCoachProps {
    hasMentions?: boolean;
    hasSpoilers?: boolean;
}

export const ReaderDiscoveryCoach: React.FC<ReaderDiscoveryCoachProps> = ({
    hasMentions = false,
    hasSpoilers = false,
}) => {
    const [activeNudge, setActiveNudge] = useState<CoachNudge | null>(null);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const getCurrentSession = useCallback(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? parseInt(stored, 10) : 0;
    }, []);

    useEffect(() => {
        // Increment session count
        const currentSession = getCurrentSession();
        const newSession = currentSession + 1;
        localStorage.setItem(STORAGE_KEY, String(newSession));

        // Load dismissed nudges
        const dismissedStr = localStorage.getItem(DISMISSED_KEY);
        const dismissedSet = dismissedStr ? new Set<string>(JSON.parse(dismissedStr)) : new Set<string>();
        setDismissed(dismissedSet);

        // Filter nudges for current session
        const sessionNudges = NUDGES.filter(n => {
            if (n.session !== newSession) return false;
            if (dismissedSet.has(n.id)) return false;
            if (n.requiresFeature === 'mentions' && !hasMentions) return false;
            if (n.requiresFeature === 'spoilers' && !hasSpoilers) return false;
            return true;
        });

        if (sessionNudges.length === 0) return;

        // Schedule nudges sequentially
        const timers: number[] = [];
        sessionNudges.forEach((nudge) => {
            const showTimer = window.setTimeout(() => {
                setActiveNudge(nudge);
            }, nudge.delayMs);
            timers.push(showTimer);

            const hideTimer = window.setTimeout(() => {
                setActiveNudge(prev => prev?.id === nudge.id ? null : prev);
            }, nudge.delayMs + nudge.durationMs);
            timers.push(hideTimer);
        });

        return () => timers.forEach(t => clearTimeout(t));
    }, []);

    const handleDismiss = (nudgeId: string) => {
        setActiveNudge(null);
        const newDismissed = new Set(dismissed);
        newDismissed.add(nudgeId);
        setDismissed(newDismissed);
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(newDismissed)));
    };

    return (
        <AnimatePresence>
            {activeNudge && (
                <motion.div
                    key={activeNudge.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`reader-coach-nudge reader-coach-${activeNudge.position}`}
                    style={{
                        position: 'fixed',
                        zIndex: 45,
                    }}
                >
                    <div className="reader-coach-nudge-inner">
                        <span className="reader-coach-nudge-icon">{activeNudge.icon}</span>
                        <p className="reader-coach-nudge-text">{activeNudge.message}</p>
                        <button
                            className="reader-coach-nudge-dismiss"
                            onClick={() => handleDismiss(activeNudge.id)}
                            aria-label="Dismiss tip"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Progress dots */}
                    <div className="reader-coach-progress">
                        {NUDGES.filter(n => n.session === activeNudge.session).map(n => (
                            <span
                                key={n.id}
                                className={`reader-coach-dot ${n.id === activeNudge.id ? 'reader-coach-dot-active' : ''}`}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
