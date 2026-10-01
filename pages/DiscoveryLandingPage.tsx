import React from 'react';
import { ArrowRight, BookOpen, Plus } from 'lucide-react';
import { Footer } from '../components/Footer';
import { discoveryLinks, landingPages } from '../seo/content.mjs';
import '../styles/support-v2.css';

export const DiscoveryLandingPage: React.FC<{ path: string }> = ({ path }) => {
    const page = landingPages[path];
    if (!page) return <NotFoundPage />;
    const details = page as typeof page & { criteria?: [string, string][]; related?: string[] };
    const related = details.related || ['/read-online', '/writing-tools', '/publish-stories', '/world-building-tools'];
    const links = discoveryLinks.filter(link => related.includes(link.href) && link.href !== path);
    return <div className="wv-support wv-discovery">
        <main className="wv-support-shell">
            <header className="wv-discovery-hero"><div><p className="wv-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="wv-lead">{page.intro}</p><a className="wv-button wv-button-primary" href={page.href}>{page.cta} <ArrowRight size={18} /></a></div><img src="/design-v2/assets/met-436535.jpg" alt="Wheat Field with Cypresses, a painting by Vincent van Gogh" className="wv-discovery-art" /></header>
            {details.criteria?.length ? <section className="wv-discovery-criteria" aria-labelledby="seo-criteria-title"><div><p className="wv-eyebrow">A practical comparison</p><h2 id="seo-criteria-title">What to check before choosing a platform</h2></div><dl>{details.criteria.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl></section> : null}
            <div className="wv-discovery-sections">{page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div>
            <section className="wv-discovery-steps"><h2>Getting started</h2><ol>{page.steps.map((step, index) => <li key={step}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol></section>
            <section className="wv-discovery-faq"><h2>Before you begin</h2>{page.faqs.map(([question, answer]) => <details className="wv-faq" key={question}><summary>{question} <Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</section>
            <nav className="wv-discovery-related" aria-label="Explore WordWeft"><h2>More to explore</h2><div>{links.map(link => <a className="wv-button" key={link.href} href={link.href}>{link.label} <ArrowRight size={16} /></a>)}<a className="wv-button wv-button-plain" href="/features">Explore all features <ArrowRight size={16} /></a></div></nav>
        </main><Footer />
    </div>;
};

export const NotFoundPage = () => <div className="wv-support"><main className="wv-support-shell wv-unavailable"><div className="wv-empty"><BookOpen size={30} aria-hidden="true" /><p className="wv-eyebrow">Page unavailable</p><h1>There’s no story at this address.</h1><p>The page may have moved or may no longer be public.</p><a className="wv-button wv-button-primary" href="/category">Explore published stories <ArrowRight size={18} /></a></div></main><Footer /></div>;
