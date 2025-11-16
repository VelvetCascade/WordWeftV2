
import React, { useState, useEffect, useRef } from 'react';
import type { User, Book, BookProgress } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, Bars3Icon, BookmarkIcon, PaintBrushIcon, XMarkIcon } from '../components/icons/Icons';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../api/client';

type ContentTheme = 'light' | 'dark' | 'sepia';

interface ReaderPageProps {
    bookId: number;
    chapterIndex: number;
    currentUser: User | null;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId, chapterIndex, currentUser }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterIndex);
  const [fontSize, setFontSize] = useState(18);
  const [contentTheme, setContentTheme] = useState<ContentTheme>('light');
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [resumeData, setResumeData] = useState<BookProgress | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
  
  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const { theme: globalTheme } = useTheme();

  const chapter = book?.chapters[currentChapterIndex];
  
  const contentThemeClasses: Record<ContentTheme, string> = {
    light: 'bg-background text-text-body',
    dark: 'bg-[#261F1D] text-[#BCAAA4]',
    sepia: 'bg-[#FBF0D9] text-[#5B4636]',
  };
  
  useEffect(() => {
    setIsLoading(true);
    api.getBookById(bookId).then(fetchedBook => {
      setBook(fetchedBook);
      setIsLoading(false);
    });
  }, [bookId]);

  useEffect(() => {
    if (globalTheme === 'dark') {
      setContentTheme('dark');
    } else {
      setContentTheme('light');
    }
  }, [globalTheme]);

  const handleSaveProgress = () => {
      if (!currentUser || !book) return;
      const contentHeight = document.documentElement.scrollHeight - window.innerHeight;
      api.saveReadingProgress(currentUser.id, book, currentChapterIndex, window.scrollY, contentHeight);
  };

  useEffect(() => {
    if (!book) return;
    const timer = setTimeout(() => {
      if (!currentUser || !contentRef.current) return;
      
      const contentHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (contentHeight <= 0) {
        api.saveReadingProgress(currentUser.id, book, currentChapterIndex, 0, contentHeight);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [book, currentChapterIndex, currentUser]);

  const goToChapter = (index: number) => {
    if (!book || (index < 0 || index >= book.chapters.length)) return;
    
    handleSaveProgress(); // Save progress before leaving chapter
    setCurrentChapterIndex(index);
    window.location.hash = `/read/book/${book.id}/chapter/${index}`;
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!currentUser) return;
    api.getReadingProgressForBook(currentUser.id, bookId).then(savedProgress => {
        if (savedProgress && savedProgress.overallProgress > 0) {
            setResumeData(savedProgress);
        }
    });
  }, [bookId, currentUser]);

  useEffect(() => {
    if (!book) return;

    const saveThrottled = () => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(handleSaveProgress, 300);
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            handleSaveProgress();
        }
    }
    
    window.addEventListener('scroll', saveThrottled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        window.removeEventListener('scroll', saveThrottled);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        handleSaveProgress(); // Save one last time on unmount
    };
  }, [book, currentChapterIndex, currentUser]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY.current && window.scrollY > 100) {
        setIsToolbarVisible(false); // scrolling down
      } else {
        setIsToolbarVisible(true); // scrolling up
      }
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleResume = () => {
    if (resumeData) {
        const resumeChapterIndex = resumeData.lastReadChapterIndex;
        const resumeScrollPosition = resumeData.lastReadScrollPosition;

        if (currentChapterIndex !== resumeChapterIndex) {
            setCurrentChapterIndex(resumeChapterIndex);
            setTimeout(() => window.scrollTo({ top: resumeScrollPosition, behavior: 'smooth' }), 100);
        } else {
            window.scrollTo({ top: resumeScrollPosition, behavior: 'smooth' });
        }
        setResumeData(null);
    }
  };

  const handleDismissResume = () => {
    if (chapterIndex !== currentChapterIndex) {
      window.scrollTo(0, 0);
    }
    setResumeData(null);
  };
  
  useEffect(() => {
    if (!currentUser || resumeData || !book || !chapter) return;

    api.getReadingProgressForBook(currentUser.id, bookId).then(progress => {
        const chapterProgress = progress?.chapters[chapter.id];
        if (chapterProgress && chapterProgress.scrollPosition > 0) {
            const targetChapterIsCurrent = chapterIndex === currentChapterIndex;
            if (targetChapterIsCurrent) {
                setTimeout(() => window.scrollTo({ top: chapterProgress.scrollPosition, behavior: 'auto' }), 50);
            }
        }
    });
  }, [currentChapterIndex, bookId, chapter, book, resumeData, chapterIndex, currentUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
                setIsSettingsPanelVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const TableOfContents: React.FC = () => {
        if (!book) return null;
        return (
            <div 
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${isTocVisible ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} 
            onClick={() => setIsTocVisible(false)}
            >
            <div 
                className={`absolute top-0 left-0 bottom-0 w-80 max-w-[80vw] ${globalTheme === 'dark' ? 'bg-dark-surface' : 'bg-background'} shadow-lg transform transition-transform duration-300 ${isTocVisible ? 'translate-x-0' : '-translate-x-full'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">Table of Contents</h3>
                <p className="text-sm text-text-body dark:text-dark-text-body truncate">{book.title}</p>
                </div>
                <ul className="overflow-y-auto h-[calc(100%-65px)]">
                {book.chapters.map((chap, index) => (
                    <li key={chap.id}>
                    <button 
                        onClick={() => { 
                        goToChapter(index); 
                        setIsTocVisible(false);
                        }}
                        className={`w-full text-left p-4 text-sm font-sans transition-colors ${index === currentChapterIndex ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt'} ${chap.status !== 'published' ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'dark:text-dark-text-body'}`}
                        disabled={chap.status !== 'published'}
                    >
                        <span className="block truncate">{chap.title}</span>
                        {chap.status !== 'published' && <span className="text-xs">(Not Released)</span>}
                    </button>
                    </li>
                ))}
                </ul>
            </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading chapter...</div>;
    }
    
    if (!book || !chapter) {
        return <div className="min-h-screen flex items-center justify-center">Could not load book content.</div>;
    }

  return (
    <div className={`transition-colors duration-300 ${contentThemeClasses[contentTheme]}`}>
      <TableOfContents />
      <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${isToolbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${globalTheme === 'dark' ? 'bg-dark-surface/80 border-dark-border' : 'bg-background/80 border-gray-200'} backdrop-blur-md border-b`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => window.location.hash = `/book/${book.id}`} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent dark:text-dark-text-body dark:hover:text-accent">
                <ChevronLeftIcon className="w-5 h-5"/>
                <span>{book.title}</span>
            </button>
             <div className="text-center">
                 <h2 className="font-sans font-semibold truncate dark:text-dark-text-rich">{chapter.title}</h2>
             </div>
            <div className="flex items-center gap-4">
                 <button onClick={() => setIsBookmarked(!isBookmarked)}>
                    <BookmarkIcon className={`w-5 h-5 transition-colors ${isBookmarked ? 'text-accent fill-accent/20' : 'text-gray-400 dark:text-gray-500 hover:text-accent dark:hover:text-accent'}`} />
                 </button>
                 <button onClick={() => setIsTocVisible(true)} className="text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors">
                    <Bars3Icon className="w-5 h-5"/>
                 </button>
            </div>
        </div>
      </header>

      <main ref={contentRef} className="max-w-prose mx-auto px-4 pt-24 pb-32">
        <h1 className="text-4xl font-serif font-bold mb-8 leading-snug">{chapter.title}</h1>
        <div 
          className="prose prose-lg lg:prose-xl dark:prose-invert"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
            {chapter.content.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
      </main>

      {resumeData && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-sm animate-slide-in-bottom">
            <div className={`${globalTheme === 'dark' ? 'bg-dark-surface/90 text-dark-text-body' : 'bg-surface/90 text-text-body'} backdrop-blur-lg border ${globalTheme === 'dark' ? 'border-dark-border' : 'border-gray-200'} rounded-2xl shadow-lg p-4 flex items-center justify-between gap-4`}>
                <div>
                    <p className="font-sans font-semibold text-sm text-text-rich dark:text-dark-text-rich">Welcome back!</p>
                    <p className="font-sans text-xs">Resume from where you left off?</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleResume} className="font-sans font-semibold text-sm bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-opacity-80 transition-colors whitespace-nowrap">Resume</button>
                    <button onClick={handleDismissResume} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
      )}

      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className={`flex items-center justify-center gap-4 ${globalTheme === 'dark' ? 'bg-dark-surface/90 border-dark-border' : 'bg-surface/90 border-gray-200'} backdrop-blur-lg border rounded-2xl shadow-lg p-2`}>
            <button onClick={() => goToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex === 0} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronLeftIcon className="w-5 h-5"/></button>
            <span className="font-sans text-sm w-20 text-center dark:text-dark-text-body">{currentChapterIndex + 1} / {book.chapters.length}</span>
            <button onClick={() => goToChapter(currentChapterIndex + 1)} disabled={currentChapterIndex === book.chapters.length - 1} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      </footer>

      <div className={`fixed top-1/2 -translate-y-1/2 right-4 z-20 flex flex-col gap-2 ${globalTheme === 'dark' ? 'bg-dark-surface/90 border-dark-border text-dark-text-body' : 'bg-surface/90 border-gray-200'} backdrop-blur-lg border rounded-full shadow-lg p-2 transition-all duration-300 ${isToolbarVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div ref={settingsPanelRef} className="relative">
            <button 
                onClick={() => setIsSettingsPanelVisible(prev => !prev)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors"
                aria-label="Reading settings"
            >
                <PaintBrushIcon className="w-5 h-5" />
            </button>
            <div className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 w-max ${globalTheme === 'dark' ? 'bg-dark-surface' : 'bg-surface'} shadow-md rounded-xl p-2 flex items-center gap-2 transition-all duration-200 origin-right ${isSettingsPanelVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <button onClick={() => setContentTheme('light')} className={`p-2 rounded-full ${contentTheme === 'light' ? 'ring-2 ring-accent' : ''}`} aria-label="Light theme"><SunIcon className="w-5 h-5 text-amber-600"/></button>
                <button onClick={() => setContentTheme('sepia')} className={`p-2 rounded-full ${contentTheme === 'sepia' ? 'ring-2 ring-accent' : ''}`} aria-label="Sepia theme"><div className="w-5 h-5 rounded-full bg-[#FBF0D9] border border-[#d3c0a5]"></div></button>
                <button onClick={() => setContentTheme('dark')} className={`p-2 rounded-full ${contentTheme === 'dark' ? 'ring-2 ring-accent' : ''}`} aria-label="Dark theme"><MoonIcon className="w-5 h-5 text-gray-700"/></button>
            </div>
        </div>
        <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-xs font-bold" aria-label="Decrease font size">A-</button>
        <button onClick={() => setFontSize(s => Math.min(32, s + 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-lg font-bold" aria-label="Increase font size">A+</button>
      </div>
    </div>
  );
};
