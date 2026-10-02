import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Footer } from '../components/Footer';
import { ReturnNavigation } from '../components/ReturnNavigation';
import { LegalTermsContent, TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from '../components/LegalTermsContent';
import { useAnalytics } from '../contexts/AnalyticsContext';
import '../styles/support-v2.css';

const TermsLinks = () => <ol>{TERMS_SECTIONS.map(([id, title], index) => <li key={id}><a href={`#terms-${id}`}>{index + 1}. {title}</a></li>)}</ol>;

export const TermsPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('content', 'policy_view', 'terms'); }, [trackEvent]);
    return (
        <div className="wv-support wv-legal">
            <header className="wv-legal-header">
                <div className="wv-support-shell wv-pagehead">
                    <ReturnNavigation />
                    <p className="wv-eyebrow">WordWeft policies</p>
                    <h1>Terms of Service</h1>
                    <p className="wv-lead">These Terms explain the rules for reading, writing, publishing and participating on WordWeft. They include our current age-rating and mature-content policy.</p>
                    <p className="wv-policy-date">Effective {TERMS_EFFECTIVE_DATE}</p>
                </div>
            </header>
            <main className="wv-support-shell wv-legal-layout">
                <aside className="wv-policy-nav">
                    <nav className="wv-policy-desktop" aria-label="Terms sections"><h2>On this page</h2><TermsLinks /></nav>
                    <details className="wv-policy-mobile"><summary>On this page</summary><nav aria-label="Terms sections"><TermsLinks /></nav></details>
                </aside>
                <article className="wv-policy-prose">
                    <LegalTermsContent />
                    <nav className="wv-policy-related" aria-label="Related policies"><a href="/privacy" className="wv-button">Privacy Policy <ArrowRight size={18} /></a><a href="/safety" className="wv-button wv-button-plain">Safety & Content Rules <ArrowRight size={18} /></a></nav>
                </article>
            </main>
            <Footer />
        </div>
    );
};
