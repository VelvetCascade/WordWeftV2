import React, { useState } from 'react';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, Pin, LockKeyhole, BookOpen, ArrowUpRight, ShieldAlert } from 'lucide-react';
import * as api from '../../api/community';
import type { CommunityPost, PostModerationAction } from '../../types/community';
import { canShowCommunityContent, communityError, optimisticReaction, POST_LABELS, WARNING_LABELS } from '../../utils/community';
import { ReportModal } from '../ReportModal';
import { CommunityAuthor, CommunityModal, useCommunitySession } from './CommunityShared';
import { CommunityComposer } from './CommunityComposer';

export const CommunityPostCard: React.FC<{ post: CommunityPost; onUpdate: (post: CommunityPost) => void; onDelete: (id: string) => void; detail?: boolean; onWarningRevealChange?: (revealed: boolean) => void }> = ({ post, onUpdate, onDelete, detail = false, onWarningRevealChange }) => {
  const { user, requireAuth } = useCommunitySession();
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [action, setAction] = useState<'DELETE' | PostModerationAction | null>(null);
  const [reason, setReason] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const href = `#/community/post/${encodeURIComponent(post.id)}`;
  const own = post.author.id === user?.id;
  const showResults = !!post.votedOptionId || post.canEdit;
  const hidden = post.contentWarnings.length > 0 && !revealed;
  const active = post.status === 'ACTIVE';
  const showContent = canShowCommunityContent(post.status, post.canModerate);
  const setWarningRevealed = (next: boolean) => { setRevealed(next); onWarningRevealChange?.(next); };
  const react = async (kind: 'like' | 'save') => {
    if (!requireAuth() || pending) return;
    const active = kind === 'like' ? !post.liked : !post.saved;
    setPending(true); setError(''); onUpdate(optimisticReaction(post, kind, active));
    try { onUpdate(await api.setReaction(post.id, kind, active)); } catch (err) { onUpdate(post); setError(communityError(err)); } finally { setPending(false); }
  };
  const vote = async (optionId: string) => {
    if (!requireAuth() || pending) return;
    setPending(true); setError('');
    try { onUpdate(await api.vote(post.id, optionId)); } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  const confirmAction = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || pending) return;
    setPending(true); setError('');
    try {
      if (action === 'DELETE') { await api.deletePost(post.id); onDelete(post.id); }
      else onUpdate(await api.moderatePost(post.id, action, reason.trim() || undefined));
      setAction(null); setReason('');
    } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  return <article className={`community-post community-post-${post.type.toLowerCase()}`}>
    <header className="community-post-header"><CommunityAuthor author={post.author} date={post.createdAt} /><div className="community-post-menu"><button className="community-icon-button" aria-label="Post actions" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>{menuOpen && <div className="community-menu">
      {post.canEdit && post.status === 'ACTIVE' && <><button onClick={() => { setMenuOpen(false); setEditing(true); }}>Edit post</button><button onClick={() => { setMenuOpen(false); setAction('DELETE'); }}>Delete post</button></>}
      {!own && post.status === 'ACTIVE' && <button onClick={() => { setMenuOpen(false); if (requireAuth()) setReporting(true); }}>Report post</button>}
      {post.canModerate && <>{(post.status === 'ACTIVE' ? [post.pinned ? 'UNPIN' : 'PIN', post.locked ? 'UNLOCK' : 'LOCK', 'REMOVE'] : ['RESTORE']).map(value => <button key={value} disabled={pending} onClick={() => { setMenuOpen(false); setAction(value as PostModerationAction); }}>{value === 'PIN' ? 'Pin in circle' : value === 'UNPIN' ? 'Unpin post' : value === 'LOCK' ? 'Lock discussion' : value === 'UNLOCK' ? 'Unlock discussion' : value === 'REMOVE' ? 'Remove post' : 'Restore post'}</button>)}</>}
      <a href={href}>Open discussion</a>
    </div>}</div></header>
    <div className="community-post-meta"><a href={`#/community/circle/${encodeURIComponent(post.circle.slug)}`}>{post.circle.name}</a><span className="community-format-label">{POST_LABELS[post.type]}</span>{post.pinned && <span><Pin size={12} /> Pinned</span>}{post.locked && <span><LockKeyhole size={12} /> Locked</span>}</div>
    {!showContent ? <p className="community-tombstone">This post has been {post.status === 'DELETED' ? 'deleted by its author' : 'removed by moderation'}.</p> : <>
      {!active && <p className="community-moderation-preview">Removed post · visible to moderators only</p>}
      {hidden ? <div className="community-warning-gate"><ShieldAlert size={22} aria-hidden="true" /><strong>Read on your terms</strong><p>{post.contentWarnings.map(warning => WARNING_LABELS[warning] || warning).join(' · ')}</p><button className="community-button" onClick={() => setWarningRevealed(true)} aria-expanded={false}>Reveal post</button></div> : <div className="community-post-content">
        {post.contentWarnings.length > 0 && <button className="community-text-button community-warning-toggle" onClick={() => setWarningRevealed(false)} aria-expanded={true}>Hide content · {post.contentWarnings.map(warning => WARNING_LABELS[warning] || warning).join(', ')}</button>}
        {post.title && (detail ? <h1 className="community-post-title">{post.title}</h1> : <h2 className="community-post-title"><a href={href}>{post.title}</a></h2>)}
        <p className="community-post-body">{post.body}</p>
        {post.attachment && <a className="community-book-attachment" href={post.attachment.chapterId && post.attachment.chapterIndex !== null ? `#/read/book/${encodeURIComponent(post.attachment.bookId)}/chapter/${post.attachment.chapterIndex}` : `#/book/${encodeURIComponent(post.attachment.bookId)}`}>
          {post.attachment.coverUrl ? <img src={post.attachment.coverUrl} alt="" loading="lazy" /> : <span className="community-book-placeholder"><BookOpen size={24} /></span>}
          <span><small>{post.attachment.chapterTitle ? 'Chapter conversation' : 'On the bookshelf'} · {post.attachment.ageRating.replaceAll('_', ' ')}</small><strong>{post.attachment.title}</strong><span>{post.attachment.chapterTitle || `by ${post.attachment.authorName}`}</span></span><ArrowUpRight size={18} aria-hidden="true" />
        </a>}
        {post.type === 'POLL' && <div className="community-poll" role="group" aria-label={post.title || 'Community poll'}>{post.pollOptions.map(option => {
          const percentage = post.voteCount ? Math.round(option.voteCount / post.voteCount * 100) : 0;
          return showResults ? <div key={option.id} className={`community-poll-result ${post.votedOptionId === option.id ? 'selected' : ''}`}><span className="community-poll-bar" style={{ width: `${percentage}%` }} /><span>{option.text}{post.votedOptionId === option.id ? ' ✓' : ''}</span><strong>{percentage}% <small>({option.voteCount})</small></strong></div> : <button key={option.id} className="community-poll-option" disabled={pending || own || post.locked} onClick={() => vote(option.id)}>{option.text}</button>;
        })}<small>{showResults ? `${post.voteCount} ${post.voteCount === 1 ? 'vote' : 'votes'} · Results` : post.locked ? 'Voting is closed.' : 'Vote to see results. Your vote cannot be changed.'}</small></div>}
      </div>}
      {active && <footer className="community-post-actions"><button aria-label={post.liked ? 'Unlike post' : 'Like post'} aria-pressed={post.liked} disabled={pending || own} onClick={() => react('like')} title={own ? 'You cannot like your own post' : undefined}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likeCount}</span></button><a href={href}><MessageCircle size={17} /><span>{post.commentCount} <span className="community-action-word">replies</span></span></a><button className="community-save" aria-pressed={post.saved} disabled={pending} onClick={() => react('save')}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saved ? 'Saved' : 'Save'}</span></button></footer>}
    </>}
    {error && !action && <p className="community-error" role="alert">{error}</p>}
    {editing && <CommunityComposer circles={[post.circle]} editing={post} onClose={() => setEditing(false)} onSaved={onUpdate} />}
    <ReportModal isOpen={reporting} onClose={() => setReporting(false)} targetType="COMMUNITY_POST" targetId={post.id} targetTitle={post.title || `Post by ${post.author.name}`} />
    {action && <CommunityModal title={action === 'DELETE' ? 'Delete this post?' : `${action.charAt(0)}${action.slice(1).toLowerCase()} post?`} onClose={() => { setAction(null); setError(''); }} busy={pending}><form className="community-dialog-body" onSubmit={confirmAction}><p>{action === 'DELETE' ? 'This removes your post from the community. This cannot be undone.' : 'This action will change the discussion for everyone in the circle.'}</p>{action !== 'DELETE' && <label className="community-field">Moderation reason {action === 'REMOVE' ? '(required)' : '(optional)'}<textarea required={action === 'REMOVE'} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>}{error && <p className="community-error" role="alert">{error}</p>}<div className="community-dialog-actions"><button type="button" className="community-button" disabled={pending} onClick={() => setAction(null)}>Cancel</button><button className="community-button primary" disabled={pending || (action === 'REMOVE' && !reason.trim())}>{pending ? 'Saving…' : 'Confirm'}</button></div></form></CommunityModal>}
  </article>;
};
