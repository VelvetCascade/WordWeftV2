import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Cloud, Heart, MessageCircle, NotebookPen, Plus, Search, Share2, Users } from 'lucide-react';
import type { User, Book, Chapter, Comment } from '../types';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WriterQuickStart } from '../components/WriterQuickStart';
import { ShareModal } from '../components/ShareModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResilientImage } from '../components/ResilientImage';
import { DisclosureMenu } from '../components/DisclosureMenu';
import { navigatePath } from '../utils/navigation';

interface WriterDashboardProps { currentUser: User; onUserUpdate: (user: User) => void; }
type StudioView = 'overview' | 'stories' | 'comments';
type ReaderComment = Comment & { bookTitle: string; chapterTitle: string };
const readView = (): StudioView => {
    const value = new URLSearchParams(window.location.search).get('view');
    return value === 'stories' || value === 'comments' ? value : 'overview';
};
const studioPath = (book: Book) => `/write/book/${book.id}/manage`;
const editPath = (book: Book, chapter?: Chapter) => `/write/book/${book.id}/chapter/${chapter?.id || 'new'}/edit`;

export const WriterDashboardPage: React.FC<WriterDashboardProps> = ({ currentUser, onUserUpdate }) => {
    const [view, setView] = useState<StudioView>(readView);
    const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
    const [search, setSearch] = useState('');
    const [shareBook, setShareBook] = useState<Book | null>(null);
    const [unpublishTarget, setUnpublishTarget] = useState<Book | null>(null);
    const [pendingBookId, setPendingBookId] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');
    const [comments, setComments] = useState<ReaderComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState('');
    const [commentsRefresh, setCommentsRefresh] = useState(0);
    const [replyTarget, setReplyTarget] = useState<ReaderComment | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replySending, setReplySending] = useState(false);
    const { trackEvent } = useAnalytics();
    const allBooks = currentUser.writtenBooks || [];
    const published = allBooks.filter(book => book.publicationStatus === 'published');
    const drafts = allBooks.filter(book => book.publicationStatus === 'draft');
    const totalViews = published.reduce((total, book) => total + (book.viewCount || 0), 0);
    const totalComments = published.reduce((total, book) => total + (book.commentCount || 0), 0);
    const publishedChapterCount = published.reduce((total, book) => total + book.chapters.filter(chapter => chapter.status === 'published').length, 0);
    const recentDraft = useMemo(() => {
        const available = allBooks.flatMap(book => book.chapters.filter(chapter => chapter.status === 'draft' || chapter.hasUnpublishedChanges).map(chapter => ({ book, chapter })));
        try {
            const recent = JSON.parse(localStorage.getItem(`ww:last-writing:${currentUser.id}`) || 'null');
            const matched = available.find(item => item.book.id === recent?.bookId && item.chapter.id === recent?.chapterId);
            if (matched) return matched;
        } catch { /* The studio can still resume a server draft when browser storage is unavailable. */ }
        return available[available.length - 1] || (drafts.length ? { book: drafts[drafts.length - 1], chapter: undefined } : undefined);
    }, [allBooks, currentUser.id]);
    const visibleBooks = allBooks.filter(book => (filter === 'all' || book.publicationStatus === filter) && book.title.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => { trackEvent('writing', 'writer_dashboard_view'); }, []);
    useEffect(() => {
        const sync = () => setView(readView());
        window.addEventListener('wordweft:navigate', sync);
        window.addEventListener('popstate', sync);
        window.addEventListener('hashchange', sync);
        return () => { window.removeEventListener('wordweft:navigate', sync); window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
    }, []);
    useEffect(() => {
        if (view !== 'comments') return;
        let active = true;
        setCommentsLoading(true);
        setCommentsError('');
        const chapters = published.flatMap(book => book.chapters.filter(chapter => chapter.status === 'published' && chapter.commentCount > 0).map(chapter => ({ book, chapter })));
        Promise.allSettled(chapters.map(async ({ book, chapter }) => (await api.getChapterComments(book.id, chapter.id)).map(comment => ({ ...comment, bookTitle: book.title, chapterTitle: chapter.title })))).then(results => {
            if (!active) return;
            setComments(results.flatMap(result => result.status === 'fulfilled' ? result.value : []).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
            if (results.some(result => result.status === 'rejected')) setCommentsError('Some chapter comments could not load. Try again to fetch the rest.');
            setCommentsLoading(false);
        });
        return () => { active = false; };
    }, [view, currentUser.writtenBooks, commentsRefresh]);

    const handleUnpublish = async () => {
        if (!unpublishTarget || pendingBookId) return;
        setPendingBookId(unpublishTarget.id);
        setActionError('');
        try { onUserUpdate(await api.unpublishBook(currentUser.id, unpublishTarget.id)); setUnpublishTarget(null); }
        catch (failure) { setActionError(failure instanceof Error ? failure.message : 'The story could not be unpublished.'); }
        finally { setPendingBookId(null); }
    };
    const sendReply = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!replyTarget || !replyText.trim() || replySending) return;
        setReplySending(true);
        try {
            await api.addChapterComment(replyTarget.bookId, replyTarget.chapterId, replyTarget.paragraphIndex, replyText.trim(), replyTarget.id);
            setReplyTarget(null); setReplyText(''); setCommentsRefresh(value => value + 1);
        } catch (failure) { setCommentsError(failure instanceof Error ? failure.message : 'Your reply could not be sent.'); }
        finally { setReplySending(false); }
    };

    const renderStory = (book: Book) => <article key={book.id} className="ww-studio-story-row">
        <a className="ww-studio-story-cover" href={studioPath(book)}><ResilientImage src={book.coverUrl} alt={`Cover of ${book.title}`} fallbackLabel={book.title} variant="cover" className="ww-studio-row-cover" /></a>
        <div className="ww-studio-story-copy"><a href={studioPath(book)}><h3>{book.title}</h3></a><p>{book.genres[0] || book.category || 'Story'} · {book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'}</p></div>
        <span className={`ww-studio-status ${book.publicationStatus}`}>{book.publicationStatus === 'published' ? 'Published' : 'Private draft'}</span>
        <DisclosureMenu label={`Actions for ${book.title}`}><a href={studioPath(book)}><NotebookPen size={16} />Manage chapters</a><a href={editPath(book, [...book.chapters].reverse().find(chapter => chapter.status === 'draft'))}><Plus size={16} />{book.chapters.some(chapter => chapter.status === 'draft') ? 'Continue draft' : 'New chapter'}</a>{book.publicationStatus === 'published' && <><button onClick={() => setShareBook(book)}><Share2 size={16} />Share story</button><a href="/write/analytics"><BookOpen size={16} />Statistics</a><button onClick={() => setUnpublishTarget(book)} disabled={pendingBookId === book.id}>Return to draft</button></>}</DisclosureMenu>
    </article>;

    return (
        <div className="ww-writer-dashboard" data-view={view}>
            <header className="ww-studio-pagehead">
                <span className="ww-studio-eyebrow">{view === 'comments' ? 'Reader conversation' : 'Your writing'}</span>
                <div><div><h1>{view === 'stories' ? 'My stories' : view === 'comments' ? 'Reader comments' : 'Writer studio'}</h1><p>{view === 'overview' ? `Welcome back, ${currentUser.name.split(' ')[0]}. Pick up your draft, or start something new.` : view === 'stories' ? 'Every world you’re building, in one place.' : 'Read what stayed with your readers, and keep the conversation going.'}</p></div>{view !== 'comments' && <a href="/write/book/create" className="ww-studio-primary">New story <Plus size={18} /></a>}</div>
            </header>
            {actionError && <p className="ww-studio-alert" role="alert">{actionError}</p>}

            {view === 'overview' && <>
                {recentDraft ? <section className="ww-studio-resume" aria-label="Continue your draft"><ResilientImage src={recentDraft.book.coverUrl} alt="" fallbackLabel={recentDraft.book.title} variant="cover" className="ww-studio-resume-cover" loading="eager" /><div><span className="ww-studio-eyebrow">Continue your draft</span><h2>{recentDraft.chapter?.title || recentDraft.book.title}</h2><p>{recentDraft.book.title}{recentDraft.chapter ? ` · Chapter ${recentDraft.book.chapters.indexOf(recentDraft.chapter) + 1} · ${recentDraft.chapter.wordCount.toLocaleString()} words` : ' · Ready for its first chapter'}</p><span className="ww-studio-private"><Cloud size={16} />Private until you publish</span></div><a href={editPath(recentDraft.book, recentDraft.chapter)} className="ww-studio-primary">Continue writing <ArrowRight size={19} /></a></section> : <section className="ww-studio-resume ww-studio-resume-empty"><div className="ww-studio-empty-icon"><NotebookPen size={30} strokeWidth={1.5} /></div><div><span className="ww-studio-eyebrow">Your next story starts here</span><h2>A place for your unfinished ideas.</h2><p>Create a private draft. Take it one chapter at a time.</p></div><a href="/write/book/create" className="ww-studio-primary">Start a story <ArrowRight size={19} /></a></section>}
                <section className="ww-studio-metrics" aria-label="Writing overview"><article><BookOpen size={20} /><span>Total chapter reads</span><strong>{totalViews.toLocaleString()}</strong><small>Across {publishedChapterCount} published chapters</small></article><article><Users size={20} /><span>Followers</span><strong>{(currentUser.followersCount || 0).toLocaleString()}</strong><small>Your writing community</small></article><article><MessageCircle size={20} /><span>Comments</span><strong>{totalComments.toLocaleString()}</strong><a href="/write?view=comments">Open reader conversations <ArrowRight size={14} /></a></article></section>
                <div className="ww-studio-overview-grid"><section className="ww-studio-stories"><header><h2>Your stories</h2><a href="/write?view=stories">View all <ArrowRight size={18} /></a></header>{allBooks.length ? allBooks.slice(0, 4).map(renderStory) : <div className="ww-studio-empty"><BookOpen size={30} /><h3>Your first story is waiting.</h3><p>Add a title, a little context, and the opening chapter.</p><a href="/write/book/create" className="ww-studio-text-link">Create your first story <ArrowRight size={17} /></a></div>}</section><aside className="ww-studio-conversation"><span className="ww-studio-eyebrow">Reader conversation</span><h3>{totalComments ? `${totalComments.toLocaleString()} comments on your writing` : 'Stories start conversations.'}</h3><p>{totalComments ? 'Come back to a thought from your readers, and reply when you have a moment.' : 'When readers respond to a published chapter, their comments will be here.'}</p><a href="/write?view=comments" className="ww-studio-text-link">Open comments <ArrowRight size={18} /></a><div className="ww-studio-conversation-rule" /><span className="ww-studio-eyebrow">Your manuscript</span><p>{drafts.length} private {drafts.length === 1 ? 'story' : 'stories'} · {published.length} published</p><a href="/write/analytics" className="ww-studio-text-link">View statistics <ArrowRight size={18} /></a></aside></div>
                <div className="ww-studio-quickstart"><WriterQuickStart currentUser={currentUser} /></div>
            </>}

            {view === 'stories' && <section><div className="ww-studio-story-filters"><div role="tablist" aria-label="Story status">{(['all', 'published', 'draft'] as const).map(value => <button role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{value === 'all' ? 'All stories' : value === 'draft' ? 'Drafts' : 'Published'}<small>{value === 'all' ? allBooks.length : value === 'draft' ? drafts.length : published.length}</small></button>)}</div><label><Search size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your stories" aria-label="Search your stories" /></label></div><div className="ww-studio-stories is-story-library">{visibleBooks.length ? visibleBooks.map(renderStory) : <div className="ww-studio-empty"><NotebookPen size={32} /><h3>{search ? 'No matching stories.' : 'A blank page is a beginning.'}</h3><p>{search ? 'Try another title or change the status filter.' : 'Your stories stay private until you choose to publish.'}</p>{!search && <a className="ww-studio-primary" href="/write/book/create">Create a story <Plus size={18} /></a>}</div>}</div></section>}

            {view === 'comments' && <section className="ww-studio-comments">{commentsError && <div role="alert" className="ww-studio-alert">{commentsError}<button onClick={() => setCommentsRefresh(value => value + 1)}>Try again</button></div>}{commentsLoading ? <p role="status" className="ww-studio-empty">Loading reader conversations…</p> : comments.filter(comment => !comment.parentId).length ? comments.filter(comment => !comment.parentId).map(comment => <article className="ww-studio-comment" key={comment.id}><header><span className="ww-studio-avatar">{comment.user.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span><div><strong>{comment.user.name}</strong><p>{comment.bookTitle} · {comment.chapterTitle}</p></div><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time></header><p className="ww-studio-comment-content">{comment.content}</p>{comments.filter(reply => reply.parentId === comment.id).map(reply => <div className="ww-studio-comment-reply" key={reply.id}><strong>{reply.user.name}</strong><p>{reply.content}</p></div>)}{replyTarget?.id === comment.id ? <form onSubmit={sendReply}><label htmlFor="studio-comment-reply">Your reply</label><textarea id="studio-comment-reply" value={replyText} onChange={event => setReplyText(event.target.value)} rows={3} autoFocus required /><div><button type="button" onClick={() => setReplyTarget(null)} disabled={replySending}>Cancel</button><button className="ww-studio-primary" disabled={replySending || !replyText.trim()}>{replySending ? 'Sending…' : 'Post reply'}<ArrowRight size={16} /></button></div></form> : <button className="ww-studio-text-link" onClick={() => { setReplyTarget(comment); setReplyText(''); }}><MessageCircle size={16} />Reply</button>}</article>) : <div className="ww-studio-empty"><MessageCircle size={34} /><h3>No reader comments yet.</h3><p>Publish and share a chapter to invite a conversation.</p><a href="/write?view=stories" className="ww-studio-text-link">Go to your stories <ArrowRight size={18} /></a></div>}</section>}
            {shareBook && <ShareModal isOpen onClose={() => setShareBook(null)} book={shareBook} shareTextOverride={`Read my story '${shareBook.title}' on WordWeft.`} />}
            <ConfirmDialog isOpen={!!unpublishTarget} title="Unpublish story?" message={`“${unpublishTarget?.title || 'This story'}” will be removed from public reading and return to your drafts. The manuscript stays saved, and you can publish it again.`} confirmLabel="Unpublish story" processingLabel="Unpublishing…" isProcessing={!!pendingBookId} tone="warning" onCancel={() => setUnpublishTarget(null)} onConfirm={handleUnpublish} />
        </div>
    );
};
