import React, { useState } from 'react';

/**
 * Interactive spoiler reveal component for preview & reader views.
 * Text starts blurred/hidden; clicking reveals it with a smooth animation.
 * Can click again to re-hide.
 */
export const SpoilerReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [revealed, setRevealed] = useState(false);

    const toggle = () => setRevealed(current => !current);

    return (
        <span
            className={`spoiler-text${revealed ? ' revealed' : ''}`}
            data-revealed={revealed ? 'true' : 'false'}
            onClick={(e) => {
                e.stopPropagation();
                toggle();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle();
                }
            }}
            aria-pressed={revealed}
            aria-label={revealed ? 'Hide spoiler' : 'Reveal spoiler'}
            title={revealed ? 'Hide spoiler' : 'Reveal spoiler'}
        >
            {children}
        </span>
    );
};
