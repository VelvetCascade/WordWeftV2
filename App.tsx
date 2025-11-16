
import React, { useState, useEffect, useCallback } from 'react';

import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { ReaderPage } from './pages/ReaderPage';
import { WriterDashboardPage } from './pages/WriterDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { AuthorPage } from './pages/AuthorPage';
import type { Book, User, Author, Shelf } from './types';
import { sampleBooks, mainAuthor, otherAuthors, sampleUsers } from './constants';

export type Page = 
  | { name: 'home' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; book: Book }
  | { name: 'reader'; book: Book; chapterIndex: number }
  | { name: 'writer-dashboard' }
  | { name: 'profile' }
  | { name: 'auth' }
  | { name: 'author'; author: Author };

const PROGRESS_STORAGE_KEY = 'wordweft_reading_progress_v2';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intendedPage, setIntendedPage] = useState<Page | null>(null);

  const navigateTo = useCallback((newPage: Page) => {
    const protectedRoutes: Page['name'][] = ['book-details', 'reader', 'writer-dashboard', 'profile', 'author'];

    if (protectedRoutes.includes(newPage.name) && !isAuthenticated) {
      setIntendedPage(newPage);
      window.location.hash = '/auth';
      setPage({ name: 'auth' });
      return;
    }
    
    window.scrollTo(0, 0);
    setPage(newPage);
  }, [isAuthenticated]);
  
  const handleLogin = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(JSON.parse(JSON.stringify(user))); // Deep copy to make mutable
    const targetPage = intendedPage || { name: 'home' };
    
    // Set hash based on target page
    if (targetPage.name === 'book-details') {
      window.location.hash = `/book/${targetPage.book.id}`;
    } else if (targetPage.name === 'author') {
      window.location.hash = `/author/${targetPage.author.id}`;
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
  
  const updateUserLibrary = (newLibrary: Shelf[]) => {
    if (currentUser) {
      setCurrentUser(prevUser => prevUser ? { ...prevUser, library: newLibrary } : null);
    }
  };
  
  // Initialize mock progress data for sample users if it doesn't exist
  useEffect(() => {
    const initProgress = () => {
        const progressExists = localStorage.getItem('wordweft_progress_initialized_v2');
        if (progressExists) return;

        const allProgress = {
            // Alice (ID: 101)
            '101': {
                '1': { overallProgress: 35, lastReadChapterIndex: 1, lastReadScrollPosition: 1200, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 40, scrollPosition: 1200 } } },
                '2': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
                '7': { overallProgress: 0, lastReadChapterIndex: 0, lastReadScrollPosition: 0, chapters: {} },
            },
            // Rahul (ID: 102)
            '102': {
                '3': { overallProgress: 80, lastReadChapterIndex: 2, lastReadScrollPosition: 2000, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 70, scrollPosition: 2000 } } },
                '7': { overallProgress: 10, lastReadChapterIndex: 1, lastReadScrollPosition: 500, chapters: { '101': { progress: 100, scrollPosition: 9999 }, '102': { progress: 5, scrollPosition: 500 } } },
            },
            // Mei (ID: 103)
            '103': {
                '1': { overallProgress: 100, lastReadChapterIndex: 3, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 100, scrollPosition: 9999 }, '4': { progress: 100, scrollPosition: 9999 } } },
                '2': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
                '3': { overallProgress: 100, lastReadChapterIndex: 2, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 100, scrollPosition: 9999 } } },
                '4': { overallProgress: 100, lastReadChapterIndex: 0, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 } } },
                '6': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
                '7': { overallProgress: 5, lastReadChapterIndex: 0, lastReadScrollPosition: 800, chapters: { '101': { progress: 10, scrollPosition: 800 } } }
            }
        };
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
        localStorage.setItem('wordweft_progress_initialized_v2', 'true');
    };
    initProgress();
  }, []);

  // On initial load, if there's a hash, try to navigate. This is a simple router.
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      let targetPage: Page;

      if (hash.startsWith('book/')) {
        const bookId = parseInt(hash.split('/')[1], 10);
        const book = sampleBooks.find(b => b.id === bookId);
        targetPage = book ? { name: 'book-details', book } : { name: 'home' };
      } else if (hash.startsWith('author/')) {
        const authorId = parseInt(hash.split('/')[1], 10);
        const allAuthors = [mainAuthor, ...otherAuthors];
        const author = allAuthors.find(a => a.id === authorId);
        targetPage = author ? { name: 'author', author } : { name: 'home' };
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
        return <BookDetailsPage navigateTo={navigateTo} book={page.book} currentUser={currentUser} updateUserLibrary={updateUserLibrary} />;
      case 'reader':
        return <ReaderPage navigateTo={navigateTo} book={page.book} chapterIndex={page.chapterIndex} currentUser={currentUser} />;
      case 'writer-dashboard':
        return <WriterDashboardPage navigateTo={navigateTo} />;
      case 'profile':
        if (!currentUser) {
          // This should not happen if navigateTo guard works, but as a fallback
          window.location.hash = '/auth';
          navigateTo({ name: 'auth' });
          return null;
        }
        return <ProfilePage navigateTo={navigateTo} user={currentUser} updateUserLibrary={updateUserLibrary} />;
      case 'auth':
        return <AuthPage navigateTo={navigateTo} onLogin={handleLogin} />;
      case 'author':
        return <AuthorPage navigateTo={navigateTo} author={page.author} />;
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
