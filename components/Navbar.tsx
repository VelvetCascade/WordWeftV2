
import React, { useState, useEffect } from 'react';
import { HomeIcon, BookOpenIcon, PencilSquareIcon, UserCircleIcon, Squares2X2Icon, MoonIcon, SunIcon, ArrowRightOnRectangleIcon } from './icons/Icons';
import { WordWeftLogo } from './icons/WordWeftLogo';
import { useTheme } from '../contexts/ThemeContext';
import { SearchOverlay } from './SearchOverlay';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  notificationBell?: React.ReactNode;
  onForYouClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout, notificationBell, onForYouClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for hero search scroll visibility from HomePage
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHeroSearchVisible(detail?.visible ?? true);
    };
    window.addEventListener('heroSearchVisibility', handler);
    return () => window.removeEventListener('heroSearchVisibility', handler);
  }, []);

  const desktopNavLinks = [
    { label: 'Home', action: () => { window.location.hash = '/'; } },
    { label: 'Genres', action: () => { window.location.hash = '/category'; } },
    { label: 'For You', action: () => { if (onForYouClick) onForYouClick(); } },
    { label: 'Library', action: () => { window.location.hash = '/profile'; } },
    { label: 'Write', action: () => { window.location.hash = '/write'; } },
  ];

  const mobileNavLinks = [
    { label: 'Home', action: () => { window.location.hash = '/'; }, icon: HomeIcon },
    { label: 'Genres', action: () => { window.location.hash = '/category'; }, icon: Squares2X2Icon },
    { label: 'Library', action: () => { window.location.hash = '/profile'; }, icon: BookOpenIcon },
    { label: 'Write', action: () => { window.location.hash = '/write'; }, icon: PencilSquareIcon },
    { label: 'Profile', action: () => { window.location.hash = '/profile'; }, icon: UserCircleIcon },
  ];

  const SearchIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  return (
    <>
      {/* Desktop Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-300 ${isScrolled ? 'bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-lg shadow-soft dark:border-b dark:border-dark-border' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }}>
            <WordWeftLogo className="w-12 h-12 md:w-14 md:h-14" />
          </a>
          <nav className="flex items-center space-x-8">
            {desktopNavLinks.map((link) => (
              <a key={link.label} href="#" onClick={(e) => { e.preventDefault(); link.action(); }} className="font-sans text-sm font-medium text-text-body dark:text-dark-text-body hover:text-accent dark:hover:text-accent transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`search-navbar-btn ${!heroSearchVisible ? 'search-navbar-btn-morph' : ''}`}
              title="Search (Ctrl+K)"
            >
              <SearchIcon />
              <span className="search-navbar-label">Search</span>
              <kbd className="search-navbar-kbd">⌘K</kbd>
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
              {theme === 'light' ? <MoonIcon className="w-6 h-6 text-text-body" /> : <SunIcon className="w-6 h-6 text-dark-text-body" />}
            </button>
            {isAuthenticated ? (
              <>
                {notificationBell}
                <button onClick={() => { window.location.hash = '/profile'; }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  <UserCircleIcon className="w-6 h-6 text-text-body dark:text-dark-text-body" />
                </button>
                <button onClick={onLogout} title="Logout" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  <ArrowRightOnRectangleIcon className="w-6 h-6 text-text-body dark:text-dark-text-body" />
                </button>
              </>
            ) : (
              <button onClick={() => { window.location.hash = '/auth'; }} className="font-sans text-sm font-semibold bg-accent text-white px-4 py-2 rounded-lg hover:bg-primary transition-colors">
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-lg border-t border-gray-200/80 dark:border-dark-border z-50">
        <nav className="h-full flex justify-around items-center">
          {mobileNavLinks.map((link) => {
            if (link.label === 'Profile' && !isAuthenticated) {
              return (
                <button key="Login" onClick={() => { window.location.hash = '/auth'; }} className="flex flex-col items-center justify-center space-y-1 text-text-body dark:text-dark-text-body hover:text-accent dark:hover:text-accent transition-colors w-1/5">
                  <ArrowRightOnRectangleIcon className="w-6 h-6" />
                  <span className="text-xs font-sans">Login</span>
                </button>
              );
            }
            return (
              <button key={link.label} onClick={link.action} className="flex flex-col items-center justify-center space-y-1 text-text-body dark:text-dark-text-body hover:text-accent dark:hover:text-accent transition-colors w-1/5">
                <link.icon className="w-6 h-6" />
                <span className="text-xs font-sans">{link.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Search FAB */}
      <button
        className="search-mobile-fab md:hidden"
        onClick={() => setIsSearchOpen(true)}
        aria-label="Search"
      >
        <SearchIcon />
      </button>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
