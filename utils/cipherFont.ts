/**
 * Cipher Font Loader Utility — Font Glyph Scrambling Protection (Approach B)
 *
 * Dynamically loads and registers the custom TrueType cipher fonts generated
 * for reader chapter obfuscation.
 *
 * Fonts map scrambled Private Use Area (PUA) codepoints (\uE100-\uE13D) back to
 * correct visual character glyphs, rendering text normally in the browser while
 * protecting against DOM parsers and scrapers.
 */

const registeredFonts = new Set<string>();

export type ReaderFontStyle = 'literary' | 'modern' | 'serif' | 'sans';

/**
 * Normalizes font style to 'serif' or 'sans'.
 */
export function normalizeCipherStyle(style?: string): 'serif' | 'sans' {
    return style === 'modern' || style === 'sans' ? 'sans' : 'serif';
}

/**
 * Extracts normalized seed index (1 to 5) from seed string like 'ww-cipher-3' or '3'.
 */
export function getSeedIndex(seed?: string | null): string {
    if (!seed) return '1';
    const match = seed.match(/\d+$/);
    if (!match) return '1';
    const num = parseInt(match[0], 10);
    if (isNaN(num) || num < 1 || num > 5) return '1';
    return String(num);
}

/**
 * Returns the CSS font-family name for a given seed and style.
 * E.g. 'WW-Cipher-Serif-1' or 'WW-Cipher-Sans-3'.
 */
export function getCipherFontFamily(seed?: string | null, style?: ReaderFontStyle): string {
    const index = getSeedIndex(seed);
    const normalized = normalizeCipherStyle(style);
    const prefix = normalized === 'sans' ? 'Sans' : 'Serif';
    return `WW-Cipher-${prefix}-${index}`;
}

/**
 * Returns the public URL for the TrueType cipher font asset.
 */
export function getCipherFontUrl(seed?: string | null, style?: ReaderFontStyle): string {
    const index = getSeedIndex(seed);
    const normalized = normalizeCipherStyle(style);
    return `/fonts/ww-cipher-${normalized}-${index}.ttf`;
}

/**
 * Injects a @font-face style rule into document.head and registers with document.fonts if available.
 */
export function ensureCipherFontLoaded(seed?: string | null, style?: ReaderFontStyle): string {
    const familyName = getCipherFontFamily(seed, style);
    if (!seed || typeof window === 'undefined' || typeof document === 'undefined') {
        return familyName;
    }

    if (registeredFonts.has(familyName)) {
        return familyName;
    }

    const fontUrl = getCipherFontUrl(seed, style);

    try {
        const styleId = `cipher-font-face-${familyName}`;
        if (!document.getElementById(styleId)) {
            const styleElem = document.createElement('style');
            styleElem.id = styleId;
            styleElem.textContent = `
                @font-face {
                    font-family: '${familyName}';
                    src: url('${fontUrl}') format('truetype');
                    font-display: swap;
                }
            `;
            document.head.appendChild(styleElem);
        }

        if (typeof FontFace !== 'undefined' && 'fonts' in document) {
            const fontFace = new FontFace(familyName, `url(${fontUrl}) format('truetype')`);
            fontFace.load().then((loaded) => {
                document.fonts.add(loaded);
            }).catch(() => {
                // Style element fallback handles loading
            });
        }

        registeredFonts.add(familyName);
    } catch {
        // Fallback gracefully without breaking page render
    }

    return familyName;
}

/**
 * Preloads both serif and sans cipher fonts for a chapter seed.
 */
export function preloadCipherFonts(seed?: string | null): void {
    if (!seed || typeof window === 'undefined') return;
    ensureCipherFontLoaded(seed, 'serif');
    ensureCipherFontLoaded(seed, 'sans');
}
