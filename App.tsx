
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
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SafetyRulesPage } from './pages/SafetyRulesPage';
import { ContactPage } from './pages/ContactPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { FeedbackToast } from './components/FeedbackToast';
import { FeedbackModal } from './components/FeedbackModal';
import { FeedbackBanner } from './components/FeedbackBanner';
import { NotificationBell } from './components/NotificationBell';
import { NotificationToast } from './components/NotificationToast';
import { FeedbackContext } from './contexts/FeedbackContext';
import { useFeedbackTriggers } from './hooks/useFeedbackTriggers';
import { useNotifications } from './hooks/useNotifications';
import type { Book, User, Author } from './types';
import * as api from './api/client';

export type Page =
  | { name: 'home' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; bookId: string }
  | { name: 'reader'; bookId: string; chapterIndex: number }
  | { name: 'writer-dashboard' }
  | { name: 'writer-create-book' }
  | { name: 'writer-manage-book'; bookId: string }
  | { name: 'writer-edit-chapter'; bookId: string, chapterId: string | 'new' }
  | { name: 'profile' }
  | { name: 'auth' }
  | { name: 'author'; authorId: string }
  | { name: 'edit-profile' }
  | { name: 'terms' }
  | { name: 'privacy' }
  | { name: 'safety' }
  | { name: 'contact' }
  | { name: 'feedback' }
  | { name: 'notifications' }
  | { name: 'search'; query: string };


