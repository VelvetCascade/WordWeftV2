import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../api/community';
import type { CommunityPost, FeedQuery } from '../../types/community';
import { communityError, mergeById } from '../../utils/community';
import { CommunityEmpty, CommunityError, CommunityLoading, useCommunitySession } from './CommunityShared';
import { CommunityPostCard } from './CommunityPostCard';

export const CommunityFeed: React.FC<{ query: FeedQuery; refreshKey?: number }> = ({ query, refreshKey = 0 }) => {
  const { user, requireAuth } = useCommunitySession();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const restricted = query.mode && query.mode !== 'discover' && !user;
  const { mode, circle, authorId, type } = query;
  useEffect(() => {
    const controller = new AbortController();
    generation.current += 1;
    setPosts([]); setCursor(null); setError(''); setLoadingMore(false);
    if (restricted) { setLoading(false); return; }
    setLoading(true);
    api.getFeed({ mode, circle, authorId, type }, controller.signal).then(page => { setPosts(mergeById([], page.items)); setCursor(page.nextCursor); }).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, circle, authorId, type, refreshKey, retry, user?.id, restricted]);
  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const current = generation.current;
    setLoadingMore(true); setError('');
    try { const page = await api.getFeed({ mode, circle, authorId, type, cursor }); if (current === generation.current) { setPosts(previous => mergeById(previous, page.items)); setCursor(page.nextCursor); } } catch (err) { if (current === generation.current) setError(communityError(err)); } finally { if (current === generation.current) setLoadingMore(false); }
  };
  if (restricted) return <CommunityEmpty title="Make this space your own">Sign in to see {mode === 'following' ? 'the writers you follow' : mode === 'saved' ? 'your saved conversations' : 'your joined circles'}.<button className="community-button primary" onClick={requireAuth}>Sign in to continue</button></CommunityEmpty>;
  return <div className="community-feed" aria-busy={loading || loadingMore}>
    {loading ? <CommunityLoading /> : <>{posts.map(post => <CommunityPostCard key={post.id} post={post} onUpdate={updated => setPosts(previous => previous.map(item => item.id === updated.id ? updated : item))} onDelete={id => setPosts(previous => previous.filter(item => item.id !== id))} />)}{!posts.length && !error && <CommunityEmpty title={mode === 'saved' ? 'Keep the conversations that stay with you.' : authorId ? 'The next chapter is still being written.' : 'There’s room for a new conversation.'}>{mode === 'saved' ? 'Save a post to find it here later.' : mode === 'following' ? 'Follow readers and writers from their profiles to see their updates here.' : mode === 'circles' ? 'Join a circle to bring its conversations into your feed.' : 'Share a reading discovery, ask a question, or let a story find its people.'}</CommunityEmpty>}</>}
    {error && <CommunityError message={error} onRetry={posts.length ? loadMore : () => setRetry(value => value + 1)} />}
    {cursor && <button className="community-button community-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading conversations…' : 'More conversations'}</button>}
  </div>;
};
