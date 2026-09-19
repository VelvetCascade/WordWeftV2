
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { Navbar } from './components/Navbar';
import { WriterLayout } from './components/WriterLayout';
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(module => ({ default: module.CategoryPage })));
const BookDetailsPage = lazy(() => import('./pages/BookDetailsPage').then(module => ({ default: module.BookDetailsPage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(module => ({ default: module.ReaderPage })));
const WriterDashboardPage = lazy(() => import('./pages/WriterDashboardPage').then(module => ({ default: module.WriterDashboardPage })));
const CreateBookPage = lazy(() => import('./pages/CreateBookPage').then(module => ({ default: module.CreateBookPage })));
const ManageChaptersPage = lazy(() => import('./pages/ManageChaptersPage').then(module => ({ default: module.ManageChaptersPage })));
const ChapterEditorPage = lazy(() => import('./pages/ChapterEditorPage').then(module => ({ default: module.ChapterEditorPage })));
const WriterAnalyticsPage = lazy(() => import('./pages/WriterAnalyticsPage').then(module => ({ default: module.WriterAnalyticsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const AuthorPage = lazy(() => import('./pages/AuthorPage').then(module => ({ default: module.AuthorPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then(module => ({ default: module.CommunityPage })));
const CommunityPostPage = lazy(() => import('./pages/CommunityPostPage').then(module => ({ default: module.CommunityPostPage })));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage').then(module => ({ default: module.EditProfilePage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const SafetyRulesPage = lazy(() => import('./pages/SafetyRulesPage').then(module => ({ default: module.SafetyRulesPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage').then(module => ({ default: module.FeedbackPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const GenrePage = lazy(() => import('./pages/GenrePage').then(module => ({ default: module.GenrePage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then(module => ({ default: module.SearchResultsPage })));
const HookFeedPage = lazy(() => import('./pages/HookFeedPage').then(module => ({ default: module.HookFeedPage })));
const ReadingGrowthPage = lazy(() => import('./pages/ReadingGrowthPage').then(module => ({ default: module.ReadingGrowthPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(module => ({ default: module.FeaturesPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const FeatureDevelopmentPage = lazy(() => import('./pages/FeatureDevelopmentPage').then(module => ({ default: module.FeatureDevelopmentPage })));
const FoundingWritersPage = lazy(() => import('./pages/FoundingWritersPage').then(module => ({ default: module.FoundingWritersPage })));
const FoundingWriterAdminPage = lazy(() => import('./pages/FoundingWriterAdminPage').then(module => ({ default: module.FoundingWriterAdminPage })));
import { FeedbackToast } from './components/FeedbackToast';
import { FeedbackModal } from './components/FeedbackModal';
import { FeedbackBanner } from './components/FeedbackBanner';
import { NotificationBell } from './components/NotificationBell';
import { NotificationToast } from './components/NotificationToast';
import { WhatsNewPopup } from './components/WhatsNewPopup';
import { WelcomeJourney } from './components/WelcomeJourney';
import { FeedbackContext } from './contexts/FeedbackContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { analytics } from './utils/analyticsService';
import { useFeedbackTriggers } from './hooks/useFeedbackTriggers';
import { useNotifications } from './hooks/useNotifications';
import type { Book, User, Author } from './types';
import * as api from './api/client';
import { replaceHash } from './utils/navigation';
import { updateRouteMetadata } from './utils/pageMetadata';
import { landingPages } from './seo/content.mjs';
import { parseRoute } from './seo/metadata.mjs';
const DiscoveryLandingPage = lazy(() => import('./pages/DiscoveryLandingPage').then(m => ({ default: m.DiscoveryLandingPage })));
const NotFoundPage = lazy(() => import('./pages/DiscoveryLandingPage').then(m => ({ default: m.NotFoundPage })));
const PublicCatalogPage = lazy(() => import('./pages/PublicCatalogPage').then(m => ({ default: m.PublicCatalogPage })));
import { communityReturnLink } from './utils/community';
import { markReaderAuthComplete, readReaderAuthIntent, type ReaderAuthView } from './utils/readerAuthIntent';

export type Page =
  | { name: 'home' }
  | { name: 'discovery-landing'; path: string }
  | { name: 'public-catalog'; path: string }
  | { name: 'not-found' }
  | { name: 'category'; genre: string | null }
  | { name: 'book-details'; bookId: string }
  | { name: 'reader'; bookId: string; chapterIndex: number; chapterId?: string }
  | { name: 'writer-dashboard' }
  | { name: 'writer-create-book' }
  | { name: 'writer-manage-book'; bookId: string }
  | { name: 'writer-edit-chapter'; bookId: string, chapterId: string | 'new' }
  | { name: 'writer-analytics' }
  | { name: 'writer-settings' }
  | { name: 'hook-feed' }
  | { name: 'reading-growth' }
  | { name: 'profile' }
  | { name: 'auth' }
  | { name: 'author'; authorId: string }
  | { name: 'community'; circleSlug?: string; query?: string }
  | { name: 'community-post'; postId: string }
  | { name: 'edit-profile' }
  | { name: 'terms' }
  | { name: 'privacy' }
  | { name: 'safety' }
  | { name: 'contact' }
  | { name: 'feedback' }
  | { name: 'notifications' }
  | { name: 'search'; query: string }
  | { name: 'features' }
  | { name: 'about' }
  | { name: 'founding-writers' }
  | { name: 'admin-founding-writers' }
  | { name: 'genre-page'; genre: string }
  | { name: 'reset-password'; token: string };

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading page">
    <div className="flex gap-1.5" aria-hidden="true">
      <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
      <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse [animation-delay:300ms]" />
    </div>
  </div>
);


const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Hash events may run before React commits a successful login. Keep the guard current.
  const sessionAuthenticated = useRef(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intendedPage, setIntendedPage] = useState<Page | null>(null);
  const [showForYouModal, setShowForYouModal] = useState(false);
  const [showWelcomeJourney, setShowWelcomeJourney] = useState(false);
  const [authInitialView, setAuthInitialView] = useState<ReaderAuthView>('login');
  const notif = useNotifications(isAuthenticated);
  const [isInitialAuthCheckDone, setIsInitialAuthCheckDone] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Preserve the complete intended destination through sign-in and onboarding.
  const navigateTo = (target: Page) => {
    switch (target.name) {
      case 'home': window.location.hash = '/home'; break;
      case 'category': window.location.hash = '/category'; break;
      case 'book-details': window.location.hash = `/book/${target.bookId}`; break;
      case 'reader': window.location.hash = target.chapterId ? `/book/${encodeURIComponent(target.bookId)}/chapter/${encodeURIComponent(target.chapterId)}` : `/read/book/${encodeURIComponent(target.bookId)}/chapter/${target.chapterIndex}`; break;
      case 'writer-dashboard': window.location.hash = '/write'; break;
      case 'writer-create-book': window.location.hash = '/write/book/create'; break;
      case 'writer-manage-book': window.location.hash = `/write/book/${encodeURIComponent(target.bookId)}/manage`; break;
      case 'writer-edit-chapter': window.location.hash = `/write/book/${encodeURIComponent(target.bookId)}/chapter/${encodeURIComponent(target.chapterId)}/edit`; break;
      case 'writer-analytics': window.location.hash = '/write/analytics'; break;
      case 'writer-settings': window.location.hash = '/write/settings'; break;
      case 'discovery-landing': case 'public-catalog': window.location.hash = target.path; break;
      case 'genre-page': window.location.hash = `/genre/${encodeURIComponent(target.genre)}`; break;
      case 'author': window.location.hash = `/author/${target.authorId}`; break;
      case 'community': window.location.hash = `/community${target.circleSlug ? `/circle/${encodeURIComponent(target.circleSlug)}` : ''}${target.query ? `?${target.query}` : ''}`; break;
      case 'community-post': window.location.hash = `/community/post/${encodeURIComponent(target.postId)}`; break;
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
      case 'features': window.location.hash = '/features'; break;
      case 'about': window.location.hash = '/about'; break;
      case 'founding-writers': window.location.hash = '/founding-writers'; break;
      case 'admin-founding-writers': window.location.hash = '/admin/founding-writers'; break;
      case 'hook-feed': window.location.hash = '/hooks'; break;
      case 'reading-growth': window.location.hash = '/events'; break;
      default: window.location.hash = '/'; break;
    }
  };

  const feedback = useFeedbackTriggers(isAuthenticated);

  // API calls can discover an expired/rejected token after the initial load.
  // Clear every in-memory auth signal together so the UI never looks signed in
  // while the backend is serving anonymous reader access.
  useEffect(() => {
    const handleInvalidSession = () => {
      sessionAuthenticated.current = false;
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    window.addEventListener(api.AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
    return () => window.removeEventListener(api.AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
  }, []);

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await api.getMe();
        if (user) {
          sessionAuthenticated.current = true;
          setIsAuthenticated(true);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Unable to verify the existing session:', error);
      } finally {
        setIsInitialAuthCheckDone(true);
      }
    };
    void checkSession();
  }, []);

  const handleLogin = (user: User) => {
    sessionAuthenticated.current = true;
    setIsAuthenticated(true);
    setCurrentUser(user);

    // Track login event
    analytics.trackEvent('auth', 'login_success', user.name, undefined, {
      userId: user.id,
      method: 'session',
    });

    const readerIntent = markReaderAuthComplete();
    if (readerIntent) {
      analytics.trackEvent('reader_gate', 'reader_gate_auth_completed', undefined, undefined, {
        bookId: readerIntent.bookId,
        chapterId: readerIntent.chapterId,
        chapterIndex: readerIntent.chapterIndex,
        accessState: 'FULL',
        authChoice: readerIntent.authView,
      });
      if (!localStorage.getItem('ww_welcomeJourneyCompleted')) {
        localStorage.setItem('ww_welcomeJourneyPending', 'true');
      }
      navigateTo({
        name: 'reader',
        bookId: readerIntent.bookId,
        chapterId: readerIntent.chapterId,
        chapterIndex: readerIntent.chapterIndex,
      });
      setIntendedPage(null);
      return;
    }

    // Check if user should see the Welcome Journey
    const hasCompletedJourney = localStorage.getItem('ww_welcomeJourneyCompleted');
    if (!hasCompletedJourney) {
      setShowWelcomeJourney(true);
      // Keep the intended route until onboarding completes or is skipped.
      window.location.hash = '/';
      return;
    }

    const targetPage = intendedPage || { name: 'home' };

    navigateTo(targetPage.name === 'auth' ? { name: 'home' } : targetPage);

    setIntendedPage(null);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // Analytics must never hold the account open if its endpoint is slow.
      analytics.trackEvent('auth', 'logout');
      await Promise.race([
        analytics.flush(),
        new Promise<void>(resolve => window.setTimeout(resolve, 1_200)),
      ]);
    } finally {
      await api.logout();
      sessionAuthenticated.current = false;
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsLoggingOut(false);
      window.location.hash = '/';
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (currentUser) {
      const updatedUser = await api.updateUserProfile(currentUser.id, updatedData);
      setCurrentUser(updatedUser);
      replaceHash('/profile');
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

    // Returns the effective route string from hash or pathname.
    // Hash navigation takes priority (existing behaviour).
    // Falls back to pathname so pre-rendered clean URLs (e.g. /features)
    // resolve to the correct page without breaking any existing links.
    const getEffectiveHash = (): string => {
      const h = window.location.hash;
      if (h.startsWith('#/')) return h.slice(2);
      // Clean URL support: /features -> 'features', / -> ''
      return (window.location.pathname + window.location.search).replace(/^\//, '');
    };

    const handleHashChange = () => {
      const hash = getEffectiveHash();
      const publicRoute = parseRoute('/' + hash);
      const cleanPath = window.location.pathname;
      let targetPage: Page;

      if (hash.startsWith('admin/founding-writers')) {
        targetPage = { name: 'admin-founding-writers' };
      } else if (hash.startsWith('founding-writers')) {
        targetPage = { name: 'founding-writers' };
      } else if (landingPages[cleanPath]) {
        targetPage = { name: 'discovery-landing', path: cleanPath };
      } else if (publicRoute.kind === 'chapter') {
        targetPage = { name: 'reader', bookId: publicRoute.id, chapterId: publicRoute.chapterId, chapterIndex: -1 };
      } else if (publicRoute.kind === 'catalog' && (publicRoute.filter || publicRoute.page > 1)) {
        targetPage = { name: 'public-catalog', path: '/' + hash };
      } else if (publicRoute.kind === 'missing' || publicRoute.page === 0) {
        targetPage = { name: 'not-found' };
      } else if (hash.startsWith('community/post/')) {
        const postId = hash.split('?')[0].split('/')[2];
        targetPage = postId ? { name: 'community-post', postId } : { name: 'community' };
      } else if (hash.startsWith('community')) {
        const route = hash.split('?')[0].split('/');
        let circleSlug = route[1] === 'circle' ? route[2] : undefined;
        try { if (circleSlug) circleSlug = decodeURIComponent(circleSlug); } catch { circleSlug = undefined; }
        targetPage = { name: 'community', circleSlug, query: hash.split('?')[1] || undefined };
      } else if (hash.startsWith('book/')) {
        const bookId = publicRoute.id;
        targetPage = bookId ? { name: 'book-details', bookId } : { name: 'home' };
      } else if (hash.startsWith('author/')) {
        const authorId = publicRoute.id;
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
      } else if (hash.startsWith('write/analytics')) {
        targetPage = { name: 'writer-analytics' };
      } else if (hash.startsWith('write/settings')) {
        targetPage = { name: 'writer-settings' };
      } else if (hash.startsWith('write')) {
        targetPage = { name: 'writer-dashboard' };
      } else if (hash.startsWith('category')) {
        targetPage = { name: 'category', genre: null };
      } else if (hash.startsWith('hooks')) {
        targetPage = { name: 'hook-feed' };
      } else if (hash.startsWith('events') || hash.startsWith('challenges')) {
        targetPage = { name: 'reading-growth' };
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
      } else if (hash.startsWith('genre/')) {
        const genreName = decodeURIComponent(hash.split('/').slice(1).join('/'));
        targetPage = genreName ? { name: 'genre-page', genre: genreName } : { name: 'home' };
      } else if (hash.startsWith('search')) {
        const searchParams = new URLSearchParams(hash.split('?')[1] || '');
        targetPage = { name: 'search', query: searchParams.get('q') || '' };
      } else if (hash.startsWith('reset-password')) {
        const searchParams = new URLSearchParams(hash.split('?')[1] || '');
        const token = searchParams.get('token') || '';
        targetPage = { name: 'reset-password', token };
      } else if (hash.startsWith('terms')) {
        targetPage = { name: 'terms' };
      } else if (hash.startsWith('features')) {
        targetPage = { name: 'features' };
      } else if (hash.startsWith('about')) {
        targetPage = { name: 'about' };
      } else if (hash.startsWith('home')) {
        targetPage = { name: 'home' };
      } else {
        // Root landing: unauthenticated visitors land on Features page by default, while HomePage remains 100% public
        targetPage = isAuthenticated ? { name: 'home' } : { name: 'features' };
      }

      const protectedRoutes: Page['name'][] = ['writer-dashboard', 'writer-create-book', 'writer-manage-book', 'writer-edit-chapter', 'writer-analytics', 'writer-settings', 'profile', 'edit-profile', 'notifications', 'admin-founding-writers'];

      if (protectedRoutes.includes(targetPage.name) && !sessionAuthenticated.current) {
        setIntendedPage(targetPage);
        window.location.hash = '/auth'; // This re-triggers the hashchange event
        return; // Stop processing to avoid rendering the protected page
      }

      if (targetPage.name === 'auth') {
        setAuthInitialView(readReaderAuthIntent()?.authView ?? 'login');
      }

      if (
        sessionAuthenticated.current
        && targetPage.name !== 'reader'
        && targetPage.name !== 'auth'
        && localStorage.getItem('ww_welcomeJourneyPending') === 'true'
      ) {
        localStorage.removeItem('ww_welcomeJourneyPending');
        setIntendedPage(targetPage);
        setShowWelcomeJourney(true);
      }

      window.scrollTo(0, 0);
      setPage(targetPage);
      updateRouteMetadata();
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('wordweft:navigate', handleHashChange);
    handleHashChange(); // Initial check for the current hash or pathname

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('wordweft:navigate', handleHashChange);
    };
  }, [isAuthenticated, isInitialAuthCheckDone]);


  const renderPage = () => {
    if (!isInitialAuthCheckDone) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background">
          <div className="flex flex-col items-center">
            <div className="font-sans text-3xl font-bold tracking-tight text-text-rich dark:text-dark-text-rich mb-6">
              Word<span className="text-accent">Weft</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent/60" style={{ animation: 'pulse 1.4s ease-in-out infinite' }}></div>
              <div className="w-2 h-2 rounded-full bg-accent/60" style={{ animation: 'pulse 1.4s ease-in-out 0.2s infinite' }}></div>
              <div className="w-2 h-2 rounded-full bg-accent/60" style={{ animation: 'pulse 1.4s ease-in-out 0.4s infinite' }}></div>
            </div>
          </div>
        </div>
      );
    }

    if (!currentUser && (page.name.startsWith('writer-') || page.name === 'profile' || page.name === 'edit-profile')) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background dark:bg-dark-background">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-3">Sign in to continue</h2>
            <p className="text-text-body dark:text-dark-text-body mb-8 leading-relaxed">
              This page requires authentication. Sign in to access your personalized WordWeft experience.
            </p>
            <button
              onClick={() => { window.location.hash = '/auth'; }}
              className="inline-flex items-center gap-2 bg-primary text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-accent transition-colors shadow-sm"
            >
              Sign In
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    switch (page.name) {
      case 'discovery-landing': return <DiscoveryLandingPage path={page.path} />;
      case 'public-catalog': return <PublicCatalogPage path={page.path} />;
      case 'not-found': return <NotFoundPage />;
      case 'home':
        return <HomePage />;
      case 'category':
        return <CategoryPage genre={page.genre} />;
      case 'book-details':
        return <BookDetailsPage bookId={page.bookId} currentUser={currentUser} onUserUpdate={setCurrentUser} />;
      case 'reader':
        return <ReaderPage bookId={page.bookId} chapterIndex={page.chapterIndex} chapterId={page.chapterId} currentUser={currentUser} onUserUpdate={setCurrentUser} />;
      case 'writer-dashboard':
        return <WriterDashboardPage currentUser={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'writer-create-book':
        return <CreateBookPage currentUser={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'writer-manage-book':
        return <ManageChaptersPage currentUser={currentUser!} bookId={page.bookId} onUserUpdate={setCurrentUser} />;
      case 'writer-edit-chapter':
        return <ChapterEditorPage currentUser={currentUser!} bookId={page.bookId} chapterId={page.chapterId} onUserUpdate={setCurrentUser} />;
      case 'writer-analytics':
        return <WriterAnalyticsPage />;
      case 'writer-settings':
        return <FeatureDevelopmentPage featureName="Writer Settings" description="Fine-grained controls for your stories and pen name are coming here. You'll be able to manage your publishing preferences and writer profile." />;
      case 'hook-feed':
        return <HookFeedPage currentUser={currentUser} onUserUpdate={setCurrentUser} onSignIn={() => { setIntendedPage(page); window.location.hash = '/auth'; }} />;
      case 'reading-growth':
        return <ReadingGrowthPage currentUser={currentUser} onSignIn={() => { setIntendedPage(page); window.location.hash = '/auth'; }} />;
      case 'profile':
        return <ProfilePage user={currentUser!} onUserUpdate={setCurrentUser} />;
      case 'edit-profile':
        return <EditProfilePage user={currentUser!} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} />;
      case 'auth':
        return <AuthPage onLogin={handleLogin} initialView={authInitialView} />;
      case 'terms':
        return <TermsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'safety':
        return <SafetyRulesPage />;
      case 'contact':
        return <ContactPage currentUser={currentUser} />;
      case 'feedback':
        return <FeedbackPage />;
      case 'author':
        return <AuthorPage authorId={page.authorId} currentUser={currentUser} onSignIn={() => { setIntendedPage(page); window.location.hash = '/auth'; }} />;
      case 'community':
        return <CommunityPage currentUser={currentUser} circleSlug={page.circleSlug} query={page.query} onSignIn={() => { setIntendedPage(page); window.location.hash = '/auth'; }} />;
      case 'community-post':
        return <CommunityPostPage postId={page.postId} currentUser={currentUser} onSignIn={() => { setIntendedPage(page); window.location.hash = '/auth'; }} />;
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
      case 'genre-page':
        return <GenrePage genre={page.genre} />;
      case 'search':
        return <SearchResultsPage searchQuery={page.query} />;
      case 'features':
        return <FeaturesPage />;
      case 'about':
        return <AboutPage />;
      case 'founding-writers':
        return <FoundingWritersPage />;
      case 'admin-founding-writers':
        return <FoundingWriterAdminPage isAdmin={currentUser?.roles?.includes('ROLE_ADMIN') === true} />;
      case 'reset-password':
        return <ResetPasswordPage token={page.token} />;
      default:
        return <HomePage />;
    }
  };

  const isWriterPage = page.name.startsWith('writer-');
  const showNavbar = page.name !== 'reader' && page.name !== 'auth' && page.name !== 'edit-profile' && page.name !== 'reset-password' && !isWriterPage;

  const feedbackCtx = {
    triggerFeedback: feedback.triggerFeedback,
    startReadingTimer: feedback.startReadingTimer,
    checkReadingDuration: feedback.checkReadingDuration,
  };

  return (
    <AnalyticsProvider>
    <FeedbackContext.Provider value={feedbackCtx}>
      <div className={`ww-app ww-route-${page.name} min-h-screen bg-background dark:bg-dark-background text-text-body dark:text-dark-text-body selection:bg-accent/20`}>
        {showNavbar && <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} isLoggingOut={isLoggingOut}
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
          onForYouClick={() => setShowForYouModal(true)}
          unreadCount={notif.unreadCount}
          currentUser={currentUser}
        />}

        {isWriterPage ? (
          <WriterLayout>
            <Suspense fallback={<PageLoadingFallback />}>{renderPage()}</Suspense>
          </WriterLayout>
        ) : (
          <main className={`ww-app-main ww-page-${page.name} ${showNavbar ? `ww-app-main-with-nav pb-24 xl:pb-0 ${page.name === 'home' || page.name === 'features' ? '' : 'xl:pt-20'}` : ""}`}>
            <Suspense fallback={<PageLoadingFallback />}>{renderPage()}</Suspense>
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
        {isAuthenticated && <WhatsNewPopup />}

        {/* Welcome Journey - Full-screen onboarding for new users */}
        {showWelcomeJourney && currentUser && (
          <WelcomeJourney
            userName={currentUser.name}
            onComplete={(role) => {
              setShowWelcomeJourney(false);
              localStorage.setItem('ww_userRole', role);
              const destination = intendedPage;
              const communityReturn = communityReturnLink(intendedPage);
              setIntendedPage(null);
              // Preserve a public acquisition destination through first-time onboarding.
              if (communityReturn) {
                window.location.hash = communityReturn;
              } else if (destination && !['home', 'auth'].includes(destination.name)) {
                navigateTo(destination);
              } else if (role === 'writer') {
                window.location.hash = '/write';
              } else {
                window.location.hash = '/';
              }
            }}
          />
        )}

        {/* Personalized / For You Modal */}
        {showForYouModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForYouModal(false)}>
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
              <div className="text-4xl mb-4"></div>
              <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-3">Personalized Discovery</h3>
              <p className="text-text-body dark:text-dark-text-body mb-6">
                Explore stories by genre, trending rankings, and curated collections to find your next great read.
              </p>
              <button
                onClick={() => setShowForYouModal(false)}
                className="bg-accent text-white font-sans font-semibold px-6 py-3 rounded-xl hover:bg-primary transition-colors"
              >
                Back to Explore
              </button>
            </div>
          </div>
        )}
      </div>
      <Analytics />
      <SpeedInsights />
    </FeedbackContext.Provider>
    </AnalyticsProvider>
  );
};

export default App;
