import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import * as api from '../../api/community';
import type { CommunityComment, CommunityPost } from '../../types/community';
import { canShowCommunityContent, commentVisibilityDelta, communityError, communityReplyTargetId, groupComments, mergeById, optimisticReaction, validateComment } from '../../utils/community';
import { ReportModal } from '../ReportModal';
import { CommunityAuthor, CommunityEmpty, CommunityError, CommunityLoading, CommunityModal, useCommunitySession } from './CommunityShared';

const CommentForm: React.FC<{ postId: string; parentId?: string; onAdded: (comment: CommunityComment) => void; onCancel?: () => void }> = ({ postId, parentId, onAdded, onCancel }) => {
  const { user, requireAuth } = useCommunitySession();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!requireAuth() || pending) return;
    const validation = validateComment(body); setError(validation); if (validation) return;
    setPending(true);
    try { const comment = await api.addComment(postId, body.trim(), parentId); onAdded(comment); setBody(''); onCancel?.(); } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  if (!user) return <button className="community-sign-in-comment community-button" onClick={requireAuth}>Sign in to join the conversation</button>;
  return <form className="community-comment-form" onSubmit={submit}><label className="community-field">{parentId ? 'Your reply' : 'Add your voice'}<textarea rows={3} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} placeholder="Be thoughtful. Be curious. Keep it about the story." /><small>{body.length}/2,000</small></label>{error && <p role="alert" className="community-error">{error}</p>}<div className="community-dialog-actions">{onCancel && <button type="button" className="community-button" disabled={pending} onClick={onCancel}>Cancel</button>}<button className="community-button primary" disabled={pending}>{pending ? 'Posting…' : parentId ? 'Post reply' : 'Post comment'}</button></div></form>;
};
const CommentItem: React.FC<{ comment: CommunityComment; post: CommunityPost; onUpdate: (comment: CommunityComment) => void; onAdded: (comment: CommunityComment) => void; orphan?: boolean }> = ({ comment, post, onUpdate, onAdded, orphan }) => {
  const { user, requireAuth } = useCommunitySession();
  const [reply, setReply] = useState(false);
  const [report, setReport] = useState(false);
  const [action, setAction] = useState<'DELETE' | 'REMOVE' | 'RESTORE' | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = comment.status === 'ACTIVE';
  const showContent = canShowCommunityContent(comment.status, comment.canModerate);
  const like = async () => {
    if (!requireAuth() || pending) return;
    setPending(true); setError(''); onUpdate(optimisticReaction(comment, 'like', !comment.liked));
    try { onUpdate(await api.setCommentLike(comment.id, !comment.liked)); } catch (err) { onUpdate(comment); setError(communityError(err)); } finally { setPending(false); }
  };
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || pending) return;
    setPending(true); setError('');
    try {
      if (action === 'DELETE') { await api.deleteComment(comment.id); onUpdate({ ...comment, body: '', status: 'DELETED', canEdit: false }); }
      else onUpdate(await api.moderateComment(comment.id, action, reason.trim()));
      setAction(null); setReason('');
    } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  return <article className="community-comment" id={`comment-${comment.id}`}>
    {orphan && <p className="community-muted">Reply to an earlier comment · Load more to find the full thread.</p>}
    {showContent ? <><CommunityAuthor author={comment.author} date={comment.createdAt} />{!active && <p className="community-moderation-preview">Removed comment · visible to moderators only</p>}<p className="community-post-body">{comment.body}</p></> : <p className="community-tombstone">{comment.status === 'DELETED' ? 'This comment was deleted by its author.' : 'This comment was removed by moderation.'}</p>}
    <div className="community-comment-actions">{active && <><button aria-label={comment.liked ? 'Unlike comment' : 'Like comment'} aria-pressed={comment.liked} disabled={pending || comment.author.id === user?.id} onClick={like}><Heart size={14} fill={comment.liked ? 'currentColor' : 'none'} />{comment.likeCount}</button>{!post.locked && <button disabled={pending} onClick={() => { if (requireAuth()) setReply(!reply); }}>Reply</button>}{comment.canEdit && <button disabled={pending} onClick={() => setAction('DELETE')}>Delete</button>}{comment.author.id !== user?.id && <button onClick={() => { if (requireAuth()) setReport(true); }}>Report</button>}</>}{comment.canModerate && comment.status !== 'DELETED' && <button disabled={pending} onClick={() => setAction(active ? 'REMOVE' : 'RESTORE')}>{active ? 'Remove' : 'Restore'}</button>}</div>
    {error && !action && <p className="community-error" role="alert">{error}</p>}
    {reply && !post.locked && <CommentForm postId={post.id} parentId={communityReplyTargetId(comment)} onAdded={onAdded} onCancel={() => setReply(false)} />}
    <ReportModal isOpen={report} onClose={() => setReport(false)} targetType="COMMUNITY_COMMENT" targetId={comment.id} targetTitle={`Comment by ${comment.author.name}`} />
    {action && <CommunityModal title={`${action === 'DELETE' ? 'Delete' : action === 'REMOVE' ? 'Remove' : 'Restore'} this comment?`} onClose={() => setAction(null)} busy={pending}><form className="community-dialog-body" onSubmit={confirm}><p>{action === 'DELETE' ? 'The comment text will be deleted. Replies remain in the conversation.' : 'This moderation action changes visibility for everyone.'}</p>{action !== 'DELETE' && <label className="community-field">Reason<textarea value={reason} maxLength={1000} required={action === 'REMOVE'} onChange={event => setReason(event.target.value)} /></label>}{error && <p className="community-error" role="alert">{error}</p>}<div className="community-dialog-actions"><button type="button" disabled={pending} className="community-button" onClick={() => setAction(null)}>Cancel</button><button className="community-button primary" disabled={pending || action === 'REMOVE' && !reason.trim()}>{pending ? 'Saving…' : 'Confirm'}</button></div></form></CommunityModal>}
  </article>;
};
export const CommunityComments: React.FC<{ post: CommunityPost; onCountChange: (delta: number) => void }> = ({ post, onCountChange }) => {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const { user } = useCommunitySession();
  useEffect(() => {
    const controller = new AbortController(); generation.current += 1;
    setLoading(true); setError(''); setComments([]); setCursor(null); setMore(false);
    api.getComments(post.id, undefined, controller.signal).then(page => { setComments(page.items); setCursor(page.nextCursor); }).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [post.id, retry, user?.id]);
  const loadMore = async () => {
    if (!cursor || more) return;
    const current = generation.current; setMore(true); setError('');
    try { const page = await api.getComments(post.id, cursor); if (current === generation.current) { setComments(previous => mergeById(previous, page.items)); setCursor(page.nextCursor); } } catch (err) { if (current === generation.current) setError(communityError(err)); } finally { if (current === generation.current) setMore(false); }
  };
  const added = (comment: CommunityComment) => {
    const delta = commentVisibilityDelta(comments.find(item => item.id === comment.id), comment);
    setComments(previous => mergeById(previous, [comment]));
    if (delta) onCountChange(delta);
  };
  const update = (comment: CommunityComment) => {
    const previousComment = comments.find(item => item.id === comment.id);
    const delta = previousComment ? commentVisibilityDelta(previousComment, comment) : 0;
    setComments(previous => previous.map(item => item.id === comment.id ? comment : item));
    if (delta) onCountChange(delta);
  };
  return <section className="community-comments"><header><h2>The conversation</h2><span>{post.commentCount}</span></header>{post.status !== 'ACTIVE' ? <p className="community-locked-note">This removed discussion is read-only while moderators review it.</p> : post.locked ? <p className="community-locked-note">This discussion is locked. You can still read the conversation.</p> : <CommentForm key={post.id} postId={post.id} onAdded={added} />}
    {loading ? <CommunityLoading /> : groupComments(comments).map(group => <div className="community-comment-thread" key={group.root.id}><CommentItem comment={group.root} post={post} onUpdate={update} onAdded={added} orphan={group.orphan} />{group.replies.length > 0 && <div className="community-replies">{group.replies.map(comment => <CommentItem key={comment.id} comment={comment} post={post} onUpdate={update} onAdded={added} />)}</div>}</div>)}
    {!loading && !comments.length && !error && <CommunityEmpty title="The conversation starts here.">Leave the first thoughtful response.</CommunityEmpty>}
    {error && <CommunityError message={error} onRetry={comments.length ? loadMore : () => setRetry(value => value + 1)} />}{cursor && <button className="community-button community-load-more" disabled={more} onClick={loadMore}>{more ? 'Loading…' : 'More comments'}</button>}
  </section>;
};
