import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/** A compact action disclosure that closes predictably and stays within the app viewport. */
export const DisclosureMenu: React.FC<{ label: string; children: React.ReactNode; className?: string; contentClassName?: string }> = ({ label, children, className = '', contentClassName = '' }) => {
    const root = useRef<HTMLDetailsElement>(null);
    const trigger = useRef<HTMLElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<'above' | 'below'>('below');
    const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
    const close = (restoreFocus = false) => {
        if (root.current) root.current.open = false;
        setOpen(false);
        if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    };
    useLayoutEffect(() => {
        if (!open) return;
        const position = () => {
            const anchor = trigger.current?.getBoundingClientRect();
            if (!anchor || !content.current) return;
            const nav = document.querySelector('.v2-bottom-nav')?.getBoundingClientRect().height || 0;
            const below = innerHeight - nav - anchor.bottom - 12;
            const above = anchor.top - 100;
            const up = content.current.scrollHeight > below && above > below;
            setPlacement(up ? 'above' : 'below');
            setMaxHeight(Math.max(44, up ? above : below));
        };
        position();
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
        const keyboard = (event: KeyboardEvent) => {
            if (!root.current?.contains(document.activeElement)) return;
            if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const items = Array.from(content.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') || []);
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keyboard);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
    }, [open]);
    return <details ref={root} className={`ww-studio-story-menu ${className}`} onToggle={event => setOpen(event.currentTarget.open)} onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close();
    }}>
        <summary ref={trigger} aria-label={label} aria-expanded={open} onKeyDown={event => {
            if (!open && event.key === 'ArrowDown') {
                event.preventDefault();
                if (root.current) root.current.open = true;
                setOpen(true);
                requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('a[href],button:not(:disabled)')?.focus());
            }
        }}><MoreHorizontal size={21} /></summary>
        <div ref={content} className={contentClassName} data-placement={placement} style={{ maxHeight }} onClickCapture={event => {
            const action = (event.target as HTMLElement).closest('a[href],button:not(:disabled)');
            if (action) close(true);
        }}>{children}</div>
    </details>;
};
