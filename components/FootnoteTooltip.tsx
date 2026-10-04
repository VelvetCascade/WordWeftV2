import React, { useState, useRef, useEffect, useId } from 'react';
import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';

/** A reader note anchored to its marker and kept inside the reading surface. */
export const FootnoteTooltip: React.FC<{ index: number; note: string }> = ({ index, note }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    const markerRef = useRef<HTMLSpanElement>(null);
    const popupRef = useRef<HTMLSpanElement>(null);
    const popupId = useId();

    useEffect(() => {
        if (!isOpen || !markerRef.current || !popupRef.current) return;
        const marker = markerRef.current;
        const popup = popupRef.current;
        let disposed = false;
        const update = () => {
            void computePosition(marker, popup, {
                placement: 'bottom',
                middleware: [offset(10), flip({ padding: 12 }), shift({ padding: 12 }), size({ padding: 12, apply({ availableWidth, availableHeight, elements }) {
                    Object.assign(elements.floating.style, { maxWidth: `${Math.max(0, availableWidth)}px`, maxHeight: `${Math.max(0, availableHeight)}px` });
                } })],
            }).then(({ x, y }) => { if (!disposed) setPosition({ left: x, top: y }); });
        };
        const stopUpdating = autoUpdate(marker, popup, update);
        // Dismiss without a full-screen shield: the same tap can activate the
        // control outside the note, including the preview's Close button.
        const outside = (event: PointerEvent | FocusEvent) => {
            if (event.target instanceof Node && !marker.contains(event.target)) setIsOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            const focusedDialog = event.target instanceof Element ? event.target.closest('[role="dialog"][aria-modal="true"]') : null;
            if (focusedDialog && focusedDialog !== marker.closest('[role="dialog"][aria-modal="true"]')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            setIsOpen(false);
            marker.querySelector<HTMLElement>('.footnote-marker')?.focus({ preventScroll: true });
        };
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('focusin', outside, true);
        document.addEventListener('keydown', escape, true);
        return () => {
            disposed = true;
            stopUpdating();
            document.removeEventListener('pointerdown', outside, true);
            document.removeEventListener('focusin', outside, true);
            document.removeEventListener('keydown', escape, true);
        };
    }, [isOpen]);

    const toggle = () => { setPosition(null); setIsOpen(open => !open); };
    return (
        <span className="footnote-wrapper" ref={markerRef}>
            <button
                type="button"
                className={`footnote-marker${isOpen ? ' active' : ''}`}
                onClick={event => { event.stopPropagation(); toggle(); }}
                aria-label={`Footnote ${index}`}
                aria-expanded={isOpen}
                aria-controls={isOpen ? popupId : undefined}
            >{index}</button>
            {isOpen && (
                <span ref={popupRef} id={popupId} role="note" aria-label={`Footnote ${index}`} className="footnote-popup"
                    style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' }}
                    onClick={event => event.stopPropagation()}>
                    <span className="footnote-popup-header">
                        <span className="footnote-popup-badge">Note {index}</span>
                        <button type="button" className="footnote-popup-close" onClick={() => { setIsOpen(false); markerRef.current?.querySelector<HTMLElement>('.footnote-marker')?.focus({ preventScroll: true }); }} aria-label="Close footnote">×</button>
                    </span>
                    <span className="footnote-popup-body">{note}</span>
                </span>
            )}
        </span>
    );
};
