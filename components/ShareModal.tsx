import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Book } from '../types';
import { ShareIcon, LinkIcon, DocumentDuplicateIcon, XMarkIcon, CheckCircleIcon, TwitterIcon, InstagramIcon } from './icons/Icons';
import { useTheme } from '../contexts/ThemeContext';
import { storyShareUrl } from '../utils/shareLinks';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: Book;
    chapter?: Book['chapters'][0];
    url?: string;
    initialTab?: 'quick' | 'story' | 'quote';
    quoteText?: string;
    /** If true, only show the Quick Share tab (for author pages, etc.) */
    quickShareOnly?: boolean;
    /** Override default share text */
    shareTextOverride?: string;
}

// --- SVG Icons for Social Platforms ---
const FacebookIconSvg = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);
const WhatsAppIconSvg = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);
const TelegramIconSvg = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.309-.346-.11l-6.4 4.02-2.76-.86c-.6-.188-.614-.6.126-.89l10.82-4.17c.502-.185.95.105.84.58z"/>
    </svg>
);

// --- Poster Theme Definitions ---
type PosterTheme = 'midnight' | 'ember' | 'frost' | 'blossom' | 'monochrome';

interface ThemeDef {
    label: string;
    bg: [string, string, string];
    accent: string;
    text: string;
    subtext: string;
    card: string;
    cardBorder: string;
    badgeBg: string;
    badgeText: string;
    previewBg: string;
}

const POSTER_THEMES: Record<PosterTheme, ThemeDef> = {
    midnight: {
        label: 'Midnight',
        bg: ['#0a0a1a', '#1a1040', '#0d0d2b'],
        accent: '#a78bfa',
        text: '#ffffff',
        subtext: '#a0a0c0',
        card: 'rgba(255,255,255,0.08)',
        cardBorder: 'rgba(255,255,255,0.15)',
        badgeBg: 'rgba(167,139,250,0.25)',
        badgeText: '#c4b5fd',
        previewBg: '#0a0a1a',
    },
    ember: {
        label: 'Ember',
        bg: ['#1a0a00', '#3d1500', '#1a0800'],
        accent: '#f59e0b',
        text: '#ffffff',
        subtext: '#d4a574',
        card: 'rgba(245,158,11,0.08)',
        cardBorder: 'rgba(245,158,11,0.2)',
        badgeBg: 'rgba(245,158,11,0.25)',
        badgeText: '#fbbf24',
        previewBg: '#1a0a00',
    },
    frost: {
        label: 'Frost',
        bg: ['#e8eef5', '#f0f4f8', '#dce4ed'],
        accent: '#3b82f6',
        text: '#1e293b',
        subtext: '#64748b',
        card: 'rgba(59,130,246,0.06)',
        cardBorder: 'rgba(59,130,246,0.15)',
        badgeBg: 'rgba(59,130,246,0.15)',
        badgeText: '#2563eb',
        previewBg: '#e8eef5',
    },
    blossom: {
        label: 'Blossom',
        bg: ['#1a0a14', '#2d1028', '#180a18'],
        accent: '#f472b6',
        text: '#ffffff',
        subtext: '#d4a0c0',
        card: 'rgba(244,114,182,0.08)',
        cardBorder: 'rgba(244,114,182,0.2)',
        badgeBg: 'rgba(244,114,182,0.25)',
        badgeText: '#f9a8d4',
        previewBg: '#1a0a14',
    },
    monochrome: {
        label: 'Mono',
        bg: ['#000000', '#111111', '#000000'],
        accent: '#ffffff',
        text: '#ffffff',
        subtext: '#999999',
        card: 'rgba(255,255,255,0.06)',
        cardBorder: 'rgba(255,255,255,0.12)',
        badgeBg: 'rgba(255,255,255,0.15)',
        badgeText: '#cccccc',
        previewBg: '#000000',
    },
};

