import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { User } from '../types';
import type { CommunityPost } from '../types/community';
import * as api from '../api/community';
import { canShowCommunityContent, canShowCommunityDiscussion, communityError, withCommentCountDelta } from '../utils/community';
import { CommunityEmpty, CommunityError, CommunityLoading, CommunitySession } from '../components/community/CommunityShared';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { getReturnNavigation } from '../utils/navigation';
import { CommunityComments } from '../components/community/CommunityComments';

export const CommunityPostPage: React.FC<{ postId: string; currentUser: User | null; onSignIn: () => void }> = ({ postId, currentUser, onSignIn }) => {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [warningRevealed, setWarningRevealed] = useState(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setPost(null); setError(''); setWarningRevealed(false); api.getPost(postId, controller.signal).then(setPost).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [postId, currentUser?.id, retry]);
  const back = getReturnNavigation('/community', 'Back to community');
  return <CommunitySession user={currentUser} onSignIn={onSignIn}>
    <div className="community-post-page">
      <button type="button" className="community-back" onClick={back.onClick}><ArrowLeft size={17} />{back.label}</button>
      {loading ? <CommunityLoading /> : error ? <CommunityError message={error} onRetry={() => setRetry(value => value + 1)} /> : post ? <div className="community-detail-layout">
        <main><CommunityPostCard key={post.id} post={post} detail onUpdate={setPost} onDelete={() => setPost(null)} onWarningRevealChange={setWarningRevealed} />
          {canShowCommunityContent(post.status, post.canModerate) && canShowCommunityDiscussion(post.contentWarnings, warningRevealed) && <CommunityComments key={post.id} post={post} onCountChange={delta => setPost(previous => previous?.id === postId ? withCommentCountDelta(previous, delta) : previous)} />}
        </main>
        <aside className="community-detail-context"><p className="community-eyebrow">ABOUT THIS CIRCLE</p><h2>{post.circle.name}</h2><p>{post.circle.description}</p><a className="community-button" href={`#/community/circle/${encodeURIComponent(post.circle.slug)}`}>Explore circle</a>
          {post.circle.rules.length > 0 && <section className="community-rules"><h2>Good conversations start here</h2><ol>{post.circle.rules.map((rule, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></li>)}</ol></section>}
        </aside>
      </div> : <CommunityEmpty title="This conversation is no longer available.">Visit the community to find another conversation.</CommunityEmpty>}
    </div>
  </CommunitySession>;
};
