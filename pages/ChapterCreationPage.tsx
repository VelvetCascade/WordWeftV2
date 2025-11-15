
import React, { useState } from 'react';
import {
  CodeBracketIcon, ChatBubbleLeftEllipsisIcon, ListBulletIcon, PhotoIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon
} from '../components/icons/Icons';

type WriterView = 'dashboard' | 'create-book' | 'edit-chapter';

interface ChapterCreationPageProps {
  setView: (view: WriterView) => void;
}

const EditorToolbar: React.FC = () => {
    const ToolButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">{children}</button>
    );

    return (
        <div className="sticky top-0 z-10 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm p-2 rounded-t-xl border-b dark:border-dark-border flex items-center flex-wrap gap-1">
            <div className="relative group">
                <button className="flex items-center gap-1 font-sans text-sm font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                    Paragraph <ChevronDownIcon className="w-4 h-4"/>
                </button>
                 <div className="absolute top-full mt-2 w-40 bg-white dark:bg-dark-surface-alt rounded-xl shadow-lg py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 border dark:border-dark-border">
                    <a href="#" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border font-sans">Paragraph</a>
                    <a href="#" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border font-sans text-2xl font-bold">Heading 1</a>
                    <a href="#" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border font-sans text-xl font-bold">Heading 2</a>
                </div>
            </div>
            <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1"></div>
            <ToolButton><span className="font-bold text-sm">B</span></ToolButton>
            <ToolButton><span className="italic text-sm">I</span></ToolButton>
            <ToolButton><span className="underline text-sm">U</span></ToolButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1"></div>
            <ToolButton><CodeBracketIcon className="w-5 h-5"/></ToolButton>
            <ToolButton><ChatBubbleLeftEllipsisIcon className="w-5 h-5"/></ToolButton>
            <ToolButton><ListBulletIcon className="w-5 h-5"/></ToolButton>
            <ToolButton><PhotoIcon className="w-5 h-5"/></ToolButton>
        </div>
    );
}

const MetadataPanel: React.FC = () => {
    const [isPublished, setIsPublished] = useState(false);
    return (
        <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-dark-surface rounded-2xl border dark:border-dark-border p-6 flex flex-col space-y-6">
            <div>
                 <label className="block font-sans font-medium text-sm mb-1 dark:text-dark-text-body">Cover Image (optional)</label>
                 <div className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-center text-xs text-gray-500 dark:text-gray-400 hover:border-accent hover:text-accent cursor-pointer transition-colors">
                     Click to upload
                 </div>
            </div>
             <div>
                 <label className="block font-sans font-medium text-sm mb-1 dark:text-dark-text-body">Word Count</label>
                 <p className="font-sans font-semibold text-lg dark:text-dark-text-rich">1,204</p>
            </div>
            <div>
                 <label className="block font-sans font-medium text-sm mb-1 dark:text-dark-text-body">Estimated Reading Time</label>
                 <p className="font-sans font-semibold text-lg dark:text-dark-text-rich">5 min</p>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <label htmlFor="visibility-toggle" className="font-sans font-medium text-sm dark:text-dark-text-body">Visibility</label>
                    <p className={`text-xs font-bold ${isPublished ? 'text-success' : 'text-amber-600'}`}>{isPublished ? 'Published' : 'Draft'}</p>
                </div>
                <button onClick={() => setIsPublished(!isPublished)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt">
                    {isPublished ? <EyeIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <EyeSlashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                </button>
            </div>
        </div>
    )
}

export const ChapterCreationPage: React.FC<ChapterCreationPageProps> = ({ setView }) => {
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');

  const handleTextChange = () => {
    setSaveState('saving');
    setTimeout(() => {
        setSaveState('saved');
    }, 1500);
  }

  const getSaveText = () => {
    switch(saveState) {
        case 'saving': return 'Saving...';
        case 'saved': return 'Saved';
        case 'error': return 'Error saving';
    }
  }

  return (
    <div className="h-full">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <input type="text" placeholder="Chapter Title" className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich bg-transparent border-none focus:ring-0 p-0" defaultValue="Chapter 1: The Beginning" />
            <div className="flex items-center gap-2 md:gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-opacity font-sans w-20 text-right">{getSaveText()}</p>
                <button onClick={() => setView('dashboard')} className="bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-4 py-2 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-border transition-colors">Dashboard</button>
                <button className="bg-accent text-white font-sans font-semibold px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors">Publish</button>
            </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border dark:border-dark-border overflow-hidden min-h-[60vh]">
                <EditorToolbar />
                <textarea 
                    onChange={handleTextChange}
                    className="flex-1 w-full p-6 md:p-8 font-serif text-lg leading-relaxed focus:outline-none resize-none bg-transparent dark:text-dark-text-body"
                    placeholder="Start writing your chapter..."
                    defaultValue="The air in the Grand Archives of Aerthos was thick with the scent of aged parchment and forgotten magic..."
                />
            </div>
            <MetadataPanel />
        </div>
    </div>
  );
};
