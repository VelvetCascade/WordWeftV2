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
import { landingPages } from './content.mjs';

export function renderStatic(path: string) {
    const pages = { '/': <FeaturesPage />, '/features': <FeaturesPage />, '/about': <AboutPage />, '/terms': <TermsPage />, '/privacy': <PrivacyPage />, '/safety': <SafetyRulesPage />, '/contact': <ContactPage currentUser={null} />, '/founding-writers': <FoundingWritersPage /> };
    const page = landingPages[path] ? <DiscoveryLandingPage path={path} /> : pages[path];
    if (!page) throw new Error(`No static page for ${path}`);
    return `<nav class="seo-public-nav" aria-label="Main navigation"><a href="/">WordWeft</a><a href="/category">Browse stories</a><a href="/writing-tools">Writing tools</a><a href="/features">Features</a><a href="/auth">Sign in</a></nav><main data-server-rendered>${renderToStaticMarkup(page)}</main>`;
}
