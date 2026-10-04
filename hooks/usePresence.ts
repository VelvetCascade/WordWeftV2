import { useEffect, useState } from 'react';

/** Retain a dismissed surface briefly for its CSS exit; callers make it inert. */
export function usePresence(open: boolean, duration = 120) {
    const [retained, setRetained] = useState(open);
    useEffect(() => {
        if (open) { setRetained(true); return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setRetained(false);
            return;
        }
        const timer = window.setTimeout(() => setRetained(false), duration);
        return () => window.clearTimeout(timer);
    }, [open, duration]);
    return open || retained;
}

/** Immediate completion, delayed indication: fast requests need no spinner. */
export function useDelayedFlag(active: boolean, delay = 150) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!active) { setVisible(false); return; }
        const timer = window.setTimeout(() => setVisible(true), delay);
        return () => window.clearTimeout(timer);
    }, [active, delay]);
    return active && visible;
}
