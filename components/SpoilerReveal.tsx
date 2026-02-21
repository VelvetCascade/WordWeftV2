import React, { useState } from 'react';

/**
 * Interactive spoiler reveal component for preview & reader views.
 * Text starts blurred/hidden; clicking reveals it with a smooth animation.
 * Can click again to re-hide.
 */
export const SpoilerReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [revealed, setRevealed] = useState(false);

    return (
        <span
            className={`spoiler-text${revealed ? ' revealed' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                setRevealed(prev => !prev);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setRevealed(prev => !prev);
                }
            }}
            aria-label={revealed ? 'Click to hide spoiler' : 'Click to reveal hidden text'}
        >
            {children}
        </span>
    );
};
