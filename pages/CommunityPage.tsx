import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, Compass, Feather, MessageCircle, Plus, Settings2, ShieldCheck, Users } from 'lucide-react';
import type { User } from '../types';
import type { Circle, CommunityMe, FeedMode, PostType } from '../types/community';
import * as api from '../api/community';
import { communityComposeLink, communityError, communityFeedLink, communityFeedMode, POST_LABELS } from '../utils/community';
import { CommunityEmpty, CommunityError, CommunitySession, useCommunitySession } from '../components/community/CommunityShared';
import { CommunityFeed } from '../components/community/CommunityFeed';
import { CommunityComposer } from '../components/community/CommunityComposer';
import { CommunitySettings } from '../components/community/CommunitySettings';
import { CommunityModeration } from '../components/community/CommunityModeration';

interface Props { currentUser: User | null; onSignIn: () => void; circleSlug?: string; query?: string }
const MODES: { mode: FeedMode; label: string; icon: typeof Compass }[] = [{ mode: 'discover', label: 'Discover', icon: Compass }, { mode: 'following', label: 'Following', icon: Users }, { mode: 'circles', label: 'My circles', icon: MessageCircle }, { mode: 'saved', label: 'Saved', icon: Bookmark }];
const CommunityContent: React.FC<Pick<Props, 'circleSlug' | 'query'>> = ({ circleSlug, query = '' }) => {
  const { user, requireAuth } = useCommunitySession();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<FeedMode>('discover');
  const [type, setType] = useState<PostType | ''>('');
  const [composer, setComposer] = useState(false);
  const [settings, setSettings] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [joining, setJoining] = useState<string[]>([]);
  const circle = circles.find(item => item.slug === circleSlug);
  const params = new URLSearchParams(query);
  const desiredType = params.get('type') as PostType;
  const initialType = Object.prototype.hasOwnProperty.call(POST_LABELS, desiredType) ? desiredType : 'UPDATE';
  useEffect(() => {
    const controller = new AbortController(); setLoadingCircles(true); setError(''); setMe(null);
    api.getCircles(controller.signal).then(setCircles).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoadingCircles(false); });
    if (user) api.getMe(controller.signal).then(setMe).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); });
    return () => controller.abort();
  }, [user?.id, retry]);
  useEffect(() => { setMode(communityFeedMode(query)); setType(''); setModerating(false); }, [circleSlug, query]);
  useEffect(() => { if (new URLSearchParams(query).get('compose') === '1' && requireAuth()) setComposer(true); }, [query, user?.id]);
  const join = async (target: Circle) => {
    if (!requireAuth() || joining.includes(target.id)) return;
    const joined = !target.joined;
    setJoining(previous => [...previous, target.id]); setError('');
    setCircles(previous => previous.map(item => item.id === target.id ? { ...item, joined, memberCount: Math.max(0, item.memberCount + (joined ? 1 : -1)) } : item));
    try { const updated = await api.setMembership(target.id, joined); setCircles(previous => previous.map(item => item.id === updated.id ? updated : item)); setRefreshKey(value => value + 1); } catch (err) { setCircles(previous => previous.map(item => item.id === target.id ? target : item)); setError(communityError(err)); } finally { setJoining(previous => previous.filter(id => id !== target.id)); }
  };
  const compose = () => {
    if (!user) { window.location.hash = communityComposeLink(circleSlug, query); requireAuth(); return; }
    setComposer(true);
  };
  const navigateFeed = (nextMode: FeedMode) => { setModerating(false); window.location.hash = communityFeedLink(nextMode); };
  return <div className="community-page">
    <header className="community-hero"><div><p className="community-eyebrow"><span /> THE SPACE BETWEEN CHAPTERS</p><h1>Stories bring us together.</h1><p>Find your people. Share your process. Stay for the conversation.</p></div><div className="community-hero-mark" aria-hidden="true"><Feather size={38} strokeWidth={1} /><span>Readers & writers,<br />in good company.</span></div></header>
    <div className="community-layout">
      <aside className="community-left"><nav aria-label="Community feeds" className="community-side-nav">{MODES.map(item => <button key={item.mode} aria-current={!moderating && mode === item.mode && !circleSlug ? 'page' : undefined} onClick={() => navigateFeed(item.mode)}><item.icon size={18} strokeWidth={1.6} />{item.label}</button>)}</nav>
        <div className="community-side-heading"><h2>Official circles</h2><span>{circles.length || '—'}</span></div>
        <nav className="community-circle-nav" aria-label="Official circles">{loadingCircles ? <p className="community-muted">Loading circles…</p> : circles.map(item => <a key={item.id} href={`#/community/circle/${encodeURIComponent(item.slug)}`} aria-current={circleSlug === item.slug ? 'page' : undefined}><span className="community-circle-initial">{item.name.charAt(0)}</span><span>{item.name}<small>{item.memberCount.toLocaleString()} members</small></span><ArrowUpRight size={13} /></a>)}</nav>
        <div className="community-sidebar-footer"><a href="#/safety">Community guidelines <ArrowUpRight size={13} /></a><p>A little kindness makes a better story.</p></div>
      </aside>
      <div className="community-main">
        <div className="community-mobile-circles"><label>Explore a circle<select value={circleSlug || ''} onChange={event => { window.location.hash = event.target.value ? `/community/circle/${encodeURIComponent(event.target.value)}` : '/community'; }}><option value="">All conversations</option>{circles.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label></div>
        {circle && <section className="community-circle-banner"><p className="community-eyebrow">{circle.official ? 'OFFICIAL CIRCLE' : 'COMMUNITY CIRCLE'}</p><h2>{circle.name}</h2><p>{circle.description}</p><button className={`community-button ${circle.joined ? '' : 'primary'}`} disabled={joining.includes(circle.id)} aria-pressed={circle.joined} onClick={() => join(circle)}>{joining.includes(circle.id) ? 'Updating…' : circle.joined ? 'Joined · Leave circle' : 'Join circle'}</button></section>}
        {circleSlug && !circle && !loadingCircles && !error ? <CommunityEmpty title="This circle isn’t available.">Choose another circle to find a conversation.</CommunityEmpty> : <>
          <button className="community-compose-invitation" onClick={compose}><span className="community-compose-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <Feather size={22} />}</span><span><strong>What’s your next conversation?</strong><small>Share an update, a question, or something worth reading.</small></span><Plus size={23} /></button>
          <div className="community-mobile-feed-tabs" aria-label="Community feeds">{MODES.map(item => <button key={item.mode} aria-pressed={mode === item.mode && !moderating && !circleSlug} onClick={() => navigateFeed(item.mode)}>{item.label}</button>)}</div>
          <div className="community-feed-heading"><h2>{moderating ? 'Community care' : circle ? 'In this circle' : MODES.find(item => item.mode === mode)?.label}</h2><div>{!moderating && <label><span className="sr-only">Filter by post format</span><select value={type} onChange={event => setType(event.target.value as PostType | '')}><option value="">All formats</option>{Object.entries(POST_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<button className="community-icon-button" title="Community interests" aria-label="Community interests" onClick={() => { if (requireAuth()) { if (me) setSettings(true); else setError('Your community settings are unavailable. Please retry.'); } }}><Settings2 size={18} /></button>{me?.canModerate && <button className="community-icon-button" title="Moderation desk" aria-label="Moderation desk" aria-pressed={moderating} onClick={() => setModerating(!moderating)}><ShieldCheck size={19} /></button>}</div></div>
          {error && <CommunityError message={error} onRetry={() => setRetry(value => value + 1)} />}
          {moderating && me?.canModerate ? <CommunityModeration /> : <CommunityFeed query={{ mode, circle: circleSlug, type: type || undefined }} refreshKey={refreshKey} />}
        </>}
      </div>
      <aside className="community-right"><section className="community-welcome-note"><p className="community-eyebrow">A SHARED MARGIN</p><h2>Every story needs<br />a little company.</h2><p>This is a place for the people behind the pages. Come as a reader, a writer, or a little of both.</p><button className="community-button primary" onClick={compose}><Plus size={16} /> Start a conversation</button></section>
        <section className="community-rules"><h2>{circle ? 'Circle notes' : 'Good conversations start here'}</h2><ol>{(circle?.rules.length ? circle.rules : ['Be generous with feedback, specific with praise.', 'Keep spoilers behind a content warning.', 'Celebrate the story, respect the person.']).map((rule, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></li>)}</ol><a href="#/safety">Read the community guidelines <ArrowUpRight size={14} /></a></section>
        {!circle && circles.slice(0, 3).map(item => <div key={item.id} className="community-suggested-circle"><div><a href={`#/community/circle/${encodeURIComponent(item.slug)}`}>{item.name}</a><small>{item.memberCount.toLocaleString()} members</small></div><button className="community-button" disabled={joining.includes(item.id)} aria-pressed={item.joined} onClick={() => join(item)}>{joining.includes(item.id) ? '…' : item.joined ? 'Joined' : 'Join'}</button></div>)}
      </aside>
    </div>
    {composer && user && <CommunityComposer circles={circles} initialCircleId={circle?.id || circles.find(item => item.allowedPostTypes.includes(initialType))?.id} initialType={initialType} bookId={params.get('bookId') || undefined} chapterId={params.get('chapterId') || undefined} onClose={() => setComposer(false)} onSaved={() => { setRefreshKey(value => value + 1); setModerating(false); }} />}
    {settings && me && <CommunitySettings me={me} onSaved={setMe} onClose={() => setSettings(false)} />}
  </div>;
};
export const CommunityPage: React.FC<Props> = ({ currentUser, onSignIn, ...props }) => <CommunitySession user={currentUser} onSignIn={onSignIn}><CommunityContent {...props} /></CommunitySession>;
