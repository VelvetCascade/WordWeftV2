
import React, { useState, useEffect, useRef } from 'react';
import type { User, Book, BookProgress } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, Bars3Icon, BookmarkIcon, PaintBrushIcon, XMarkIcon } from '../components/icons/Icons';
import { useTheme } from '../contexts/ThemeContext';

type ContentTheme = 'light' | 'dark' | 'sepia';

// --- Reading Progress Logic ---
const PROGRESS_STORAGE_KEY = 'wordweft_reading_progress_v2';

const getReadingProgressForBook = (userId: number, bookId: number): BookProgress | null => {
    try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        return allProgress[userId]?.[bookId] || null;
    } catch (e) {
        console.error("Failed to get reading progress", e);
        return null;
    }
};

const saveReadingProgress = (userId: number, book: Book, chapterIndex: number, scrollPosition: number, contentHeight: number) => {
    try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        if (!allProgress[userId]) {
            allProgress[userId] = {};
        }

        const bookProgress: BookProgress = allProgress[userId][book.id] || {
            overallProgress: 0,
            lastReadChapterIndex: chapterIndex,
            lastReadScrollPosition: scrollPosition,
            chapters: {},
        };

        const chapterId = book.chapters[chapterIndex].id;
        
        let currentChapterProgress: number;

        // If content isn't scrollable or user is at the bottom, progress is 100%
        if (contentHeight <= 0 || (scrollPosition >= contentHeight - 5)) {
            currentChapterProgress = 100;
        } else {
            currentChapterProgress = (scrollPosition / contentHeight) * 100;
        }
        
        currentChapterProgress = Math.min(100, Math.max(0, currentChapterProgress));

        // Get existing progress to avoid overwriting 100% with a smaller value if user scrolls up.
        const existingChapterProgress = bookProgress.chapters[chapterId]?.progress || 0;

        bookProgress.chapters[chapterId] = {
            progress: Math.max(existingChapterProgress, currentChapterProgress), // Only update if new progress is higher
            scrollPosition: Math.round(scrollPosition),
        };

        // Update last read location
        bookProgress.lastReadChapterIndex = chapterIndex;
        bookProgress.lastReadScrollPosition = Math.round(scrollPosition);
        
        // Recalculate overall progress
        const totalChapters = book.chapters.filter(c => c.isReleased).length;
        // Re-evaluate the sum of progress from the potentially updated chapters map
        const completedChaptersSum = Object.values(bookProgress.chapters).reduce((sum: number, chap: any) => sum + (chap.progress || 0), 0);
        bookProgress.overallProgress = totalChapters > 0 ? Math.round(completedChaptersSum / totalChapters) : 0;
        
        allProgress[userId][book.id] = bookProgress;
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
    } catch (e) {
        console.error("Failed to save reading progress", e);
    }
};


