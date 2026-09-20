
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { Squares2X2Icon, Bars3Icon, ChevronDownIcon, FunnelIcon, XMarkIcon, StarIcon, SearchIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { applyMetadata } from '../utils/pageMetadata';
import { metadataFor, parseRoute, isPublicBook } from '../seo/metadata.mjs';
import { ResilientImage } from '../components/ResilientImage';

type ViewMode = 'grid' | 'list';
type SortOption = 'most_read' | 'most_viewed' | 'recent_update' | 'new';

const SORT_OPTIONS: Array<[SortOption, string]> = [
  ['most_read', 'Most Read'],
  ['most_viewed', 'Most Viewed'],
  ['recent_update', 'Recently Updated'],
  ['new', 'Newly Added'],
];

const BookListItem: React.FC<{ book: Book; onClick: () => void }> = ({ book, onClick }) => (
  <div onClick={onClick} className="flex flex-col sm:flex-row gap-6 p-4 bg-white dark:bg-dark-surface rounded-2xl shadow-soft hover:shadow-lifted cursor-pointer transition-all duration-300 hover:-translate-y-1">
    <ResilientImage src={book.coverUrl} alt={`Cover of ${book.title}`} fallbackLabel={book.title} variant="cover" className="w-full sm:w-32 h-48 sm:h-auto object-cover rounded-xl" />
    <div className="flex-1">
      <div className="flex flex-wrap gap-2 mb-2">
        {book.genres.map(g => <button type="button" key={g} onClick={event => { event.stopPropagation(); window.location.hash = `/genre/${encodeURIComponent(g)}`; }} className="text-xs font-sans font-medium bg-accent/10 text-accent px-2 py-1 rounded-full hover:bg-accent/20">{g}</button>)}
      </div>
      <h3 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">{book.title}</h3>
      <p className="text-sm font-medium text-text-body dark:text-dark-text-body mb-2">by {book.author.name}</p>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
        <StarIcon className="w-4 h-4 text-amber-600 mr-1" />
        <span>{book.rating}</span>
        <span className="mx-2">·</span>
        <span>{book.reviewsCount.toLocaleString()} reviews</span>
      </div>
      <p className="text-sm text-text-body dark:text-dark-text-body line-clamp-2 mb-4">{book.summary}</p>
      <button className="font-sans font-semibold text-sm text-accent hover:underline">Open Book</button>
    </div>
  </div>
);


export const CategoryPage: React.FC<{ genre: string | null }> = ({ genre }) => {
    const { trackEvent } = useAnalytics();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('most_read');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(genre ? [genre] : []);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalBooks, setTotalBooks] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [genresError, setGenresError] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');

  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSequenceRef = useRef(0);

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev => prev.includes(g) ? [] : [g]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target as Node)) {
        setIsGenreOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsFilterOpen(false);
      setIsGenreOpen(false);
      setIsSortOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    if (isFilterOpen) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFilterOpen]);

  useEffect(() => {
    setGenresError(false);
    api.getGenres().then(setAllGenres).catch(() => setGenresError(true));
  }, [loadAttempt]);

  useEffect(() => {
    let active = true;
    const requestSequence = ++requestSequenceRef.current;
    setIsLoading(true);
    setIsLoadingMore(false);
    setLoadError(null);
    setPage(0);
    api.getBooks({ genre: selectedGenres[0], sort: sortOption, page: 0, size: 20 }).then(res => {
      if (!active || requestSequence !== requestSequenceRef.current) return;
      setBooks(res.content);
      setHasMore(res.hasMore);
      setTotalBooks(res.totalElements);
      setIsLoading(false);
      if (window.location.pathname === '/category') applyMetadata(metadataFor(parseRoute('/category'), { books: res.content.filter(isPublicBook) }));
    }).catch((error) => { if (active) { setLoadError(error instanceof Error ? error.message : 'The library could not be loaded.'); setIsLoading(false); } });
    return () => { active = false; };
  }, [selectedGenres, sortOption, loadAttempt]);

  const loadNextPage = async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    const nextPage = page + 1;
    const requestSequence = requestSequenceRef.current;
    setIsLoadingMore(true);
    try {
      const response = await api.getBooks({ genre: selectedGenres[0], sort: sortOption, page: nextPage, size: 20 });
      if (requestSequence !== requestSequenceRef.current) return;
      setBooks(current => {
        const seen = new Set(current.map(book => book.id));
        return [...current, ...response.content.filter(book => !seen.has(book.id))];
      });
      setPage(nextPage);
      setHasMore(response.hasMore);
      setTotalBooks(response.totalElements);
    } catch (error) {
      if (requestSequence === requestSequenceRef.current) setLoadError(error instanceof Error ? error.message : 'More stories could not be loaded.');
    } finally {
      if (requestSequence === requestSequenceRef.current) setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadNextPage();
    }, { rootMargin: '500px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, page, selectedGenres, sortOption]);

  const handleGenreToggle = () => {
    setIsGenreOpen(prev => !prev);
    setIsSortOpen(false); // Close other dropdown
  };

  const handleSortToggle = () => {
    setIsSortOpen(prev => !prev);
    setIsGenreOpen(false); // Close other dropdown
  };


  const filteredGenres = allGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

  const handleLibrarySearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!libraryQuery.trim()) return;
    window.location.hash = `/search?q=${encodeURIComponent(libraryQuery.trim())}`;
  };

  const FilterDrawer: React.FC = () => (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setIsFilterOpen(false)}>
      <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto bg-white dark:bg-dark-surface rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mobile-filter-heading">
        <div className="flex justify-between items-center mb-4">
          <h3 id="mobile-filter-heading" className="font-sans text-xl font-bold dark:text-dark-text-rich">Filters</h3>
          <button type="button" aria-label="Close filters" onClick={() => setIsFilterOpen(false)}><XMarkIcon className="w-6 h-6 dark:text-dark-text-body" /></button>
        </div>
        <div>
          <h4 className="font-sans font-semibold mb-3 dark:text-dark-text-rich">Genres</h4>
          <input
            type="text"
            placeholder="Search genres..."
            value={genreSearch}
            onChange={e => setGenreSearch(e.target.value)}
            className="w-full h-10 px-4 mb-3 rounded-xl text-sm font-sans border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
          />
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {filteredGenres.map(g => (
              <button key={g} onClick={() => toggleGenre(g)} className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body'}`}>
                {g}
              </button>
            ))}
            {filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match.</p>}
          </div>
        </div>
        <button onClick={() => setIsFilterOpen(false)} className="mt-6 w-full bg-accent text-white font-sans font-semibold py-3 rounded-xl">Apply Filters</button>
      </div>
    </div>
  );

  return (
    <div className="ww-library-page min-h-screen">
      <div className="ww-library-container container mx-auto px-4 sm:px-6 py-8">
        <span className="ww-page-eyebrow">The WordWeft library</span>
        <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4">
          {genre || 'All Books'}
        </h1>
        <p className="text-lg text-text-body dark:text-dark-text-body max-w-2xl mb-8">
          Browse our curated collection of books. Filter by genre and sort to find your next great read.
        </p>
        <div className="ww-library-discovery">
          <form onSubmit={handleLibrarySearch} className="ww-library-search">
            <SearchIcon className="w-5 h-5" />
            <input value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)} placeholder="Search by title, author, world, or theme…" aria-label="Search the library" />
            <button type="submit">Search</button>
          </form>
          {allGenres.length > 0 && (
            <div className="ww-library-quick-genres">
              <span>Start with</span>
              {allGenres.slice(0, 6).map(item => <button key={item} onClick={() => toggleGenre(item)} className={selectedGenres.includes(item) ? 'active' : ''}>{item}</button>)}
            </div>
          )}
        </div>

        {/* Sticky Filter Bar */}
        <div className="ww-library-filter sticky top-[72px] z-30 bg-background/80 dark:bg-dark-background/80 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-8 border-b border-gray-200 dark:border-dark-border">
          <div className="flex justify-between items-center">
            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-4">
              <div ref={genreDropdownRef} className="relative">
                <button type="button" onClick={handleGenreToggle} aria-expanded={isGenreOpen} aria-haspopup="true" className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  Genre <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isGenreOpen ? 'rotate-180' : ''}`} />
                </button>
                {isGenreOpen && <div className="absolute top-full mt-2 w-80 bg-white dark:bg-dark-surface rounded-xl shadow-lg p-4 border dark:border-dark-border" role="group" aria-label="Filter by genre">
                  <input
                    type="text"
                    placeholder="Search genres..."
                    value={genreSearch}
                    onChange={e => setGenreSearch(e.target.value)}
                    className="w-full h-9 px-3 mb-3 rounded-lg text-sm font-sans border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                  />
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {filteredGenres.map(g => (
                      <button key={g} onClick={() => toggleGenre(g)} className={`px-2 py-1 rounded-md text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body hover:bg-gray-200 dark:hover:bg-dark-border'}`}>
                        {g}
                      </button>
                    ))}
                    {filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match.</p>}
                  </div>
                  {selectedGenres.length > 0 && <button onClick={() => setSelectedGenres([])} className="text-xs text-accent mt-3 hover:underline">Clear all</button>}
                </div>}
              </div>
              <div ref={sortDropdownRef} className="relative">
                <button type="button" onClick={handleSortToggle} aria-expanded={isSortOpen} aria-haspopup="menu" className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                  Sort by: {SORT_OPTIONS.find(([value]) => value === sortOption)?.[1]} <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSortOpen && <div className="absolute top-full mt-2 w-48 bg-white dark:bg-dark-surface rounded-xl shadow-lg py-2 border dark:border-dark-border" role="menu">
                  {SORT_OPTIONS.map(([val, label]) => (
                    <button type="button" role="menuitemradio" aria-checked={sortOption === val} key={val} onClick={() => { setSortOption(val); setIsSortOpen(false); }} className="block w-full px-4 py-2 text-left text-sm text-text-body dark:text-dark-text-body hover:bg-gray-100 dark:hover:bg-dark-surface-alt">{label}</button>
                  ))}
                </div>}
              </div>
            </div>

            {/* Mobile Filter Button */}
            <div className="md:hidden">
              <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg bg-gray-100 dark:bg-dark-surface-alt">
                <FunnelIcon className="w-4 h-4" /> Filters
              </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-surface-alt p-1 rounded-lg">
              {!isLoading && <span className="hidden sm:inline px-2 text-xs text-gray-500">{totalBooks.toLocaleString()} stories</span>}
              <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-dark-surface shadow-sm' : 'text-gray-500'}`}>
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-dark-surface shadow-sm' : 'text-gray-500'}`}>
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          </div>
          {selectedGenres.length > 0 && (
            <div className="hidden md:flex items-center gap-2 pt-3">
              {selectedGenres.map(g => (
                <div key={g} className="flex items-center gap-1 bg-accent/10 text-accent text-sm font-medium px-2 py-1 rounded-full">
                  <span>{g}</span>
                  <button type="button" aria-label={`Remove ${g} filter`} onClick={() => toggleGenre(g)}><XMarkIcon className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Books Display */}
        {isLoading ? (
          <div className="text-center p-8" role="status">Loading stories…</div>
        ) : loadError ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-danger/20 bg-white p-8 text-center shadow-soft dark:bg-dark-surface" role="alert">
            <h2 className="text-xl font-bold text-text-rich dark:text-dark-text-rich">The library couldn’t be loaded.</h2>
            <p className="mt-2 text-sm text-text-body dark:text-dark-text-body">{loadError}</p>
            <button onClick={() => setLoadAttempt(value => value + 1)} className="mt-5 rounded-xl bg-accent px-6 py-2.5 font-semibold text-white">Try again</button>
          </div>
        ) : books.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-soft dark:border-dark-border dark:bg-dark-surface">
            <h2 className="text-xl font-bold text-text-rich dark:text-dark-text-rich">No stories match these filters yet.</h2>
            <p className="mt-2 text-sm text-text-body dark:text-dark-text-body">Try another genre or clear the current filter.</p>
            {selectedGenres.length > 0 && <button onClick={() => setSelectedGenres([])} className="mt-5 rounded-xl bg-accent px-6 py-2.5 font-semibold text-white">Show all stories</button>}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {books.map(book => (
              <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {books.map(book => (
              <BookListItem key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
            ))}
          </div>
        )}

        {!isLoading && books.length > 0 && (
          <div ref={loadMoreRef} className="flex min-h-28 items-center justify-center py-8" aria-live="polite">
            {hasMore ? (
              <button type="button" onClick={() => void loadNextPage()} disabled={isLoadingMore} className="rounded-xl border border-accent/25 bg-white px-6 py-3 text-sm font-bold text-accent shadow-sm hover:bg-accent/5 disabled:opacity-60 dark:bg-dark-surface">
                {isLoadingMore ? 'Loading more stories…' : 'Load more stories'}
              </button>
            ) : (
              <p className="text-sm text-gray-500">You’ve reached the end of this collection.</p>
            )}
          </div>
        )}

      </div>
      {genresError && !loadError && <div className="sr-only" role="status">Genre filters are temporarily unavailable.</div>}
      {isFilterOpen && <FilterDrawer />}
      <Footer />
    </div>
  );
};
