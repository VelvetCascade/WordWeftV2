
import React, { useState, useEffect } from 'react';
import type { Author, Book, User } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { TwitterIcon, InstagramIcon, FacebookIcon, ThreadsIcon } from '../components/icons/Icons';
import * as api from '../api/client';

export const AuthorPage: React.FC<{ authorId: string; currentUser: User | null; onUserUpdate: (user: User) => void }> = ({ authorId, currentUser, onUserUpdate }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

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

    useEffect(() => {
        if (currentUser && authorId) {
            setIsFollowing(currentUser.following.some(u => u.id === authorId));
        }
    }, [currentUser, authorId]);

    const handleFollowToggle = async () => {
        if (!currentUser) {
            window.location.hash = '/auth';
            return;
        }
        if (isFollowLoading) return;

        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await api.unfollowUser(authorId);
                // Update local user state
                const newFollowing = currentUser.following.filter(u => u.id !== authorId);
                const updatedUser = { ...currentUser, following: newFollowing };
                onUserUpdate(updatedUser);
            } else {
                await api.followUser(authorId);
                // Optimistically add author to following list (we need full author object ideally, but basic info is enough)
                if (author) {
                    const newFollowing = [...currentUser.following, author];
                    const updatedUser = { ...currentUser, following: newFollowing };
                    onUserUpdate(updatedUser);
                }
            }
            // Toggle local state
            setIsFollowing(!isFollowing);
        } catch (error) {
            console.error("Failed to toggle follow", error);
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

    const isMe = currentUser?.id === authorId;

    return (
        <div>
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border">
                <div className="container mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <img src={author.avatarUrl} alt={author.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-lg" />
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">{author.name}</h1>
                            <p className="text-text-body dark:text-dark-text-body mt-2 max-w-2xl">{author.bio}</p>

                            {/* Social Links */}
                            {author.socialLinks && Object.keys(author.socialLinks).length > 0 && (
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                    {author.socialLinks.twitter && (
                                        <a href={author.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1DA1F2] transition-colors">
                                            <TwitterIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socialLinks.instagram && (
                                        <a href={author.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors">
                                            <InstagramIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socialLinks.facebook && (
                                        <a href={author.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] transition-colors">
                                            <FacebookIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socialLinks.threads && (
                                        <a href={author.socialLinks.threads} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                            <ThreadsIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}



                            {!isMe && (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`mt-6 px-6 py-2.5 rounded-full font-sans font-bold text-sm transition-all shadow-soft hover:shadow-lifted active:scale-95 ${isFollowing
                                        ? 'bg-gray-100 dark:bg-dark-border text-text-body dark:text-dark-text-body hover:bg-gray-200 dark:hover:bg-dark-surface-alt'
                                        : 'bg-accent text-white hover:bg-accent-hover'
                                        } ${isFollowLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
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
                            <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-dark-surface rounded-2xl">
                        <p className="text-text-body dark:text-dark-text-body">No books found for this author.</p>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};
