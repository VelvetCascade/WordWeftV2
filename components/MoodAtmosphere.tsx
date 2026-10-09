import React, { useEffect, useRef, useState } from 'react';
import { usePresence } from '../hooks/usePresence';
import { MOODS, moodAtReadingLine, type MoodType, type AtmosphereIntensity } from '../utils/atmosphere';
import '../styles/atmospheres.css';
export type { MoodType } from '../utils/atmosphere';

function scrollRoot(content: HTMLElement): HTMLElement | null {
    return content.closest<HTMLElement>('.ww-reading-preview-canvas');
}

/** One measured reading line, shared by the live reader and its scrollable preview. */
export function useMoodDetector(contentRef: React.RefObject<HTMLElement | null>, active = true): MoodType | null {
    const [mood, setMood] = useState<MoodType | null>(null);
    useEffect(() => {
        const content = contentRef.current;
        if (!active || !content) { setMood(null); return; }
        const root = scrollRoot(content);
        let blocks: HTMLElement[] = [];
        let frame = 0;
        let observed = false;
        const visible = new Set<HTMLElement>();
        const measure = () => {
            frame = 0;
            const bounds = root?.getBoundingClientRect();
            const top = bounds?.top ?? 0;
            const height = root?.clientHeight ?? window.innerHeight;
            const line = top + Math.min(height * .32, 260);
            const passages = (observed ? Array.from(visible) : blocks).map(block => {
                const rect = block.getBoundingClientRect();
                return { mood: block.dataset.mood ?? null, top: rect.top, bottom: rect.bottom };
            });
            const next = moodAtReadingLine(passages, line);
            setMood(previous => {
                // A small dead band prevents touch-scroll jitter at an exact boundary.
                if (previous && previous !== next && (moodAtReadingLine(passages, line - 10) === previous || moodAtReadingLine(passages, line + 10) === previous)) return previous;
                return previous === next ? previous : next;
            });
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
        // Only measure visible sections during scroll; do not scan a long chapter each frame.
        const observer = new IntersectionObserver(entries => {
            observed = true;
            entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target as HTMLElement); else visible.delete(entry.target as HTMLElement); });
            schedule();
        }, { root, threshold: [0, 1] });
        const refresh = () => {
            observer.disconnect(); visible.clear(); observed = false;
            blocks = Array.from(content.querySelectorAll<HTMLElement>('[data-mood]'));
            blocks.forEach(block => observer.observe(block));
            schedule();
        };
        const mutations = new MutationObserver(refresh);
        mutations.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mood'] });
        const resize = new ResizeObserver(schedule); resize.observe(content);
        if (root) resize.observe(root);
        const scroller = root ?? window;
        scroller.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        refresh();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect(); resize.disconnect(); scroller.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
    }, [contentRef, active]);
    return active ? mood : null;
}

// Artwork supplies the atmosphere; movement never uses mood icons as particles.
const PARTICLES: Record<MoodType, { image: string; count: number; duration: number }> = {
    melancholy: { image: 'rain-streak', count: 28, duration: 2.7 },
    romantic: { image: 'petal', count: 12, duration: 10 },
    eerie: { image: 'light-mote', count: 0, duration: 24 },
    tense: { image: 'shadow-trace', count: 2, duration: 6 },
    triumphant: { image: 'amber-stroke', count: 6, duration: 7 },
    serene: { image: 'light-mote', count: 0, duration: 10 },
};
const Layer: React.FC<{ mood: MoodType; open: boolean }> = ({ mood, open }) => {
    const present = usePresence(open, 500);
    if (!present) return null;
    const particles = PARTICLES[mood];
    return <div className={`ww-atmosphere-layer ww-atmosphere-${mood}`} data-state={open ? 'open' : 'closed'} data-mood-layer={mood}>
        {['romantic', 'melancholy', 'eerie'].includes(mood) && <div className="ww-atmosphere-scenery">
            {['left', 'right'].map(side => <div key={side} className={`ww-atmosphere-cloudbank ww-atmosphere-cloudbank-${side}`}>
                {[0, 1].map(index => <img key={index} className={`ww-atmosphere-veil ww-atmosphere-veil-${index}`} src="/assets/atmospheres/fog-veil.webp" alt="" width="960" height="960" decoding="async" />)}
            </div>)}
        </div>}
        {mood === 'serene' && <div className="ww-atmosphere-water">
            {[0, 1, 2].map(index => <img key={index} className={`ww-atmosphere-ripple ww-atmosphere-ripple-${index}`} src="/assets/atmospheres/water-ripple.webp" alt="" width="768" height="768" decoding="async" />)}
        </div>}
        {['left', 'right'].map(side => <div key={side} className={`ww-atmosphere-edge ww-atmosphere-edge-${side}`}>
            {Array.from({ length: particles.count }, (_, index) => <div key={index} className="ww-ambient-detail" style={{ '--detail-x': `${4 + (((index + (side === 'right' ? 3 : 0)) * 19) % 76)}%`, '--detail-y': `${6 + ((index * 17) % 82)}%`, '--detail-delay': `${-(index + (side === 'right' ? .7 : 0)) * 2.3}s`, '--detail-duration': `${particles.duration + (index % 7) * (mood === 'melancholy' ? .18 : .7)}s`, '--detail-rotation': `${index * 37}deg` } as React.CSSProperties}>
                <img src={`/assets/atmospheres/${particles.image}.webp`} alt="" width="24" height="64" decoding="async" />
            </div>)}
        </div>)}
    </div>;
};

