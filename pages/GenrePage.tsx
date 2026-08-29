
import React, { useState, useEffect } from 'react';
import type { Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { SortDropdown } from '../components/SortDropdown';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import AdUnit from '../components/AdUnit';

type SortOption = 'most_read' | 'most_viewed' | 'recent_update' | 'new';

const SORT_OPTIONS = [
    { value: 'most_read', label: 'Most Read (7 days)' },
    { value: 'most_viewed', label: 'Most Viewed (7 days)' },
    { value: 'recent_update', label: 'Recently Updated' },
    { value: 'new', label: 'Newly Added' },
];

export const GenrePage: React.FC<{ genre: string }> = ({ genre }) => {
    const { trackEvent } = useAnalytics();
    const [books, setBooks] = useState<Book[]>([]);
    const [sortOption, setSortOption] = useState<SortOption>('most_read');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBooks = (sort: SortOption, pageNum: number, append: boolean) => {
        setIsLoading(true);
        api.getBooksByGenre(genre, { sort, page: pageNum, size: 12 }).then(res => {
            setBooks(prev => append ? [...prev, ...res.content] : res.content);
            setHasMore(res.hasMore);
            setIsLoading(false);
        });
    };

    useEffect(() => {
        setPage(0);
        setBooks([]);
        fetchBooks(sortOption, 0, false);
    }, [genre, sortOption]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchBooks(sortOption, nextPage, true);
    };

    return (
        <div className="ww-library-page min-h-screen">
            <div className="ww-library-container container mx-auto px-4 sm:px-6 py-8">
                <span className="ww-page-eyebrow">Browse by genre</span>
                <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4">
                    {decodeURIComponent(genre)}
                </h1>
                <p className="text-lg text-text-body dark:text-dark-text-body max-w-2xl mb-8">
                    Explore books in the {decodeURIComponent(genre)} genre, sorted transparently by your chosen metric.
                </p>

                {/* Sort Bar */}
                <div className="flex items-center justify-between mb-8">
                    <p className="text-sm text-text-body dark:text-dark-text-body">
                        {books.length > 0 && `${books.length} books`}
                    </p>
                    <SortDropdown
                        options={SORT_OPTIONS}
                        value={sortOption}
                        onChange={(v) => setSortOption(v as SortOption)}
                    />
                </div>

                {/* Book Grid */}
                {isLoading && books.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-dark-surface-alt rounded-xl"></div>
                                <div className="h-4 bg-gray-200 dark:bg-dark-surface-alt rounded mt-3 w-3/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-dark-surface-alt rounded mt-2 w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : books.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-lg text-text-body dark:text-dark-text-body">No books found in this genre yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {books.map(book => (
                            <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
                        ))}
                    </div>
                )}

                {/* Load More */}
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

                <AdUnit format="horizontal" />
            </div>
            <Footer />
        </div>
    );
};
