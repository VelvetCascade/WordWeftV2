import React, { useEffect } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';
import '../styles/support-v2.css';

export const AboutPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    useEffect(() => {
        trackEvent('content', 'page_view', 'about');
        window.scrollTo(0, 0);
    }, []);
    return (
        <div className="wv-support">
            <main className="wv-support-shell">
                <header className="wv-pagehead">
                    <p className="wv-eyebrow">About WordWeft</p>
                    <h1>A place for stories<br />and the people behind them.</h1>
                    <p className="wv-lead">WordWeft is a reading and writing platform made around the simple act of sharing a story.</p>
                </header>
                <section className="wv-about-grid" aria-label="Reading and writing on WordWeft">
                    <img className="wv-about-art" src="/design-v2/assets/met-45294.jpg" alt="A Japanese woodblock print of boats beneath a bridge at sunset" />
                    <div className="wv-about-copy">
                        <section><h2>A good place to read.</h2><p>Discover original fiction, save a place in your library, and follow the writers you enjoy. Reading preferences and chapter discussions help you stay close to the story.</p></section>
                        <section><h2>A clear place to write.</h2><p>Start with a draft. Keep chapters, characters, scenes and notes together. When you are ready, share your work with readers and keep ownership of what you create.</p></section>
                        <div className="wv-actions"><a href="/category" className="wv-button wv-button-primary">Browse stories <ArrowRight size={18} /></a><a href="/write" className="wv-button">Start writing</a></div>
                    </div>
                </section>
                <section className="wv-section wv-about-beginning">
                    <h2>At the beginning</h2>
                    <p className="wv-lead">WordWeft is still growing. If you want to help shape it, join the Founding Writers Programme or share what would make reading and writing here better.</p>
                    <div className="wv-actions"><a href="/founding-writers" className="wv-button">Founding writers <ArrowRight size={18} /></a><a href="/feedback" className="wv-button wv-button-plain">Send feedback</a></div>
                </section>
                <details className="wv-about-origin wv-faq">
                    <summary>Why we started WordWeft <ChevronDown size={18} aria-hidden="true" /></summary>
                    <div><p>We started WordWeft after seeing writers spend years building an audience on platforms where a change in policy or discovery rules could make that audience difficult to reach.</p><p>We want writers to have clear publishing tools, understandable policies and a direct way to build relationships with readers. We also want readers to have a calm place to find stories they enjoy.</p><p>WordWeft is built for readers and writers around the world. We are building it carefully, listening to the people using it and being open about what is available now and what is planned for later.</p></div>
                </details>
            </main>
            <Footer />
        </div>
    );
};
