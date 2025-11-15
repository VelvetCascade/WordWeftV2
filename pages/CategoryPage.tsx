
import React, { useState, useMemo } from 'react';
import type { Book, NavigateTo } from '../types';
import { sampleBooks, genres } from '../constants';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { Squares2X2Icon, Bars3Icon, ChevronDownIcon, FunnelIcon, XMarkIcon, StarIcon } from '../components/icons/Icons';

type ViewMode = 'grid' | 'list';
type SortOption = 'Recent' | 'Rating' | 'Popular';

const BookListItem: React.FC<{ book: Book; onClick: () => void }> = ({ book, onClick }) => (
    <div onClick={onClick} className="flex flex-col sm:flex-row gap-6 p-4 bg-white dark:bg-dark-surface rounded-2xl shadow-soft hover:shadow-lifted cursor-pointer transition-all duration-300 hover:-translate-y-1">
        <img src={book.coverUrl} alt={book.title} className="w-full sm:w-32 h-48 sm:h-auto object-cover rounded-xl"/>
        <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
                {book.genres.map(g => <span key={g} className="text-xs font-sans font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">{g}</span>)}
            </div>
            <h3 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">{book.title}</h3>
            <p className="text-sm font-medium text-text-body dark:text-dark-text-body mb-2">by {book.author.name}</p>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                <StarIcon className="w-4 h-4 text-amber-400 mr-1"/>
                <span>{book.rating}</span>
                <span className="mx-2">·</span>
                <span>{book.reviewsCount.toLocaleString()} reviews</span>
            </div>
            <p className="text-sm text-text-body dark:text-dark-text-body line-clamp-2 mb-4">{book.summary}</p>
            <button className="font-sans font-semibold text-sm text-accent hover:underline">Open Book</button>
        </div>
    </div>
);


export const CategoryPage: React.FC<{ navigateTo: NavigateTo; genre: string | null }> = ({ navigateTo, genre }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('Recent');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(genre ? [genre] : []);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleGenre = (g: string) => {
      setSelectedGenres(prev => prev.includes(g) ? prev.filter(i => i !== g) : [...prev, g]);
  };

  const filteredAndSortedBooks = useMemo(() => {
    let books = sampleBooks;

    if(selectedGenres.length > 0) {
        books = books.filter(book => selectedGenres.some(g => book.genres.includes(g)));
    }

    return [...books].sort((a, b) => {
        switch (sortOption) {
            case 'Rating': return b.rating - a.rating;
            case 'Popular': return b.reviewsCount - a.reviewsCount;
            case 'Recent':
            default: return b.id - a.id;
        }
    });
  }, [selectedGenres, sortOption]);

  const FilterDrawer: React.FC = () => (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isFilterOpen ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsFilterOpen(false)}>
        <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-3xl p-6 shadow-2xl transform transition-transform duration-300 ${isFilterOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-sans text-xl font-bold dark:text-dark-text-rich">Filters</h3>
                <button onClick={() => setIsFilterOpen(false)}><XMarkIcon className="w-6 h-6 dark:text-dark-text-body"/></button>
            </div>
            <div>
                <h4 className="font-sans font-semibold mb-3 dark:text-dark-text-rich">Genres</h4>
                <div className="flex flex-wrap gap-2">
                    {genres.map(g => (
                        <button key={g} onClick={() => toggleGenre(g)} className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body'}`}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={() => setIsFilterOpen(false)} className="mt-6 w-full bg-accent text-white font-sans font-semibold py-3 rounded-xl">Apply Filters</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4">
          {genre || 'All Books'}
        </h1>
        <p className="text-lg text-text-body dark:text-dark-text-body max-w-2xl mb-8">
          Browse our curated collection of books. Filter by genre and sort to find your next great read.
        </p>

        {/* Sticky Filter Bar */}
        <div className="sticky top-[72px] z-30 bg-background/80 dark:bg-dark-background/80 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-8 border-b border-gray-200 dark:border-dark-border">
          <div className="flex justify-between items-center">
            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-4">
               <div className="relative group">
                    <button className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                        Genre <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full mt-2 w-72 bg-white dark:bg-dark-surface rounded-xl shadow-lg p-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 border dark:border-dark-border">
                         <div className="flex flex-wrap gap-2">
                            {genres.map(g => (
                                <button key={g} onClick={() => toggleGenre(g)} className={`px-2 py-1 rounded-md text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body'}`}>
                                    {g}
                                </button>
                            ))}
                        </div>
                        {selectedGenres.length > 0 && <button onClick={() => setSelectedGenres([])} className="text-xs text-accent mt-3 hover:underline">Clear all</button>}
                    </div>
               </div>
                <div className="relative group">
                    <button className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                        Sort by: {sortOption} <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full mt-2 w-40 bg-white dark:bg-dark-surface rounded-xl shadow-lg py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 border dark:border-dark-border">
                        {(['Recent', 'Rating', 'Popular'] as SortOption[]).map(opt => (
                           <a key={opt} href="#" onClick={(e) => { e.preventDefault(); setSortOption(opt); }} className="block px-4 py-2 text-sm text-text-body dark:text-dark-text-body hover:bg-gray-100 dark:hover:bg-dark-surface-alt">{opt}</a>
                        ))}
                    </div>
               </div>
            </div>

            {/* Mobile Filter Button */}
            <div className="md:hidden">
              <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 font-sans font-medium text-sm p-2 rounded-lg bg-gray-100 dark:bg-dark-surface-alt">
                <FunnelIcon className="w-4 h-4" /> Filters
              </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-surface-alt p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-dark-surface shadow-sm' : 'text-gray-500'}`}>
                <Squares2X2Icon className="w-5 h-5"/>
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-dark-surface shadow-sm' : 'text-gray-500'}`}>
                <Bars3Icon className="w-5 h-5"/>
              </button>
            </div>
          </div>
            {selectedGenres.length > 0 && (
                <div className="hidden md:flex items-center gap-2 pt-3">
                    {selectedGenres.map(g => (
                        <div key={g} className="flex items-center gap-1 bg-accent/10 text-accent text-sm font-medium px-2 py-1 rounded-full">
                            <span>{g}</span>
                            <button onClick={() => toggleGenre(g)}><XMarkIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Books Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {filteredAndSortedBooks.map(book => (
              <BookCard key={book.id} book={book} onClick={() => navigateTo({ name: 'book-details', book })} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredAndSortedBooks.map(book => (
              <BookListItem key={book.id} book={book} onClick={() => navigateTo({ name: 'book-details', book })} />
            ))}
          </div>
        )}
      </div>
      <FilterDrawer />
      <Footer />
    </div>
  );
};
