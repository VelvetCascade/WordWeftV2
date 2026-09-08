import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * MoodAtmosphere — The Atmospheric Engine
 *
 * Watches [data-mood] blocks in the viewport via IntersectionObserver.
 * When a mood block enters view, the entire page environment shifts:
 *   - Background gradient layer
 *   - A restrained environmental texture
 *   - A small number of deterministic ambient details
 *
 * All effects are pure CSS, pointer-events:none, and respect prefers-reduced-motion.
 */

export type MoodType = 'romantic' | 'tense' | 'melancholy' | 'triumphant' | 'eerie' | 'serene';

interface MoodAtmosphereProps {
    /** Ref to the scrollable content container that holds mood blocks */
    contentRef: React.RefObject<HTMLElement | null>;
    /** Whether the atmosphere is active (e.g. reader is reading) */
    active?: boolean;
}

const MOOD_PARTICLES: Record<MoodType, { count: number; className: string }> = {
    romantic: { count: 9, className: 'mood-particle--petal' },
    tense: { count: 12, className: 'mood-particle--spark' },
    melancholy: { count: 14, className: 'mood-particle--raindrop' },
    triumphant: { count: 10, className: 'mood-particle--sparkle' },
    eerie: { count: 8, className: 'mood-particle--wisp' },
    serene: { count: 9, className: 'mood-particle--orb' },
};

const seededValue = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * (salt + 11) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

const particleStyle = (index: number): React.CSSProperties => ({
    '--particle-index': index,
    '--particle-delay': `${seededValue(index, 1) * 4}s`,
    '--particle-duration': `${10 + seededValue(index, 2) * 12}s`,
    '--particle-x': `${4 + seededValue(index, 3) * 92}%`,
    '--particle-y': `${6 + seededValue(index, 4) * 88}%`,
    '--particle-scale': `${0.65 + seededValue(index, 5) * 0.75}`,
    '--particle-opacity': `${0.16 + seededValue(index, 6) * 0.22}`,
} as React.CSSProperties);

export const MoodAtmosphere: React.FC<MoodAtmosphereProps> = ({ contentRef, active = true }) => {
    const [activeMood, setActiveMood] = useState<MoodType | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const activeMoodRef = useRef<MoodType | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const visibleMoodsRef = useRef<Map<Element, { mood: MoodType; ratio: number }>>(new Map());
    const transitionTimeoutRef = useRef<number | null>(null);

    const determineDominantMood = useCallback(() => {
        let best: { mood: MoodType; ratio: number } | null = null;
        visibleMoodsRef.current.forEach((entry) => {
            if (!best || entry.ratio > best.ratio) {
                best = entry;
            }
        });
        return best?.mood || null;
    }, []);

    // Setup IntersectionObserver
    useEffect(() => {
        if (!active || !contentRef.current) return;

        const container = contentRef.current;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const moodAttr = entry.target.getAttribute('data-mood') as MoodType | null;
                    if (!moodAttr) return;

                    if (entry.isIntersecting && entry.intersectionRatio > 0) {
                        visibleMoodsRef.current.set(entry.target, {
                            mood: moodAttr,
                            ratio: entry.intersectionRatio,
                        });
                    } else {
                        visibleMoodsRef.current.delete(entry.target);
                    }
                });

                const dominant = determineDominantMood();

                if (dominant !== activeMoodRef.current) {
                    activeMoodRef.current = dominant;
                    setIsTransitioning(true);
                    setActiveMood(dominant);

                    if (transitionTimeoutRef.current) {
                        clearTimeout(transitionTimeoutRef.current);
                    }
                    transitionTimeoutRef.current = window.setTimeout(() => {
                        setIsTransitioning(false);
                    }, 1200);
                }
            },
            {
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
            }
        );

        // Observe all mood blocks
        const moodBlocks = container.querySelectorAll('[data-mood]');
        moodBlocks.forEach((block) => observerRef.current?.observe(block));

        // Also set up a MutationObserver to watch for new mood blocks
        const mutationObserver = new MutationObserver(() => {
            const newBlocks = container.querySelectorAll('[data-mood]');
            observerRef.current?.disconnect();
            newBlocks.forEach((block) => observerRef.current?.observe(block));
        });
        mutationObserver.observe(container, { childList: true, subtree: true });

        return () => {
            observerRef.current?.disconnect();
            mutationObserver.disconnect();
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, [active, contentRef, determineDominantMood]);

    // Apply global body class for immersive full-page styling overrides
    useEffect(() => {
        if (activeMood) {
            document.body.setAttribute('data-active-mood', activeMood);
        } else {
            document.body.removeAttribute('data-active-mood');
        }

        return () => {
            document.body.removeAttribute('data-active-mood');
        };
    }, [activeMood]);

    if (!active || !activeMood) return null;

    const particleConfig = MOOD_PARTICLES[activeMood];

    return (
        <div
            className={`mood-atmosphere ${activeMood ? `mood-atmosphere--${activeMood}` : ''} ${isTransitioning ? 'mood-atmosphere--transitioning' : ''}`}
            aria-hidden="true"
        >
            {/* Layer 1: Full-page gradient background */}
            <div className={`mood-atmosphere__gradient mood-atmosphere__gradient--${activeMood}`} />

            {/* Layer 2: A quiet paper/light texture that gives the palette depth */}
            <div className={`mood-atmosphere__texture mood-atmosphere__texture--${activeMood}`} />

            {/* Layer 3: Sparse ambient details */}
            <div className="mood-atmosphere__particles">
                {Array.from({ length: particleConfig.count }).map((_, i) => (
                    <div
                        key={`${activeMood}-${i}`}
                        className={`mood-particle ${particleConfig.className}`}
                        style={particleStyle(i)}
                    />
                ))}
            </div>

            {/* Layer 4: Edge light keeps the manuscript as the visual anchor */}
            <div className={`mood-atmosphere__vignette mood-atmosphere__vignette--${activeMood}`} />
        </div>
    );
};

/**
 * useMoodDetector — Hook to detect the currently active mood in a content area.
 * For use in contexts where you want to read the mood but not render the atmosphere.
 */
export function useMoodDetector(contentRef: React.RefObject<HTMLElement | null>): MoodType | null {
    const [activeMood, setActiveMood] = useState<MoodType | null>(null);

    useEffect(() => {
        if (!contentRef.current) return;

        const container = contentRef.current;
        const visibleMoods = new Map<Element, { mood: MoodType; ratio: number }>();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const moodAttr = entry.target.getAttribute('data-mood') as MoodType | null;
                    if (!moodAttr) return;

                    if (entry.isIntersecting && entry.intersectionRatio > 0) {
                        visibleMoods.set(entry.target, { mood: moodAttr, ratio: entry.intersectionRatio });
                    } else {
                        visibleMoods.delete(entry.target);
                    }
                });

                let best: { mood: MoodType; ratio: number } | null = null;
                visibleMoods.forEach((entry) => {
                    if (!best || entry.ratio > best.ratio) best = entry;
                });
                setActiveMood(best?.mood || null);
            },
            { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
        );

        const moodBlocks = container.querySelectorAll('[data-mood]');
        moodBlocks.forEach((block) => observer.observe(block));

        return () => observer.disconnect();
    }, [contentRef]);

    return activeMood;
}
