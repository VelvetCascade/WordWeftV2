
import React, { useState, useEffect } from 'react';
import type { Author, Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { UserGroupIcon, PlusIcon, CheckCircleIcon } from '../components/icons/Icons';
import { ConnectionsModal } from '../components/ConnectionsModal';
import * as api from '../api/client';

export const AuthorPage: React.FC<{ authorId: string }> = ({ authorId }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getAuthorById(authorId),
            api.getBooksByAuthor(authorId)
        ]).then(([fetchedAuthor, fetchedBooks]) => {
            setAuthor(fetchedAuthor);
            setAuthorBooks(fetchedBooks);
            setIsLoading(false);
        });
    }, [authorId]);

    const handleFollowToggle = async () => {
        if (!author) return;
        
        // Optimistic UI update
        const prevAuthor = { ...author };
        const isNowFollowing = !author.isFollowing;
        setAuthor({
            ...author,
            isFollowing: isNowFollowing,
            followersCount: (author.followersCount || 0) + (isNowFollowing ? 1 : -1)
        });
        
        setIsFollowLoading(true);
        try {
            if (prevAuthor.isFollowing) {
                await api.unfollowUser(author.id);
            } else {
                await api.followUser(author.id);
            }
        } catch (error) {
            // Revert on failure
            setAuthor(prevAuthor);
            // Optionally redirect to login if 401, but api client handles some of that
            if(!localStorage.getItem('wordweft_jwt')) {
                window.location.hash = '/auth';
            }
        } finally {
            setIsFollowLoading(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading author profile...</div>;
    }

    if (!author) {
        return <div className="min-h-screen flex items-center justify-center">Author not found.</div>;
    }

    return (
        <div>
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border">
                <div className="container mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <img src={author.avatarUrl} alt={author.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-lg" />
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                                <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">{author.name}</h1>
                                <button 
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all transform active:scale-95 ${
                                        author.isFollowing 
                                        ? 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-surface'
                                        : 'bg-accent text-white hover:bg-primary shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {author.isFollowing ? (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" /> Following
                                        </>
                                    ) : (
                                        <>
                                            <PlusIcon className="w-4 h-4" /> Follow
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-text-body dark:text-dark-text-body max-w-2xl">{author.bio}</p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                                <button 
                                    onClick={() => setConnectionModalType('followers')}
                                    className="flex items-center gap-2 group"
                                >
                                    <span className="font-bold text-lg text-text-rich dark:text-dark-text-rich group-hover:text-accent transition-colors">{author.followersCount || 0}</span>
                                    <span className="text-sm text-gray-500 group-hover:text-accent transition-colors">Followers</span>
                                </button>
                                <button 
                                    onClick={() => setConnectionModalType('following')}
                                    className="flex items-center gap-2 group"
                                >
                                    <span className="font-bold text-lg text-text-rich dark:text-dark-text-rich group-hover:text-accent transition-colors">{author.followingCount || 0}</span>
                                    <span className="text-sm text-gray-500 group-hover:text-accent transition-colors">Following</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-6 py-12">
                <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-6">
                    Books by {author.name}
                </h2>
                {authorBooks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                        {authorBooks.map(book => (
                            <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`}/>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-dark-surface rounded-2xl">
                        <p className="text-text-body dark:text-dark-text-body">No books found for this author.</p>
                    </div>
                )}
            </div>
            
            <ConnectionsModal 
                isOpen={!!connectionModalType}
                onClose={() => setConnectionModalType(null)}
                title={connectionModalType === 'followers' ? 'Followers' : 'Following'}
                userId={author.id}
                type={connectionModalType || 'followers'}
            />
            
            <Footer />
        </div>
    );
};
