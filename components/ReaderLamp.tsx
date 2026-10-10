import React, { useEffect, useRef } from 'react';
import type { LampReadingMode } from '../utils/lampReading';
import '../styles/lamp-reading.css';

/** Lighting changes the paper behind the prose, never masks or dims the text.
 * One composited light follows either the reading band or a fine pointer.
 * Selection, touch, keyboard reading and reduced motion keep a steady surface. */
export function ReaderLamp({ mode, contentRef }: { mode: LampReadingMode; contentRef: React.RefObject<HTMLElement | null> }) {
    const lightRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (mode === 'off') return;
        const light = lightRef.current;
        if (!light) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
        let frame = 0;
        let pointer: { x: number; y: number } | null = null;
        const place = () => {
            frame = 0;
            const content = contentRef.current;
            if (!content) return;
            const rect = content.getBoundingClientRect();
            const selected = !!window.getSelection()?.toString();
            const x = pointer && mode === 'pointer' && fine.matches && !selected && !reduced.matches ? pointer.x : rect.left + rect.width / 2;
            const y = pointer && mode === 'pointer' && fine.matches && !selected && !reduced.matches ? pointer.y : window.innerHeight * .43;
            light.style.transform = `translate3d(${x - light.offsetWidth / 2}px, ${y - light.offsetHeight / 2}px, 0)`;
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
        const move = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || reduced.matches || !fine.matches || window.getSelection()?.toString()) return;
            if (!(event.target instanceof Element) || !event.target.closest('.reader-copy')) { pointer = null; schedule(); return; }
            pointer = { x: event.clientX, y: event.clientY }; schedule();
        };
        const scroll = () => { pointer = null; schedule(); };
        // Widths are read only once per animation frame; no React scroll renders.
        place();
        if (mode === 'pointer') window.addEventListener('pointermove', move, { passive: true });
        window.addEventListener('scroll', scroll, { passive: true });
        window.addEventListener('resize', schedule);
        document.addEventListener('selectionchange', scroll);
        reduced.addEventListener('change', scroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('scroll', scroll);
            window.removeEventListener('resize', schedule);
            document.removeEventListener('selectionchange', scroll);
            reduced.removeEventListener('change', scroll);
        };
    }, [mode, contentRef]);
    return mode === 'off' ? null : <div className="reader-lamp-layer" aria-hidden="true"><div ref={lightRef} className="reader-lamp-light" /></div>;
}
