import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { User, Book } from '../types';
import { ShareIcon, XMarkIcon, DocumentDuplicateIcon, CheckCircleIcon, TwitterIcon, InstagramIcon } from './icons/Icons';
import { useTheme } from '../contexts/ThemeContext';

interface AuthorShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    author: User | { id: string; name: string; avatarUrl: string; bio?: string; stats?: any; };
    authorBooks: Book[];
    url?: string;
}

// Icons
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

// Utilities
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function extractColorsFromImage(img: HTMLImageElement): [string, string] {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 100, 100);
    // Rough estimation by sampling a few points
    const tL = ctx.getImageData(10, 10, 1, 1).data;
    const bR = ctx.getImageData(90, 90, 1, 1).data;
    return [
        `rgb(${tL[0]},${tL[1]},${tL[2]})`,
        `rgb(${bR[0]},${bR[1]},${bR[2]})`
    ];
}

// Canvas Drawing
async function drawAuthorPoster(
    canvas: HTMLCanvasElement,
    author: any,
    authorBooks: Book[]
) {
    const W = 1080;
    const H = 1350; // Premium 4:5 portrait aspect ratio for Instagram/Socials

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Load avatar first for background color extraction
    const avatarImg = await loadImage(author.avatarUrl);

    // ── 1. Background Generation ──
    let bgImgSrc = avatarImg;
    
    // Try to get their first book cover for a more thematic background
    if (authorBooks && authorBooks.length > 0 && authorBooks[0].coverUrl) {
        const coverImg = await loadImage(authorBooks[0].coverUrl);
        if (coverImg) {
            bgImgSrc = coverImg;
        }
    }

    if (bgImgSrc) {
        // Draw the image scaled to cover the canvas (object-cover semantics)
        const imgRatio = bgImgSrc.width / bgImgSrc.height;
        const canvasRatio = W / H;
        let drawW = W;
        let drawH = H;
        let drawX = 0;
        let drawY = 0;

        if (imgRatio > canvasRatio) {
            drawW = H * imgRatio;
            drawX = (W - drawW) / 2;
        } else {
            drawH = W / imgRatio;
            drawY = (H - drawH) / 2;
        }

        // Apply a heavy cinematic blur
        ctx.filter = 'blur(60px) brightness(0.6)';
        // Scale up slightly to prevent blurred edges from bleeding white
        ctx.drawImage(bgImgSrc, drawX - 100, drawY - 100, drawW + 200, drawH + 200);
        ctx.filter = 'none';
        
        // Add a sleek dark/purple overlay to ensure the glass card pops
        const overlayGrad = ctx.createLinearGradient(0, 0, W, H);
        overlayGrad.addColorStop(0, 'rgba(46, 12, 58, 0.5)'); // deep wordweft purple
        overlayGrad.addColorStop(1, 'rgba(10, 10, 26, 0.8)'); // very dark
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, W, H);
    } else {
        // Fallback if absolutely no image loaded
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#2e0c3a');
        bgGrad.addColorStop(1, '#0a0a1a'); 
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);
    }

    // ── 2. Glassmorphism Card ──
    const cardMargin = 50;
    const cardW = W - (cardMargin * 2);
    const footerH = 100;
    const cardH = H - (cardMargin * 2) - footerH;
    
    ctx.save();
    roundRect(ctx, cardMargin, cardMargin, cardW, cardH, 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip(); // Clip all content to within the glass card

    let currentY = cardMargin + 80;

    // ── 3. Avatar ──
    const avatarRadius = 120; // Slightly larger avatar
    
    if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, currentY + avatarRadius, avatarRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, W / 2 - avatarRadius, currentY, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
        
        // Avatar glowing ring
        ctx.beginPath();
        ctx.arc(W / 2, currentY + avatarRadius, avatarRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#a78bfa'; // Accent color
        ctx.lineWidth = 8;
        ctx.stroke();
    }
    currentY += avatarRadius * 2 + 50;

    // ── 4. Name & Badge ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 54px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(author.name, W / 2, currentY);
    currentY += 70;
    
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('WORDWEFT AUTHOR', W / 2, currentY);
    currentY += 80;

    // ── 5. Bio ──
    if (author.bio) {
        ctx.font = '28px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        const bioLines = wrapText(ctx, author.bio, cardW - 160);
        
        bioLines.slice(0, 3).forEach(line => {
            ctx.fillText(line, W / 2, currentY);
            currentY += 40;
        });
        if (bioLines.length > 3) {
            ctx.fillText('...', W / 2, currentY);
            currentY += 40;
        }
        currentY += 40;
    }

    // ── 6. Asymmetrical Premium Stats Layout ──
    const gridSpacing = 30;
    const statBoxW = (cardW - 120 - gridSpacing) / 2; // half width
    const fullBoxW = cardW - 120; // full width
    const statBoxH = 130;
    
    // Background glowing orb behind stats
    const glowGrad = ctx.createRadialGradient(W/2, currentY + 150, 0, W/2, currentY + 150, 400);
    glowGrad.addColorStop(0, 'rgba(167, 139, 250, 0.15)'); // accent color glow
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, currentY, W, 400);

    const startX = cardMargin + 60;

    // Helper to draw an exciting stat box
    const drawStatBox = (x: number, y: number, w: number, h: number, val: string, label: string, isAccent: boolean = false) => {
        // Box background
        roundRect(ctx, x, y, w, h, 24);
        
        const boxGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        if (isAccent) {
            boxGrad.addColorStop(0, 'rgba(167, 139, 250, 0.2)');
            boxGrad.addColorStop(1, 'rgba(167, 139, 250, 0.05)');
        } else {
            boxGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            boxGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        }
        ctx.fillStyle = boxGrad;
        ctx.fill();
        
        // Box border
        ctx.strokeStyle = isAccent ? 'rgba(167, 139, 250, 0.5)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Tech accent corner (top right)
        ctx.beginPath();
        ctx.moveTo(x + w - 30, y);
        ctx.lineTo(x + w - 20, y);
        ctx.arcTo(x + w, y, x + w, y + 20, 24);
        ctx.lineTo(x + w, y + 30);
        ctx.strokeStyle = isAccent ? '#a78bfa' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Text
        ctx.textAlign = 'center';
        
        // Value with glow if accent
        if (isAccent) {
            ctx.shadowColor = '#a78bfa';
            ctx.shadowBlur = 15;
        }
        ctx.font = 'bold 46px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(val, x + w / 2, y + 25);
        ctx.shadowBlur = 0; // reset shadow
        
        ctx.font = '600 18px "Inter", sans-serif';
        ctx.fillStyle = isAccent ? '#e9d5ff' : '#a0a0c0';
        ctx.fillText(label.toUpperCase(), x + w / 2, y + 85);
    };

    // Box 1: Full width top (Total Reads)
    const totalReads = authorBooks.reduce((acc, b) => acc + b.viewCount, 0).toLocaleString();
    drawStatBox(startX, currentY, fullBoxW, statBoxH, totalReads, 'Total Reads', true);
    
    // Box 2: Half width left (Published Works)
    const publishedWorks = authorBooks.length.toString();
    drawStatBox(startX, currentY + statBoxH + gridSpacing, statBoxW, statBoxH, publishedWorks, 'Published Works');
    
    // Box 3: Half width right (Followers)
    const followers = (author.stats?.followers || author.followersCount || 0).toLocaleString();
    drawStatBox(startX + statBoxW + gridSpacing, currentY + statBoxH + gridSpacing, statBoxW, statBoxH, followers, 'Followers');
    
    // Box 4: Full width bottom (Words Read)
    const wordsRead = (author.stats?.totalWordsRead || 0).toLocaleString();
    drawStatBox(startX, currentY + (statBoxH + gridSpacing) * 2, fullBoxW, statBoxH, wordsRead, 'Words Read');

    ctx.restore(); // End glass card clip

    // ── 7. Footer branding bar ──
    const footerY = H - footerH;

    ctx.beginPath();
    ctx.moveTo(60, footerY);
    ctx.lineTo(W - 60, footerY);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 28px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WORDWEFT', 60, footerY + footerH / 2);

    ctx.font = '300 22px "Inter", sans-serif';
    ctx.fillStyle = '#a0a0c0';
    ctx.textAlign = 'right';
    ctx.fillText('wordweftstudio.com', W - 60, footerY + footerH / 2);
}

