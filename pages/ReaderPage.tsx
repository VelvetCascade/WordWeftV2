
import React, { useState, useEffect, useRef } from 'react';
import type { Book, NavigateTo } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, Bars3Icon, BookmarkIcon, PaintBrushIcon } from '../components/icons/Icons';
import { useTheme } from '../contexts/ThemeContext';

type ContentTheme = 'light' | 'dark' | 'sepia';

export const ReaderPage: React.FC<{ navigateTo: NavigateTo; book: Book; chapterIndex: number }> = ({ navigateTo, book, chapterIndex }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterIndex);
  const [fontSize, setFontSize] = useState(18);
  const [contentTheme, setContentTheme] = useState<ContentTheme>('light');
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { theme: globalTheme } = useTheme();

  const chapter = book.chapters[currentChapterIndex];
  
  const contentThemeClasses: Record<ContentTheme, string> = {
    light: 'bg-background text-text-body',
    dark: 'bg-gray-900 text-gray-300',
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

  const goToChapter = (index: number) => {
    if (index >= 0 && index < book.chapters.length) {
      setCurrentChapterIndex(index);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className={`transition-colors duration-300 ${contentThemeClasses[contentTheme]}`}>
      {/* Floating Header */}
      <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${isToolbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${globalTheme === 'dark' ? 'bg-dark-surface/80 border-dark-border' : 'bg-background/80 border-gray-200'} backdrop-blur-md border-b`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => navigateTo({ name: 'book-details', book })} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent dark:text-dark-text-body dark:hover:text-accent">
                <ChevronLeftIcon className="w-5 h-5"/>
                <span>{book.title}</span>
            </button>
             <div className="text-center">
                 <h2 className="font-sans font-semibold truncate dark:text-dark-text-rich">{chapter.title}</h2>
             </div>
            <div className="flex items-center gap-4 dark:text-dark-text-body">
                 <button><BookmarkIcon className="w-5 h-5"/></button>
                 <button><Bars3Icon className="w-5 h-5"/></button>
            </div>
        </div>
      </header>

      {/* Main Reading Content */}
      <main className="max-w-prose mx-auto px-4 pt-24 pb-32">
        <h1 className="text-4xl font-serif font-bold mb-8 leading-snug">{chapter.title}</h1>
        <div 
          className="prose prose-lg lg:prose-xl"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
          <p>
            The air in the Grand Archives of Aerthos was thick with the scent of aged parchment and forgotten magic. Elara traced a finger over the spine of a leather-bound tome, dust motes dancing in the slivers of light that pierced the high, vaulted windows. Each book here held a story, a life, a world unto itself. But she wasn't here for just any story. She was searching for a beginning—her own.
          </p>
          <p>
            Her earliest memory was of waking in this very library, a book of constellations clutched in her small hands and a name whispered on her lips: Lyra. It was the only clue to her past, a single star in a sky of unknowns. The archivists had raised her, feeding her knowledge as they would a fledgling bird, but none could tell her where she came from.
          </p>
          <blockquote>
            "A book is a dream you hold in your hand." - Neil Gaiman
          </blockquote>
          <p>
            Following the cryptic map she'd found tucked within a rare celestial atlas, Kaelen found himself before the ancient Sundial of Omens. Its gnomon, a shard of obsidian, stretched towards the heavens like a skeletal finger, casting a long, sharp shadow across the arcane markings etched into the stone base. The map claimed that at the precise moment of the twin moons' eclipse, the sundial would reveal a hidden path.
          </p>
          <p>
            He checked the sky. The two moons, one silver and one sapphire, were beginning to converge. A palpable energy hummed in the air, making the hairs on his arms stand on end. He was a rogue, a skeptic by trade, but the magic of this place was undeniable. This wasn't just some treasure hunt; it was a rendezvous with destiny.
          </p>
        </div>
      </main>

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
        <div className="relative group">
            <button className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors">
                <PaintBrushIcon className="w-5 h-5" />
            </button>
            <div className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 w-max ${globalTheme === 'dark' ? 'bg-dark-surface' : 'bg-surface'} shadow-md rounded-xl p-2 flex items-center gap-2 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity`}>
                <button onClick={() => setContentTheme('light')} className={`p-2 rounded-full ${contentTheme === 'light' ? 'ring-2 ring-accent' : ''}`}><SunIcon className="w-5 h-5 text-yellow-500"/></button>
                <button onClick={() => setContentTheme('sepia')} className={`p-2 rounded-full ${contentTheme === 'sepia' ? 'ring-2 ring-accent' : ''}`}><div className="w-5 h-5 rounded-full bg-[#FBF0D9] border border-[#d3c0a5]"></div></button>
                <button onClick={() => setContentTheme('dark')} className={`p-2 rounded-full ${contentTheme === 'dark' ? 'ring-2 ring-accent' : ''}`}><MoonIcon className="w-5 h-5 text-gray-700"/></button>
            </div>
        </div>
        <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-xs font-bold">A-</button>
        <button onClick={() => setFontSize(s => Math.min(32, s + 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-lg font-bold">A+</button>
      </div>
    </div>
  );
};
