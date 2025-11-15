import React, { useState, useEffect, useCallback } from 'react';

import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { ReaderPage } from './pages/ReaderPage';
import { WriterDashboardPage } from './pages/WriterDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import type { Book, User } from './types';
import { sampleBooks, sampleUser } from './constants';

export type Page = 
  | { name: 'home' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; book: Book }
  | { name: 'reader'; book: Book; chapterIndex: number }
  | { name: 'writer-dashboard' }
  | { name: 'profile' }
  | { name: 'auth' };

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intendedPage, setIntendedPage] = useState<Page | null>(null);

  const navigateTo = useCallback((newPage: Page) => {
    const protectedRoutes: Page['name'][] = ['book-details', 'reader', 'writer-dashboard', 'profile'];

    if (protectedRoutes.includes(newPage.name) && !isAuthenticated) {
      setIntendedPage(newPage);
      window.location.hash = '/auth';
      setPage({ name: 'auth' });
      return;
    }
    
    window.scrollTo(0, 0);
    setPage(newPage);
  }, [isAuthenticated]);
  
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentUser(sampleUser);
    const targetPage = intendedPage || { name: 'home' };
    
    // Set hash based on target page
    if (targetPage.name === 'book-details') {
      window.location.hash = `/book/${targetPage.book.id}`;
    } else if(targetPage.name !== 'home' && targetPage.name !== 'auth') {
       window.location.hash = `/${targetPage.name}`;
    } else {
       window.location.hash = '/';
    }

    navigateTo(targetPage);
    setIntendedPage(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.hash = '/';
    navigateTo({ name: 'home' });
  };
  
  // On initial load, if there's a hash, try to navigate. This is a simple router.
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      let targetPage: Page;

      if (hash.startsWith('book/')) {
        const bookId = parseInt(hash.split('/')[1], 10);
        const book = sampleBooks.find(b => b.id === bookId);
        targetPage = book ? { name: 'book-details', book } : { name: 'home' };
      } else if (hash.startsWith('category')) {
        // This is a simplified genre parsing
        targetPage = { name: 'category', genre: null };
      } else if (hash.startsWith('write')) {
        targetPage = { name: 'writer-dashboard' };
      } else if (hash.startsWith('profile')) {
        targetPage = { name: 'profile' };
      } else if (hash.startsWith('auth')) {
        targetPage = { name: 'auth' };
      } else {
        targetPage = { name: 'home' };
      }
      navigateTo(targetPage);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigateTo]);


  const renderPage = () => {
    switch (page.name) {
      case 'home':
        return <HomePage navigateTo={navigateTo} />;
      case 'category':
        return <CategoryPage navigateTo={navigateTo} genre={page.genre} />;
      case 'book-details':
        return <BookDetailsPage navigateTo={navigateTo} book={page.book} />;
      case 'reader':
        return <ReaderPage navigateTo={navigateTo} book={page.book} chapterIndex={page.chapterIndex} />;
      case 'writer-dashboard':
        return <WriterDashboardPage navigateTo={navigateTo} />;
      case 'profile':
        if (!currentUser) {
          // This should not happen if navigateTo guard works, but as a fallback
          window.location.hash = '/auth';
          navigateTo({ name: 'auth' });
          return null;
        }
        return <ProfilePage navigateTo={navigateTo} user={currentUser} />;
      case 'auth':
        return <AuthPage navigateTo={navigateTo} onLogin={handleLogin} />;
      default:
        return <HomePage navigateTo={navigateTo} />;
    }
  };
  
  const showNavbar = page.name !== 'reader' && page.name !== 'auth';

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background text-text-body dark:text-dark-text-body selection:bg-accent/20">
      {showNavbar && <Navbar navigateTo={navigateTo} isAuthenticated={isAuthenticated} onLogout={handleLogout} />}
      <main className={showNavbar ? "pt-20" : ""}>
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
