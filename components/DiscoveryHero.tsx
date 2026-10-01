import React from 'react';
import { ArrowRight } from 'lucide-react';

/** Shared by the live discovery screen and its public, crawlable entry. */
export function DiscoveryHero({ onRead, onWrite }: { onRead?: () => void; onWrite?: () => void }) {
  return <section className="v2-home-hero" aria-labelledby="home-title">
    <div className="v2-hero-copy">
      <p className="ww-page-eyebrow">A home for readers and writers</p>
      <h1 id="home-title">Read <span className="v2-story-word">stories</span>.<br />Write your own.</h1>
      <img className="v2-hero-underline" src="/design-v2/assets/home-underline.jpg" alt="" aria-hidden="true" />
      <p className="v2-hero-description">Discover stories from real people.<br />Find your next chapter, or write your own.</p>
      <div className="v2-hero-actions"><a className="v2-button" href="/category" onClick={onRead}>Read stories <ArrowRight size={18} /></a><a className="v2-button secondary" href="/write" onClick={onWrite}>Start writing <ArrowRight size={18} /></a></div>
    </div>
    <img className="v2-hero-art" src="/design-v2/assets/home-covers.jpg" width="800" height="568" alt="Illustrated literary covers: a place for stories of every kind" fetchPriority="high" />
  </section>;
}
