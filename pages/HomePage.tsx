
import React, { useState, useEffect } from 'react';
import type { Book, Author } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
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
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [spotlightAuthor, setSpotlightAuthor] = useState<Author | null>(null);

  useEffect(() => {
    api.getBooks({ sortBy: 'Popular', limit: 6 }).then(books => {
      setTrendingBooks(books);
      if (books.length > 0) {
        setSpotlightAuthor(books[0].author);
      }
    });
    api.getGenres().then(setGenres);
  }, []);
  
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
            <HeroCarousel books={trendingBooks.slice(0, 5)} />
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

      {/* Trending Books */}
      <section className="container mx-auto px-6 mb-24 -mt-8">
        <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich mb-6">Trending Books</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trendingBooks.length > 0 
           ? trendingBooks.map(book => (
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
      </section>

      {/* Top Genres */}
      <section className="container mx-auto px-6 mb-24">
        <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich mb-6">Top Genres</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {genres.slice(0, 5).map(genre => (
            <div key={genre} onClick={() => window.location.hash = '/category'} className="relative h-28 rounded-2xl p-4 flex items-end justify-start text-white font-sans font-bold text-xl cursor-pointer overflow-hidden group">
              <div className="absolute inset-0 bg-primary dark:bg-dark-surface-alt group-hover:bg-animated-gradient group-hover:animate-gradient-shift transition-all duration-300"></div>
              <div className="absolute inset-0 bg-black/30"></div>
              <span className="relative z-10">{genre}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Author Spotlight */}
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

      <Footer />
    </div>
  );
};
