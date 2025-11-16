
import React, { useState } from 'react';
import { HomeIcon, BookOpenIcon, PlusCircleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from '../components/icons/Icons';
import { ChapterCreationPage } from './ChapterCreationPage';

type WriterView = 'dashboard' | 'create-book' | 'edit-chapter';

const BookListCard: React.FC<{ status: 'Draft' | 'Published' }> = ({ status }) => (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border dark:border-dark-border flex items-center gap-4">
        <div className="w-16 h-20 bg-gray-200 dark:bg-dark-surface-alt rounded-lg flex items-center justify-center">
            <BookOpenIcon className="w-8 h-8 text-gray-400" />
        </div>
        <div className="flex-1">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-sans font-bold text-text-rich dark:text-dark-text-rich">Untitled Book</h4>
                    <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full ${status === 'Draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Edited 2 hours ago</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
                <button className="text-xs font-sans font-semibold text-accent hover:underline">Edit Book</button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button className="text-xs font-sans font-semibold text-accent hover:underline">Manage Chapters</button>
                 <span className="text-gray-300 dark:text-gray-600">|</span>
                <button className="text-xs font-sans font-semibold text-danger hover:underline">Unpublish</button>
            </div>
        </div>
    </div>
);


const WriterDashboard: React.FC<{ setView: (view: WriterView) => void }> = ({ setView }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich">Dashboard</h2>
                <button onClick={() => setView('create-book')} className="bg-accent text-white font-sans font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary transition-colors">
                    <PlusCircleIcon className="w-5 h-5"/> Create New Book
                </button>
            </div>
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border dark:border-dark-border mb-8">
                <h3 className="font-sans font-semibold mb-4 dark:text-dark-text-rich">Analytics Overview</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Analytics coming soon!</p>
            </div>
            <div>
                 <h3 className="font-sans font-semibold mb-4 dark:text-dark-text-rich">Your Books</h3>
                 <div className="space-y-4">
                    <BookListCard status="Published"/>
                    <BookListCard status="Draft"/>
                 </div>
            </div>
        </div>
    );
};

const BookCreationPage: React.FC<{ setView: (view: WriterView) => void }> = ({ setView }) => {
    const [step, setStep] = useState(1);
    const steps = ['Book Info', 'Cover', 'Genre & Tags', 'Description', 'Confirm'];

    return (
        <div>
            <h2 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich mb-2">Create a New Book</h2>
            <p className="text-text-body dark:text-dark-text-body mb-6">Follow the steps to get your book ready for readers.</p>
            
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((s, i) => (
                        <React.Fragment key={s}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-sans font-bold transition-colors ${i + 1 <= step ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-dark-surface-alt text-gray-500 dark:text-dark-text-body'}`}>
                                    {i + 1}
                                </div>
                                <p className={`mt-2 text-xs font-sans font-medium ${i + 1 <= step ? 'text-accent' : 'text-gray-500 dark:text-dark-text-body'}`}>{s}</p>
                            </div>
                            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 ${i + 1 < step ? 'bg-accent' : 'bg-gray-200 dark:bg-dark-border'}`}></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            
            <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl border dark:border-dark-border">
                {step === 1 && (
                    <div>
                        <h3 className="font-sans font-semibold text-xl mb-4 dark:text-dark-text-rich">Book Info</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="font-sans font-medium text-sm dark:text-dark-text-body">Title</label>
                                <input type="text" className="w-full mt-1 border-gray-300 rounded-lg focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" />
                            </div>
                             <div>
                                <label className="font-sans font-medium text-sm dark:text-dark-text-body">Subtitle (optional)</label>
                                <input type="text" className="w-full mt-1 border-gray-300 rounded-lg focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich" />
                            </div>
                        </div>
                    </div>
                )}
                 {step === 2 && (
                    <div>
                        <h3 className="font-sans font-semibold text-xl mb-4 dark:text-dark-text-rich">Upload Cover</h3>
                        <div className="h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                           <p>Drag & drop your cover image here</p>
                           <p className="text-sm">or</p>
                           <button className="font-sans font-semibold text-accent mt-1">Browse files</button>
                        </div>
                    </div>
                )}
                {/* Other steps would be here */}
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1} className="bg-gray-200 dark:bg-dark-surface-alt font-sans font-semibold px-6 py-2 rounded-xl disabled:opacity-50 dark:text-dark-text-body">Back</button>
                {step < steps.length ? (
                    <button onClick={() => setStep(s => Math.min(steps.length, s+1))} className="bg-accent text-white font-sans font-semibold px-6 py-2 rounded-xl">Next</button>
                ) : (
                    <button onClick={() => setView('edit-chapter')} className="bg-success text-white font-sans font-semibold px-6 py-2 rounded-xl">Finish & Add Chapter</button>
                )}
            </div>
        </div>
    );
};

export const WriterDashboardPage: React.FC = () => {
  const [view, setView] = useState<WriterView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const SideBarContent = () => (
      <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border">
              <h2 className="font-sans font-bold text-2xl text-primary dark:text-gray-100 tracking-tighter">Writer Area</h2>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <a href="#" onClick={(e)=>{ e.preventDefault(); setView('dashboard') }} className={`flex items-center gap-3 px-3 py-2 rounded-lg font-sans font-medium text-sm  ${view === 'dashboard' ? 'bg-accent/10 text-accent' : 'text-text-body dark:text-dark-text-body hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}><HomeIcon className="w-5 h-5"/>Dashboard</a>
              <a href="#" onClick={(e)=>{ e.preventDefault(); }} className="flex items-center gap-3 px-3 py-2 rounded-lg font-sans font-medium text-sm text-text-body dark:text-dark-text-body hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><BookOpenIcon className="w-5 h-5"/>My Books</a>
              <a href="#" onClick={(e)=>{ e.preventDefault(); }} className="flex items-center gap-3 px-3 py-2 rounded-lg font-sans font-medium text-sm text-text-body dark:text-dark-text-body hover:bg-gray-100 dark:hover:bg-dark-surface-alt"><Cog6ToothIcon className="w-5 h-5"/>Settings</a>
          </nav>
      </div>
  );


  const renderView = () => {
    switch(view) {
        case 'dashboard': return <WriterDashboard setView={setView} />;
        case 'create-book': return <BookCreationPage setView={setView} />;
        case 'edit-chapter': return <ChapterCreationPage setView={setView} />;
        default: return <WriterDashboard setView={setView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-dark-background">
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 transition-transform duration-300 lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="relative w-72 h-full bg-white dark:bg-dark-surface shadow-lg">
              <SideBarContent />
          </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border flex-shrink-0">
        <SideBarContent />
      </aside>

      <div className="flex-1 p-4 sm:p-6 lg:p-10">
        <button className="lg:hidden mb-4" onClick={() => setIsSidebarOpen(true)}>
            <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        {renderView()}
      </div>
    </div>
  );
};