export const AuthorShareModal: React.FC<AuthorShareModalProps> = ({
    isOpen,
    onClose,
    author,
    authorBooks,
    url = window.location.href,
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'quick' | 'card'>('quick');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const shareTitle = `${author.name} on WordWeft`;
    const shareText = `Discover ${author.name}'s stories on WordWeft!`;

    const drawPoster = useCallback(async () => {
        if (!canvasRef.current || activeTab !== 'card') return;
        await drawAuthorPoster(canvasRef.current, author, authorBooks);
    }, [author, authorBooks, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'card') drawPoster();
    }, [isOpen, drawPoster, activeTab]);

    if (!isOpen) return null;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + url)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    };

    const openLink = (link: string) => {
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url });
            } catch (e) {
                console.log('Native share cancelled or failed', e);
            }
        }
    };

    const handleDownloadCanvas = async () => {
        if (!canvasRef.current) return;
        setIsGenerating(true);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/png');

            if (navigator.canShare) {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], `wordweft-author-${author.name.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: shareTitle, text: shareText });
                        setIsGenerating(false);
                        return;
                    }
                } catch (e) {
                    console.log('Web share not supported or cancelled', e);
                }
            }

            const link = document.createElement('a');
            link.download = `wordweft-author-${author.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200/50 dark:border-dark-border/50">
                    <h3 className="font-sans font-bold text-xl flex items-center gap-2 text-text-rich dark:text-dark-text-rich">
                        <ShareIcon className="w-5 h-5 text-accent" />
                        Share Profile
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors text-gray-500">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-2 border-b border-gray-200/50 dark:border-dark-border/50">
                    <button onClick={() => setActiveTab('quick')} className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'quick' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'}`}>
                        Quick Share
                    </button>
                    <button onClick={() => setActiveTab('card')} className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'card' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'}`}>
                        Portfolio Card
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* ========== QUICK SHARE TAB ========== */}
                    {activeTab === 'quick' && (
                        <div className="animate-fade-in flex flex-col gap-6">
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-dark-surface-alt p-4 rounded-2xl">
                                <img src={author.avatarUrl} className="w-16 h-16 object-cover rounded-full shadow-sm" alt="Avatar" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-sans font-bold text-text-rich dark:text-dark-text-rich truncate">{author.name}</h4>
                                    <p className="text-sm text-text-body dark:text-dark-text-body mt-1">WordWeft Author</p>
                                </div>
                            </div>

                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button onClick={handleNativeShare} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all shadow-md flex items-center justify-center gap-2">
                                    <ShareIcon className="w-5 h-5" /> Share via...
                                </button>
                            )}

                            <div className="grid grid-cols-5 gap-3">
                                <button onClick={() => openLink(shareLinks.twitter)} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><TwitterIcon className="w-5 h-5" /></div><span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">X</span></button>
                                <button onClick={() => openLink(shareLinks.facebook)} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-[#1877F2] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><FacebookIconSvg /></div><span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Facebook</span></button>
                                <button onClick={() => openLink(shareLinks.whatsapp)} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><WhatsAppIconSvg /></div><span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">WhatsApp</span></button>
                                <button onClick={() => openLink(shareLinks.telegram)} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-[#229ED9] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><TelegramIconSvg /></div><span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Telegram</span></button>
                                <button onClick={() => setActiveTab('card')} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><InstagramIcon className="w-6 h-6"/></div><span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Instagram</span></button>
                            </div>

                            <hr className="border-gray-200 dark:border-dark-border" />

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Profile Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate flex items-center">
                                        {url}
                                    </div>
                                    <button onClick={handleCopyLink} className={`px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${copied ? 'bg-success/10 text-success' : 'bg-accent text-white hover:bg-primary'}`}>
                                        {copied ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== PORTFOLIO CARD TAB ========== */}
                    {activeTab === 'card' && (
                        <div className="animate-fade-in flex flex-col items-center">
                            <p className="text-center text-sm text-text-body dark:text-dark-text-body mb-4">
                                Download a beautiful portfolio card.
                            </p>

                            {/* Canvas Preview */}
                            <div className="w-full relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-dark-border aspect-[4/5] bg-gray-900">
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain"
                                    style={{ display: 'block' }}
                                />
                            </div>

                            <button
                                onClick={handleDownloadCanvas}
                                disabled={isGenerating}
                                className="mt-6 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? 'Generating...' : 'Download Card'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