const THEME_KEYS: PosterTheme[] = ['midnight', 'ember', 'frost', 'blossom', 'monochrome'];

// --- Canvas Drawing Utilities ---

/** Draw a rounded rectangle path on the canvas context */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/** Wrap text to fit within a max width, returns array of lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        
        if (char === '\n') {
            lines.push(currentLine);
            currentLine = '';
            continue;
        }

        const testLine = currentLine + char;
        const width = ctx.measureText(testLine).width;
        
        if (width > maxWidth && currentLine.length > 0) {
            if (char === ' ') {
                lines.push(currentLine);
                currentLine = '';
            } else {
                const lastSpaceIndex = currentLine.lastIndexOf(' ');
                if (lastSpaceIndex > 0) {
                    lines.push(currentLine.substring(0, lastSpaceIndex));
                    currentLine = currentLine.substring(lastSpaceIndex + 1) + char;
                } else {
                    lines.push(currentLine);
                    currentLine = char;
                }
            }
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

/** Load an image with CORS, returns null on failure */
function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/** Genre-based fallback gradient colors when cover image CORS fails */
function getGenreFallbackColors(genres: string[]): [string, string] {
    const genre = (genres[0] || '').toLowerCase();
    if (genre.includes('romance') || genre.includes('love')) return ['#be185d', '#9d174d'];
    if (genre.includes('fantasy') || genre.includes('magic')) return ['#7c3aed', '#5b21b6'];
    if (genre.includes('sci-fi') || genre.includes('science')) return ['#0891b2', '#0e7490'];
    if (genre.includes('horror') || genre.includes('thriller')) return ['#991b1b', '#7f1d1d'];
    if (genre.includes('mystery') || genre.includes('detective')) return ['#4338ca', '#3730a3'];
    if (genre.includes('adventure') || genre.includes('action')) return ['#b45309', '#92400e'];
    if (genre.includes('comedy') || genre.includes('humor')) return ['#ca8a04', '#a16207'];
    return ['#475569', '#334155'];
}

// --- Main Drawing Functions ---

