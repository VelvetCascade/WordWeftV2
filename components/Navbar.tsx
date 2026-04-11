
import React, { useState, useEffect } from 'react';
import { HomeIcon, BookOpenIcon, PencilSquareIcon, UserCircleIcon, Squares2X2Icon, MoonIcon, SunIcon, ArrowRightOnRectangleIcon, ChevronRightIcon, HeartIcon } from './icons/Icons';
import { WordWeftLogo } from './icons/WordWeftLogo';
import { useTheme } from '../contexts/ThemeContext';
import { SearchOverlay } from './SearchOverlay';
import type { User } from '../types';

// ── Inline Icons ──
const EllipsisIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  notificationBell?: React.ReactNode;
  onForYouClick?: () => void;
  unreadCount?: number;
  currentUser?: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout, notificationBell, onForYouClick, unreadCount = 0, currentUser }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine active route for bottom nav highlighting
  const getActiveRoute = (): string => {
    const hash = window.location.hash.replace('#/', '');
    if (hash === '' || hash === '/') return 'home';
    if (hash.startsWith('category') || hash.startsWith('genre')) return 'genres';
    if (hash.startsWith('profile') || hash.startsWith('edit-profile')) return 'library';
    if (hash.startsWith('write')) return 'write';
    return '';
  };

  const [activeRoute, setActiveRoute] = useState(getActiveRoute());

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active route on hash change
  useEffect(() => {
    const handleHashChange = () => setActiveRoute(getActiveRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const desktopNavLinks = [
    { label: 'Home', action: () => { window.location.hash = '/'; } },
    { label: 'Genres', action: () => { window.location.hash = '/category'; } },
    { label: 'For You', action: () => { if (onForYouClick) onForYouClick(); } },
    { label: 'Library', action: () => { window.location.hash = '/profile'; } },
    { label: 'Write', action: () => { window.location.hash = '/write'; } },
  ];

  const mobileNavLinks = [
    { label: 'Home', route: 'home', action: () => { window.location.hash = '/'; }, icon: HomeIcon },
    { label: 'Genres', route: 'genres', action: () => { window.location.hash = '/category'; }, icon: Squares2X2Icon },
    { label: 'Library', route: 'library', action: () => { window.location.hash = '/profile'; }, icon: BookOpenIcon },
    { label: 'Write', route: 'write', action: () => { window.location.hash = '/write'; }, icon: PencilSquareIcon },
  ];

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setTouchOffsetY(0);
  };

  const handleMobileNav = (action: () => void) => {
    closeMobileMenu();
    action();
  };

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchOffsetY, setTouchOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const drawer = target.closest('.mobile-more-drawer') as HTMLElement;
    if (drawer && drawer.scrollTop > 5) return; // Allow normal scroll if already scrolled down
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0) {
      setTouchOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY === null) return;
    if (touchOffsetY > 100) {
      closeMobileMenu();
    } else {
      setTouchOffsetY(0);
    }
    setTouchStartY(null);
  };

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?';

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

            {/* Support Button */}
            <a 
              href="https://ko-fi.com/wordweftstudio" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group hidden sm:block"
              title="Support WordWeft on Ko-fi"
            >
              <HeartIcon className="w-6 h-6 text-gray-500 dark:text-dark-text-body group-hover:text-red-500 transition-colors" />
            </a>

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
          {mobileNavLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => link.action()}
              className={`mobile-nav-tab ${activeRoute === link.route ? 'mobile-nav-tab-active' : ''}`}
            >
              <link.icon className="w-6 h-6" />
              <span>{link.label}</span>
            </button>
          ))}
          {/* More Tab */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`mobile-nav-tab ${isMobileMenuOpen ? 'mobile-nav-tab-active' : ''}`}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <EllipsisIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="mobile-nav-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span>More</span>
          </button>
        </nav>
      </div>

      {/* Mobile More Drawer */}
      {isMobileMenuOpen && (
        <>
          <div className="mobile-more-backdrop md:hidden" onClick={closeMobileMenu} />
          <div 
            className="mobile-more-drawer md:hidden"
            style={{ 
              transform: touchOffsetY > 0 ? `translateY(${touchOffsetY}px)` : undefined, 
              transition: touchStartY === null ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' 
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="mobile-more-handle" />

            {isAuthenticated && currentUser ? (
              <>
                {/* User Profile Card */}
                <div
                  className="mobile-more-user"
                  onClick={() => handleMobileNav(() => { window.location.hash = '/profile'; })}
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="mobile-more-avatar" />
                  ) : (
                    <div className="mobile-more-avatar-placeholder">{userInitial}</div>
                  )}
                  <div className="mobile-more-user-info">
                    <p className="mobile-more-user-name">{currentUser.name}</p>
                    <p className="mobile-more-user-sub">View your profile</p>
                  </div>
                  <ChevronRightIcon className="mobile-more-user-arrow" />
                </div>

                <div className="mobile-more-divider" />

                {/* Notifications */}
                <button
                  className="mobile-more-item"
                  onClick={() => handleMobileNav(() => { window.location.hash = '/notifications'; })}
                >
                  <BellIcon className="mobile-more-item-icon" />
                  <span className="mobile-more-item-label">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="mobile-more-notif-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* For You */}
                <button
                  className="mobile-more-item"
                  onClick={() => { closeMobileMenu(); if (onForYouClick) onForYouClick(); }}
                >
                  <SparklesIcon className="mobile-more-item-icon" />
                  <span className="mobile-more-item-label">For You</span>
                </button>

                <div className="mobile-more-divider" />

                {/* Support WordWeft Premium Banner */}
                <div className="px-4 py-2">
                  <a
                    href="https://ko-fi.com/wordweftstudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-[rgba(141,110,99,0.15)] dark:to-[rgba(141,110,99,0.05)] border border-red-100 dark:border-accent/20 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                    onClick={closeMobileMenu}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-dark-surface p-2 rounded-full shadow-sm group-hover:scale-110 group-hover:bg-red-50 dark:group-hover:bg-accent/20 transition-all duration-300">
                        <HeartIcon className="w-5 h-5 text-red-500 dark:text-accent" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-sm text-text-rich dark:text-dark-text-rich">Support WordWeft</span>
                        <span className="text-xs text-text-body dark:text-dark-text-body opacity-80">Buy us a coffee ☕</span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-red-400 dark:text-accent/60 group-hover:text-red-500 dark:group-hover:text-accent transition-colors" />
                  </a>
                </div>

                <div className="mobile-more-divider" />

                {/* Dark Mode Toggle */}
                <div className="mobile-more-toggle-row">
                  {theme === 'light' ? (
                    <MoonIcon className="mobile-more-item-icon" />
                  ) : (
                    <SunIcon className="mobile-more-item-icon" />
                  )}
                  <span className="mobile-more-item-label" style={{ fontSize: '15px', fontWeight: 500, color: 'inherit' }}>
                    Dark Mode
                  </span>
                  <button className="mobile-more-toggle" onClick={toggleTheme} aria-label="Toggle dark mode" />
                </div>

                <div className="mobile-more-divider" />

                {/* Logout */}
                <button
                  className="mobile-more-item mobile-more-item-danger"
                  onClick={() => handleMobileNav(onLogout)}
                >
                  <ArrowRightOnRectangleIcon className="mobile-more-item-icon" />
                  <span className="mobile-more-item-label">Log Out</span>
                </button>
              </>
            ) : (
              <>
                {/* Non-authenticated state */}
                <div className="mobile-more-login-card">
                  <p>Sign in to access all features</p>
                  <button
                    className="mobile-more-login-btn"
                    onClick={() => handleMobileNav(() => { window.location.hash = '/auth'; })}
                  >
                    Login / Sign Up
                  </button>
                </div>

                <div className="mobile-more-divider" />

                {/* Support WordWeft Premium Banner */}
                <div className="px-4 py-2">
                  <a
                    href="https://ko-fi.com/wordweftstudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-[rgba(141,110,99,0.15)] dark:to-[rgba(141,110,99,0.05)] border border-red-100 dark:border-accent/20 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                    onClick={closeMobileMenu}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-dark-surface p-2 rounded-full shadow-sm group-hover:scale-110 group-hover:bg-red-50 dark:group-hover:bg-accent/20 transition-all duration-300">
                        <HeartIcon className="w-5 h-5 text-red-500 dark:text-accent" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-sm text-text-rich dark:text-dark-text-rich">Support WordWeft</span>
                        <span className="text-xs text-text-body dark:text-dark-text-body opacity-80">Buy us a coffee ☕</span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-red-400 dark:text-accent/60 group-hover:text-red-500 dark:group-hover:text-accent transition-colors" />
                  </a>
                </div>

                <div className="mobile-more-divider" />

                {/* Dark Mode Toggle (always available) */}
                <div className="mobile-more-toggle-row">
                  {theme === 'light' ? (
                    <MoonIcon className="mobile-more-item-icon" />
                  ) : (
                    <SunIcon className="mobile-more-item-icon" />
                  )}
                  <span className="mobile-more-item-label" style={{ fontSize: '15px', fontWeight: 500, color: 'inherit' }}>
                    Dark Mode
                  </span>
                  <button className="mobile-more-toggle" onClick={toggleTheme} aria-label="Toggle dark mode" />
                </div>
              </>
            )}
          </div>
        </>
      )}

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

