import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Search, PenLine, MessageCircle, Library, Menu, X, Sun, Moon, LogOut, UserRound, Settings, Sparkles, Compass, Trophy, Feather, Info, ShieldCheck, Heart } from 'lucide-react';
import { SearchOverlay } from './SearchOverlay';
import { ResilientImage } from './ResilientImage';
import { WordWeftLogo } from './icons/WordWeftLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import type { User } from '../types';

interface NavbarProps {
  isAuthenticated: boolean; onLogout: () => Promise<void> | void; isLoggingOut?: boolean;
  notificationBell?: React.ReactNode; onForYouClick?: () => void; unreadCount?: number; currentUser?: User | null;
}
const route = () => window.location.pathname;
export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout, isLoggingOut, notificationBell, onForYouClick, currentUser }) => {
  const [path, setPath] = useState(route);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPresent = usePresence(menuOpen);
  const { theme, toggleTheme } = useTheme();
  const menuRef = useDialog(menuOpen, () => setMenuOpen(false));
  useEffect(() => {
    const update = () => { setPath(route()); setMenuOpen(false); setSearchOpen(false); };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(open => !open); }
    };
    window.addEventListener('wordweft:navigate', update); window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update); window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('wordweft:navigate', update); window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update); window.removeEventListener('keydown', shortcut);
    };
  }, []);
  const primary = [{ label: 'Read', href: '/category', icon: Compass, active: ['/', '/home', '/category', '/search', '/hooks'].includes(path) || path.startsWith('/genre') || path.startsWith('/book') || path.startsWith('/author') },
    { label: 'Write', href: '/write', icon: PenLine, active: path.startsWith('/write') },
    { label: 'Community', href: '/community', icon: MessageCircle, active: path.startsWith('/community') }];
  const more = [{ label: 'Hook feed', href: '/hooks', icon: Sparkles }, { label: 'Events & challenges', href: '/events', icon: Trophy },
    { label: 'Platform features', href: '/features', icon: BookOpen }, { label: 'Founding Writers', href: '/founding-writers', icon: Feather },
    { label: 'About WordWeft', href: '/about', icon: Info }, { label: 'Help & contact', href: '/contact', icon: MessageCircle }, { label: 'Support WordWeft', href: 'https://ko-fi.com/wordweftstudio', icon: Heart }];
  return <>
    <header className="v2-nav-wrap">
      <nav className="v2-nav" aria-label="Main navigation">
        <a className="v2-brand" href="/" aria-label="WordWeft home"><WordWeftLogo /><span>WordWeft</span></a>
        <div className="v2-nav-primary">{primary.map(item => <a key={item.label} href={item.href} className={item.active ? 'active' : ''} aria-current={item.active ? 'page' : undefined}>{item.label}</a>)}<a href="/about" className={path === '/about' ? 'active' : ''} aria-current={path === '/about' ? 'page' : undefined}>About</a></div>
        <div className="v2-nav-actions">
          {isAuthenticated && <a href="/library" title="Your library" className={`v2-library-link ${path === '/library' ? 'active' : ''}`} aria-current={path === '/library' ? 'page' : undefined}><Library size={18} />Your library</a>}
          <button className="v2-icon-button" onClick={() => setSearchOpen(true)} aria-label="Search WordWeft" title="Search (Ctrl / ⌘ K)"><Search size={20} /></button>
          {isAuthenticated && notificationBell}
          {!isAuthenticated && <a href="/auth" className="v2-signin">Sign in</a>}
          {!isAuthenticated && <a href="/category" className="v2-button v2-start">Start reading <ArrowRight size={17} /></a>}
          <button className={`v2-icon-button ${isAuthenticated ? 'v2-account-trigger' : ''}`} aria-label={isAuthenticated ? 'Open account and navigation' : 'More navigation'} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            {isAuthenticated ? <ResilientImage src={currentUser?.avatarUrl} alt="Your account" fallbackLabel={currentUser?.name || 'Reader'} className="v2-nav-avatar" /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
    </header>
    <nav className="v2-bottom-nav" aria-label="Mobile navigation">
      {[primary[0], { label: 'Library', href: '/library', icon: Library, active: path === '/library' }, primary[2], primary[1]].map(item => <a key={item.label} href={item.href} aria-current={item.active ? 'page' : undefined} className={item.active ? 'active' : ''}><item.icon size={20} /><span>{item.label === 'Read' ? 'Explore' : item.label}</span></a>)}
    </nav>
    {menuPresent && <div className="v2-menu-scrim ww-presence" data-state={menuOpen ? 'open' : 'closed'} inert={!menuOpen} aria-hidden={!menuOpen || undefined} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <div className="v2-account-menu" ref={menuRef} role="dialog" aria-modal="true" aria-labelledby="navigation-title" tabIndex={-1}>
        <div className="v2-menu-heading"><div><small>{isAuthenticated ? 'YOUR ACCOUNT' : 'FIND YOUR NEXT CHAPTER'}</small><h2 id="navigation-title">{currentUser?.name || 'Explore WordWeft'}</h2></div><button className="v2-icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
        {isAuthenticated && <div className="v2-menu-group"><a href="/profile"><UserRound size={18} />Your profile</a><a href="/edit-profile"><Settings size={18} />Account settings</a><a href="/library"><Library size={18} />Your library</a></div>}
        <div className="v2-menu-group">{more.map(item => <a href={item.href} key={item.href} target={item.href.startsWith('https://') ? '_blank' : undefined} rel={item.href.startsWith('https://') ? 'noopener noreferrer' : undefined}><item.icon size={18} />{item.label}</a>)}{currentUser?.roles?.includes('ROLE_ADMIN') && <><a href="/admin"><ShieldCheck size={18} />Admin console</a><a href="/admin/founding-writers"><Feather size={18} />Writer applications</a></>}{onForYouClick && <button onClick={() => { setMenuOpen(false); onForYouClick(); }}><Compass size={18} />Personalized discovery</button>}</div>
        <div className="v2-menu-group"><button onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}{theme === 'light' ? 'Use dark appearance' : 'Use light appearance'}</button>{isAuthenticated ? <button disabled={isLoggingOut} onClick={() => void onLogout()}><LogOut size={18} />{isLoggingOut ? 'Signing out…' : 'Sign out'}</button> : <a href="/auth"><UserRound size={18} />Sign in or create an account</a>}</div>
      </div>
    </div>}
    <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
  </>;
};
