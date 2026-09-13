import React from 'react';
import { Footer } from '../components/Footer';
import { discoveryLinks, landingPages } from '../seo/content.mjs';

export const DiscoveryLandingPage: React.FC<{ path: string }> = ({ path }) => {
  const page = landingPages[path];
  if (!page) return null;
  return <>
    <article className="seo-landing">
      <header className="seo-hero">
        <a className="seo-back" href="/">WordWeft Studio</a>
        <p className="ww-page-eyebrow">{page.eyebrow}</p>
        <h1>{page.heading}</h1>
        <p className="seo-intro">{page.intro}</p>
        <a className="seo-cta" href={page.href}>{page.cta} <span aria-hidden="true">→</span></a>
      </header>
      <div className="seo-sections">{page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div>
      <section className="seo-steps"><h2>Getting started</h2><ol>{page.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
      <section className="seo-faq"><h2>Before you begin</h2>{page.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <nav className="seo-related" aria-label="Explore WordWeft"><h2>More to explore</h2>{discoveryLinks.filter(link => link.href !== path).map(link => <a key={link.href} href={link.href}>{link.label} <span aria-hidden="true">↗</span></a>)}<a href="/features">Explore all features ↗</a></nav>
    </article>
    <Footer />
  </>;
};

export const NotFoundPage = () => <section className="seo-landing seo-hero"><p className="ww-page-eyebrow">Page unavailable</p><h1>There’s no story at this address.</h1><p>The page may have moved or may no longer be public.</p><a className="seo-cta" href="/category">Explore published stories →</a></section>;
