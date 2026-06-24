
import React, { useState, useEffect, useCallback } from 'react';
import type { SearchBookResult, SearchAuthorResult, SearchFullResponse } from '../types';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { StarIcon } from '../components/icons/Icons';
import AdUnit from '../components/AdUnit';

type SearchTab = 'all' | 'books' | 'authors';

export const SearchResultsPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('all');
    const [results, setResults] = useState<SearchFullResponse>({});
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [inputValue, setInputValue] = useState('');

    // Parse query from hash
    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/[?&]q=([^&]*)/);
        if (match) {
            const q = decodeURIComponent(match[1]);
            setQuery(q);
            setInputValue(q);
        }
    }, []);

    const fetchResults = useCallback(async (q: string, tab: SearchTab, page: number) => {
        if (q.trim().length < 2) return;
        setIsLoading(true);
        try {
            const data = await api.searchFull(q, tab, page, 12);
            if (page === 0) {
                setResults(data);
            } else {
                // Append results for "load more"
                setResults(prev => ({
                    books: data.books ? {
                        ...data.books,
                        items: [...(prev.books?.items || []), ...data.books.items],
                    } : prev.books,
                    authors: data.authors ? {
                        ...data.authors,
                        items: [...(prev.authors?.items || []), ...data.authors.items],
                    } : prev.authors,
                }));
            }
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (query) {
            setCurrentPage(0);
            fetchResults(query, activeTab, 0);
        }
    }, [query, activeTab, fetchResults]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim().length >= 2) {
            setQuery(inputValue.trim());
            window.location.hash = `/search?q=${encodeURIComponent(inputValue.trim())}`;
        }
    };

    const handleLoadMore = () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchResults(query, activeTab, nextPage);
    };

    const bookResults = results.books?.items || [];
    const authorResults = results.authors?.items || [];
    const totalBooks = results.books?.total || 0;
    const totalAuthors = results.authors?.total || 0;
    const hasMoreBooks = (results.books?.page ?? 0) < (results.books?.totalPages ?? 0) - 1;
    const hasMoreAuthors = (results.authors?.page ?? 0) < (results.authors?.totalPages ?? 0) - 1;
    const hasMore = activeTab === 'books' ? hasMoreBooks : activeTab === 'authors' ? hasMoreAuthors : (hasMoreBooks || hasMoreAuthors);

    const tabs: { key: SearchTab; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: totalBooks + totalAuthors },
        { key: 'books', label: 'Books', count: totalBooks },
        { key: 'authors', label: 'Users', count: totalAuthors },
    ];

    return (
        <div className="search-results-page">
            <div className="container mx-auto px-4 md:px-6 py-8">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="search-results-bar">
                    <svg className="search-results-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Search books, users, genres..."
                        className="search-results-bar-input"
                    />
                    <button type="submit" className="search-results-bar-btn">Search</button>
                </form>

                {/* Tabs */}
                <div className="search-results-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`search-results-tab ${activeTab === tab.key ? 'search-results-tab-active' : ''}`}
                            onClick={() => { setActiveTab(tab.key); setCurrentPage(0); }}
                        >
                            {tab.label}
                            {tab.count > 0 && <span className="search-results-tab-count">{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {/* Results */}
                {isLoading && currentPage === 0 ? (
                    <div className="search-results-loading">
                        <div className="search-overlay-spinner" />
                        <p>Searching for "{query}"...</p>
                    </div>
                ) : (
                    <>
                        {/* Book Results */}
                        {(activeTab === 'all' || activeTab === 'books') && bookResults.length > 0 && (
                            <div className="search-results-section">
                                {activeTab === 'all' && (
                                    <div className="search-results-section-header">
                                        <h2>Books</h2>
                                        {totalBooks > 5 && (
                                            <button onClick={() => setActiveTab('books')} className="search-results-see-all">
                                                See all {totalBooks} results →
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="search-results-book-grid">
                                    {(activeTab === 'all' ? bookResults.slice(0, 6) : bookResults).map((book, i) => (
                                        <BookResultCard key={book.id} book={book} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Author Results */}
                        {(activeTab === 'all' || activeTab === 'authors') && authorResults.length > 0 && (
                            <div className="search-results-section">
                                {activeTab === 'all' && (
                                    <div className="search-results-section-header">
                                        <h2>Users</h2>
                                        {totalAuthors > 3 && (
                                            <button onClick={() => setActiveTab('authors')} className="search-results-see-all">
                                                See all {totalAuthors} results →
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="search-results-author-grid">
                                    {(activeTab === 'all' ? authorResults.slice(0, 4) : authorResults).map((author, i) => (
                                        <AuthorResultCard key={author.id} author={author} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && query && bookResults.length === 0 && authorResults.length === 0 && (
                            <div className="search-results-empty">
                                <svg className="w-20 h-20 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                    <path d="M8 11h6" />
                                </svg>
                                <h3 className="text-xl font-bold text-text-rich dark:text-dark-text-rich mb-2">No results found</h3>
                                <p className="text-text-body dark:text-dark-text-body max-w-md mx-auto">
                                    We couldn't find anything matching <strong>"{query}"</strong>. Try different keywords, check your spelling, or broaden your search.
                                </p>
                            </div>
                        )}

                        {/* Load More */}
                        {activeTab !== 'all' && hasMore && (
                            <div className="search-results-load-more">
                                <button onClick={handleLoadMore} disabled={isLoading} className="search-results-load-more-btn">
                                    {isLoading ? 'Loading...' : 'Load More Results'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                <AdUnit format="horizontal" />
            </div>
        </div>
    );
};

// ─── Book Result Card ─────────────────────────────────────────

const BookResultCard: React.FC<{ book: SearchBookResult; index: number }> = ({ book, index }) => (
    <div
        className="search-book-card"
        style={{ animationDelay: `${index * 60}ms` }}
        onClick={() => { window.location.hash = `/book/${book.id}`; }}
    >
        <div className="search-book-card-cover-wrapper">
            <img
                src={book.coverUrl || 'https://via.placeholder.com/200x280'}
                alt={book.title}
                className="search-book-card-cover"
            />
            <div className="search-book-card-cover-overlay">
                <span>View Book</span>
            </div>
        </div>
        <div className="search-book-card-info">
            <h3 className="search-book-card-title">{book.title}</h3>
            {book.author && (
                <p className="search-book-card-author" onClick={(e) => {
                    e.stopPropagation();
                    window.location.hash = `/author/${book.author!.id}`;
                }}>
                    by {book.author.name}
                </p>
            )}
            <div className="search-book-card-meta">
                {book.rating > 0 && (
                    <span className="search-book-card-rating">
                        <StarIcon className="w-4 h-4 text-amber-500" />
                        {book.rating.toFixed(1)}
                    </span>
                )}
                {book.readingStatus && (
                    <span className={`search-book-card-status ${book.readingStatus === 'Completed' ? 'search-status-completed' : 'search-status-ongoing'}`}>
                        {book.readingStatus}
                    </span>
                )}
            </div>
            {book.genres && book.genres.length > 0 && (
                <div className="search-book-card-genres">
                    {book.genres.slice(0, 3).map((g) => (
                        <span key={g} className="search-genre-pill">{g}</span>
                    ))}
                </div>
            )}
            {book.summary && (
                <p className="search-book-card-summary">
                    {book.summary.length > 120 ? book.summary.slice(0, 120) + '…' : book.summary}
                </p>
            )}
        </div>
    </div>
);

// ─── Author Result Card ───────────────────────────────────────

const AuthorResultCard: React.FC<{ author: SearchAuthorResult; index: number }> = ({ author, index }) => (
    <div
        className="search-author-card"
        style={{ animationDelay: `${index * 80}ms` }}
        onClick={() => { window.location.hash = `/author/${author.id}`; }}
    >
        <img
            src={author.avatarUrl || 'https://via.placeholder.com/80'}
            alt={author.name}
            className="search-author-card-avatar"
        />
        <div className="search-author-card-info">
            <h3 className="search-author-card-name">{author.name}</h3>
            {author.bio && (
                <p className="search-author-card-bio">
                    {author.bio.length > 100 ? author.bio.slice(0, 100) + '…' : author.bio}
                </p>
            )}
            <div className="search-author-card-stats">
                <span>{author.followersCount} followers</span>
                {author.favoriteGenres && author.favoriteGenres.length > 0 && (
                    <span className="search-author-card-genres">
                        {author.favoriteGenres.slice(0, 2).join(', ')}
                    </span>
                )}
            </div>
        </div>
        <button className="search-author-card-btn" onClick={(e) => {
            e.stopPropagation();
            window.location.hash = `/author/${author.id}`;
        }}>
            View Profile
        </button>
    </div>
);
