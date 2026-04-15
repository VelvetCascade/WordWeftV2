import React, { useState, useRef, useEffect } from 'react';
import type { Book } from '../types';
import { ShareIcon, LinkIcon, DocumentDuplicateIcon, XMarkIcon, CheckCircleIcon, TwitterIcon, InstagramIcon } from './icons/Icons';
import html2canvas from 'html2canvas';
import { useTheme } from '../contexts/ThemeContext';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: Book;
    chapter?: Book['chapters'][0];
    url?: string;
}

// Crisp SVGs for remaining platforms
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


export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, book, chapter, url = window.location.href }) => {
    const { theme } = useTheme();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'quick' | 'story'>('quick');
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const shareTitle = chapter ? `${book.title} - ${chapter.title}` : book.title;
    const authorName = book.author?.name || 'an unknown author';
    const shareText = chapter 
        ? `I am reading ${chapter.title} from ${book.title}. Check it out on WordWeft!`
        : `Check out ${book.title} by ${authorName} on WordWeft!`;

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            setActiveTab('quick');
        }
    }, [isOpen]);

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

    const handleGeneratePoster = async () => {
        if (!posterRef.current) return;
        setIsGeneratingStory(true);
        
        try {
            // Need to set crossOrigin anonymous for external images in html2canvas if possible, 
            // but we will try standard capture first.
            const canvas = await html2canvas(posterRef.current, {
                scale: 2,
                useCORS: true, 
                backgroundColor: theme === 'dark' ? '#181414' : '#FDFBF7'
            });

            const dataUrl = canvas.toDataURL('image/png');
            
            // Check if Web Share API is available with file support
            if (navigator.canShare) {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], 'wordweft-story.png', { type: 'image/png' });
                    
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: shareTitle,
                            text: shareText
                        });
                        setIsGeneratingStory(false);
                        return; // Successfully shared
                    }
                } catch (e) {
                    console.log("Web share not supported or cancelled", e);
                }
            }

            // Fallback: Download the image
            const link = document.createElement('a');
            link.download = `wordweft-${book.title.replace(/\s+/g, '-').toLowerCase()}-poster.png`;
            link.href = dataUrl;
            link.click();
            
        } catch (error) {
            console.error("Error generating poster:", error);
            alert("Failed to generate the story poster. Please try again.");
        } finally {
            setIsGeneratingStory(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div 
                className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all"
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
                <div className="flex px-6 pt-2 border-b border-gray-200/50 dark:border-dark-border/50">
                    <button 
                        onClick={() => setActiveTab('quick')}
                        className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'quick' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'}`}
                    >
                        Quick Share
                    </button>
                    <button 
                        onClick={() => setActiveTab('story')}
                        className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'story' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'}`}
                    >
                        Story Poster (IG)
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {activeTab === 'quick' && (
                        <div className="animate-fade-in flex flex-col gap-6">
                            
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-dark-surface-alt p-4 rounded-2xl">
                                <img src={book.coverUrl} className="w-16 h-24 object-cover rounded-lg shadow-sm" alt="Cover" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-sans font-bold text-text-rich dark:text-dark-text-rich truncate">{shareTitle}</h4>
                                    <p className="text-sm text-text-body dark:text-dark-text-body mt-1 line-clamp-2">By {book.author.name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
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
                                <button onClick={() => setActiveTab('story')} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-md"><InstagramIcon className="w-6 h-6"/></div>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-text-rich dark:group-hover:text-dark-text-rich transition-colors">Instagram</span>
                                </button>
                            </div>

                            <hr className="border-gray-200 dark:border-dark-border" />

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Page Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate flex items-center">
                                        {url}
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

                    {activeTab === 'story' && (
                        <div className="animate-fade-in flex flex-col items-center">
                            <p className="text-center text-sm text-text-body dark:text-dark-text-body mb-4">
                                Automatically generate a beautiful poster for Instagram Stories or other social media feeds.
                            </p>
                            
                            {/* Poster Preview Container (Scaled Down for Viewport) */}
                            <div className="w-full relative rounded-2xl overflow-hidden shadow-lg border-2 border-dashed border-gray-300 dark:border-dark-border aspect-[9/16] bg-gray-100 dark:bg-dark-surface-alt flex items-center justify-center group cursor-pointer" onClick={handleGeneratePoster}>
                                
                                {/* The Actual Poster DOM to be captured via html2canvas. 
                                    We use an absolute container that is larger inside a scale wrapper, or we just render it responsively.
                                    A responsive standard format works well.
                                */}
                                <div 
                                    ref={posterRef} 
                                    className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] text-white flex flex-col h-full w-full font-sans transition-all"
                                >
                                    {/* Abstract Background Effects */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>

                                    {/* Content Wrapper */}
                                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-center">
                                        <div className="mb-8 w-40 h-60 rounded-xl overflow-hidden shadow-2xl border-4 border-white/10 mx-auto">
                                            <img src={book.coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Book Cover" />
                                        </div>
                                        
                                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-full">
                                            <div className="text-amber-400 mb-2 font-semibold tracking-wider text-xs uppercase px-3 py-1 bg-amber-400/20 inline-block rounded-full">
                                                {chapter ? 'Currently Reading' : 'Featured Read'}
                                            </div>
                                            <h2 className="text-2xl font-bold font-serif mb-2 leading-tight">{chapter ? chapter.title : book.title}</h2>
                                            {chapter && <p className="text-sm text-gray-300 mb-2 font-medium">From {book.title}</p>}
                                            <p className="text-gray-400 text-sm">By {book.author?.name || 'an unknown author'}</p>
                                        </div>
                                        
                                        {!chapter && book.summary && (
                                            <div className="mt-8 px-6 text-sm italic text-gray-300 line-clamp-4 relative">
                                                <span className="text-4xl absolute -top-4 -left-2 text-white/20 font-serif">"</span>
                                                {book.summary}
                                                <span className="text-4xl absolute -bottom-8 -right-2 text-white/20 font-serif">"</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer / Branding */}
                                    <div className="absolute bottom-6 left-0 right-0 text-center">
                                        <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2 rounded-full border border-white/10">
                                            <img src="/logo.svg" className="w-4 h-4" onError={(e) => e.currentTarget.style.display='none'} alt="Logo" />
                                            <span className="font-bold tracking-widest text-xs uppercase">WordWeft</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Overlay Hint */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity z-20 backdrop-blur-sm">
                                    <DocumentDuplicateIcon className="w-10 h-10 mb-2 text-white/80" />
                                    <span className="font-bold">Click to Save or Share Poster</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleGeneratePoster}
                                disabled={isGeneratingStory}
                                className="mt-6 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGeneratingStory ? (
                                    <>Generating Poster...</>
                                ) : (
                                    <>Share / Download Poster ✨</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
