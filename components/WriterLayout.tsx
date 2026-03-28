
import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ChartPieIcon, Cog6ToothIcon, ArrowLeftIcon } from './icons/Icons';
import { WordWeftLogo } from './icons/WordWeftLogo';

interface WriterLayoutProps {
  children: React.ReactNode;
}

const writerTabs = [
  { id: 'books', label: 'My Books', icon: BookOpenIcon, hash: '#/write' },
  { id: 'analytics', label: 'Analytics', icon: ChartPieIcon, hash: '#/write/analytics' },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon, hash: '#/write/settings' },
];

type PageContext = {
  activeTab: string | null;
  isChapterEditor: boolean;
  isSubPage: boolean;
  backLabel: string;
  backHash: string;
};

const getPageContext = (hash: string): PageContext => {
  // Chapter editor — full distraction-free mode, no writer bar
  if (hash.match(/#\/write\/book\/[^/]+\/chapter\/[^/]+\/edit/)) {
    return { activeTab: null, isChapterEditor: true, isSubPage: true, backLabel: '', backHash: '' };
  }
  // Manage chapters page
  if (hash.match(/#\/write\/book\/[^/]+\/manage/)) {
    return { activeTab: 'books', isChapterEditor: false, isSubPage: true, backLabel: 'My Books', backHash: '/write' };
  }
  // Create book page
  if (hash.startsWith('#/write/book/create')) {
    return { activeTab: 'books', isChapterEditor: false, isSubPage: true, backLabel: 'My Books', backHash: '/write' };
  }
  // Main pages
  if (hash.startsWith('#/write/analytics')) {
    return { activeTab: 'analytics', isChapterEditor: false, isSubPage: false, backLabel: 'Home', backHash: '/' };
  }
  if (hash.startsWith('#/write/settings')) {
    return { activeTab: 'settings', isChapterEditor: false, isSubPage: false, backLabel: 'Home', backHash: '/' };
  }
  // Default: dashboard
  return { activeTab: 'books', isChapterEditor: false, isSubPage: false, backLabel: 'Home', backHash: '/' };
};

export const WriterLayout: React.FC<WriterLayoutProps> = ({ children }) => {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const ctx = getPageContext(currentHash);

  // Chapter editor: render children directly, no wrapper (distraction-free)
  if (ctx.isChapterEditor) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
      {/* Writer Top Bar */}
      <div className="writer-topbar">
        <div className="writer-topbar-inner">
          {/* Left: Back + Logo */}
          <div className="writer-topbar-left">
            <button
              className="writer-back-btn"
              onClick={() => { window.location.hash = ctx.backHash; }}
              title={`Back to ${ctx.backLabel}`}
            >
              <ArrowLeftIcon />
              <span>{ctx.backLabel}</span>
            </button>
            <a href="#/write" onClick={(e) => { e.preventDefault(); window.location.hash = '/write'; }} className="writer-topbar-logo">
              <WordWeftLogo className="w-9 h-9" />
              <span className="writer-topbar-studio">Writer Studio</span>
            </a>
          </div>

          {/* Right: Tab Navigation */}
          <div className="writer-tabs">
            {writerTabs.map((tab) => (
              <button
                key={tab.id}
                className={`writer-tab ${ctx.activeTab === tab.id ? 'writer-tab-active' : ''}`}
                onClick={() => { window.location.hash = tab.hash.substring(1); }}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
};
