
import React from 'react';
import type { Author, NavigateTo } from '../types';
import { sampleBooks } from '../constants';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { ArrowLeftIcon } from '../components/icons/Icons';

export const AuthorPage: React.FC<{ navigateTo: NavigateTo; author: Author }> = ({ navigateTo, author }) => {
    const authorBooks = sampleBooks.filter(b => b.author.id === author.id);

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
                            <BookCard key={book.id} book={book} onClick={() => navigateTo({ name: 'book-details', book })}/>
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
