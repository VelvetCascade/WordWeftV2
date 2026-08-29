import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { User } from '../types';
import type { CommunityPost } from '../types/community';
import * as api from '../api/community';
import { canShowCommunityContent, canShowCommunityDiscussion, communityError, withCommentCountDelta } from '../utils/community';
import { CommunityEmpty, CommunityError, CommunityLoading, CommunitySession } from '../components/community/CommunityShared';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { CommunityComments } from '../components/community/CommunityComments';

export const CommunityPostPage: React.FC<{ postId: string; currentUser: User | null; onSignIn: () => void }> = ({ postId, currentUser, onSignIn }) => {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [warningRevealed, setWarningRevealed] = useState(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setPost(null); setError(''); setWarningRevealed(false); api.getPost(postId, controller.signal).then(setPost).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [postId, currentUser?.id, retry]);
  return <CommunitySession user={currentUser} onSignIn={onSignIn}><div className="community-post-page"><a className="community-back" href={post ? `#/community/circle/${encodeURIComponent(post.circle.slug)}` : '#/community'}><ArrowLeft size={17} />{post ? `Back to ${post.circle.name}` : 'Back to Community'}</a>{loading ? <CommunityLoading /> : error ? <CommunityError message={error} onRetry={() => setRetry(value => value + 1)} /> : post ? <><CommunityPostCard key={post.id} post={post} detail onUpdate={setPost} onDelete={() => setPost(null)} onWarningRevealChange={setWarningRevealed} />{canShowCommunityContent(post.status, post.canModerate) && canShowCommunityDiscussion(post.contentWarnings, warningRevealed) && <CommunityComments key={post.id} post={post} onCountChange={delta => setPost(previous => previous?.id === postId ? withCommentCountDelta(previous, delta) : previous)} />}</> : <CommunityEmpty title="This conversation is no longer available.">Visit the community to find another conversation.</CommunityEmpty>}</div></CommunitySession>;
};
