
import React, { useState, useEffect } from 'react';
import type { User, Book } from '../types';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon } from '../components/icons/Icons';
import * as api from '../api/client';

interface CreateBookPageProps {
    currentUser: User;
    onUserUpdate: (user: User) => void;
}

export const CreateBookPage: React.FC<CreateBookPageProps> = ({ currentUser, onUserUpdate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [category, setCategory] = useState('');
    const [isMature, setIsMature] = useState(false);
    const [isAIGenerated, setIsAIGenerated] = useState(false);
    const [coverUrl, setCoverUrl] = useState('');
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [isLoadingGenres, setIsLoadingGenres] = useState(true);
    const [genreSearch, setGenreSearch] = useState('');
    const [customCategory, setCustomCategory] = useState('');

    const BOOK_CATEGORIES = [
        'Novel', 'Novella', 'Short Story', 'Poetry', 'Essay',
        'Anthology', 'Memoir', 'Biography', 'Self-Help', 'Graphic Novel',
        'Light Novel', 'Web Novel', 'Fan Fiction', 'Screenplay', 'Play',
        'Journal', 'Guide', 'Other'
    ];

    useEffect(() => {
        api.getGenres().then(fetchedGenres => {
            setAllGenres(fetchedGenres);
            setIsLoadingGenres(false);
        });
    }, []);

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalCategory = category === 'Other' ? customCategory : category;

        const newBookData = {
            title,
            description,
            summary: description.substring(0, 150) + '...',
            coverUrl: coverUrl || 'https://picsum.photos/seed/newbook/400/600',
            genres: selectedGenres,
            category: finalCategory,
            tags: selectedGenres,
            isMature,
            isAIGenerated,
        };

        const updatedUser = await api.createBook(currentUser.id, newBookData);
        onUserUpdate(updatedUser);

        const newBookId = updatedUser.writtenBooks?.find(b => b.title === title)?.id;
        if (newBookId) {
            window.location.hash = `/write/book/${newBookId}/manage`;
        } else {
            window.location.hash = '/write';
        }
    };

    const filteredGenres = allGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
            <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => window.location.hash = '/write'}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich">
                        Create a New Book
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-surface p-8 rounded-2xl border dark:border-dark-border space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Book Title</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" placeholder="e.g., The Last Sky-Sailor" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Book Description</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={5} className="w-full p-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" placeholder="A short, compelling summary of your story."></textarea>
                    </div>
                    <div>
                        <label htmlFor="coverUrl" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Cover Image URL</label>
                        <div className="flex gap-4 items-start">
                            <input
                                type="url"
                                id="coverUrl"
                                value={coverUrl}
                                onChange={e => setCoverUrl(e.target.value)}
                                className="flex-1 h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                                placeholder="https://example.com/cover.jpg"
                            />
                            <div className="w-16 h-24 bg-gray-100 dark:bg-dark-surface-alt rounded-lg border dark:border-dark-border flex items-center justify-center overflow-hidden flex-shrink-0">
                                {coverUrl ? (
                                    <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                                ) : (
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Leave empty for a random default cover.</p>
                    </div>

                    {/* Book Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Book Category</label>
                        <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                        >
                            <option value="">Select a category...</option>
                            {BOOK_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">What kind of book is this?</p>
                        
                        {category === 'Other' && (
                            <div className="mt-3">
                                <label htmlFor="customCategory" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Custom Category</label>
                                <input 
                                    type="text" 
                                    id="customCategory" 
                                    value={customCategory} 
                                    onChange={e => setCustomCategory(e.target.value)} 
                                    required 
                                    className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" 
                                    placeholder="e.g., LitRPG" 
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-2">Genres</label>
                        {selectedGenres.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {selectedGenres.map(g => (
                                    <span key={g} onClick={() => toggleGenre(g)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white cursor-pointer hover:bg-primary/80 transition-colors">
                                        {g} <span className="text-white/70">×</span>
                                    </span>
                                ))}
                            </div>
                        )}
                        <input
                            type="text"
                            placeholder="Search genres..."
                            value={genreSearch}
                            onChange={e => setGenreSearch(e.target.value)}
                            className="w-full h-10 px-4 mb-2 rounded-xl text-sm font-sans border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                        />
                        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                            {isLoadingGenres ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Loading genres...</p>
                            ) : (
                                filteredGenres.map(g => (
                                    <button key={g} type="button" onClick={() => toggleGenre(g)} className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body hover:bg-gray-200 dark:hover:bg-dark-border'}`}>
                                        {g}
                                    </button>
                                ))
                            )}
                            {!isLoadingGenres && filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match your search.</p>}
                        </div>
                    </div>
                    {/* <div className="flex items-center justify-between pt-4">
                        <label htmlFor="isMature" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="isMature" className="sr-only" checked={isMature} onChange={e => setIsMature(e.target.checked)} />
                                <div className={`block w-14 h-8 rounded-full transition-colors ${isMature ? 'bg-danger' : 'bg-gray-200 dark:bg-dark-surface-alt'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isMature ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <div className="ml-3 text-text-body dark:text-dark-text-body">
                                <p className="font-sans font-medium">Mature Content</p>
                                <p className="text-xs">This book is intended for audiences 18+</p>
                            </div>
                        </label>
                    </div> */}

                    <div className="flex items-center justify-between pt-2 border-t dark:border-dark-border">
                        <label htmlFor="isAIGenerated" className="flex items-center cursor-pointer py-2">
                            <div className="relative">
                                <input type="checkbox" id="isAIGenerated" className="sr-only" checked={isAIGenerated} onChange={e => setIsAIGenerated(e.target.checked)} />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${isAIGenerated ? 'bg-accent' : 'bg-gray-200 dark:bg-dark-surface-alt'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAIGenerated ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <div className="ml-3 text-text-body dark:text-dark-text-body">
                                <p className="font-sans font-bold flex items-center gap-2">✨ AI Generated Content</p>
                                <p className="text-xs text-gray-500 mt-1">Check this if your book utilizes AI to generate text or structure.</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => window.location.hash = '/write'} className="bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-border transition-colors">Cancel</button>
                        <button type="submit" className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors disabled:bg-gray-400" disabled={!title || !description}>Create Book & Add Chapters</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
