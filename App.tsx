
import React, { useState, useEffect } from 'react';

import { Navbar } from './components/Navbar';
import { WriterLayout } from './components/WriterLayout';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { ReaderPage } from './pages/ReaderPage';
import { WriterDashboardPage } from './pages/WriterDashboardPage';
import { CreateBookPage } from './pages/CreateBookPage';
import { ManageChaptersPage } from './pages/ManageChaptersPage';
import { ChapterEditorPage } from './pages/ChapterEditorPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { AuthorPage } from './pages/AuthorPage';
import { EditProfilePage } from './pages/EditProfilePage';
import type { Book, User, Author, Shelf } from './types';
import { sampleBooks, mainAuthor, otherAuthors, sampleUsers } from './constants';

export type Page = 
  | { name: 'home' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; book: Book }
  | { name: 'reader'; book: Book; chapterIndex: number }
  | { name: 'writer-dashboard' }
  | { name: 'writer-create-book' }
  | { name: 'writer-manage-book'; bookId: number }
  | { name: 'writer-edit-chapter'; bookId: number, chapterId: number | 'new' }
  | { name: 'profile' }
  | { name: 'auth' }
  | { name: 'author'; author: Author }
  | { name: 'edit-profile' };

const PROGRESS_STORAGE_KEY = 'wordweft_reading_progress_v2';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intendedPage, setIntendedPage] = useState<Page | null>(null);
  
  const handleLogin = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(JSON.parse(JSON.stringify(user))); // Deep copy to make mutable
    const targetPage = intendedPage || { name: 'home' };
    
    // Set hash based on target page, the hashchange listener will handle navigation
    if (targetPage.name === 'book-details') {
      window.location.hash = `/book/${targetPage.book.id}`;
    } else if (targetPage.name === 'author') {
      window.location.hash = `/author/${targetPage.author.id}`;
    } else if(targetPage.name !== 'home' && targetPage.name !== 'auth') {
       window.location.hash = `/${targetPage.name}`;
    } else {
       window.location.hash = '/';
    }

    setIntendedPage(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.hash = '/';
  };
  
  const updateUser = (updater: (user: User) => User) => {
      setCurrentUser(currentUser => {
          if (!currentUser) return null;
          return updater(JSON.parse(JSON.stringify(currentUser)));
      });
  };

  const handleUpdateProfile = (updatedData: Partial<User>) => {
    if (currentUser) {
      updateUser(user => ({...user, ...updatedData}));
      window.location.hash = '/profile';
    }
  };
  
  // Initialize mock progress data for sample users if it doesn't exist
  useEffect(() => {
    const initProgress = () => {
        const progressExists = localStorage.getItem('wordweft_progress_initialized_v2');
        if (progressExists) return;

        const allProgress = {
            '101': {
                '1': { overallProgress: 35, lastReadChapterIndex: 1, lastReadScrollPosition: 1200, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 40, scrollPosition: 1200 } } },
                '2': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
                '7': { overallProgress: 0, lastReadChapterIndex: 0, lastReadScrollPosition: 0, chapters: {} },
            },
            '102': {
                '3': { overallProgress: 80, lastReadChapterIndex: 2, lastReadScrollPosition: 2000, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 70, scrollPosition: 2000 } } },
                '7': { overallProgress: 10, lastReadChapterIndex: 1, lastReadScrollPosition: 500, chapters: { '101': { progress: 100, scrollPosition: 9999 }, '102': { progress: 5, scrollPosition: 500 } } },
            },
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

  // Centralized routing logic
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      let targetPage: Page;

      if (hash.startsWith('book/')) {
        const bookId = parseInt(hash.split('/')[1], 10);
        const allBooks = [...sampleBooks, ...sampleUsers.flatMap(u => u.writtenBooks || [])];
        const book = allBooks.find(b => b.id === bookId);
        targetPage = book ? { name: 'book-details', book } : { name: 'home' };
      } else if (hash.startsWith('author/')) {
        const authorId = parseInt(hash.split('/')[1], 10);
        const allAuthors = [mainAuthor, ...otherAuthors];
        const author = allAuthors.find(a => a.id === authorId);
        targetPage = author ? { name: 'author', author } : { name: 'home' };
      } else if (hash.startsWith('read/book/')) {
        const parts = hash.split('/');
        const bookId = parseInt(parts[2], 10);
        const chapterIndex = parseInt(parts[4], 10) || 0;
        const book = sampleBooks.find(b => b.id === bookId);
        targetPage = book ? { name: 'reader', book, chapterIndex: chapterIndex } : { name: 'home' };
      } else if (hash.startsWith('write/book/create')) {
        targetPage = { name: 'writer-create-book' };
      } else if (hash.startsWith('write/book/')) {
        const parts = hash.split('/');
        const bookId = parseInt(parts[2], 10);
        if (parts[3] === 'manage') {
          targetPage = { name: 'writer-manage-book', bookId };
        } else if (parts[3] === 'chapter' && parts[5] === 'edit') {
          const chapterId = parts[4] === 'new' ? 'new' : parseInt(parts[4], 10);
          targetPage = { name: 'writer-edit-chapter', bookId, chapterId };
        } else {
          targetPage = { name: 'writer-dashboard' };
        }
      } else if (hash.startsWith('write')) {
        targetPage = { name: 'writer-dashboard' };
      } else if (hash.startsWith('category')) {
        targetPage = { name: 'category', genre: null };
      } else if (hash.startsWith('profile')) {
        targetPage = { name: 'profile' };
      } else if (hash.startsWith('edit-profile')) {
        targetPage = { name: 'edit-profile' };
      } else if (hash.startsWith('auth')) {
        targetPage = { name: 'auth' };
      } else {
        targetPage = { name: 'home' };
      }
      
      const protectedRoutes: Page['name'][] = ['writer-dashboard', 'writer-create-book', 'writer-manage-book', 'writer-edit-chapter', 'profile', 'edit-profile'];

      if (protectedRoutes.includes(targetPage.name) && !isAuthenticated) {
        setIntendedPage(targetPage);
        window.location.hash = '/auth'; // This re-triggers the hashchange event
        return; // Stop processing to avoid rendering the protected page
      }
      
      window.scrollTo(0, 0);
      setPage(targetPage);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check for the current hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);


  const renderPage = () => {
    if (!currentUser && (page.name.startsWith('writer-') || page.name === 'profile' || page.name === 'edit-profile')) {
      return null;
    }

    switch (page.name) {
      case 'home':
        return <HomePage />;
      case 'category':
        return <CategoryPage genre={page.genre} />;
      case 'book-details':
        return <BookDetailsPage book={page.book} currentUser={currentUser} updateUserLibrary={(library) => updateUser(user => ({...user, library}))} />;
      case 'reader':
        return <ReaderPage book={page.book} chapterIndex={page.chapterIndex} currentUser={currentUser} />;
      case 'writer-dashboard':
        return <WriterDashboardPage currentUser={currentUser!} onUpdateUser={updateUser}/>;
      case 'writer-create-book':
        return <CreateBookPage currentUser={currentUser!} onUpdateUser={updateUser} />;
      case 'writer-manage-book':
        return <ManageChaptersPage currentUser={currentUser!} bookId={page.bookId} onUpdateUser={updateUser} />;
      case 'writer-edit-chapter':
        return <ChapterEditorPage currentUser={currentUser!} bookId={page.bookId} chapterId={page.chapterId} onUpdateUser={updateUser} />;
      case 'profile':
        return <ProfilePage user={currentUser!} updateUserLibrary={(library) => updateUser(user => ({...user, library}))} />;
      case 'edit-profile':
        return <EditProfilePage user={currentUser!} onUpdateProfile={handleUpdateProfile} />;
      case 'auth':
        return <AuthPage onLogin={handleLogin} />;
      case 'author':
        return <AuthorPage author={page.author} />;
      default:
        return <HomePage />;
    }
  };
  
  const isWriterPage = page.name.startsWith('writer-');
  const showNavbar = page.name !== 'reader' && page.name !== 'auth' && page.name !== 'edit-profile' && !isWriterPage;

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background text-text-body dark:text-dark-text-body selection:bg-accent/20">
      {showNavbar && <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />}
      
      {isWriterPage ? (
        <WriterLayout>
          {renderPage()}
        </WriterLayout>
      ) : (
        <main className={showNavbar ? "pt-20" : ""}>
          {renderPage()}
        </main>
      )}
    </div>
  );
};

export default App;
