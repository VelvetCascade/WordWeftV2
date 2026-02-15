import React, { useState, useRef, useEffect } from 'react';

/**
 * FootnoteTooltip — elegant floating card that shows footnote content.
 * Used in preview and reader views.
 */
export const FootnoteTooltip: React.FC<{ index: number; note: string }> = ({ index, note }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<'above' | 'below'>('above');
    const markerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (isOpen && markerRef.current) {
            const rect = markerRef.current.getBoundingClientRect();
            const spaceAbove = rect.top;
            setPosition(spaceAbove < 120 ? 'below' : 'above');
        }
    }, [isOpen]);

    return (
        <span className="footnote-wrapper" ref={markerRef}>
            <span
                className={`footnote-marker${isOpen ? ' active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsOpen(prev => !prev);
                    }
                }}
                aria-label={`Footnote ${index}`}
            >
                {index}
            </span>
            {isOpen && (
                <>
                    <div className="footnote-overlay" onClick={() => setIsOpen(false)} />
                    <div className={`footnote-popup ${position}`}>
                        <div className="footnote-popup-header">
                            <span className="footnote-popup-badge">Note {index}</span>
                            <button
                                className="footnote-popup-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="footnote-popup-body">{note}</div>
                    </div>
                </>
            )}
        </span>
    );
};
