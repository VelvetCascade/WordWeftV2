import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeaturesPage } from '../pages/FeaturesPage';
import { AboutPage } from '../pages/AboutPage';
import { TermsPage } from '../pages/TermsPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { SafetyRulesPage } from '../pages/SafetyRulesPage';
import { ContactPage } from '../pages/ContactPage';
import { FoundingWritersPage } from '../pages/FoundingWritersPage';
import { DiscoveryLandingPage } from '../pages/DiscoveryLandingPage';
import { DiscoveryHero } from '../components/DiscoveryHero';
import { Footer } from '../components/Footer';
import { landingPages } from './content.mjs';
import type { DiscoveryHeroGroups } from '../utils/discoveryHero';
import { WordWeftLogo } from '../components/icons/WordWeftLogo';

export function renderHome(groups: DiscoveryHeroGroups) {
    return renderStatic('/', groups);
}

export function renderStatic(path: string, heroGroups?: DiscoveryHeroGroups) {
    const home = <div className="v2-discovery"><DiscoveryHero groups={heroGroups} /><section className="v2-discovery-section"><div className="v2-section-heading"><div><p className="ww-page-eyebrow">Story discovery</p><h2>Find a story. Stay for a chapter.</h2></div><a href="/category">Browse stories →</a></div><p>Explore original fiction, poetry, and essays from independent writers. Save your favourites and continue wherever you left off.</p></section><Footer /></div>;
    const pages = { '/': home, '/features': <FeaturesPage />, '/about': <AboutPage />, '/terms': <TermsPage />, '/privacy': <PrivacyPage />, '/safety': <SafetyRulesPage />, '/contact': <ContactPage currentUser={null} />, '/founding-writers': <FoundingWritersPage /> };
    const page = landingPages[path] ? <DiscoveryLandingPage path={path} /> : pages[path];
    if (!page) throw new Error(`No static page for ${path}`);
    return `<div class="ww-app"><nav class="v2-nav" aria-label="Main navigation"><a class="v2-brand" href="/" aria-label="WordWeft home">${renderToStaticMarkup(<WordWeftLogo />)}<span>WordWeft</span></a><div class="v2-nav-primary"><a href="/category">Read</a><a href="/write">Write</a><a href="/community">Community</a><a href="/about">About</a></div><div class="v2-nav-actions"><a href="/auth">Sign in</a><a class="v2-button" href="/auth">Start your story</a></div></nav><main data-server-rendered>${renderToStaticMarkup(page)}</main></div>`;
}
