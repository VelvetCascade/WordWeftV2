
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchBookResult, SearchAuthorResult } from '../types';
import * as api from '../api/client';
import { StarIcon } from './icons/Icons';
import { createLatestRequestGate } from '../utils/runtimeLifecycle';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [books, setBooks] = useState<SearchBookResult[]>([]);
    const [authors, setAuthors] = useState<SearchAuthorResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const requestGateRef = useRef<ReturnType<typeof createLatestRequestGate> | null>(null);
    if (!requestGateRef.current) requestGateRef.current = createLatestRequestGate();

    const totalResults = books.length + authors.length;

    // Focus input when overlay opens
    useEffect(() => {
        if (isOpen) {
            focusTimer.current = setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setBooks([]);
            setAuthors([]);
            setSelectedIndex(-1);
        } else {
            requestGateRef.current?.invalidate();
        }
        return () => {
            if (focusTimer.current) clearTimeout(focusTimer.current);
        };
    }, [isOpen]);

    useEffect(() => () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        requestGateRef.current?.invalidate();
    }, []);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Escape key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const fetchAutocomplete = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setBooks([]);
            setAuthors([]);
            setIsLoading(false);
            return;
        }
        const requestId = requestGateRef.current!.begin();
        setIsLoading(true);
        try {
            const result = await api.searchAutocomplete(q);
            if (!requestGateRef.current?.isLatest(requestId)) return;
            setBooks(result.books || []);
            setAuthors(result.authors || []);
        } catch (e) {
            if (requestGateRef.current?.isLatest(requestId)) {
                console.error('Autocomplete error:', e);
            }
        } finally {
            if (requestGateRef.current?.isLatest(requestId)) setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setSelectedIndex(-1);
        requestGateRef.current?.invalidate();
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchAutocomplete(val), 300);
    };

    const navigateToBook = (bookId: string) => {
        onClose();
        window.location.hash = `/book/${bookId}`;
    };

    const navigateToAuthor = (authorId: string) => {
        onClose();
        window.location.hash = `/author/${authorId}`;
    };

    const navigateToFullSearch = () => {
        if (query.trim().length >= 2) {
            onClose();
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
        }
    };

    if (!isOpen) return null;

    return (
        <div className="search-overlay-backdrop" onClick={onClose} ref={overlayRef}>
            <div className="search-overlay-container" onClick={(e) => e.stopPropagation()}>
                {/* Search Input */}
                <div className="search-overlay-input-wrapper">
                    <svg className="search-overlay-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Search books, users, genres..."
                        className="search-overlay-input"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button onClick={onClose} className="search-overlay-close-btn">
                        <span>ESC</span>
                    </button>
                </div>

                {/* Results */}
                {(books.length > 0 || authors.length > 0 || isLoading) && (
                    <div className="search-overlay-results">
                        {isLoading && (
                            <div className="search-overlay-loading">
                                <div className="search-overlay-spinner" />
                                <span>Searching...</span>
                            </div>
                        )}

                        {/* Books Section */}
                        {books.length > 0 && (
                            <div className="search-overlay-section">
                                <div className="search-overlay-section-label">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                    </svg>
                                    Books
                                </div>
                                {books.map((book, i) => (
                                    <button
                                        key={book.id}
                                        className={`search-overlay-item ${selectedIndex === i ? 'search-overlay-item-active' : ''}`}
                                        onClick={() => navigateToBook(book.id)}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <img
                                            src={book.coverUrl || 'https://via.placeholder.com/40x56'}
                                            alt={book.title}
                                            className="search-overlay-book-cover"
                                        />
                                        <div className="search-overlay-item-text">
                                            <div className="search-overlay-item-title">{book.title}</div>
                                            <div className="search-overlay-item-subtitle">
                                                {book.author?.name && <span>by {book.author.name}</span>}
                                                {book.rating > 0 && (
                                                    <span className="search-overlay-rating">
                                                        <StarIcon className="w-3 h-3" />
                                                        {book.rating.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            {book.genres && book.genres.length > 0 && (
                                                <div className="search-overlay-genres">
                                                    {book.genres.slice(0, 3).map((g) => (
                                                        <span key={g} className="search-overlay-genre-pill">{g}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <svg className="search-overlay-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="m9 18 6-6-6-6" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Authors Section */}
                        {authors.length > 0 && (
                            <div className="search-overlay-section">
                                <div className="search-overlay-section-label">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Users
                                </div>
                                {authors.map((author, i) => {
                                    const idx = books.length + i;
                                    return (
                                        <button
                                            key={author.id}
                                            className={`search-overlay-item ${selectedIndex === idx ? 'search-overlay-item-active' : ''}`}
                                            onClick={() => navigateToAuthor(author.id)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                        >
                                            <img
                                                src={author.avatarUrl || 'https://via.placeholder.com/40'}
                                                alt={author.name}
                                                className="search-overlay-avatar"
                                            />
                                            <div className="search-overlay-item-text">
                                                <div className="search-overlay-item-title">{author.name}</div>
                                                {author.bio && (
                                                    <div className="search-overlay-item-subtitle">
                                                        {author.bio.length > 60 ? author.bio.slice(0, 60) + '…' : author.bio}
                                                    </div>
                                                )}
                                                <div className="search-overlay-item-meta">
                                                    {author.followersCount} followers
                                                </div>
                                            </div>
                                            <svg className="search-overlay-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m9 18 6-6-6-6" />
                                            </svg>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer hint */}
                        {totalResults > 0 && (
                            <button className="search-overlay-footer" onClick={navigateToFullSearch}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <span>Press Enter to see all results for <strong>"{query}"</strong></span>
                            </button>
                        )}
                    </div>
                )}

                {/* No results */}
                {query.trim().length >= 2 && !isLoading && totalResults === 0 && (
                    <div className="search-overlay-empty">
                        <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                            <path d="m8 8 6 6" />
                            <path d="m14 8-6 6" />
                        </svg>
                        <p className="text-text-body dark:text-dark-text-body">No results found for "{query}"</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try different keywords or check spelling</p>
                    </div>
                )}
            </div>
        </div>
    );
};
