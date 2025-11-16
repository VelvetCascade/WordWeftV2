
import React, { useState, useEffect } from 'react';
import type { Author, Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import * as api from '../api/client';

export const AuthorPage: React.FC<{ authorId: number }> = ({ authorId }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                            <h1 className="font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">{author.name}</h1>
                            <p className="text-text-body dark:text-dark-text-body mt-2 max-w-2xl">{author.bio}</p>
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
            <Footer />
        </div>
    );
};
