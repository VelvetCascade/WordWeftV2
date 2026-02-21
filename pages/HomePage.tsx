
import React, { useState, useEffect } from 'react';
import type { Book, Author } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { SortDropdown } from '../components/SortDropdown';
import { SearchIcon, XMarkIcon } from '../components/icons/Icons';
import * as api from '../api/client';


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


export const HomePage: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [rankedGenres, setRankedGenres] = useState<{ name: string; bookCount: number; readCount: number }[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [spotlightAuthor, setSpotlightAuthor] = useState<Author | null>(null);
  const [sortMode, setSortMode] = useState<'most_read' | 'most_viewed' | 'recent_update' | 'new'>('most_read');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPersonalizedModal, setShowPersonalizedModal] = useState(false);
  const [genreBooks, setGenreBooks] = useState<Record<string, Book[]>>({});

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

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[90vh] min-h-[600px] flex items-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-animated-gradient animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-primary/30"></div>
        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 items-center gap-8">
          <div className="text-center md:text-left">
            <h1 className="font-sans text-5xl md:text-7xl font-extrabold leading-tight tracking-tighter mb-4">
              Discover. Write. Publish.
            </h1>
            <p className="text-lg md:text-xl max-w-lg mx-auto md:mx-0 text-gray-200 mb-8">
              A next-gen platform for readers and storytellers.
            </p>
            <div className="flex justify-center md:justify-start space-x-4">
              <button onClick={() => window.location.hash = '/category'} className="bg-accent font-sans font-semibold px-8 py-3 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg">Start Reading</button>
              <button onClick={() => window.location.hash = '/write'} className="bg-surface/20 font-sans font-semibold px-8 py-3 rounded-xl hover:bg-surface/30 transition-transform hover:scale-105 duration-300 shadow-lg">Start Writing</button>
            </div>
          </div>
          <div className="hidden md:block">
            <HeroCarousel books={books.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="transform -translate-y-1/2 z-20 relative">
        <div className="container mx-auto px-6">
          <div className="relative max-w-2xl mx-auto">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search for books, authors, or genres..."
              className="w-full h-16 pl-14 pr-12 rounded-3xl font-sans text-lg border-none shadow-lifted focus:ring-2 focus:ring-accent focus:shadow-glow transition-all duration-300 dark:bg-dark-surface-alt dark:text-dark-text-rich"
            />
            {searchValue && <XMarkIcon onClick={() => setSearchValue("")} className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 cursor-pointer hover:text-text-rich dark:hover:text-dark-text-rich" />}
          </div>
        </div>
      </section>

      {/* Explore Books */}
      <section className="container mx-auto px-6 mb-24 -mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich">Explore Books</h2>
          <SortDropdown
            options={SORT_OPTIONS}
            value={sortMode}
            onChange={(v) => setSortMode(v as any)}
          />
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich">Top Genres</h2>
            {rankedGenres.length > 6 && (
              <button
                onClick={() => setShowAllGenres(prev => !prev)}
                className="font-sans text-sm font-semibold text-accent hover:text-primary transition-colors"
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
                  onClick={() => window.location.hash = `/genre/${encodeURIComponent(genre.name)}`}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">{genre}</h2>
            <a
              href={`#/genre/${encodeURIComponent(genre)}`}
              className="font-sans text-sm font-semibold text-accent hover:underline transition-colors"
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
            <h3 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-3">Personalized Discovery Coming Soon</h3>
            <p className="text-text-body dark:text-dark-text-body mb-6">
              We are building a thoughtful recommendation system. For now, explore stories using transparent ranking and genre filters.
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
