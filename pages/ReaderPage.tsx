
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User, Book, BookProgress, Comment } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, Bars3Icon, BookmarkIcon, PaintBrushIcon, XMarkIcon, PlusIcon, ArrowUturnLeftIcon } from '../components/icons/Icons';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../api/client';

type ContentTheme = 'light' | 'dark' | 'sepia';

interface ReaderPageProps {
    bookId: string;
    chapterIndex: number;
    currentUser: User | null;
}

// ... (Comment Components remain exactly the same, omitting for brevity to focus on logic changes, but assume they are here) ...
const CommentItem: React.FC<{ 
    comment: Comment; 
    allComments: Comment[]; 
    onReply: (parentId: string, content: string) => Promise<void>; 
    depth: number 
}> = ({ comment, allComments, onReply, depth }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const replies = allComments.filter(c => c.parentId === comment.id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!replyContent.trim()) return;
        setIsSubmitting(true);
        await onReply(comment.id, replyContent);
        setReplyContent('');
        setIsReplying(false);
        setIsSubmitting(false);
    };

    return (
        <div className={`relative ${depth > 0 ? 'ml-6 mt-3' : 'mt-4'}`}>
            {depth > 0 && (
                <div className="absolute -left-4 top-4 w-4 h-[1px] bg-gray-300 dark:bg-dark-border"></div>
            )}
            
            <div className={`bg-gray-50 dark:bg-dark-surface-alt p-3 rounded-xl border border-transparent ${isReplying ? 'border-accent/50' : ''}`}>
                <div className="flex items-start gap-2 mb-1">
                    <img 
                        src={comment.user.avatarUrl} 
                        alt={comment.user.name} 
                        className="w-6 h-6 rounded-full flex-shrink-0 cursor-pointer"
                        onClick={() => window.location.hash = `/author/${comment.user.id}`}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span 
                                className="font-sans font-bold text-xs text-text-rich dark:text-dark-text-rich truncate cursor-pointer hover:text-accent"
                                onClick={() => window.location.hash = `/author/${comment.user.id}`}
                            >
                                {comment.user.name}
                            </span>
                            <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-text-body dark:text-dark-text-body mt-1 break-words">{comment.content}</p>
                    </div>
                </div>
                
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={() => setIsReplying(!isReplying)} 
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent flex items-center gap-1"
                    >
                        <ArrowUturnLeftIcon className="w-3 h-3"/> Reply
                    </button>
                </div>

                {isReplying && (
                    <form onSubmit={handleSubmitReply} className="mt-3 animate-slide-in-bottom">
                         <textarea 
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder={`Replying to ${comment.user.name}...`}
                            className="w-full p-2 text-xs rounded-lg border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-body focus:ring-accent focus:border-accent resize-none mb-2"
                            rows={2}
                            autoFocus
                         />
                         <div className="flex justify-end gap-2">
                             <button type="button" onClick={() => setIsReplying(false)} className="text-xs px-3 py-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-border rounded">Cancel</button>
                             <button 
                                type="submit" 
                                disabled={isSubmitting || !replyContent.trim()}
                                className="text-xs bg-accent text-white px-3 py-1 rounded font-semibold hover:bg-primary transition-colors disabled:opacity-50"
                             >
                                 Reply
                             </button>
                         </div>
                    </form>
                )}
            </div>

            <div className="border-l-2 border-gray-100 dark:border-dark-border/50 ml-2 pl-0">
                {replies.map(reply => (
                    <CommentItem 
                        key={reply.id} 
                        comment={reply} 
                        allComments={allComments} 
                        onReply={onReply} 
                        depth={depth + 1} 
                    />
                ))}
            </div>
        </div>
    );
};

const CommentDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    comments: Comment[]; 
    paragraphIndex: number | null; 
    paragraphText?: string;
    onAddComment: (content: string, parentId?: string | null) => Promise<void>; 
}> = ({ isOpen, onClose, comments, paragraphIndex, paragraphText, onAddComment }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;
    
    const topLevelComments = comments.filter(c => !c.parentId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newComment.trim()) return;
        setIsSubmitting(true);
        await onAddComment(newComment, null);
        setNewComment('');
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
             <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
             <div 
                className="relative w-full max-w-md bg-white dark:bg-dark-surface h-full shadow-2xl flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
             >
                 <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-surface-alt">
                     <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">
                         {paragraphIndex !== null ? `Paragraph #${paragraphIndex + 1}` : 'Chapter Comments'}
                     </h3>
                     <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     {paragraphText && (
                         <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border-l-4 border-amber-400 text-sm text-gray-700 dark:text-gray-300 italic mb-6">
                             "{paragraphText.substring(0, 150)}{paragraphText.length > 150 ? '...' : ''}"
                         </div>
                     )}

                     {topLevelComments.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">No comments yet. Be the first!</div>
                     ) : (
                         topLevelComments.map(c => (
                             <CommentItem 
                                key={c.id} 
                                comment={c} 
                                allComments={comments} 
                                onReply={async (parentId, content) => await onAddComment(content, parentId)}
                                depth={0}
                             />
                         ))
                     )}
                 </div>

                 <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-alt">
                     <form onSubmit={handleSubmit}>
                         <textarea 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Start a new discussion..."
                            className="w-full p-3 rounded-lg border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-body text-sm focus:ring-accent focus:border-accent resize-none mb-2"
                            rows={3}
                         />
                         <button 
                            type="submit" 
                            disabled={isSubmitting || !newComment.trim()}
                            className="w-full bg-accent text-white font-sans font-semibold py-2 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                         >
                             {isSubmitting ? 'Posting...' : 'Post Comment'}
                         </button>
                     </form>
                 </div>
             </div>
        </div>
    );
};

