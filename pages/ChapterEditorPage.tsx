
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from '../types';
import { ArrowLeftIcon, EyeIcon } from '../components/icons/Icons';
import * as api from '../api/client';

interface ChapterEditorPageProps {
  currentUser: User;
  bookId: number;
  chapterId: number | 'new';
  onUserUpdate: (user: User) => void;
}

export const ChapterEditorPage: React.FC<ChapterEditorPageProps> = ({ currentUser, bookId, chapterId: initialChapterId, onUserUpdate }) => {
  const [chapterId, setChapterId] = useState(initialChapterId);
  const isNewChapter = chapterId === 'new';
  
  const book = currentUser.writtenBooks?.find(b => b.id === bookId);
  const chapter = isNewChapter ? null : book?.chapters.find(c => c.id === chapterId);
  
  const [title, setTitle] = useState(chapter?.title || '');
  const [content, setContent] = useState(chapter?.content || '');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const saveTimeoutRef = useRef<number | null>(null);
  
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);

  useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, []);

  const handleSave = async (status: 'draft' | 'published', currentContent: string, currentTitle: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!currentTitle && !currentContent) return; // Don't save empty chapters

    setSaveState('saving');
    
    try {
        const updatedUser = await api.saveChapter(currentUser.id, bookId, chapterId, { title: currentTitle, content: currentContent }, status);
        onUserUpdate(updatedUser);

        // If it was a new chapter, find its newly created ID and update state
        if (chapterId === 'new') {
            const newChapter = updatedUser.writtenBooks?.find(b => b.id === bookId)?.chapters.find(c => c.title === currentTitle);
            if (newChapter) {
                setChapterId(newChapter.id);
            }
        }
        
        setSaveState('saved');

        if (status === 'published') {
            window.location.hash = `/write/book/${bookId}/manage`;
        }
    } catch (error) {
        console.error("Failed to save chapter:", error);
        setSaveState('unsaved');
    }
  };

  const debouncedSave = (status: 'draft' | 'published', newContent: string, newTitle: string) => {
    setSaveState('unsaved');
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
        handleSave(status, newContent, newTitle);
    }, 2000);
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave('draft', newContent, title);
  };
  
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave('draft', content, newTitle);
  };

  const getSaveText = () => {
    switch(saveState) {
        case 'saving': return 'Saving...';
        case 'saved': return '✓ Saved';
        case 'unsaved': return '...';
    }
  };
  
  if (!book) return <div className="p-8">Book not found.</div>;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-dark-surface">
        <header className="flex-shrink-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b dark:border-dark-border z-10">
            <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button 
                        onClick={() => window.location.hash = `/write/book/${bookId}/manage`} 
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors flex-shrink-0"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-xs text-text-body dark:text-dark-text-body truncate">{book.title}</p>
                        <input 
                            type="text"
                            value={title}
                            onChange={e => handleTitleChange(e.target.value)}
                            placeholder="Chapter Title"
                            className="font-sans font-bold text-md bg-transparent border-none focus:ring-0 p-0 w-full dark:text-dark-text-rich"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                     <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-opacity font-sans w-16 sm:w-24 text-right">{getSaveText()}</p>
                     <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors" title="Preview (coming soon)">
                        <EyeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button 
                        onClick={() => handleSave('draft', content, title)}
                        className="hidden sm:inline-block bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border transition-colors text-sm"
                    >
                        Save Draft
                    </button>
                    <button 
                         onClick={() => handleSave('published', content, title)}
                        className="bg-accent text-white font-sans font-semibold px-3 sm:px-4 py-2 rounded-lg hover:bg-primary transition-colors text-sm"
                    >
                        Publish
                    </button>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 py-8 h-full">
                <textarea 
                    value={content}
                    onChange={e => handleContentChange(e.target.value)}
                    className="w-full h-full max-w-prose mx-auto bg-transparent font-serif text-lg leading-relaxed focus:outline-none resize-none dark:text-dark-text-body"
                    placeholder="Start writing your chapter..."
                />
            </div>
        </main>
        <footer className="flex-shrink-0 container mx-auto px-4 sm:px-6 h-8 flex items-center justify-center">
             <p className="text-xs text-gray-500 dark:text-gray-400 font-sans">{wordCount.toLocaleString()} words</p>
        </footer>
    </div>
  );
};
