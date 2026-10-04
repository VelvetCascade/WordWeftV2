import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import type { Book } from '../types';
import { ResilientImage } from './ResilientImage';
import { DISCOVERY_HERO_GROUPS, groupDiscoveryBooks, nextDiscoveryGroup, normalizeDiscoveryGroups } from '../utils/discoveryHero';
import type { DiscoveryHeroGroup, DiscoveryHeroGroups } from '../utils/discoveryHero';

interface DiscoveryHeroProps {
  groups?: Partial<DiscoveryHeroGroups>;
  books?: Book[];
  isLoading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  onRead?: () => void;
  onWrite?: () => void;
}
const emptyBooks: Book[] = [];
const hasInteractiveFocus = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('a,button,input,select,textarea,[role="button"]');

/** Shared by the live discovery screen and its public, crawlable entry. */
export function DiscoveryHero({ groups, books = emptyBooks, isLoading = false, loadError = '', onRetry, onRead, onWrite }: DiscoveryHeroProps) {
  const catalog = useMemo(() => groups ? normalizeDiscoveryGroups(groups) : groupDiscoveryBooks(books), [groups, books]);
  const available = DISCOVERY_HERO_GROUPS.filter(group => catalog[group].length > 0);
  const availableKey = available.join(',');
  const [activeGroup, setActiveGroup] = useState<DiscoveryHeroGroup>(() => available[0] || 'stories');
  const [pendingGroup, setPendingGroup] = useState<DiscoveryHeroGroup | null>(null);
  const [entering, setEntering] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLElement>(null);
  const currentBooks = catalog[activeGroup];
  const canRotate = available.length > 1 && !isLoading && !reducedMotion;
  const autoRotate = canRotate && !hovered && !focused && !pressed && inView && visible;
  const phase = pendingGroup ? 'exit' : entering ? 'enter' : 'idle';

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(document.visibilityState !== 'hidden');
    updateMotion(); updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 }) : null;
    if (section.current) observer?.observe(section.current);
    return () => { media.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updateVisibility); observer?.disconnect(); };
  }, []);

  useEffect(() => {
    if (available.length && !catalog[activeGroup].length) {
      setActiveGroup(available[0]); setPendingGroup(null); setEntering(false);
    }
  }, [activeGroup, availableKey, catalog]);

  useEffect(() => {
    if (!autoRotate) return;
    const timer = window.setTimeout(() => setPendingGroup(nextDiscoveryGroup(activeGroup, catalog)), 2000);
    return () => window.clearTimeout(timer);
  }, [activeGroup, availableKey, catalog, autoRotate]);

  useEffect(() => {
    if (!pendingGroup) return;
    if (!autoRotate) { setPendingGroup(null); return; }
    const timer = window.setTimeout(() => { setActiveGroup(pendingGroup); setPendingGroup(null); setEntering(true); }, 220);
    return () => window.clearTimeout(timer);
  }, [pendingGroup, autoRotate]);

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => setEntering(false), 360);
    return () => window.clearTimeout(timer);
  }, [entering]);

  return <section ref={section} className="v2-home-hero" aria-labelledby="home-title" data-active-format={activeGroup} data-transition={phase} data-pressing={pressed || undefined} data-reduced-motion={reducedMotion || undefined}>
    <div className="v2-hero-copy">
      <p className="ww-page-eyebrow">A home for readers and writers</p>
      <h1 id="home-title"><span className="v2-hero-accessible-heading">Read stories. Write your own.</span><span aria-hidden="true">Read <span className="v2-story-word"><span className="v2-story-word-text" key={activeGroup}>{activeGroup}</span></span>.<br />Write your own.</span></h1>
      <svg className="v2-hero-underline" viewBox="0 0 180 23" aria-hidden="true" focusable="false"><path d="M3 17C52 8 106 5 156 8L145 12C153 10 166 9 177 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <p className="v2-hero-description">Discover stories from real people.<br />Find your next chapter, or write your own.</p>
      <div className="v2-hero-actions"><a className="v2-button" href="/category" onClick={onRead}>Read stories <ArrowRight size={18} /></a><a className="v2-button secondary" href="/write" onClick={onWrite}>Start writing <ArrowRight size={18} /></a></div>
    </div>
    <div className="v2-hero-showcase">
      <div className="v2-hero-books" data-count={currentBooks.length} aria-label={`Featured published ${activeGroup}`} aria-busy={isLoading}
        onPointerDown={() => setPressed(true)} onPointerUp={() => requestAnimationFrame(() => setPressed(false))} onPointerCancel={() => setPressed(false)}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }} onPointerLeave={() => setHovered(false)}
        onFocusCapture={event => setFocused(hasInteractiveFocus(event.target))} onBlurCapture={event => setFocused(event.currentTarget.contains(event.relatedTarget as Node) && hasInteractiveFocus(event.relatedTarget))}>
        {currentBooks.length ? currentBooks.map((book, index) => <a className={`v2-hero-book v2-hero-book-${index + 1}`} href={`/book/${encodeURIComponent(book.id)}`} key={book.id} aria-label={`Read ${book.title}`}>
          <div className="v2-hero-cover"><ResilientImage src={book.coverUrl} alt={`Cover of ${book.title}`} fallbackLabel={book.title} variant="cover" loading="eager" fetchPriority={index === 0 ? 'high' : 'auto'} /><span className="v2-hero-book-caption" aria-hidden="true"><strong>{book.title}</strong><span>{book.author?.name}</span></span></div>
        </a>) : isLoading ? <div className="v2-hero-cover-skeletons" aria-label="Loading featured books">{[1, 2, 3].map(index => <span className={`v2-hero-book v2-hero-book-${index}`} key={index} aria-hidden="true" />)}</div> : <div className="v2-hero-catalog-state"><BookOpen size={38} aria-hidden="true" /><p>{loadError ? 'The books are taking a moment.' : 'New stories are on their way.'}</p><span>{loadError ? 'Explore the shelves, or try the featured books again.' : 'Browse the shelves or begin a story of your own.'}</span>{loadError && onRetry && <button type="button" onClick={onRetry} aria-label="Reload featured books"><RefreshCw size={14} />Try again</button>}</div>}
      </div>
    </div>
  </section>;
}
