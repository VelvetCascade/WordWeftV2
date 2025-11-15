import React, { useState, useEffect } from 'react';
import type { NavigateTo } from '../types';
import { HomeIcon, BookOpenIcon, PencilSquareIcon, UserCircleIcon, Squares2X2Icon, MoonIcon, SunIcon, ArrowRightOnRectangleIcon } from './icons/Icons';
import { sampleUser } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  navigateTo: NavigateTo;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ navigateTo, isAuthenticated, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const desktopNavLinks = [
    { label: 'Home', action: () => { window.location.hash = '/'; navigateTo({ name: 'home' }); } },
    { label: 'Genres', action: () => { window.location.hash = '/category'; navigateTo({ name: 'category', genre: null }); } },
    { label: 'Library', action: () => { window.location.hash = '/profile'; navigateTo({ name: 'profile', user: sampleUser }); } },
    { label: 'Write', action: () => { window.location.hash = '/write'; navigateTo({ name: 'writer-dashboard' }); } },
  ];

  const mobileNavLinks = [
      { label: 'Home', action: () => { window.location.hash = '/'; navigateTo({ name: 'home' }); }, icon: HomeIcon },
      { label: 'Genres', action: () => { window.location.hash = '/category'; navigateTo({ name: 'category', genre: null }); }, icon: Squares2X2Icon },
      { label: 'Library', action: () => { window.location.hash = '/profile'; navigateTo({ name: 'profile', user: sampleUser }); }, icon: BookOpenIcon },
      { label: 'Write', action: () => { window.location.hash = '/write'; navigateTo({ name: 'writer-dashboard' }); }, icon: PencilSquareIcon },
      { label: 'Profile', action: () => { isAuthenticated ? navigateTo({ name: 'profile', user: sampleUser }) : navigateTo({ name: 'auth' }) }, icon: UserCircleIcon },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-300 ${isScrolled ? 'bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-lg shadow-soft dark:border-b dark:border-dark-border' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#/" onClick={(e) => { e.preventDefault(); navigateTo({ name: 'home' })}} className="font-sans font-bold text-2xl text-primary dark:text-gray-100 tracking-tighter">
            Aetherium
          </a>
          <nav className="flex items-center space-x-8">
            {desktopNavLinks.map((link) => (
              <a key={link.label} href="#" onClick={(e) => { e.preventDefault(); link.action(); }} className="font-sans text-sm font-medium text-text-body dark:text-dark-text-body hover:text-accent dark:hover:text-accent transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                {theme === 'light' ? <MoonIcon className="w-6 h-6 text-text-body" /> : <SunIcon className="w-6 h-6 text-dark-text-body" />}
            </button>
            {isAuthenticated ? (
              <>
                <button onClick={() => { window.location.hash = '/profile'; navigateTo({ name: 'profile', user: sampleUser }); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  <UserCircleIcon className="w-6 h-6 text-text-body dark:text-dark-text-body" />
                </button>
                <button onClick={onLogout} title="Logout" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  <ArrowRightOnRectangleIcon className="w-6 h-6 text-text-body dark:text-dark-text-body" />
                </button>
              </>
            ) : (
              <button onClick={() => navigateTo({ name: 'auth' })} className="font-sans text-sm font-semibold bg-accent text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
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
                    <button key="Login" onClick={() => navigateTo({ name: 'auth' })} className="flex flex-col items-center justify-center space-y-1 text-text-body dark:text-dark-text-body hover:text-accent dark:hover:text-accent transition-colors w-1/5">
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
    </>
  );
};