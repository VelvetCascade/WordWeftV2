
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
    const [isMature, setIsMature] = useState(false);
    const [coverUrl, setCoverUrl] = useState('https://picsum.photos/seed/newbook/400/600');
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [isLoadingGenres, setIsLoadingGenres] = useState(true);

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
        
        const newBookData = {
            title,
            description,
            summary: description.substring(0, 150) + '...',
            coverUrl,
            genres: selectedGenres,
            tags: selectedGenres,
            isMature,
        };

        const updatedUser = await api.createBook(currentUser.id, newBookData);
        onUserUpdate(updatedUser);
        
        const newBookId = updatedUser.writtenBooks?.find(b => b.title === title)?.id;
        if(newBookId) {
            window.location.hash = `/write/book/${newBookId}/manage`;
        } else {
            window.location.hash = '/write';
        }
    };

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
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" placeholder="e.g., The Last Sky-Sailor"/>
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">Book Description</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={5} className="w-full p-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" placeholder="A short, compelling summary of your story."></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-2">Cover Image</label>
                        <div className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-center text-gray-500 dark:text-gray-400 hover:border-accent hover:text-accent cursor-pointer transition-colors">
                           <div>
                                <PhotoIcon className="w-10 h-10 mx-auto mb-2"/>
                                <p>Feature coming soon!</p>
                                <p className="text-xs">A default image will be used.</p>
                           </div>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-2">Genres</label>
                        <div className="flex flex-wrap gap-2">
                            {isLoadingGenres ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Loading genres...</p>
                            ) : (
                                allGenres.map(g => (
                                    <button key={g} type="button" onClick={() => toggleGenre(g)} className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-alt text-text-body dark:text-dark-text-body'}`}>
                                        {g}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                     <div className="flex items-center justify-between pt-4">
                        <label htmlFor="isMature" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="isMature" className="sr-only" checked={isMature} onChange={e => setIsMature(e.target.checked)}/>
                                <div className={`block w-14 h-8 rounded-full transition-colors ${isMature ? 'bg-danger' : 'bg-gray-200 dark:bg-dark-surface-alt'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isMature ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <div className="ml-3 text-text-body dark:text-dark-text-body">
                                <p className="font-sans font-medium">Mature Content</p>
                                <p className="text-xs">This book is intended for audiences 18+</p>
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