interface ReaderPageProps {
    book: Book;
    chapterIndex: number;
    currentUser: User | null;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ book, chapterIndex, currentUser }) => {
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

  const chapter = book.chapters[currentChapterIndex];
  
  const contentThemeClasses: Record<ContentTheme, string> = {
    light: 'bg-background text-text-body',
    dark: 'bg-[#261F1D] text-[#BCAAA4]',
    sepia: 'bg-[#FBF0D9] text-[#5B4636]',
  };
  
  // Set initial reader theme based on global theme
  useEffect(() => {
    if (globalTheme === 'dark') {
      setContentTheme('dark');
    } else {
      setContentTheme('light');
    }
  }, [globalTheme]);

  // Effect to handle non-scrollable content and mark it as read.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser || !contentRef.current) return;
      
      const contentHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (contentHeight <= 0) {
        saveReadingProgress(currentUser.id, book, currentChapterIndex, 0, contentHeight);
      }
    }, 500); // Wait a bit for content to fully render and layout to be calculated.

    return () => clearTimeout(timer);
  }, [book, currentChapterIndex, currentUser]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < book.chapters.length) {
      setCurrentChapterIndex(index);
      window.scrollTo(0, 0);
    }
  };

  // Effect to check for saved progress on load
  useEffect(() => {
    if (!currentUser) return;
    const savedProgress = getReadingProgressForBook(currentUser.id, book.id);
    if (savedProgress && savedProgress.overallProgress > 0) {
      // Show prompt only if there's meaningful progress
      setResumeData(savedProgress);
    }
  }, [book.id, currentUser]);

  // Effect to save progress on scroll and chapter change
  useEffect(() => {
    const handleSaveProgress = () => {
        if (!currentUser) return;
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
            const contentHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (contentHeight > 0) {
              saveReadingProgress(currentUser.id, book, currentChapterIndex, window.scrollY, contentHeight);
            }
        }, 300); // Throttle saving
    };

    const handleVisibilityChange = () => {
        if (!currentUser) return;
        if (document.visibilityState === 'hidden') {
            const contentHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (contentHeight > 0) {
              saveReadingProgress(currentUser.id, book, currentChapterIndex, window.scrollY, contentHeight);
            }
        }
    }
    
    window.addEventListener('scroll', handleSaveProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        window.removeEventListener('scroll', handleSaveProgress);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        if (!currentUser) return;
        // Save one last time on unmount
        const contentHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (contentHeight > 0) {
            saveReadingProgress(currentUser.id, book, currentChapterIndex, window.scrollY, contentHeight);
        }
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
            // Use timeout to ensure content is rendered before scrolling
            setTimeout(() => window.scrollTo({ top: resumeScrollPosition, behavior: 'smooth' }), 100);
        } else {
            window.scrollTo({ top: resumeScrollPosition, behavior: 'smooth' });
        }
        setResumeData(null);
    }
  };

  const handleDismissResume = () => {
    // If dismissed, and we are not on the requested chapter, go to it from top
    if (chapterIndex !== currentChapterIndex) {
      window.scrollTo(0, 0);
    }
    setResumeData(null);
  };
  
  // Jump to last scroll position for the current chapter when it loads
  useEffect(() => {
    if (!currentUser) return;
    const progress = getReadingProgressForBook(currentUser.id, book.id);
    const chapterProgress = progress?.chapters[chapter.id];

    // Only auto-scroll if we're not showing the main "resume" prompt
    if (chapterProgress && chapterProgress.scrollPosition > 0 && !resumeData) {
        // If user navigates to a chapter directly, start them where they left off in THAT chapter.
        const targetChapterIsCurrent = chapterIndex === currentChapterIndex;
        if (targetChapterIsCurrent) {
            setTimeout(() => window.scrollTo({ top: chapterProgress.scrollPosition, behavior: 'auto' }), 50);
        }
    }
  }, [currentChapterIndex, book.id, chapter.id, resumeData, chapterIndex, currentUser]);

    // Effect to close settings panel on outside click
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

    const TableOfContents: React.FC = () => (
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
                className={`w-full text-left p-4 text-sm font-sans transition-colors ${index === currentChapterIndex ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt'} ${!chap.isReleased ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'dark:text-dark-text-body'}`}
                disabled={!chap.isReleased}
              >
                <span className="block truncate">{chap.title}</span>
                {!chap.isReleased && <span className="text-xs">(Not Released)</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );


  return (
    <div className={`transition-colors duration-300 ${contentThemeClasses[contentTheme]}`}>
      <TableOfContents />
      {/* Floating Header */}
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

      {/* Main Reading Content */}
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

      {/* Resume Prompt */}
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

      {/* Bottom Navigation */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className={`flex items-center justify-center gap-4 ${globalTheme === 'dark' ? 'bg-dark-surface/90 border-dark-border' : 'bg-surface/90 border-gray-200'} backdrop-blur-lg border rounded-2xl shadow-lg p-2`}>
            <button onClick={() => goToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex === 0} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronLeftIcon className="w-5 h-5"/></button>
            <span className="font-sans text-sm w-20 text-center dark:text-dark-text-body">{currentChapterIndex + 1} / {book.chapters.length}</span>
            <button onClick={() => goToChapter(currentChapterIndex + 1)} disabled={currentChapterIndex === book.chapters.length - 1} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      </footer>

      {/* Side Toolbar for settings */}
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
