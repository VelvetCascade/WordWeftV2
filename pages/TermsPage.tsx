import React, { useEffect } from 'react';
import { Footer } from '../components/Footer';
import { LegalTermsContent, TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from '../components/LegalTermsContent';
import { useAnalytics } from '../contexts/AnalyticsContext';

export const TermsPage: React.FC = () => {
    const { trackEvent } = useAnalytics();

    useEffect(() => {
        trackEvent('content', 'policy_view', 'terms');
    }, [trackEvent]);

    return (
        <div className="min-h-screen bg-background text-text-body dark:bg-dark-background dark:text-dark-text-body">
            <header className="border-b border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
                <div className="container mx-auto max-w-5xl px-6 py-12 md:py-16">
                    <p className="mb-3 font-sans text-sm font-semibold text-accent">Legal</p>
                    <h1 className="font-sans text-4xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-5xl">
                        Terms of Service
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-7 md:text-lg">
                        These Terms explain the rules for reading, writing, publishing and participating on WordWeft.
                        They include our current age-rating and mature-content policy.
                    </p>
                    <p className="mt-5 font-sans text-sm text-gray-600 dark:text-gray-400">
                        Effective {TERMS_EFFECTIVE_DATE}
                    </p>
                </div>
            </header>

            <main className="container mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-16">
                <nav aria-label="Terms sections" className="self-start lg:sticky lg:top-24">
                    <h2 className="mb-3 font-sans text-sm font-bold text-text-rich dark:text-dark-text-rich">On this page</h2>
                    <ol className="grid gap-2 border-l border-gray-200 pl-4 text-sm dark:border-dark-border">
                        {TERMS_SECTIONS.map(([id, title], index) => (
                            <li key={id}>
                                <a className="text-gray-600 hover:text-accent dark:text-gray-400 dark:hover:text-dark-text-rich" href={`#terms-${id}`}>
                                    {index + 1}. {title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <article className="min-w-0">
                    <LegalTermsContent />
                </article>
            </main>

            <Footer />
        </div>
    );
};
