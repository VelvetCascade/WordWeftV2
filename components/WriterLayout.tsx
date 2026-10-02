import React, { useState, useEffect } from 'react';
import { LayoutDashboard, NotebookPen, MessageCircle, ChartNoAxesCombined, Users, Settings, CircleHelp, Menu, ArrowLeft, X } from 'lucide-react';
import type { User } from '../types';
import { navigatePath } from '../utils/navigation';
import '../styles/writer-v2.css';
import { useDialog } from '../hooks/useDialog';
import { ResilientImage } from './ResilientImage';

interface WriterLayoutProps {
  children: React.ReactNode;
  currentUser?: User;
}

const currentRoute = () => window.location.pathname + window.location.search;

export const WriterLayout: React.FC<WriterLayoutProps> = ({ children, currentUser }) => {
  const [route, setRoute] = useState(currentRoute);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreDialogRef = useDialog(moreOpen, () => setMoreOpen(false));

  useEffect(() => {
    const syncRoute = () => { setRoute(currentRoute()); setMoreOpen(false); };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('wordweft:navigate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('wordweft:navigate', syncRoute);
    };
  }, []);

  const isEditor = /\/write\/book\/[^/]+\/chapter\/[^/]+\/edit/.test(route);
  if (isEditor) return <main id="main-content" tabIndex={-1} className="ww-writer-v2 ww-writer-editor-layout">{children}</main>;

  const view = new URLSearchParams(route.split('?')[1] || '').get('view');
  const bookId = route.match(/\/write\/book\/([^/]+)\/manage/)?.[1];
  const guideBookId = bookId || currentUser?.writtenBooks?.[0]?.id;
  const isGuide = route.includes('tab=characters') || route.includes('tab=scenes') || route.includes('tab=notes');
  const active = route.startsWith('/write/analytics') ? 'analytics' : view === 'comments' ? 'comments' : isGuide ? 'guide' : view === 'stories' || route.includes('/book/') ? 'stories' : 'overview';
  const destinations = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/write' },
    { id: 'stories', label: 'My stories', icon: NotebookPen, path: '/write?view=stories' },
    { id: 'comments', label: 'Reader comments', icon: MessageCircle, path: '/write?view=comments' },
    { id: 'analytics', label: 'Statistics', icon: ChartNoAxesCombined, path: '/write/analytics' },
    { id: 'guide', label: 'Story guide', icon: Users, path: guideBookId ? `/write/book/${guideBookId}/manage?tab=characters` : '/write?view=stories' },
  ];
  return (
    <div className="ww-writer-v2 ww-writer-shell">
      <aside className="ww-studio-sidebar" aria-label="Writer studio navigation">
        <div className="ww-studio-identity">
          <ResilientImage src={currentUser?.avatarUrl} alt="" fallbackLabel={currentUser?.name || 'Writer'} className="ww-studio-avatar" />
          <div><strong>{currentUser?.name || 'Your studio'}</strong><small>Writer studio</small></div>
        </div>
        <span className="ww-studio-nav-label">Your writing</span>
        <nav>
          {destinations.map(item => <a key={item.id} href={item.path} className={`ww-studio-link ${active === item.id ? 'active' : ''}`} aria-current={active === item.id ? 'page' : undefined}><item.icon size={19} strokeWidth={1.6} /><span>{item.label}</span></a>)}
        </nav>
        <span className="ww-studio-nav-label">Account</span>
        <nav>
          <a className="ww-studio-link" href="/edit-profile"><Settings size={19} strokeWidth={1.6} />Settings</a>
          <a className="ww-studio-link" href="/help"><CircleHelp size={19} strokeWidth={1.6} />Writing help</a>
          <a className="ww-studio-link ww-studio-return" href="/"><ArrowLeft size={19} strokeWidth={1.6} />Back to reading</a>
        </nav>
        <div className="ww-studio-ownership"><strong>Your work stays yours.</strong><p>Private until you publish.<br />Always yours to keep.</p></div>
      </aside>
      <nav className="ww-studio-mobile-nav" aria-label="Writer studio">
        {destinations.slice(0, 3).map(item => <a key={item.id} href={item.path} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined}><item.icon size={20} strokeWidth={1.6} /><span>{item.id === 'stories' ? 'Stories' : item.id === 'comments' ? 'Comments' : item.label}</span></a>)}
        <button type="button" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} aria-controls="ww-studio-more"><Menu size={20} strokeWidth={1.6} /><span>More</span></button>
      </nav>
      <main id="main-content" tabIndex={-1} className="ww-writer-main">{children}</main>
      {moreOpen && <div className="ww-studio-more-backdrop" onClick={event => event.target === event.currentTarget && setMoreOpen(false)}><div ref={moreDialogRef} tabIndex={-1} id="ww-studio-more" className="ww-studio-more" role="dialog" aria-modal="true" aria-label="More studio destinations"><header><strong>Your studio</strong><button aria-label="Close menu" onClick={() => setMoreOpen(false)}><X size={20} /></button></header>{[...destinations.slice(3), { id: 'settings', label: 'Settings', icon: Settings, path: '/edit-profile' }, { id: 'help', label: 'Writing help', icon: CircleHelp, path: '/help' }].map(item => <button className="ww-studio-link" key={item.id} onClick={() => { setMoreOpen(false); navigatePath(item.path); }}><item.icon size={20} />{item.label}</button>)}</div></div>}
    </div>
  );
};