export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId, chapterIndex, currentUser }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterIndex);
  const [fontSize, setFontSize] = useState(18);
  const [contentTheme, setContentTheme] = useState<ContentTheme>('light');
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);

  const lastScrollY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const saveProgressTimeoutRef = useRef<number | null>(null);
  const hasRecordedView = useRef<string | null>(null);
  
  const { theme: globalTheme } = useTheme();

  const chapter = book?.chapters[currentChapterIndex];
  
  const contentThemeClasses: Record<ContentTheme, string> = {
    light: 'bg-background text-text-body',
    dark: 'bg-[#261F1D] text-[#BCAAA4]',
    sepia: 'bg-[#FBF0D9] text-[#5B4636]',
  };
  
  // 1. Initial Load
  useEffect(() => {
    setIsLoading(true);
    api.getBookById(bookId).then(fetchedBook => {
      setBook(fetchedBook);
      setIsLoading(false);
    });
  }, [bookId]);

  // 2. Fetch Comments & Record View
  useEffect(() => {
      if(book && chapter) {
          api.getChapterComments(bookId, chapter.id).then(setComments);
          
          // Record view if not already recorded for this chapter in this session
          if (hasRecordedView.current !== chapter.id) {
              api.recordChapterView(bookId, chapter.id);
              hasRecordedView.current = chapter.id;
          }
      }
  }, [bookId, chapter]);

  // 3. Theme Sync
  useEffect(() => {
    if (globalTheme === 'dark') {
      setContentTheme('dark');
    } else {
      setContentTheme('light');
    }
  }, [globalTheme]);

  // 4. Progress Saving Logic
  const saveProgress = useCallback(() => {
      if (!currentUser || !book || !chapter) return;
      
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const maxScroll = fullHeight - windowHeight;
      
      let percentage = 0;
      if (maxScroll > 0) {
          percentage = (scrollTop / maxScroll) * 100;
      } else {
          percentage = 100; // Content fits in screen, so it's fully read
      }

      // Ensure percentage is between 0 and 100
      percentage = Math.min(100, Math.max(0, percentage));
      
      api.saveReadingProgress(
          currentUser.id, 
          book, 
          currentChapterIndex, 
          scrollTop, 
          percentage
      );
  }, [currentUser, book, currentChapterIndex, chapter]);

  // 5. Restore Progress Position on Load/Chapter Change
  useEffect(() => {
    if (!currentUser || !chapter) return;
    
    const restorePosition = async () => {
        const savedProgress = await api.getReadingProgressForBook(currentUser.id, bookId);
        if (savedProgress && savedProgress.chapters[chapter.id]) {
            const savedScroll = savedProgress.chapters[chapter.id].scrollPosition;
            if(savedScroll > 0) {
                window.scrollTo({ top: savedScroll, behavior: 'instant' });
            } else {
                window.scrollTo(0, 0);
            }
        } else {
            window.scrollTo(0, 0);
        }
    };
    
    // Tiny delay to allow DOM to render and images to load slightly
    setTimeout(restorePosition, 100);
  }, [bookId, chapter, currentUser]);


  // 6. Scroll Handler (Visibility & Progress Throttling)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Toolbar Visibility
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsToolbarVisible(false);
      } else {
        setIsToolbarVisible(true);
      }
      lastScrollY.current = currentScrollY;

      // Throttle Progress Saving (Save every 2 seconds max while scrolling)
      if (saveProgressTimeoutRef.current === null) {
          saveProgressTimeoutRef.current = window.setTimeout(() => {
              saveProgress();
              saveProgressTimeoutRef.current = null;
          }, 2000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup: Save immediately on unmount/chapter change and clear timeout
    return () => {
        window.removeEventListener('scroll', handleScroll);
        if (saveProgressTimeoutRef.current) {
            clearTimeout(saveProgressTimeoutRef.current);
        }
        saveProgress(); // Ensure final position is saved
    };
  }, [saveProgress]);


  const goToChapter = (index: number) => {
    if (!book || (index < 0 || index >= book.chapters.length)) return;
    saveProgress(); // Save before leaving
    setCurrentChapterIndex(index);
    window.location.hash = `/read/book/${book.id}/chapter/${index}`;
  };

  const openCommentDrawer = (index: number | null) => {
      setActiveParagraphIndex(index);
      setIsCommentDrawerOpen(true);
  };

  const handleAddComment = async (content: string, parentId: string | null = null) => {
      if(!book || !chapter) return;
      const newComment = await api.addChapterComment(bookId, chapter.id, activeParagraphIndex, content, parentId);
      setComments(prev => [newComment, ...prev]);
  };

  const scrollToParagraph = (index: number) => {
      const el = document.getElementById(`paragraph-${index}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('highlight-animation');
          void el.offsetWidth; 
          el.classList.add('highlight-animation');
      }
  };

  const TableOfContents: React.FC = () => {
        if (!book) return null;
        return (
            <div 
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${isTocVisible ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} 
            onClick={() => setIsTocVisible(false)}
            >
            <div 
                className={`absolute top-0 left-0 bottom-0 w-80 max-w-[80vw] ${globalTheme === 'dark' ? 'bg-dark-surface' : 'bg-background'} shadow-lg transform transition-transform duration-300 ${isTocVisible ? 'translate-x-0' : '-translate-x-full'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">Table of Contents</h3>
                <p className="text-sm text-text-body dark:text-dark-text-body truncate">{book.title}</p>
                </div>
                <ul className="overflow-y-auto h-[calc(100%-65px)]">
                {book.chapters.map((chap, index) => (
                    <li key={chap.id}>
                    <button 
                        onClick={() => { 
                        goToChapter(index); 
                        setIsTocVisible(false);
                        }}
                        className={`w-full text-left p-4 text-sm font-sans transition-colors ${index === currentChapterIndex ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-alt'} ${chap.status !== 'published' ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'dark:text-dark-text-body'}`}
                        disabled={chap.status !== 'published'}
                    >
                        <span className="block truncate">{chap.title}</span>
                        {chap.status !== 'published' && <span className="text-xs">(Not Released)</span>}
                    </button>
                    </li>
                ))}
                </ul>
            </div>
            </div>
        );
    }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading chapter...</div>;
  if (!book || !chapter) return <div className="min-h-screen flex items-center justify-center">Could not load content.</div>;

  const paragraphComments = (index: number) => comments.filter(c => c.paragraphIndex === index);
  const paragraphCommentCount = (index: number) => comments.filter(c => c.paragraphIndex === index && !c.parentId).length;

  return (
    <div className={`transition-colors duration-300 min-h-screen flex flex-col ${contentThemeClasses[contentTheme]}`}>
      <TableOfContents />
      
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${isToolbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${globalTheme === 'dark' ? 'bg-dark-surface/80 border-dark-border' : 'bg-background/80 border-gray-200'} backdrop-blur-md border-b`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => { saveProgress(); window.location.hash = `/book/${book.id}`; }} className="flex items-center gap-2 text-sm font-sans font-medium hover:text-accent dark:text-dark-text-body dark:hover:text-accent">
                <ChevronLeftIcon className="w-5 h-5"/>
                <span>{book.title}</span>
            </button>
             <div className="text-center">
                 <h2 className="font-sans font-semibold truncate dark:text-dark-text-rich">{chapter.title}</h2>
             </div>
            <div className="flex items-center gap-4">
                 <button onClick={() => setIsBookmarked(!isBookmarked)}>
                    <BookmarkIcon className={`w-5 h-5 transition-colors ${isBookmarked ? 'text-accent fill-accent/20' : 'text-gray-400 dark:text-gray-500 hover:text-accent dark:hover:text-accent'}`} />
                 </button>
                 <button onClick={() => setIsTocVisible(true)} className="text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors">
                    <Bars3Icon className="w-5 h-5"/>
                 </button>
            </div>
        </div>
      </header>

      {/* Content */}
      <main ref={contentRef} className="max-w-prose mx-auto px-4 pt-24 pb-12 flex-1">
        <h1 className="text-4xl font-serif font-bold mb-8 leading-snug">{chapter.title}</h1>
        <div 
          className="prose prose-lg lg:prose-xl dark:prose-invert"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
            {chapter.content.split('\n').map((paragraph, index) => {
                const count = paragraphCommentCount(index);
                return (
                    <div key={index} id={`paragraph-${index}`} className="group relative mb-6 rounded-lg transition-colors">
                        <p>{paragraph}</p>
                        <button 
                            onClick={() => openCommentDrawer(index)}
                            className={`absolute -right-12 top-0 p-2 rounded-full transition-all duration-200 ${count > 0 ? 'opacity-100 text-accent bg-accent/10' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
                            title="Add comment"
                        >
                            <div className="relative">
                                <PlusIcon className="w-5 h-5" />
                                {count > 0 && <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold px-1.5 rounded-full min-w-[16px] text-center">{count}</span>}
                            </div>
                        </button>
                    </div>
                );
            })}
        </div>
      </main>

      {/* Discussion Section (Bottom) */}
      <section className="max-w-4xl mx-auto w-full px-6 py-12 border-t border-gray-200 dark:border-dark-border bg-black/5 dark:bg-white/5 rounded-t-3xl">
          <div className="flex items-center justify-between mb-8">
              <h2 className="font-sans text-2xl font-bold dark:text-dark-text-rich">
                  Chapter Discussion <span className="text-base font-normal text-gray-500">({comments.length})</span>
              </h2>
              <button 
                onClick={() => openCommentDrawer(null)}
                className="bg-accent text-white font-sans font-semibold px-4 py-2 rounded-lg hover:bg-primary transition-colors text-sm"
              >
                  Add General Comment
              </button>
          </div>

          <div className="space-y-6">
              {comments.filter(c => !c.parentId && c.paragraphIndex === null).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No general comments yet.</p>
              ) : (
                  comments.filter(c => !c.parentId).slice(0, 3).map(comment => {
                      const snippet = comment.paragraphIndex !== null 
                          ? chapter.content.split('\n')[comment.paragraphIndex] 
                          : null;
                      
                      return (
                          <div key={comment.id} className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border cursor-pointer hover:border-accent/30 transition-colors" onClick={() => openCommentDrawer(comment.paragraphIndex)}>
                              <div className="flex items-start gap-4">
                                  <img 
                                    src={comment.user.avatarUrl} 
                                    alt={comment.user.name} 
                                    className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); window.location.hash = `/author/${comment.user.id}`; }}
                                  />
                                  <div className="flex-1">
                                      <div className="flex items-baseline justify-between">
                                          <h4 
                                            className="font-sans font-bold text-text-rich dark:text-dark-text-rich hover:text-accent cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); window.location.hash = `/author/${comment.user.id}`; }}
                                          >
                                            {comment.user.name}
                                          </h4>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      
                                      {snippet && comment.paragraphIndex !== null && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); scrollToParagraph(comment.paragraphIndex!); }}
                                            className="w-full text-left mt-2 mb-3 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-3 rounded-r-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group"
                                          >
                                              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1 flex items-center gap-2">
                                                  In response to paragraph #{comment.paragraphIndex + 1}
                                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">Jump to paragraph ↗</span>
                                              </p>
                                              <p className="text-sm text-gray-700 dark:text-gray-300 italic line-clamp-2 font-serif">"{snippet}"</p>
                                          </button>
                                      )}
                                      
                                      <p className="text-text-body dark:text-dark-text-body mt-2 leading-relaxed">{comment.content}</p>
                                      
                                      {comments.filter(r => r.parentId === comment.id).length > 0 && (
                                          <div className="mt-3 text-xs text-accent font-semibold flex items-center gap-1">
                                              <ArrowUturnLeftIcon className="w-3 h-3"/>
                                              {comments.filter(r => r.parentId === comment.id).length} Replies
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })
              )}
               {comments.filter(c => !c.parentId).length > 3 && (
                   <button onClick={() => openCommentDrawer(null)} className="w-full py-3 text-center text-accent font-sans font-semibold hover:underline">View All Discussions</button>
               )}
          </div>
      </section>

      {/* Footer Navigation */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className={`flex items-center justify-center gap-4 ${globalTheme === 'dark' ? 'bg-dark-surface/90 border-dark-border' : 'bg-surface/90 border-gray-200'} backdrop-blur-lg border rounded-2xl shadow-lg p-2`}>
            <button onClick={() => goToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex === 0} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronLeftIcon className="w-5 h-5"/></button>
            <span className="font-sans text-sm w-20 text-center dark:text-dark-text-body">{currentChapterIndex + 1} / {book.chapters.length}</span>
            <button onClick={() => goToChapter(currentChapterIndex + 1)} disabled={currentChapterIndex === book.chapters.length - 1} className="p-3 disabled:opacity-50 dark:text-dark-text-body"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      </footer>

      {/* Settings Toolbar */}
      <div className={`fixed top-1/2 -translate-y-1/2 right-4 z-20 flex flex-col gap-2 ${globalTheme === 'dark' ? 'bg-dark-surface/90 border-dark-border text-dark-text-body' : 'bg-surface/90 border-gray-200'} backdrop-blur-lg border rounded-full shadow-lg p-2 transition-all duration-300 ${isToolbarVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div ref={settingsPanelRef} className="relative">
            <button onClick={() => setIsSettingsPanelVisible(prev => !prev)} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors">
                <PaintBrushIcon className="w-5 h-5" />
            </button>
            <div className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 w-max ${globalTheme === 'dark' ? 'bg-dark-surface' : 'bg-surface'} shadow-md rounded-xl p-2 flex items-center gap-2 transition-all duration-200 origin-right ${isSettingsPanelVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <button onClick={() => setContentTheme('light')} className={`p-2 rounded-full ${contentTheme === 'light' ? 'ring-2 ring-accent' : ''}`}><SunIcon className="w-5 h-5 text-amber-600"/></button>
                <button onClick={() => setContentTheme('sepia')} className={`p-2 rounded-full ${contentTheme === 'sepia' ? 'ring-2 ring-accent' : ''}`}><div className="w-5 h-5 rounded-full bg-[#FBF0D9] border border-[#d3c0a5]"></div></button>
                <button onClick={() => setContentTheme('dark')} className={`p-2 rounded-full ${contentTheme === 'dark' ? 'ring-2 ring-accent' : ''}`}><MoonIcon className="w-5 h-5 text-gray-700"/></button>
            </div>
        </div>
        <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-xs font-bold">A-</button>
        <button onClick={() => setFontSize(s => Math.min(32, s + 1))} className="p-3 hover:bg-gray-100 dark:hover:bg-dark-surface-alt rounded-full transition-colors text-lg font-bold">A+</button>
      </div>

      <CommentDrawer 
        isOpen={isCommentDrawerOpen}
        onClose={() => setIsCommentDrawerOpen(false)}
        comments={activeParagraphIndex !== null ? paragraphComments(activeParagraphIndex) : comments.filter(c => c.paragraphIndex === null)}
        paragraphIndex={activeParagraphIndex}
        paragraphText={activeParagraphIndex !== null ? chapter.content.split('\n')[activeParagraphIndex] : undefined}
        onAddComment={handleAddComment}
      />
    </div>
  );
};
