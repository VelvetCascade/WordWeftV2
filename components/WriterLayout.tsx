
import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ChartPieIcon, Cog6ToothIcon, ArrowUturnLeftIcon, Bars3Icon, XMarkIcon } from './icons/Icons';

interface WriterLayoutProps {
  children: React.ReactNode;
}

const SidebarLink: React.FC<{ href: string; icon: React.ElementType; label: string; isActive?: boolean; onClick?: () => void }> = ({ href, icon: Icon, label, isActive, onClick }) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = href.substring(1);
        if (onClick) {
            onClick();
        }
    };
    
    return (
        <a 
            href={href}
            onClick={handleClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-sans">{label}</span>
        </a>
    );
};


export const WriterLayout: React.FC<WriterLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
      setIsSidebarOpen(false);
    }
    window.addEventListener('hashchange', handleHashChange);
    // Initial call to set hash
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '#/write') {
      return currentHash.startsWith('#/write');
    }
    return currentHash.includes(path.substring(1));
  }
  
  const sidebarContent = (
    <>
       <div className="flex-1">
            <div className="flex items-center justify-between mb-8 px-3">
                 <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="font-sans font-bold text-2xl text-primary dark:text-gray-100 tracking-tighter">
                    WordWeft
                </a>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-gray-500 dark:text-gray-400">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="space-y-2">
                <SidebarLink href="#/write" icon={BookOpenIcon} label="My Books" isActive={isActive('#/write')} onClick={() => setIsSidebarOpen(false)} />
                <SidebarLink href="#/analytics" icon={ChartPieIcon} label="Analytics" isActive={isActive('analytics')} onClick={() => setIsSidebarOpen(false)}/>
                <SidebarLink href="#/settings" icon={Cog6ToothIcon} label="Settings" isActive={isActive('settings')} onClick={() => setIsSidebarOpen(false)}/>
            </nav>
        </div>
        <div className="mt-auto">
             <SidebarLink href="#/" icon={ArrowUturnLeftIcon} label="Back to WordWeft" onClick={() => setIsSidebarOpen(false)}/>
        </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-dark-background">
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-dark-surface border-r dark:border-dark-border p-4 flex-col z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-dark-surface border-b dark:border-dark-border flex-shrink-0 h-16 flex items-center px-4 justify-between sticky top-0 z-30">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2">
                <Bars3Icon className="w-6 h-6" />
            </button>
            <a href="#/write" onClick={(e) => { e.preventDefault(); window.location.hash = '/write'; }} className="font-sans font-bold text-xl text-primary dark:text-gray-100 tracking-tighter">
                WordWeft
            </a>
            {/* Placeholder for alignment */}
            <div className="w-6 h-6"></div>
        </header>
        
        <main className="flex-1">
            {children}
        </main>
      </div>
    </div>
  );
};
