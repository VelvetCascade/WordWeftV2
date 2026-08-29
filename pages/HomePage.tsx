
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Book, Author, SearchBookResult, SearchAuthorResult } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { SortDropdown } from '../components/SortDropdown';
import { SearchIcon, XMarkIcon } from '../components/icons/Icons';
import { StarIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';


const HeroCarousel: React.FC<{ books: Book[] }> = ({ books }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (books.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % books.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [books.length]);

  const getCardStyle = (index: number) => {
    if (books.length === 0) return {};
    const offset = (index - currentIndex + books.length) % books.length;

    if (offset === 0) { // Active
      return { transform: 'translateX(0) scale(1)', opacity: 1, zIndex: 3 };
    }
    if (offset === 1) { // Next
      return { transform: 'translateX(50%) scale(0.8)', opacity: 0.7, zIndex: 2 };
    }
    if (offset === books.length - 1) { // Previous
      return { transform: 'translateX(-50%) scale(0.8)', opacity: 0.7, zIndex: 2 };
    }
    // Hidden
    return { transform: `translateX(${offset > books.length / 2 ? '-100%' : '100%'}) scale(0.6)`, opacity: 0, zIndex: 1 };
  };

  if (books.length === 0) {
    return <div className="relative w-full h-64 md:h-96 flex items-center justify-center"><div className="w-64 h-96 bg-gray-200 dark:bg-dark-surface-alt rounded-xl animate-pulse"></div></div>;
  }

  return (
    <div className="relative w-full h-64 md:h-96 flex items-center justify-center perspective-1000">
      {books.map((book, index) => (
        <div
          key={book.id}
          className="absolute w-40 md:w-64 transition-transform duration-700 ease-in-out"
          style={getCardStyle(index)}
          onClick={() => window.location.hash = `/book/${book.id}`}
        >
          <img src={book.coverUrl} alt={book.title} className="w-full h-auto object-cover rounded-xl shadow-lifted cursor-pointer" />
        </div>
      ))}
    </div>
  );
};


// ─── Hero Search with Inline Autocomplete ─────────────────────

interface HeroSearchProps {
  onScrolledPast: (past: boolean) => void;
}

const HeroSearch: React.FC<HeroSearchProps> = ({ onScrolledPast }) => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<SearchBookResult[]>([]);
  const [authors, setAuthors] = useState<SearchAuthorResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalResults = books.length + authors.length;

  // Intersection Observer for scroll-morph effect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScrolledPast(!entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '-60px 0px 0px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onScrolledPast]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setBooks([]);
      setAuthors([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.searchAutocomplete(q);
      setBooks(result.books || []);
      setAuthors(result.authors || []);
    } catch (e) {
      console.error('Autocomplete error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(val), 300);
  };

  const navigateToBook = (bookId: string) => {
    setIsFocused(false);
    window.location.hash = `/book/${bookId}`;
  };

  const navigateToAuthor = (authorId: string) => {
    setIsFocused(false);
    window.location.hash = `/author/${authorId}`;
  };

  const navigateToFullSearch = () => {
    if (query.trim().length >= 2) {
      setIsFocused(false);
      window.location.hash = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (selectedIndex < books.length) {
          navigateToBook(books[selectedIndex].id);
        } else {
          navigateToAuthor(authors[selectedIndex - books.length].id);
        }
      } else {
        navigateToFullSearch();
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isFocused && (totalResults > 0 || (query.trim().length >= 2 && !isLoading));

  return (
    <section className="hero-search-section" ref={containerRef}>
      <div className="container mx-auto px-6">
        <div className="hero-search-wrapper">
          {/* Glow ring */}
          <div className={`hero-search-glow ${isFocused ? 'hero-search-glow-active' : ''}`} />

          {/* Input */}
          <div className="hero-search-input-row">
            <svg className="hero-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search for books, users, or genres..."
              className="hero-search-input"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className="hero-search-clear" onClick={() => { setQuery(''); setBooks([]); setAuthors([]); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            )}
            {query.trim().length >= 2 && (
              <button className="hero-search-submit" onClick={navigateToFullSearch}>
                Search
              </button>
            )}
          </div>

          {/* Inline Autocomplete Dropdown */}
          {showDropdown && (
            <div className="hero-search-dropdown">
              {isLoading && (
                <div className="hero-search-loading">
                  <div className="search-overlay-spinner" />
                  <span>Searching...</span>
                </div>
              )}

              {/* Books */}
              {books.length > 0 && (
                <div className="hero-search-group">
                  <div className="hero-search-group-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                    Books
                  </div>
                  {books.map((book, i) => (
                    <button
                      key={book.id}
                      className={`hero-search-item ${selectedIndex === i ? 'hero-search-item-active' : ''}`}
                      onClick={() => navigateToBook(book.id)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <img
                        src={book.coverUrl || 'https://via.placeholder.com/40x56'}
                        alt={book.title}
                        className="hero-search-item-cover"
                      />
                      <div className="hero-search-item-info">
                        <div className="hero-search-item-title">{book.title}</div>
                        <div className="hero-search-item-meta">
                          {book.author?.name && <span>by {book.author.name}</span>}
                          {book.rating > 0 && (
                            <span className="hero-search-item-rating">
                              <StarIcon className="w-3 h-3" />
                              {book.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {book.genres && book.genres.length > 0 && (
                          <div className="hero-search-item-genres">
                            {book.genres.slice(0, 3).map(g => (
                              <span key={g} className="search-overlay-genre-pill">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg className="hero-search-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Authors */}
              {authors.length > 0 && (
                <div className="hero-search-group">
                  <div className="hero-search-group-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Authors
                  </div>
                  {authors.map((author, i) => {
                    const idx = books.length + i;
                    return (
                      <button
                        key={author.id}
                        className={`hero-search-item ${selectedIndex === idx ? 'hero-search-item-active' : ''}`}
                        onClick={() => navigateToAuthor(author.id)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <img
                          src={author.avatarUrl || 'https://via.placeholder.com/40'}
                          alt={author.name}
                          className="hero-search-item-avatar"
                        />
                        <div className="hero-search-item-info">
                          <div className="hero-search-item-title">{author.name}</div>
                          <div className="hero-search-item-meta">
                            {author.bio && <span>{author.bio.length > 50 ? author.bio.slice(0, 50) + '…' : author.bio}</span>}
                          </div>
                          <div className="hero-search-item-meta">{author.followersCount} followers</div>
                        </div>
                        <svg className="hero-search-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {!isLoading && query.trim().length >= 2 && totalResults === 0 && (
                <div className="hero-search-empty">
                  <p>No results for "{query}"</p>
                  <p className="hero-search-empty-hint">Try different keywords or check your spelling</p>
                </div>
              )}

              {/* Footer */}
              {totalResults > 0 && (
                <button className="hero-search-footer" onClick={navigateToFullSearch}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  <span>See all results for <strong>"{query}"</strong></span>
                  <kbd>↵</kbd>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


export const HomePage: React.FC = () => {
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [rankedGenres, setRankedGenres] = useState<{ name: string; bookCount: number; readCount: number }[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [spotlightAuthor, setSpotlightAuthor] = useState<Author | null>(null);
  const [heroSearchPast, setHeroSearchPast] = useState(false);
  const [sortMode, setSortMode] = useState<'most_read' | 'most_viewed' | 'recent_update' | 'new'>('most_read');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPersonalizedModal, setShowPersonalizedModal] = useState(false);
  const [genreBooks, setGenreBooks] = useState<Record<string, Book[]>>({});
  const { trackEvent } = useAnalytics();

  const SORT_OPTIONS = [
    { value: 'most_read', label: 'Most Read (7 days)' },
    { value: 'most_viewed', label: 'Most Viewed (7 days)' },
    { value: 'recent_update', label: 'Recently Updated' },
    { value: 'new', label: 'Newly Added' },
  ];

  const fetchBooks = (sort: string, pageNum: number, append: boolean) => {
    setIsLoading(true);
    api.getBooks({ sort: sort as any, page: pageNum, size: 12 }).then(res => {
      setBooks(prev => append ? [...prev, ...res.content] : res.content);
      setHasMore(res.hasMore);
      setIsLoading(false);
      if (!append && res.content.length > 0) {
        setSpotlightAuthor(res.content[0].author);
      }
    });
  };

  useEffect(() => {
    setPage(0);
    fetchBooks(sortMode, 0, false);
  }, [sortMode]);

  useEffect(() => {
    api.getGenresRanked().then(setRankedGenres);
    api.getHomeGenres().then(setGenreBooks);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBooks(sortMode, nextPage, true);
  };


  // Dispatch custom event so Navbar can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('heroSearchVisibility', { detail: { visible: !heroSearchPast } }));
  }, [heroSearchPast]);

  return (
    <div className="ww-home-page overflow-x-hidden">
      {/* Hero Section */}
      <section className="ww-home-hero relative min-h-[65vh] md:h-screen md:min-h-[600px] flex items-center text-white overflow-hidden py-28 md:py-0">
        <div className="absolute inset-0 bg-animated-gradient animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-primary/30"></div>
        <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 lg:gap-8 items-center h-full">
          <div className="ww-home-hero-copy text-center lg:text-left z-20 flex flex-col items-center lg:items-start">
            <span className="ww-home-eyebrow">Your next chapter starts here</span>
            <h1 className="font-sans text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tighter mb-4 drop-shadow-md">
              Find a story.<br />Leave with a world.
            </h1>
            <p className="text-lg md:text-xl max-w-lg text-gray-100 mb-8 drop-shadow">
              Discover immersive fiction, follow the voices you love, or shape a story of your own.
            </p>
            <div className="ww-home-actions flex justify-center lg:justify-start space-x-4">
              <button onClick={() => { trackEvent('navigation', 'hero_cta_click', 'Start Reading'); window.location.hash = '/category'; }} className="ww-home-primary">Explore the library</button>
              <button onClick={() => { trackEvent('navigation', 'hero_cta_click', 'Start Writing'); window.location.hash = '/write'; }} className="ww-home-secondary">Open writer studio</button>
            </div>
          </div>
          <div className="hidden md:flex lg:block justify-center items-center w-full z-10 mt-8 lg:mt-0 opacity-90 pb-16 lg:pb-0">
            <HeroCarousel books={books.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* Hero Search — live autocomplete, morphs into navbar on scroll */}
      <HeroSearch onScrolledPast={setHeroSearchPast} />

      {books[0] && (
        <section className="ww-home-feature container mx-auto px-6">
          <div className="ww-home-feature-cover">
            <img src={books[0].coverUrl} alt={`Cover of ${books[0].title}`} />
            <span>Editor&rsquo;s shelf</span>
          </div>
          <div className="ww-home-feature-copy">
            <span className="ww-page-eyebrow">A story worth meeting</span>
            <h2>{books[0].title}</h2>
            <p className="ww-home-feature-author">by <button onClick={() => window.location.hash = `/author/${books[0].author.id}`}>{books[0].author.name}</button></p>
            <p className="ww-home-feature-summary">{books[0].summary || books[0].description}</p>
            <div className="ww-home-feature-meta">
              <span><StarIcon className="w-4 h-4" /> {books[0].rating || 'New'}</span>
              <span>{books[0].chapters.length} chapters</span>
              <span>{books[0].readingStatus}</span>
              {books[0].genres.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}
            </div>
            <div className="ww-home-feature-actions">
              <button onClick={() => window.location.hash = `/book/${books[0].id}`}>Open story <span>→</span></button>
              <button onClick={() => window.location.hash = '/category'}>Browse all stories</button>
            </div>
          </div>
          <div className="ww-home-feature-note"><span>&ldquo;</span><p>Stories are how we rehearse being human.</p><small>WordWeft reading room</small></div>
        </section>
      )}

      {/* Explore Books */}
      <section className="ww-content-section container mx-auto px-6 mb-24 mt-4 md:mt-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="font-sans text-2xl sm:text-3xl font-bold text-text-rich dark:text-dark-text-rich leading-tight truncate">Explore Books</h2>
          <div className="flex-shrink-0">
            <SortDropdown
              options={SORT_OPTIONS}
              value={sortMode}
              onChange={(v) => setSortMode(v as any)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {books.length > 0
            ? books.map(book => (
              <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
            ))
            : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-dark-surface-alt rounded-xl"></div>
                <div className="h-4 bg-gray-200 dark:bg-dark-surface-alt rounded mt-3 w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-dark-surface-alt rounded mt-2 w-1/2"></div>
              </div>
            ))
          }
        </div>
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="font-sans font-semibold text-sm bg-accent text-white px-6 py-3 rounded-xl hover:bg-primary transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </section>

      {/* Top Genres */}
      {rankedGenres.length > 0 && (
        <section className="container mx-auto px-6 mb-24">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-sans text-2xl sm:text-3xl font-bold text-text-rich dark:text-dark-text-rich leading-tight truncate">Top Genres</h2>
            {rankedGenres.length > 6 && (
              <button
                onClick={() => setShowAllGenres(prev => !prev)}
                className="flex-shrink-0 font-sans text-sm font-semibold text-accent hover:text-primary transition-colors whitespace-nowrap"
              >
                {showAllGenres ? 'Show Less' : `View All (${rankedGenres.length})`}
              </button>
            )}
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${showAllGenres ? 'max-h-[600px] overflow-y-auto pr-1' : ''}`}>
            {(showAllGenres ? rankedGenres : rankedGenres.slice(0, 6)).map((genre, idx) => {
              const gradients = [
                'bg-gradient-to-br from-violet-600 to-purple-800',
                'bg-gradient-to-br from-rose-500 to-pink-700',
                'bg-gradient-to-br from-sky-500 to-blue-700',
                'bg-gradient-to-br from-amber-500 to-orange-700',
                'bg-gradient-to-br from-emerald-500 to-teal-700',
                'bg-gradient-to-br from-indigo-500 to-blue-800',
                'bg-gradient-to-br from-fuchsia-500 to-purple-700',
                'bg-gradient-to-br from-cyan-500 to-teal-600',
                'bg-gradient-to-br from-red-500 to-rose-700',
                'bg-gradient-to-br from-lime-500 to-green-700',
              ];
              return (
                <div
                  key={genre.name}
                  onClick={() => { trackEvent('navigation', 'genre_card_click', genre.name); window.location.hash = `/genre/${encodeURIComponent(genre.name)}`; }}
                  className="relative h-36 rounded-2xl p-5 flex flex-col justify-end text-white font-sans cursor-pointer overflow-hidden group transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg"
                >
                  <div className={`absolute inset-0 transition-all duration-500 ${gradients[idx % gradients.length]} group-hover:brightness-110`}></div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                  <span className="absolute top-3 right-3 z-10 bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full">{genre.bookCount} books</span>
                  <span className="relative z-10 font-bold text-xl leading-tight">{genre.name}</span>
                  <span className="relative z-10 text-xs font-medium text-white/70 mt-1 group-hover:text-white/90 transition-colors">Explore →</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Genre-wise Book Sections */}
      {Object.keys(genreBooks).length > 0 && Object.entries(genreBooks).map(([genre, gBooks]) => (
        <section key={genre} className="container mx-auto px-6 mb-16">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-sans text-xl sm:text-2xl font-bold text-text-rich dark:text-dark-text-rich leading-tight truncate">{genre}</h2>
            <a
              href={`#/genre/${encodeURIComponent(genre)}`}
              className="flex-shrink-0 font-sans text-sm font-semibold text-accent hover:underline transition-colors whitespace-nowrap"
            >
              View All →
            </a>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {gBooks.map(book => (
              <div key={book.id} className="flex-shrink-0 w-40">
                <BookCard book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Author Spotlight - Hidden for now
      {spotlightAuthor && (
        <section className="bg-white dark:bg-dark-surface py-24">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center bg-surface dark:bg-dark-surface-alt rounded-3xl shadow-soft p-8 md:p-12 gap-8">
              <img src={spotlightAuthor.avatarUrl} alt={spotlightAuthor.name} className="w-32 h-32 rounded-full object-cover" />
              <div className="text-center md:text-left">
                <p className="font-sans text-sm font-semibold text-accent mb-2">Author Spotlight</p>
                <h3 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich mb-2">{spotlightAuthor.name}</h3>
                <p className="max-w-xl mb-4">{spotlightAuthor.bio}</p>
                <button onClick={() => window.location.hash = `/author/${spotlightAuthor.id}`} className="font-sans font-semibold text-accent hover:underline">View Profile</button>
              </div>
            </div>
          </div>
        </section>
      )}
      */}

      {/* Personalized Modal */}
      {showPersonalizedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPersonalizedModal(false)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">✨</div>
            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-3">Personalized Discovery</h3>
            <p className="text-text-body dark:text-dark-text-body mb-6">
              Explore stories using transparent ranking and genre filters to find your next great read.
            </p>
            <button
              onClick={() => setShowPersonalizedModal(false)}
              className="bg-accent text-white font-sans font-semibold px-6 py-3 rounded-xl hover:bg-primary transition-colors"
            >
              Back to Explore
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