async function drawStoryPoster(
    canvas: HTMLCanvasElement,
    book: Book,
    chapter: Book['chapters'][0] | undefined,
    themeName: PosterTheme
) {
    // ── Fixed 9:16 Story dimensions (Instagram / TikTok standard) ──
    const W = 1080;
    const H = 1920;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const t = POSTER_THEMES[themeName];

    // ── 1. Smooth atmospheric background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, t.bg[0]);
    bgGrad.addColorStop(0.42, t.bg[1]);
    bgGrad.addColorStop(1, t.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient spotlight glow behind the book
    const glow = ctx.createRadialGradient(W / 2, 600, 40, W / 2, 600, 600);
    glow.addColorStop(0, t.accent + '26');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Subtle edge vignette
    const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.42, W / 2, H / 2, W * 0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Refined top badge (no emojis) ──
    const topTag = chapter ? 'CURRENTLY READING' : 'FEATURED STORY';
    ctx.font = '700 20px "Inter", sans-serif';
    const tagTextW = ctx.measureText(topTag).width;
    const tagPadX = 24;
    const tagH = 38;
    const tagW = tagTextW + tagPadX * 2;
    const tagX = Math.round((W - tagW) / 2);
    const tagY = 120;

    roundRect(ctx, tagX, tagY, tagW, tagH, tagH / 2);
    ctx.fillStyle = t.card;
    ctx.fill();
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.badgeText || t.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topTag, W / 2, tagY + tagH / 2);

    // ── 3. Uncropped 3D Floating Book (Hero) ──
    const coverImg = await loadImage(book.coverUrl);
    const maxBookH = 820;
    const maxBookW = 580;
    let bookH = maxBookH;
    let bookW = 546; // standard 2:3 ratio fallback

    if (coverImg && coverImg.naturalWidth && coverImg.naturalHeight) {
        const naturalAspect = coverImg.naturalWidth / coverImg.naturalHeight;
        // Clamp aspect ratio between 0.58 and 0.82 to retain realistic book proportions
        const clampedAspect = Math.min(Math.max(naturalAspect, 0.58), 0.82);
        bookW = Math.round(bookH * clampedAspect);
        if (bookW > maxBookW) {
            bookW = maxBookW;
            bookH = Math.round(bookW / clampedAspect);
        }
    }

    const bookX = Math.round((W - bookW) / 2);
    const bookY = 200;

    // Realistic drop shadow behind book
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 28;
    ctx.shadowOffsetX = 0;
    roundRect(ctx, bookX, bookY, bookW, bookH, 18);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    // Draw cover artwork
    ctx.save();
    roundRect(ctx, bookX, bookY, bookW, bookH, 18);
    ctx.clip();

    if (coverImg) {
        ctx.drawImage(coverImg, bookX, bookY, bookW, bookH);
    } else {
        const [fc1, fc2] = getGenreFallbackColors(book.genres);
        const fgrad = ctx.createLinearGradient(bookX, bookY, bookX + bookW, bookY + bookH);
        fgrad.addColorStop(0, fc1);
        fgrad.addColorStop(1, fc2);
        ctx.fillStyle = fgrad;
        ctx.fillRect(bookX, bookY, bookW, bookH);

        // Fallback title on cover
        ctx.font = 'bold 44px "Literata", Georgia, serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fallbackLines = wrapText(ctx, book.title, bookW - 60);
        fallbackLines.slice(0, 3).forEach((line, idx) => {
            ctx.fillText(line, bookX + bookW / 2, bookY + bookH * 0.42 + idx * 54);
        });
    }

    // Book spine crease effect on left edge
    const spineW = 30;
    const spineGrad = ctx.createLinearGradient(bookX, 0, bookX + spineW, 0);
    spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    spineGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.12)');
    spineGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
    spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(bookX, bookY, spineW, bookH);

    // Subtle lighting sheen across the cover
    const sheenGrad = ctx.createLinearGradient(bookX, bookY, bookX + bookW, bookY + bookH);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(bookX, bookY, bookW, bookH);

    ctx.restore();

    // Crisp book edge border
    roundRect(ctx, bookX, bookY, bookW, bookH, 18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── 4. Story information section (below book) ──
    let currentY = bookY + bookH + 46;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Title
    const displayTitle = chapter ? chapter.title : book.title;
    let titleFontSize = 54;
    ctx.font = `bold ${titleFontSize}px "Literata", Georgia, serif`;
    let titleLines = wrapText(ctx, displayTitle, W - 160);
    if (titleLines.length > 2) {
        titleFontSize = 46;
        ctx.font = `bold ${titleFontSize}px "Literata", Georgia, serif`;
        titleLines = wrapText(ctx, displayTitle, W - 160);
    }
    titleLines = titleLines.slice(0, 2);

    ctx.fillStyle = t.text;
    const titleLineH = titleFontSize * 1.22;
    titleLines.forEach((line) => {
        ctx.fillText(line, W / 2, currentY);
        currentY += titleLineH;
    });
    currentY += 6;

    // Chapter or Book context
    if (chapter) {
        ctx.font = '500 26px "Inter", sans-serif';
        ctx.fillStyle = t.subtext;
        ctx.fillText(`from "${book.title}"`, W / 2, currentY);
        currentY += 36;
    }

    // Author
    ctx.font = '500 30px "Inter", sans-serif';
    ctx.fillStyle = t.subtext;
    ctx.fillText(`by ${book.author?.name || 'Unknown Author'}`, W / 2, currentY);
    currentY += 46;

    // Rating stars (vector geometry - no emojis)
    if (book.rating > 0) {
        const starCount = 5;
        const starSize = 28;
        const starSpacing = 36;
        const filledStars = Math.round(book.rating);
        const totalStarsWidth = starCount * starSpacing;
        const starsStartX = (W - totalStarsWidth) / 2;
        const starCenterY = currentY + starSize / 2;

        for (let s = 0; s < starCount; s++) {
            const sx = starsStartX + s * starSpacing + starSize / 2;
            const rOuter = starSize / 2;
            const rInner = rOuter * 0.42;
            ctx.beginPath();
            for (let pt = 0; pt < 10; pt++) {
                const angle = (pt * Math.PI) / 5 - Math.PI / 2;
                const r = pt % 2 === 0 ? rOuter : rInner;
                const px = sx + r * Math.cos(angle);
                const py = starCenterY + r * Math.sin(angle);
                if (pt === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = s < filledStars ? (themeName === 'frost' ? '#f59e0b' : t.accent) : (t.accent + '25');
            ctx.fill();
        }

        ctx.font = '600 24px "Inter", sans-serif';
        ctx.fillStyle = t.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(book.rating.toFixed(1), starsStartX + totalStarsWidth + 8, starCenterY);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        currentY += 46;
    }

    // Genre pills (clean minimal chips - no emojis)
    const genres = (book.genres || []).slice(0, 3);
    if (genres.length > 0) {
        ctx.font = '600 20px "Inter", sans-serif';
        const pillH = 38;
        const pillGap = 12;
        const pillPadX = 22;

        const pillWidths = genres.map(g => ctx.measureText(g).width + pillPadX * 2);
        const totalPillsWidth = pillWidths.reduce((sum, w) => sum + w, 0) + (genres.length - 1) * pillGap;
        let pillX = Math.round((W - totalPillsWidth) / 2);

        genres.forEach((genre, idx) => {
            const pW = pillWidths[idx];
            roundRect(ctx, pillX, currentY, pW, pillH, pillH / 2);
            ctx.fillStyle = t.card;
            ctx.fill();
            ctx.strokeStyle = t.cardBorder;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = t.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(genre, pillX + pW / 2, currentY + pillH / 2);

            pillX += pW + pillGap;
        });

        currentY += pillH + 26;
    }

    // Summary excerpt (if space permits)
    if (!chapter && book.summary && currentY < 1720) {
        ctx.font = 'italic 24px "Literata", Georgia, serif';
        ctx.fillStyle = t.subtext + 'dd';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const summaryLines = wrapText(ctx, book.summary, W - 240);
        const linesToDraw = summaryLines.slice(0, 2);
        linesToDraw.forEach((line, idx) => {
            const lineText = idx === 0 && linesToDraw.length === 1 ? `"${line}"` : (idx === 0 ? `"${line}` : (idx === linesToDraw.length - 1 ? `${line}"` : line));
            ctx.fillText(lineText, W / 2, currentY + idx * 34);
        });
    }

    // ── 5. Clean footer branding ──
    const footerY = 1800;

    // Subtle divider
    ctx.beginPath();
    ctx.moveTo(100, footerY);
    ctx.lineTo(W - 100, footerY);
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brand name
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.fillStyle = t.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WORDWEFT', 100, footerY + 44);

    // Domain
    ctx.font = '400 20px "Inter", sans-serif';
    ctx.fillStyle = t.subtext;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('wordweftstudio.com', W - 100, footerY + 44);
}

async function drawQuoteCard(
    canvas: HTMLCanvasElement,
    quoteText: string,
    book: Book,
    chapter: Book['chapters'][0] | undefined,
    themeName: PosterTheme
) {
    const W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const t = POSTER_THEMES[themeName];

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, t.bg[0]);
    bgGrad.addColorStop(0.5, t.bg[1]);
    bgGrad.addColorStop(1, t.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Glow
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 500);
    glow.addColorStop(0, t.accent + '15');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // --- Large opening quote mark ---
    ctx.font = '200px "Literata", Georgia, serif';
    ctx.fillStyle = t.accent + '25';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u201C', W / 2, 80);

    // --- Quote text ---
    ctx.font = 'italic 40px "Literata", Georgia, serif';
    ctx.fillStyle = t.text;
    const quoteLines = wrapText(ctx, quoteText, W - 200);
    const maxQuoteLines = 8;
    const totalQuoteHeight = Math.min(quoteLines.length, maxQuoteLines) * 56;
    let quoteStartY = (H / 2) - (totalQuoteHeight / 2) - 20;
    if (quoteStartY < 260) quoteStartY = 260;

    quoteLines.slice(0, maxQuoteLines).forEach((line, i) => {
        ctx.fillText(line, W / 2, quoteStartY + i * 56);
    });

    // --- Divider line ---
    const divY = quoteStartY + Math.min(quoteLines.length, maxQuoteLines) * 56 + 50;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, divY);
    ctx.lineTo(W / 2 + 60, divY);
    ctx.strokeStyle = t.accent + '60';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Book / Chapter info ---
    let infoY = divY + 40;
    if (chapter) {
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillStyle = t.subtext;
        ctx.fillText(chapter.title, W / 2, infoY);
        infoY += 40;
        ctx.font = '400 24px "Inter", sans-serif';
        ctx.fillText(`from ${book.title}`, W / 2, infoY);
        infoY += 36;
    } else {
        ctx.font = '500 30px "Inter", sans-serif';
        ctx.fillStyle = t.text;
        ctx.fillText(book.title, W / 2, infoY);
        infoY += 40;
    }
    ctx.font = '400 24px "Inter", sans-serif';
    ctx.fillStyle = t.subtext;
    ctx.fillText(`by ${book.author?.name || 'Unknown Author'}`, W / 2, infoY);

    // --- Footer branding ---
    const brandText = 'WORDWEFT';
    ctx.font = 'bold 18px "Inter", sans-serif';
    const bm = ctx.measureText(brandText);
    const pW = bm.width + 48, pH = 38, pX = (W - pW) / 2, pY = H - 80;
    roundRect(ctx, pX, pY, pW, pH, pH / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = t.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(brandText, W / 2, pY + pH / 2);
}


// ============================
// ShareModal Component
// ============================

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen, onClose, book, chapter, url,
    initialTab = 'quick', quoteText, quickShareOnly = false, shareTextOverride,
}) => {
    const { theme } = useTheme();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'quick' | 'story' | 'quote'>(initialTab);
    const [posterTheme, setPosterTheme] = useState<PosterTheme>('midnight');
    const [isGenerating, setIsGenerating] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const quoteCanvasRef = useRef<HTMLCanvasElement>(null);
    const publicUrl = url || storyShareUrl(book.id);

    const shareTitle = chapter ? `${book.title} - ${chapter.title}` : book.title;
    const authorName = book.author?.name || 'an unknown author';

    // Context-aware share text
    const getShareText = () => {
        if (shareTextOverride) return shareTextOverride;
        if (quoteText && activeTab === 'quote') {
            return `"${quoteText.slice(0, 200)}${quoteText.length > 200 ? '...' : ''}" — ${book.title} by ${authorName} #WordWeft #BookQuotes`;
        }
        if (chapter) {
            const chapterIndex = book.chapters.findIndex(c => c.id === chapter.id);
            return `Reading Chapter ${chapterIndex + 1}: '${chapter.title}' from '${book.title}'. #WordWeft`;
        }
        const stats = [];
        if (book.rating > 0) stats.push(`${book.rating} stars`);
        if (book.viewCount > 0) stats.push(`${book.viewCount.toLocaleString()} readers`);
        const statsStr = stats.length > 0 ? ` — ${stats.join(', ')} already` : '';
        return `I just discovered '${book.title}' by ${authorName} on WordWeft${statsStr}.`;
    };

    const shareText = getShareText();

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            setActiveTab(quickShareOnly ? 'quick' : initialTab);
        }
    }, [isOpen, initialTab, quickShareOnly]);

    // Draw poster/quote card whenever relevant state changes
    const drawPoster = useCallback(async () => {
        if (!canvasRef.current || activeTab !== 'story') return;
        await drawStoryPoster(canvasRef.current, book, chapter, posterTheme);
    }, [book, chapter, posterTheme, activeTab]);

    const drawQuote = useCallback(async () => {
        if (!quoteCanvasRef.current || activeTab !== 'quote' || !quoteText) return;
        await drawQuoteCard(quoteCanvasRef.current, quoteText, book, chapter, posterTheme);
    }, [book, chapter, posterTheme, activeTab, quoteText]);

    useEffect(() => {
        if (isOpen && activeTab === 'story') drawPoster();
    }, [isOpen, drawPoster, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'quote') drawQuote();
    }, [isOpen, drawQuote, activeTab]);

    if (!isOpen) return null;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + publicUrl)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`
    };

    const openLink = (link: string) => {
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url: publicUrl });
            } catch (e) {
                console.log('Native share cancelled or failed', e);
            }
        }
    };

    const handleDownloadCanvas = async (canvas: HTMLCanvasElement | null, filenamePrefix: string) => {
        if (!canvas) return;
        setIsGenerating(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');

            // Try Web Share API with files first
            if (navigator.canShare) {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], `${filenamePrefix}.png`, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: shareTitle, text: shareText });
                        setIsGenerating(false);
                        return;
                    }
                } catch (e) {
                    console.log('Web share not supported or cancelled', e);
                }
            }

            // Fallback: download
            const link = document.createElement('a');
            link.download = `wordweft-${book.title.replace(/\s+/g, '-').toLowerCase()}-${filenamePrefix}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const tabConfig = quickShareOnly
        ? [{ key: 'quick' as const, label: 'Share' }]
        : [
            { key: 'quick' as const, label: 'Quick Share' },
            { key: 'story' as const, label: 'Story Poster' },
            ...(quoteText ? [{ key: 'quote' as const, label: 'Quote Card' }] : []),
          ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            role="dialog"
            aria-modal="true"
            aria-label={`Share ${book.title}`}
            onClick={onClose}
        >
            <div
                className={`ww-share-dialog bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all ${activeTab === 'story' ? 'ww-share-dialog-poster' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200/50 dark:border-dark-border/50">
                    <h3 className="font-sans font-bold text-xl flex items-center gap-2 text-text-rich dark:text-dark-text-rich">
                        <ShareIcon className="w-5 h-5 text-accent" />
                        {chapter ? 'Share Chapter' : 'Share Book'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors text-gray-500">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                {tabConfig.length > 1 && (
                    <div className="flex px-6 pt-2 border-b border-gray-200/50 dark:border-dark-border/50">
                        {tabConfig.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="ww-share-content p-6 overflow-y-auto max-h-[78vh] custom-scrollbar">

                    {/* ========== QUICK SHARE TAB ========== */}
                    {activeTab === 'quick' && (
                        <div className="animate-fade-in flex flex-col gap-6">

                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-dark-surface-alt p-4 rounded-2xl">
                                <img src={book.coverUrl} className="w-16 h-24 object-cover rounded-lg shadow-sm" alt="Cover" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-sans font-bold text-text-rich dark:text-dark-text-rich truncate">{shareTitle}</h4>
                                    <p className="text-sm text-text-body dark:text-dark-text-body mt-1 line-clamp-2">By {book.author?.name || 'Unknown Author'}</p>
                                </div>
                            </div>

                            {/* Native Share (mobile) */}
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                    Share via...
                                </button>
                            )}

                            <div className="ww-share-channels grid grid-cols-5 gap-3">
                                <button onClick={() => openLink(shareLinks.twitter)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><TwitterIcon className="w-5 h-5" /></div>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">X</span>
                                </button>
                                <button onClick={() => openLink(shareLinks.facebook)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 bg-[#1877F2] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><FacebookIconSvg /></div>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Facebook</span>
                                </button>
                                <button onClick={() => openLink(shareLinks.whatsapp)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><WhatsAppIconSvg /></div>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">WhatsApp</span>
                                </button>
                                <button onClick={() => openLink(shareLinks.telegram)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 bg-[#229ED9] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><TelegramIconSvg /></div>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Telegram</span>
                                </button>
                                {!quickShareOnly && (
                                    <button onClick={() => setActiveTab('story')} className="flex flex-col items-center gap-2 group">
                                        <div className="w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><InstagramIcon className="w-6 h-6"/></div>
                                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Instagram</span>
                                    </button>
                                )}
                            </div>

                            <hr className="border-gray-200 dark:border-dark-border" />

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Page Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate flex items-center">
                                        {publicUrl}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className={`px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${copied ? 'bg-success/10 text-success' : 'bg-accent text-white hover:bg-primary'}`}
                                    >
                                        {copied ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== STORY POSTER TAB ========== */}
                    {activeTab === 'story' && (
                        <div className="ww-poster-workspace animate-fade-in">
                            <div className="ww-poster-controls">
                                <div>
                                    <h4>Make it yours</h4>
                                    <p>Choose a look, preview it, then share the finished poster.</p>
                                </div>
                                <div className="ww-poster-themes" aria-label="Poster theme">
                                    {THEME_KEYS.map(tk => (
                                        <button
                                            key={tk}
                                            onClick={() => setPosterTheme(tk)}
                                            className={posterTheme === tk ? 'active' : ''}
                                            aria-pressed={posterTheme === tk}
                                        >
                                            <i style={{ backgroundColor: POSTER_THEMES[tk].accent }} />
                                            {POSTER_THEMES[tk].label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleDownloadCanvas(canvasRef.current, 'poster')}
                                    disabled={isGenerating}
                                    className="ww-poster-share-button"
                                >
                                    <ShareIcon className="w-5 h-5" /> {isGenerating ? 'Preparing…' : 'Share poster'}
                                </button>
                                <small>On supported phones this opens the share sheet with the poster attached.</small>
                            </div>

                            <div className="ww-poster-preview relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-dark-border aspect-[9/16]"
                                style={{ backgroundColor: POSTER_THEMES[posterTheme].previewBg }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain"
                                    style={{ display: 'block' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ========== QUOTE CARD TAB ========== */}
                    {activeTab === 'quote' && quoteText && (
                        <div className="animate-fade-in flex flex-col items-center">
                            <p className="text-center text-sm text-text-body dark:text-dark-text-body mb-4">
                                Download a memorable passage as a beautiful quote card.
                            </p>

                            {/* Theme Picker */}
                            <div className="flex gap-2 mb-4 flex-wrap justify-center">
                                {THEME_KEYS.map(tk => (
                                    <button
                                        key={tk}
                                        onClick={() => setPosterTheme(tk)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${posterTheme === tk
                                            ? 'bg-accent text-white shadow-md scale-105'
                                            : 'bg-gray-100 dark:bg-dark-surface-alt text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
                                        }`}
                                    >
                                        {POSTER_THEMES[tk].label}
                                    </button>
                                ))}
                            </div>

                            {/* Canvas Preview */}
                            <div className="w-full relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-dark-border aspect-square"
                                style={{ backgroundColor: POSTER_THEMES[posterTheme].previewBg }}
                            >
                                <canvas
                                    ref={quoteCanvasRef}
                                    className="w-full h-full"
                                    style={{ display: 'block' }}
                                />
                            </div>

                            <button
                                onClick={() => handleDownloadCanvas(quoteCanvasRef.current, 'quote')}
                                disabled={isGenerating}
                                className="mt-6 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? 'Generating...' : 'Download Quote Card'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
