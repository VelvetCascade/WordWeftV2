import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * MoodAtmosphere — The Atmospheric Engine
 *
 * Watches [data-mood] blocks in the viewport via IntersectionObserver.
 * When a mood block enters view, the entire page environment shifts:
 *   - Background gradient layer
 *   - Floating particle elements
 *   - Edge vignette overlay
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

// Particle configurations for each mood
const MOOD_PARTICLES: Record<MoodType, { count: number; className: string }> = {
    romantic: { count: 1000, className: 'mood-particle--petal' },
    tense: { count: 1000, className: 'mood-particle--spark' },
    melancholy: { count: 1000, className: 'mood-particle--raindrop' },
    triumphant: { count: 1000, className: 'mood-particle--sparkle' },
    eerie: { count: 1000, className: 'mood-particle--wisp' },
    serene: { count: 1000, className: 'mood-particle--orb' },
};

export const MoodAtmosphere: React.FC<MoodAtmosphereProps> = ({ contentRef, active = true }) => {
    const [activeMood, setActiveMood] = useState<MoodType | null>(null);
    const [prevMood, setPrevMood] = useState<MoodType | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
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

                if (dominant !== activeMood) {
                    setPrevMood(activeMood);
                    setIsTransitioning(true);
                    setActiveMood(dominant);

                    if (transitionTimeoutRef.current) {
                        clearTimeout(transitionTimeoutRef.current);
                    }
                    transitionTimeoutRef.current = window.setTimeout(() => {
                        setIsTransitioning(false);
                        setPrevMood(null);
                    }, 900);
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
    }, [active, contentRef, determineDominantMood, activeMood]);

    if (!active || !activeMood) return null;

    const particleConfig = MOOD_PARTICLES[activeMood];

    return (
        <div
            className={`mood-atmosphere ${activeMood ? `mood-atmosphere--${activeMood}` : ''} ${isTransitioning ? 'mood-atmosphere--transitioning' : ''}`}
            aria-hidden="true"
        >
            {/* Layer 1: Full-page gradient background */}
            <div className={`mood-atmosphere__gradient mood-atmosphere__gradient--${activeMood}`} />

            {/* Layer 2: Floating particles */}
            <div className="mood-atmosphere__particles">
                {Array.from({ length: particleConfig.count }).map((_, i) => (
                    <div
                        key={`${activeMood}-${i}`}
                        className={`mood-particle ${particleConfig.className}`}
                        style={{
                            '--particle-index': i,
                            '--particle-delay': `${(i * 0.5) + Math.random() * 1.5}s`,
                            '--particle-duration': `${3 + Math.random() * 5}s`,
                            '--particle-x': `${3 + Math.random() * 94}%`,
                            '--particle-y': `${Math.random() * 100}%`,
                            '--particle-size': `${5 + Math.random() * 12}px`,
                            '--particle-opacity': `${0.35 + Math.random() * 0.5}`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* Layer 3: Vignette overlay */}
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
