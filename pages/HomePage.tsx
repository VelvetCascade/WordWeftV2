import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, BookOpen, RefreshCw, Search, Sparkles } from 'lucide-react';
import type { Book, Author, SearchBookResult, SearchAuthorResult } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { DiscoveryHero } from '../components/DiscoveryHero';
import { SortDropdown } from '../components/SortDropdown';
import { SearchIcon, XMarkIcon, StarIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { applyMetadata } from '../utils/pageMetadata';
import { metadataFor, parseRoute, isPublicBook } from '../seo/metadata.mjs';
import { ResilientImage } from '../components/ResilientImage';
import { createLatestRequestGate } from '../utils/runtimeLifecycle';
import type { DiscoveryHeroGroups } from '../utils/discoveryHero';
import { getGenreArtwork } from '../utils/genreArtwork';
import '../styles/discovery-v2.css';

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
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGateRef = useRef(createLatestRequestGate());
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
    return () => {
      document.removeEventListener('mousedown', handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestGateRef.current.invalidate();
    };
  }, []);

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setBooks([]);
      setAuthors([]);
      return;
    }
    const requestId = requestGateRef.current.begin();
    setIsLoading(true);
    setSearchError('');
    try {
      const result = await api.searchAutocomplete(q);
      if (!requestGateRef.current.isLatest(requestId)) return;
      setBooks(result.books || []);
      setAuthors(result.authors || []);
    } catch (e) {
      if (requestGateRef.current.isLatest(requestId)) {
        console.error('Autocomplete error:', e);
        setSearchError(e instanceof Error ? e.message : 'Search is unavailable. Please try again.');
      }
    } finally {
      if (requestGateRef.current.isLatest(requestId)) setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    requestGateRef.current.invalidate();
    setQuery(val);
    setSelectedIndex(-1);
    if (val.trim().length < 2) { setBooks([]); setAuthors([]); setIsLoading(false); setSearchError(''); }
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
              aria-label="Search books, writers, or genres"
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
              <button className="hero-search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setBooks([]); setAuthors([]); }}>
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
                      <ResilientImage
                        src={book.coverUrl}
                        alt={book.title}
                        fallbackLabel={book.title}
                        variant="cover"
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
                        <ResilientImage
                          src={author.avatarUrl}
                          alt={author.name}
                          fallbackLabel={author.name}
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
              {searchError && <div className="search-overlay-error" role="alert"><strong>Search could not be loaded.</strong><span>{searchError}</span><button type="button" onClick={() => void fetchAutocomplete(query)}>Try again</button></div>}
              {!isLoading && !searchError && query.trim().length >= 2 && totalResults === 0 && (
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
  const [books, setBooks] = useState<Book[]>([]);
  const [rankedGenres, setRankedGenres] = useState<{ name: string; bookCount: number; readCount: number }[]>([]);
  const [rankedGenresLoading, setRankedGenresLoading] = useState(true);
  const [rankedGenresError, setRankedGenresError] = useState('');
  const [genresAttempt, setGenresAttempt] = useState(0);
  const [genreBooks, setGenreBooks] = useState<Record<string, Book[]>>({});
  const [loadGenreShelves, setLoadGenreShelves] = useState(false);
  const genreShelfRef = useRef<HTMLDivElement>(null);
  const [sortMode, setSortMode] = useState<'most_read' | 'most_viewed' | 'recent_update' | 'new'>('most_read');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [activeShelf, setActiveShelf] = useState('');
  const [heroGroups, setHeroGroups] = useState<DiscoveryHeroGroups>({ stories: [], novels: [], poems: [] });
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroError, setHeroError] = useState('');
  const [heroAttempt, setHeroAttempt] = useState(0);
  const { trackEvent } = useAnalytics();
  const SORT_OPTIONS = [{ value: 'most_read', label: 'Most read this week' }, { value: 'most_viewed', label: 'Most viewed this week' }, { value: 'recent_update', label: 'Recently updated' }, { value: 'new', label: 'New arrivals' }];
  useEffect(() => {
    let active = true;
    setIsLoading(true); setLoadError('');
    api.getBooks({ sort: sortMode, page: 0, size: 7 }).then(response => {
      if (!active) return;
      setBooks(response.content);
      if (window.location.pathname === '/home' || window.location.pathname === '/') applyMetadata(metadataFor(parseRoute('/home'), { books: response.content.filter(isPublicBook) }));
    }).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Stories could not be loaded.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [sortMode, attempt]);
  useEffect(() => {
    let active = true;
    setRankedGenresLoading(true);
    setRankedGenresError('');
    api.getGenresRanked().then(value => { if (active) setRankedGenres(value); })
      .catch(error => { if (active) setRankedGenresError(error instanceof Error ? error.message : 'Genres could not be loaded.'); })
      .finally(() => { if (active) setRankedGenresLoading(false); });
    return () => { active = false; };
  }, [attempt, genresAttempt]);
  useEffect(() => {
    if (isLoading || rankedGenresLoading || loadGenreShelves) return;
    const target = genreShelfRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === 'undefined') { setLoadGenreShelves(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) { setLoadGenreShelves(true); observer.disconnect(); }
    }, { rootMargin: '300px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoading, rankedGenresLoading, loadGenreShelves]);
  useEffect(() => {
    if (!loadGenreShelves) return;
    let active = true;
    api.getHomeGenres().then(value => { if (active) setGenreBooks(value); }).catch(() => {});
    return () => { active = false; };
  }, [loadGenreShelves, attempt]);
  useEffect(() => {
    let active = true;
    setHeroLoading(true); setHeroError('');
    api.getDiscoveryHero().then(groups => { if (active) setHeroGroups(groups); })
      .catch(error => { if (active) setHeroError(error instanceof Error ? error.message : 'Featured books could not be loaded.'); })
      .finally(() => { if (active) setHeroLoading(false); });
    return () => { active = false; };
  }, [heroAttempt]);
  const featuredGenres = rankedGenres.slice(0, 8);
  const featuredArtwork = featuredGenres.map(genre => getGenreArtwork(genre.name)).filter(Boolean);
  return <div className="v2-discovery">
    <DiscoveryHero groups={heroGroups} isLoading={heroLoading} loadError={heroError} onRetry={() => setHeroAttempt(value => value + 1)} onRead={() => trackEvent('navigation', 'hero_cta_click', 'Start Reading')} onWrite={() => trackEvent('navigation', 'hero_cta_click', 'Start Writing')} />
    <div className="v2-home-search"><HeroSearch onScrolledPast={() => {}} /></div>
    <nav className="ww-discovery-shortcuts" aria-label="More ways to discover"><a href="/hooks"><BookOpen size={17} />Find a story by its opening<ArrowRight size={16} /></a><a href="/events">Reading events & challenges<ArrowRight size={16} /></a></nav>
    <section className="v2-discovery-section" aria-labelledby="stories-heading">
      <div className="v2-section-heading"><div><p className="ww-page-eyebrow">Story discovery</p><h2 id="stories-heading">Find a story. Stay for a chapter.</h2></div><a href="/category">Browse stories <ArrowRight size={18} /></a></div>
      {loadError ? <div className="v2-load-state" role="alert"><BookOpen size={28} /><h3>The shelves are taking a moment.</h3><p>{loadError}</p><button className="v2-button secondary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} />Try again</button></div> : isLoading && !books.length ? <div className="v2-story-discovery-grid" aria-label="Loading stories" aria-busy="true">{[0,1,2].map(index => <div className="v2-story-skeleton" key={index}><div /><span /><span /></div>)}</div> : !books.length ? <div className="v2-load-state"><BookOpen size={28} /><h3>A new shelf, a new beginning.</h3><p>The first stories are on their way. Your words could be among them.</p><a href="/write" className="v2-button">Start a story <ArrowRight size={16} /></a></div> : <div className="v2-story-discovery-grid">{books.slice(0,3).map((book,index) => <article className={`v2-feature-story ${index === 0 ? 'lead' : ''}`} key={book.id}>
        <a className="v2-feature-cover" href={`/book/${encodeURIComponent(book.id)}`} aria-label={`Open ${book.title}`}><ResilientImage src={book.coverUrl} alt={`Cover of ${book.title}`} fallbackLabel={book.title} variant="cover" /></a>
        <div className="v2-feature-info"><p className="ww-page-eyebrow">{book.genres[0] || 'Original story'} · {book.readingStatus}</p><h3><a href={`/book/${encodeURIComponent(book.id)}`}>{book.title}</a></h3><a className="v2-feature-author" href={`/author/${encodeURIComponent(book.author.id)}`}>{book.author.name}</a><p className="v2-feature-summary">{book.summary || book.description}</p><div className="v2-feature-meta"><span><BookOpen size={15} />{book.chapters?.length || 0} chapters</span><span><StarIcon className="w-4 h-4" />{book.rating || 'New'}</span><a href={`/book/${encodeURIComponent(book.id)}`} aria-label={`Read ${book.title}`}>Read <ArrowRight size={16} /></a></div></div>
      </article>)}</div>}
    </section>
    {(!!featuredGenres.length || !!rankedGenresError || rankedGenresLoading) && <section className="v2-discovery-section" aria-labelledby="genres-heading" aria-busy={rankedGenresLoading}>
      <div className="v2-section-heading"><div><p className="ww-page-eyebrow">Explore</p><h2 id="genres-heading">Stories across genres.</h2></div><a href="/category">All genres <ArrowRight size={18} /></a></div>
      {rankedGenresLoading && <p role="status">Loading genres…</p>}
      {rankedGenresError && <div className="ww-section-retry" role="alert"><p>{rankedGenresError}</p><button type="button" className="v2-button secondary" onClick={() => setGenresAttempt(value => value + 1)}>Retry genres</button></div>}
      <div className="v2-genre-strip">{featuredGenres.map(genre => {
        const art = getGenreArtwork(genre.name);
        return <a className={`v2-genre-tile ${art ? '' : 'v2-genre-tile-unillustrated'}`} href={`/genre/${encodeURIComponent(genre.name)}`} key={genre.name} onClick={() => trackEvent('navigation','genre_card_click',genre.name)}>
          {art ? <img src={art.file} alt="" loading="lazy" style={art.position ? { objectPosition: art.position } : undefined} /> : <i aria-hidden="true">{genre.name.charAt(0)}</i>}
          <span>{genre.name}<small>{genre.bookCount} {genre.bookCount === 1 ? 'story' : 'stories'}</small></span>
        </a>;
      })}</div>
      {!!featuredArtwork.length && <details className="v2-artwork-credits"><summary>Artwork credits</summary><ul>{featuredArtwork.map(art => <li key={art.file}><a href={art.source} target="_blank" rel="noopener noreferrer">{art.title}</a><span>{art.artist}{art.date ? `, ${art.date}` : ''} · {art.genre}</span></li>)}</ul><p>The Metropolitan Museum of Art, Open Access. Public domain images (<a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0</a>).</p></details>}
    </section>}
    {books.length > 3 && <section className="v2-discovery-section v2-shelf" aria-labelledby="shelf-heading"><div className="v2-section-heading"><div><p className="ww-page-eyebrow">Your next read</p><h2 id="shelf-heading">A little more to discover.</h2></div><SortDropdown options={SORT_OPTIONS} value={sortMode} onChange={value => setSortMode(value as typeof sortMode)} /></div><div className="v2-shelf-grid" aria-busy={isLoading}>{books.slice(3,7).map(book => <BookCard book={book} key={book.id} onClick={() => window.location.hash = `/book/${book.id}`} />)}</div></section>}
    <div ref={genreShelfRef} aria-hidden="true" />
    {!!Object.keys(genreBooks).length && <section className="v2-discovery-section"><div className="v2-section-heading"><h2>Choose a shelf.</h2><a href={`/genre/${encodeURIComponent(activeShelf || Object.keys(genreBooks)[0])}`}>Explore genre <ArrowRight size={18} /></a></div><div className="v2-genre-tabs" role="group" aria-label="Explore a genre shelf">{Object.keys(genreBooks).map(genre => <button type="button" key={genre} aria-pressed={(activeShelf || Object.keys(genreBooks)[0]) === genre} onClick={() => setActiveShelf(genre)}>{genre}</button>)}</div><div className="v2-scroll-shelf">{(genreBooks[activeShelf || Object.keys(genreBooks)[0]] || []).map(book => <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />)}</div></section>}
    {books[0]?.author && <section className="v2-author-spotlight"><ResilientImage src={books[0].author.avatarUrl} alt={books[0].author.name} fallbackLabel={books[0].author.name} /><div><p className="ww-page-eyebrow">Meet a storyteller</p><h2>{books[0].author.name}</h2>{books[0].author.bio && <p>{books[0].author.bio}</p>}<a href={`/author/${encodeURIComponent(books[0].author.id)}`}>Visit their writing room <ArrowRight size={16} /></a></div></section>}
    <Footer />
  </div>;
};
