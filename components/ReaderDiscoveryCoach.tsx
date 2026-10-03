import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { readOptionalTip, writeOptionalTip } from '../utils/optionalStorage';
import '../styles/optional-tips.css';

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
const COMPLETED_SESSION = Math.max(...NUDGES.map(nudge => nudge.session)) + 1;
const NUDGE_IDS = new Set(NUDGES.map(nudge => nudge.id));

function readSession(): number {
    const stored = readOptionalTip(STORAGE_KEY);
    if (!stored || !/^\d+$/.test(stored)) return 0;
    const session = Number(stored);
    return Number.isFinite(session) ? Math.min(session, COMPLETED_SESSION) : 0;
}

function readDismissed(): Set<string> {
    try {
        const parsed: unknown = JSON.parse(readOptionalTip(DISMISSED_KEY) || '[]');
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((id): id is string => typeof id === 'string' && NUDGE_IDS.has(id)));
    } catch {
        return new Set();
    }
}

interface ReaderDiscoveryCoachProps {
    hasMentions?: boolean;
    hasSpoilers?: boolean;
}

export const ReaderDiscoveryCoach: React.FC<ReaderDiscoveryCoachProps> = ({
    hasMentions = false,
    hasSpoilers = false,
}) => {
    const [activeNudge, setActiveNudge] = useState<CoachNudge | null>(null);
    const session = useRef<number | null>(null);
    const dismissed = useRef<Set<string>>(new Set());
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        // Effect replay restarts timers for the same mount. A real remount starts
        // the next reading session, capped once all discovery sessions are over.
        if (session.current === null) {
            session.current = Math.min(readSession() + 1, COMPLETED_SESSION);
            writeOptionalTip(STORAGE_KEY, String(session.current));
            dismissed.current = readDismissed();
        }

        // Filter nudges for current session
        const sessionNudges = NUDGES.filter(n => {
            if (n.session !== session.current) return false;
            if (dismissed.current.has(n.id)) return false;
            if (n.requiresFeature === 'mentions' && !hasMentions) return false;
            if (n.requiresFeature === 'spoilers' && !hasSpoilers) return false;
            return true;
        });

        if (sessionNudges.length === 0) return;

        // Schedule nudges sequentially
        const timers: number[] = [];
        sessionNudges.forEach((nudge) => {
            const showTimer = window.setTimeout(() => {
                if (!dismissed.current.has(nudge.id)) setActiveNudge(nudge);
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
        dismissed.current.add(nudgeId);
        writeOptionalTip(DISMISSED_KEY, JSON.stringify(Array.from(dismissed.current)));
    };

    return (
        <AnimatePresence>
            {activeNudge && (
                <motion.div
                    key={activeNudge.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.9 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
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
                            type="button"
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
