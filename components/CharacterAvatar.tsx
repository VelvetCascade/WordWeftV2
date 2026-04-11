import React from 'react';

/**
 * A beautiful, consistent character avatar component used across the app.
 * Shows the character image if available, otherwise renders a stylish
 * gradient placeholder with the character's initial and a decorative
 * silhouette motif.
 */

interface CharacterAvatarProps {
    name: string;
    imageUrl?: string;
    /** 'xs' = 32px, 'sm' = 40px, 'md' = 64px, 'lg' = 96px, 'xl' = full-width hero */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    /** If true, renders as a square with rounded corners instead of a circle */
    square?: boolean;
}

// Deterministic colour palette based on first character — gives each character a unique vibe
const PALETTE: { bg: string; text: string; accent: string }[] = [
    { bg: 'from-rose-400 to-pink-600', text: 'text-white', accent: 'bg-rose-300/30' },
    { bg: 'from-violet-400 to-purple-600', text: 'text-white', accent: 'bg-violet-300/30' },
    { bg: 'from-blue-400 to-indigo-600', text: 'text-white', accent: 'bg-blue-300/30' },
    { bg: 'from-cyan-400 to-teal-600', text: 'text-white', accent: 'bg-cyan-300/30' },
    { bg: 'from-emerald-400 to-green-600', text: 'text-white', accent: 'bg-emerald-300/30' },
    { bg: 'from-amber-400 to-orange-600', text: 'text-white', accent: 'bg-amber-300/30' },
    { bg: 'from-red-400 to-rose-600', text: 'text-white', accent: 'bg-red-300/30' },
    { bg: 'from-fuchsia-400 to-pink-600', text: 'text-white', accent: 'bg-fuchsia-300/30' },
    { bg: 'from-sky-400 to-blue-600', text: 'text-white', accent: 'bg-sky-300/30' },
    { bg: 'from-lime-400 to-emerald-600', text: 'text-white', accent: 'bg-lime-300/30' },
];

function getColorIndex(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % PALETTE.length;
}

const SIZE_MAP = {
    xs: { container: 'w-8 h-8', initial: 'text-xs', icon: 16 },
    sm: { container: 'w-10 h-10', initial: 'text-sm', icon: 18 },
    md: { container: 'w-16 h-16', initial: 'text-2xl', icon: 28 },
    lg: { container: 'w-24 h-24', initial: 'text-4xl', icon: 44 },
    xl: { container: 'w-full h-64', initial: 'text-6xl', icon: 80 },
};

// Inline SVG for a stylish person/character silhouette
const CharacterSilhouette: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        className={className}
        style={{ opacity: 0.2 }}
    >
        <circle cx="40" cy="26" r="14" fill="currentColor" />
        <path
            d="M12 72c0-15.464 12.536-28 28-28s28 12.536 28 28"
            fill="currentColor"
        />
    </svg>
);

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
    name,
    imageUrl,
    size = 'md',
    className = '',
    square = false,
}) => {
    const sizeConfig = SIZE_MAP[size];
    const rounding = square ? 'rounded-2xl' : 'rounded-full';
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const palette = PALETTE[getColorIndex(name || '')];

    // Has a valid image URL
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={`${sizeConfig.container} ${rounding} object-cover bg-gray-200 dark:bg-dark-surface-alt ${className}`}
                onError={(e) => {
                    // If image fails to load, swap to the placeholder
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                }}
            />
        );
    }

    // Placeholder — gradient background with silhouette + initial
    return (
        <div
            className={`${sizeConfig.container} ${rounding} bg-gradient-to-br ${palette.bg} flex items-center justify-center relative overflow-hidden flex-shrink-0 ${className}`}
            title={name}
        >
            {/* Decorative silhouette in background */}
            <div className="absolute inset-0 flex items-end justify-center">
                <CharacterSilhouette size={sizeConfig.icon * 2.2} className={palette.text} />
            </div>

            {/* Character initial */}
            <span className={`relative z-10 font-sans font-extrabold ${sizeConfig.initial} ${palette.text} drop-shadow-sm`}>
                {initial}
            </span>

            {/* Subtle decorative ring for larger sizes */}
            {(size === 'lg' || size === 'xl') && (
                <div className={`absolute inset-1 ${rounding} border-2 border-white/20`} />
            )}
        </div>
    );
};

/**
 * Hero-style character placeholder for the CharacterPreview modal.
 * Shows a full-width gradient banner with silhouette and name overlay.
 */
export const CharacterHeroPlaceholder: React.FC<{ name: string; imageUrl?: string }> = ({ name, imageUrl }) => {
    const palette = PALETTE[getColorIndex(name || '')];
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                    // Replace with placeholder on error
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                        e.currentTarget.style.display = 'none';
                        // Force re-render by toggling a data attribute
                        parent.setAttribute('data-fallback', 'true');
                    }
                }}
            />
        );
    }

    return (
        <div className={`w-full h-full bg-gradient-to-br ${palette.bg} flex items-center justify-center relative overflow-hidden`}>
            {/* Large silhouette */}
            <div className="absolute inset-0 flex items-end justify-center opacity-30">
                <svg width="200" height="200" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="22" r="16" fill="currentColor" />
                    <path d="M8 76c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="currentColor" />
                </svg>
            </div>

            {/* Large initial */}
            <span className={`relative z-10 font-sans font-black text-8xl ${palette.text} drop-shadow-lg tracking-tight`}>
                {initial}
            </span>

            {/* Decorative elements */}
            <div className={`absolute top-4 right-4 w-16 h-16 rounded-full ${palette.accent} blur-xl`} />
            <div className={`absolute bottom-8 left-4 w-20 h-20 rounded-full ${palette.accent} blur-xl`} />
        </div>
    );
};