const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intendedPage, setIntendedPage] = useState<Page | null>(null);
  const notif = useNotifications(isAuthenticated);
  const [isInitialAuthCheckDone, setIsInitialAuthCheckDone] = useState(false);

  // Helper to navigate by converting Page to hash URL
  const navigateTo = (target: Page) => {
    switch (target.name) {
      case 'home': window.location.hash = '/'; break;
      case 'category': window.location.hash = '/category'; break;
      case 'book-details': window.location.hash = `/book/${target.bookId}`; break;
      case 'reader': window.location.hash = `/read/book/${target.bookId}/chapter/${target.chapterIndex}`; break;
      case 'writer-dashboard': window.location.hash = '/write'; break;
      case 'author': window.location.hash = `/author/${target.authorId}`; break;
      case 'profile': window.location.hash = '/profile'; break;
      case 'auth': window.location.hash = '/auth'; break;
      case 'edit-profile': window.location.hash = '/edit-profile'; break;
      case 'notifications': window.location.hash = '/notifications'; break;
      case 'search': window.location.hash = `/search?q=${encodeURIComponent(target.query)}`; break;
      case 'terms': window.location.hash = '/terms'; break;
      case 'privacy': window.location.hash = '/privacy'; break;
      case 'safety': window.location.hash = '/safety'; break;
      case 'contact': window.location.hash = '/contact'; break;
      case 'feedback': window.location.hash = '/feedback'; break;
      default: window.location.hash = '/'; break;
    }
  };

  const feedback = useFeedbackTriggers();

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      const user = await api.getMe();
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
      setIsInitialAuthCheckDone(true);
    };
    checkSession();
  }, []);

  const handleLogin = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    const targetPage = intendedPage || { name: 'home' };

    if (targetPage.name === 'book-details') {
      window.location.hash = `/book/${targetPage.bookId}`;
    } else if (targetPage.name === 'author') {
      window.location.hash = `/author/${targetPage.authorId}`;
    } else if (targetPage.name !== 'home' && targetPage.name !== 'auth') {
      window.location.hash = `/${targetPage.name}`;
    } else {
      window.location.hash = '/';
    }

    setIntendedPage(null);
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.hash = '/';
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (currentUser) {
      const updatedUser = await api.updateUserProfile(currentUser.id, updatedData);
      setCurrentUser(updatedUser);
      window.location.hash = '/profile';
    }
  };

  const handleChangePassword = async (oldPassword_unused: string, newPassword_unused: string) => {
    if (!currentUser) throw new Error("Not logged in");
    const updatedUser = await api.changePassword(currentUser.id, oldPassword_unused, newPassword_unused);
    setCurrentUser(updatedUser);
  };


  // Centralized routing logic
  useEffect(() => {
    if (!isInitialAuthCheckDone) return; // Wait until initial auth check is complete

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      let targetPage: Page;

      if (hash.startsWith('book/')) {
        const bookId = hash.split('/')[1];
        targetPage = bookId ? { name: 'book-details', bookId } : { name: 'home' };
      } else if (hash.startsWith('author/')) {
        const authorId = hash.split('/')[1];
        targetPage = authorId ? { name: 'author', authorId } : { name: 'home' };
      } else if (hash.startsWith('read/book/')) {
        const parts = hash.split('/');
        const bookId = parts[2];
        const chapterIndex = parseInt(parts[4], 10) || 0;
        targetPage = bookId ? { name: 'reader', bookId, chapterIndex: chapterIndex } : { name: 'home' };
      } else if (hash.startsWith('write/book/create')) {
        targetPage = { name: 'writer-create-book' };
      } else if (hash.startsWith('write/book/')) {
        const parts = hash.split('/');
        const bookId = parts[2];
        if (parts[3] === 'manage') {
          targetPage = { name: 'writer-manage-book', bookId };
        } else if (parts[3] === 'chapter' && parts[5] === 'edit') {
          const chapterId = parts[4];
          targetPage = { name: 'writer-edit-chapter', bookId, chapterId: chapterId === 'new' ? 'new' : chapterId };
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
      } else if (hash.startsWith('privacy')) {
        targetPage = { name: 'privacy' };
      } else if (hash.startsWith('safety')) {
        targetPage = { name: 'safety' };
      } else if (hash.startsWith('contact')) {
        targetPage = { name: 'contact' };
      } else if (hash.startsWith('feedback')) {
        targetPage = { name: 'feedback' };
      } else if (hash.startsWith('notifications')) {
        targetPage = { name: 'notifications' };
      } else if (hash.startsWith('search')) {
        const searchParams = new URLSearchParams(hash.split('?')[1] || '');
        targetPage = { name: 'search', query: searchParams.get('q') || '' };
      } else if (hash.startsWith('terms')) {
        targetPage = { name: 'terms' };
      } else {
        targetPage = { name: 'home' };
      }

      const protectedRoutes: Page['name'][] = ['writer-dashboard', 'writer-create-book', 'writer-manage-book', 'writer-edit-chapter', 'profile', 'edit-profile', 'notifications'];

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
  }, [isAuthenticated, isInitialAuthCheckDone]);


  const renderPage = () => {
    if (!isInitialAuthCheckDone) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!currentUser && (page.name.startsWith('writer-') || page.name === 'profile' || page.name === 'edit-profile')) {
      return null;
    }

    switch (page.name) {
      case 'home':
        return <HomePage />;
      case 'category':
        return <CategoryPage genre={page.genre} />;
      case 'book-details':
        return <BookDetailsPage bookId={page.bookId} currentUser={currentUser} onUserUpdate={setCurrentUser} />;
      case 'reader':
        return <ReaderPage bookId={page.bookId} chapterIndex={page.chapterIndex} currentUser={currentUser} />;
      case 'writer-dashboard':
        return <WriterDashboardPage currentUser={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'writer-create-book':
        return <CreateBookPage currentUser={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'writer-manage-book':
        return <ManageChaptersPage currentUser={currentUser!} bookId={page.bookId} onUserUpdate={setCurrentUser} />;
      case 'writer-edit-chapter':
        return <ChapterEditorPage currentUser={currentUser!} bookId={page.bookId} chapterId={page.chapterId} onUserUpdate={setCurrentUser} />;
      case 'profile':
        return <ProfilePage user={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'edit-profile':
        return <EditProfilePage user={currentUser!} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} />;
      case 'auth':
        return <AuthPage onLogin={handleLogin} />;
      case 'terms':
        return <TermsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'safety':
        return <SafetyRulesPage />;
      case 'contact':
        return <ContactPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'author':
        return <AuthorPage authorId={page.authorId} />;
      case 'notifications':
        return <NotificationsPage
          currentUser={currentUser}
          navigateTo={navigateTo}
          onLogout={handleLogout}
          notifications={notif.notifications}
          onMarkRead={notif.markAsRead}
          onMarkAllRead={notif.markAllAsRead}
          unreadCount={notif.unreadCount}
          hasMore={notif.hasMore}
          onLoadMore={notif.loadMore}
          isLoading={notif.isLoading}
        />;
      case 'search':
        return <SearchResultsPage />;
      default:
        return <HomePage />;
    }
  };

  const isWriterPage = page.name.startsWith('writer-');
  const showNavbar = page.name !== 'reader' && page.name !== 'auth' && page.name !== 'edit-profile' && !isWriterPage;

  const feedbackCtx = {
    triggerFeedback: feedback.triggerFeedback,
    startReadingTimer: feedback.startReadingTimer,
    checkReadingDuration: feedback.checkReadingDuration,
  };

  return (
    <FeedbackContext.Provider value={feedbackCtx}>
      <div className="min-h-screen bg-background dark:bg-dark-background text-text-body dark:text-dark-text-body selection:bg-accent/20">
        {showNavbar && <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout}
          notificationBell={
            isAuthenticated ? (
              <NotificationBell
                unreadCount={notif.unreadCount}
                notifications={notif.notifications}
                onMarkRead={notif.markAsRead}
                onMarkAllRead={notif.markAllAsRead}
                onNavigate={navigateTo}
                hasMore={notif.hasMore}
                onLoadMore={notif.loadMore}
                isLoading={notif.isLoading}
              />
            ) : undefined
          }
        />}

        {isWriterPage ? (
          <WriterLayout>
            {renderPage()}
          </WriterLayout>
        ) : (
          <main className={showNavbar ? "pt-20" : ""}>
            {renderPage()}
          </main>
        )}

        {/* Contextual Feedback System */}
        <FeedbackToast
          config={feedback.toastConfig}
          onRespond={feedback.handleToastRespond}
          onDismiss={feedback.handleToastDismiss}
        />
        <FeedbackModal
          config={feedback.modalConfig}
          onSubmit={feedback.handleModalSubmit}
          onDismiss={feedback.handleModalDismiss}
          onOpenFullForm={feedback.openFullFeedback}
        />
        <FeedbackBanner
          visible={feedback.showBanner}
          onDismiss={feedback.handleBannerDismiss}
        />
        <NotificationToast
          notification={notif.toastNotification}
          onDismiss={notif.dismissToast}
          onNavigate={navigateTo}
        />
      </div>
    </FeedbackContext.Provider>
  );
};

export default App;