export const MoodAtmosphere: React.FC<{ contentRef: React.RefObject<HTMLElement | null>; active?: boolean; intensity?: AtmosphereIntensity }> = ({ contentRef, active = true, intensity = 'full' }) => {
    const mood = useMoodDetector(contentRef, active && intensity !== 'off');
    const frameRef = useRef<HTMLDivElement>(null);
    const [paused, setPaused] = useState(typeof document !== 'undefined' && document.hidden);
    useEffect(() => {
        const visibility = () => setPaused(document.hidden);
        document.addEventListener('visibilitychange', visibility);
        return () => document.removeEventListener('visibilitychange', visibility);
    }, []);
    useEffect(() => {
        const content = contentRef.current;
        const frame = frameRef.current;
        if (!content || !frame) return;
        const root = scrollRoot(content);
        const measure = () => {
            const rootRect = root?.getBoundingClientRect();
            const viewportWidth = root?.clientWidth ?? document.documentElement.clientWidth;
            const rect = content.getBoundingClientRect();
            const origin = rootRect?.left ?? 0;
            const reader = content.closest('.reader-experience');
            const railRect = (selector: string) => {
                const rail = reader?.querySelector<HTMLElement>(selector);
                if (!rail || getComputedStyle(rail).display === 'none') return null;
                const bounds = rail.getBoundingClientRect();
                return bounds.width > 0 && bounds.height > 0 ? bounds : null;
            };
            const outline = railRect('.reader-outline-rail');
            const conversation = railRect('.reader-conversation-rail');
            // Use the gaps beside the words, not the viewport edges hidden under sidebars.
            const textLeft = Math.max(0, rect.left - origin - 4);
            const textRight = Math.min(viewportWidth, rect.right - origin + 4);
            const leftLimit = outline ? Math.max(0, outline.right - origin + 12) : 0;
            const rightLimit = conversation ? Math.min(viewportWidth, conversation.left - origin - 12) : viewportWidth;
            const leftWidth = Math.max(0, Math.min(320, textLeft - leftLimit));
            const rightWidth = Math.max(0, Math.min(320, rightLimit - textRight));
            frame.style.setProperty('--atmosphere-copy-left', `${textLeft}px`);
            frame.style.setProperty('--atmosphere-copy-right', `${textRight}px`);
            frame.style.setProperty('--atmosphere-left-start', `${textLeft - leftWidth}px`);
            frame.style.setProperty('--atmosphere-left-width', `${leftWidth}px`);
            frame.style.setProperty('--atmosphere-right-start', `${viewportWidth - textRight - rightWidth}px`);
            frame.style.setProperty('--atmosphere-right-width', `${rightWidth}px`);
            frame.style.setProperty('--atmosphere-height', `${root?.clientHeight ?? window.innerHeight}px`);
        };
        const resize = new ResizeObserver(measure); resize.observe(content); resize.observe(content.closest('.reader-manuscript') ?? content); if (root) resize.observe(root);
        const reader = content.closest('.reader-experience');
        reader?.querySelectorAll('.reader-outline-rail, .reader-conversation-rail').forEach(rail => resize.observe(rail));
        const appearance = new MutationObserver(measure); if (reader) appearance.observe(reader, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('resize', measure, { passive: true }); measure();
        return () => { resize.disconnect(); appearance.disconnect(); window.removeEventListener('resize', measure); };
    }, [contentRef]);
    return <div ref={frameRef} className="ww-atmospheres" data-active-atmosphere={mood ?? 'none'} data-intensity={intensity} data-paused={paused || undefined} aria-hidden="true">
        {MOODS.map(value => <Layer key={value} mood={value} open={active && mood === value && intensity !== 'off'} />)}
    </div>;
};
