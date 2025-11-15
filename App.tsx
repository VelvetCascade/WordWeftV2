import React, { useState, useEffect } from 'react';

import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { ReaderPage } from './pages/ReaderPage';
import { WriterDashboardPage } from './pages/WriterDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import type { Book, User } from './types';
import { sampleBooks, sampleUser } from './constants';

export type Page = 
  | { name: 'home' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; book: Book }
  | { name: 'reader'; book: Book; chapterIndex: number }
  | { name: 'writer-dashboard' }
  | { name: 'profile'; user: User };

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });

  const navigateTo = (newPage: Page) => {
    window.scrollTo(0, 0);
    setPage(newPage);
  };
  
  // On initial load, if there's a hash, try to navigate. This is a simple router.
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash.startsWith('book/')) {
        const bookId = parseInt(hash.split('/')[1], 10);
        const book = sampleBooks.find(b => b.id === bookId);
        if (book) {
          navigateTo({ name: 'book-details', book });
        }
      } else if (hash.startsWith('category')) {
        navigateTo({ name: 'category', genre: null });
      } else if (hash.startsWith('write')) {
        navigateTo({ name: 'writer-dashboard' });
      } else if (hash.startsWith('profile')) {
        navigateTo({ name: 'profile', user: sampleUser });
      } else {
        navigateTo({ name: 'home' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
        return <ProfilePage navigateTo={navigateTo} user={page.user} />;
      default:
        return <HomePage navigateTo={navigateTo} />;
    }
  };
  
  const showNavbar = page.name !== 'reader';

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background text-text-body dark:text-dark-text-body selection:bg-accent/20">
      {showNavbar && <Navbar navigateTo={navigateTo} />}
      <main className={showNavbar ? "pt-20" : ""}>
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
