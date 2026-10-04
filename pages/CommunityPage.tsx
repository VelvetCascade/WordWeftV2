import { readHistoryState, updateHistoryState } from '../utils/historyEntryState';
import React, { useEffect, useRef, useState } from 'react';
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
import { ResilientImage } from '../components/ResilientImage';

interface Props { currentUser: User | null; onSignIn: () => void; circleSlug?: string; query?: string }
const MODES: { mode: FeedMode; label: string; icon: typeof Compass }[] = [{ mode: 'discover', label: 'Discover', icon: Compass }, { mode: 'following', label: 'Following', icon: Users }, { mode: 'circles', label: 'Circles', icon: MessageCircle }, { mode: 'saved', label: 'Saved', icon: Bookmark }];
const communityJourneyPath = () => window.location.pathname + window.location.search;
const readCommunityFormat = (): PostType | '' => {
  const saved = readHistoryState()?.wordWeftCommunity;
  return saved?.path === communityJourneyPath() && Object.prototype.hasOwnProperty.call(POST_LABELS, saved.type) ? saved.type : '';
};
const CommunityContent: React.FC<Pick<Props, 'circleSlug' | 'query'>> = ({ circleSlug, query = '' }) => {
  const { user, requireAuth } = useCommunitySession();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<FeedMode>('discover');
  const [type, setType] = useState<PostType | ''>(readCommunityFormat);
  const journeyPathRef = useRef(communityJourneyPath());
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
  useEffect(() => { setMode(communityFeedMode(query)); setType(readCommunityFormat()); setModerating(false); }, [circleSlug, query]);
  useEffect(() => {
    if (communityJourneyPath() !== journeyPathRef.current) return;
    // Format choices belong to this feed entry; preserve navigation's own
    // history fields so browser Back returns to the same conversation list.
    updateHistoryState({ wordWeftCommunity: { path: journeyPathRef.current, type } });
  }, [type]);
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
    <header className={`community-hero ${circle ? 'community-circle-hero' : ''}`}>
      <div><p className="community-eyebrow">{circle ? (circle.official ? 'OFFICIAL WORDWEFT CIRCLE' : 'WORDWEFT CIRCLE') : 'WORDWEFT COMMUNITY'}</p><h1>{circle ? circle.name : 'Between the chapters.'}</h1><p>{circle ? circle.description : 'Updates, conversations, and company for the writing life.'}</p>
        {circle && <div className="community-circle-hero-actions"><span><Users size={16} /> {circle.memberCount.toLocaleString()} {circle.memberCount === 1 ? 'member' : 'members'}</span><button className={`community-button ${circle.joined ? '' : 'primary'}`} disabled={joining.includes(circle.id)} aria-pressed={circle.joined} onClick={() => join(circle)}>{joining.includes(circle.id) ? 'Updating…' : circle.joined ? 'Joined · Leave circle' : 'Join circle'}</button></div>}
      </div>
      {circle && <img src="/design-v2/assets/met-45294.jpg" alt="" className="community-circle-art" />}
    </header>
    <div className="community-layout">
      <aside className="community-left">
        {user && <><div className="community-side-heading"><h2>Your circles</h2><span>{circles.filter(item => item.joined).length}</span></div>
        <nav className="community-circle-nav" aria-label="Your circles">{loadingCircles ? <p className="community-muted">Loading circles…</p> : circles.filter(item => item.joined).map(item => <a key={item.id} href={`/community/circle/${encodeURIComponent(item.slug)}`} aria-current={circleSlug === item.slug ? 'page' : undefined}><span>{item.name}<small>{item.memberCount.toLocaleString()} {item.memberCount === 1 ? 'member' : 'members'}</small></span><ArrowUpRight size={13} /></a>)}{!loadingCircles && !circles.some(item => item.joined) && <p className="community-muted">Join a circle to make its conversations part of your feed.</p>}</nav></>}
        <div className="community-side-heading"><h2>Explore circles</h2><span>{circles.filter(item => !item.joined).length}</span></div>
        <nav className="community-circle-nav" aria-label="Explore circles">{loadingCircles ? <p className="community-muted">Loading circles…</p> : circles.filter(item => !item.joined).map(item => <a key={item.id} href={`/community/circle/${encodeURIComponent(item.slug)}`} aria-current={circleSlug === item.slug ? 'page' : undefined}><span>{item.name}<small>{item.memberCount.toLocaleString()} {item.memberCount === 1 ? 'member' : 'members'}</small></span><ArrowUpRight size={13} /></a>)}</nav>
        <div className="community-sidebar-footer"><button type="button" onClick={() => { document.querySelector('[aria-label="Explore circles"]')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }}>Explore circles <ArrowUpRight size={15} /></button><a href="/safety">Community guidelines <ArrowUpRight size={13} /></a><p>A little kindness makes a better story.</p></div>
      </aside>
      <div className="community-main">
        <div className="community-mobile-circles"><label>Explore a circle<select value={circleSlug || ''} onChange={event => { window.location.hash = event.target.value ? `/community/circle/${encodeURIComponent(event.target.value)}` : '/community'; }}><option value="">All conversations</option>{circles.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label></div>
        {circleSlug && !circle && !loadingCircles && !error ? <CommunityEmpty title="This circle isn’t available.">Choose another circle to find a conversation.<a href="/community" className="community-button">Explore conversations</a></CommunityEmpty> : <>
          <div className="community-feed-tabs" aria-label="Community feeds">{MODES.map(item => <button key={item.mode} aria-pressed={mode === item.mode && !moderating && !circleSlug} onClick={() => navigateFeed(item.mode)}>{item.label}</button>)}</div>
          <button className="community-compose-invitation" onClick={compose}><span className="community-compose-avatar">{user ? <ResilientImage src={user.avatarUrl} alt="" fallbackLabel={user.name} className="community-avatar-image" /> : <Feather size={22} />}</span><span><strong>What are you reading or writing?</strong><small>Share an update, ask a question, or recommend a story.</small></span><span className="community-compose-post">Post <Plus size={18} /></span></button>
          <div className="community-feed-heading"><h2>{moderating ? 'Community care' : circle ? 'In this circle' : MODES.find(item => item.mode === mode)?.label}</h2><div>{!moderating && <label><span className="sr-only">Filter by post format</span><select value={type} onChange={event => setType(event.target.value as PostType | '')}><option value="">All formats</option>{Object.entries(POST_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<button className="community-icon-button" title="Community interests" aria-label="Community interests" onClick={() => { if (requireAuth()) { if (me) setSettings(true); else setError('Your community settings are unavailable. Please retry.'); } }}><Settings2 size={18} /></button>{me?.canModerate && <button className="community-icon-button" title="Moderation desk" aria-label="Moderation desk" aria-pressed={moderating} onClick={() => setModerating(!moderating)}><ShieldCheck size={19} /></button>}</div></div>
          {error && <CommunityError message={error} onRetry={() => setRetry(value => value + 1)} />}
          {moderating && me?.canModerate ? <CommunityModeration /> : <CommunityFeed query={{ mode, circle: circleSlug, type: type || undefined }} refreshKey={refreshKey} />}
        </>}
      </div>
      <aside className="community-right"><div className="community-right-heading"><h2>Around the stories</h2><p>Find company for the writing life.</p></div><section className="community-welcome-note"><p className="community-eyebrow">{circle ? 'IN THIS CIRCLE' : 'CIRCLES TO EXPLORE'}</p><h2>{circle ? circle.name : 'Your kind of company.'}</h2><p>{circle ? `${circle.memberCount.toLocaleString()} readers and writers are part of this circle.` : 'From new releases to the craft of writing. Find a conversation that feels like home.'}</p><button className="community-button" onClick={compose}><Plus size={16} /> Start a conversation</button></section>
        <section className="community-rules"><h2>{circle ? 'Circle notes' : 'Good conversations start here'}</h2><ol>{(circle?.rules.length ? circle.rules : ['Be generous with feedback, specific with praise.', 'Keep spoilers behind a content warning.', 'Celebrate the story, respect the person.']).map((rule, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></li>)}</ol><a href="/safety">Read the community guidelines <ArrowUpRight size={14} /></a></section>
        {!circle && circles.slice(0, 3).map(item => <div key={item.id} className="community-suggested-circle"><div><a href={`/community/circle/${encodeURIComponent(item.slug)}`}>{item.name}</a><small>{item.memberCount.toLocaleString()} members</small></div><button className="community-button" disabled={joining.includes(item.id)} aria-pressed={item.joined} onClick={() => join(item)}>{joining.includes(item.id) ? '…' : item.joined ? 'Joined' : 'Join'}</button></div>)}
      </aside>
    </div>
    {composer && user && <CommunityComposer circles={circles} initialCircleId={circle?.id} initialType={initialType} bookId={params.get('bookId') || undefined} chapterId={params.get('chapterId') || undefined} onClose={() => setComposer(false)} onSaved={() => { setRefreshKey(value => value + 1); setModerating(false); }} />}
    {settings && me && <CommunitySettings me={me} onSaved={setMe} onClose={() => setSettings(false)} />}
  </div>;
};
export const CommunityPage: React.FC<Props> = ({ currentUser, onSignIn, ...props }) => <CommunitySession user={currentUser} onSignIn={onSignIn}><CommunityContent {...props} /></CommunitySession>;
