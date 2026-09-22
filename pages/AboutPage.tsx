import React, { useEffect } from 'react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {children}
    </p>
);

interface PillarCardProps {
    heading: string;
    body: string;
}

const PillarCard: React.FC<PillarCardProps> = ({ heading, body }) => (
    <article className="border-t-2 border-accent/35 pt-5">
        <h3 className="mb-2 font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich">{heading}</h3>
        <p className="text-sm leading-relaxed text-text-body dark:text-dark-text-body">{body}</p>
    </article>
);

interface AudienceRowProps {
    heading: string;
    text: string;
}

const AudienceRow: React.FC<AudienceRowProps> = ({ heading, text }) => (
    <article className="grid gap-2 border-t border-gray-200 py-6 dark:border-dark-border sm:grid-cols-[180px_1fr] sm:gap-8">
        <h3 className="font-sans font-bold text-text-rich dark:text-dark-text-rich">{heading}</h3>
        <p className="leading-relaxed text-text-body dark:text-dark-text-body">{text}</p>
    </article>
);

export const AboutPage: React.FC = () => {
    const { trackEvent } = useAnalytics();

    useEffect(() => {
        trackEvent('content', 'page_view', 'about');
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-background dark:bg-dark-background">
            <section className="border-b border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
                <div className="container mx-auto max-w-5xl px-6 py-16 md:py-24">
                    <SectionLabel>About WordWeft</SectionLabel>
                    <h1 className="max-w-3xl font-sans text-4xl font-extrabold leading-tight tracking-tight text-text-rich dark:text-dark-text-rich sm:text-5xl md:text-6xl">
                        A place to read stories and write your own.
                    </h1>
                    <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-body dark:text-dark-text-body md:text-xl">
                        WordWeft is a platform for original fiction. Readers can discover stories, follow writers and keep track of what they are reading. Writers can draft, organise and publish their work chapter by chapter.
                    </p>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="container mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
                    <div>
                        <SectionLabel>Why we started</SectionLabel>
                        <h2 className="font-sans text-3xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-4xl">
                            Writers should stay connected to their work and their readers.
                        </h2>
                    </div>
                    <div className="space-y-5 leading-relaxed text-text-body dark:text-dark-text-body">
                        <p>
                            We started WordWeft after seeing writers spend years building an audience on platforms where a change in policy or discovery rules could make that audience difficult to reach.
                        </p>
                        <p>
                            We want writers to have clear publishing tools, understandable policies and a direct way to build relationships with readers. We also want readers to have a calm place to find stories they genuinely enjoy.
                        </p>
                        <p>
                            WordWeft is still early. We are building it carefully, listening to the people using it and being open about what is available now and what is planned for later.
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-y border-gray-200 bg-white py-16 dark:border-dark-border dark:bg-dark-surface md:py-20">
                <div className="container mx-auto max-w-5xl px-6">
                    <SectionLabel>Available globally</SectionLabel>
                    <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
                        <h2 className="font-sans text-3xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-4xl">
                            Stories can come from anywhere.
                        </h2>
                        <div className="space-y-5 leading-relaxed text-text-body dark:text-dark-text-body">
                            <p>
                                WordWeft is built for readers and writers around the world. We do not treat one country or one kind of storyteller as the default.
                            </p>
                            <p>
                                Our aim is straightforward: make it easier to find good fiction, publish original work and connect through stories.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="container mx-auto max-w-5xl px-6">
                    <SectionLabel>What we focus on</SectionLabel>
                    <h2 className="max-w-2xl font-sans text-3xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-4xl">
                        Useful tools and a better reading experience.
                    </h2>
                    <div className="mt-10 grid gap-8 md:grid-cols-3">
                        <PillarCard
                            heading="Discovery that feels relevant"
                            body="Readers can browse by genre, mood and the details that matter to them instead of relying on a single recommendation feed."
                        />
                        <PillarCard
                            heading="Context while you read"
                            body="Character information, chapter discussions and reading preferences help readers stay inside the story without losing their place."
                        />
                        <PillarCard
                            heading="Practical writing tools"
                            body="Writers can keep chapters, characters, scenes and notes together, then publish without giving up ownership of their work."
                        />
                    </div>
                </div>
            </section>

            <section className="border-y border-gray-200 bg-white py-16 dark:border-dark-border dark:bg-dark-surface md:py-20">
                <div className="container mx-auto max-w-5xl px-6">
                    <SectionLabel>Who WordWeft is for</SectionLabel>
                    <h2 className="mb-8 font-sans text-3xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-4xl">
                        Readers and writers at every stage.
                    </h2>
                    <AudienceRow
                        heading="For readers"
                        text="Find original fiction, follow the writers you enjoy and continue reading across devices."
                    />
                    <AudienceRow
                        heading="For new writers"
                        text="Start with an idea, organise your story and publish when you are ready."
                    />
                    <AudienceRow
                        heading="For established writers"
                        text="Bring your existing work and audience while keeping ownership and control of your stories."
                    />
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="container mx-auto max-w-3xl px-6 text-center">
                    <SectionLabel>Where we are now</SectionLabel>
                    <h2 className="font-sans text-3xl font-extrabold tracking-tight text-text-rich dark:text-dark-text-rich md:text-4xl">
                        We are building WordWeft in the open.
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-body dark:text-dark-text-body">
                        The platform is early and some features are still being developed. Feedback from readers and writers helps us decide what to improve next.
                    </p>
                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="/"
                            className="inline-flex items-center justify-center rounded-lg bg-accent px-7 py-3 font-sans font-semibold text-white transition-colors hover:bg-primary"
                        >
                            Start reading
                        </a>
                        <a
                            href="/write"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-7 py-3 font-sans font-semibold text-text-rich transition-colors hover:border-accent dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-rich dark:hover:border-accent"
                        >
                            Start writing
                        </a>
                    </div>
                </div>
            </section>

            <section className="bg-accent py-12">
                <div className="container mx-auto px-6 text-center">
                    <p className="mb-2 font-sans text-xs font-bold uppercase tracking-[0.24em] text-white/75">WordWeft Studio</p>
                    <h2 className="font-sans text-2xl font-extrabold text-white md:text-3xl">
                        Read stories. Write your own.
                    </h2>
                </div>
            </section>

            <Footer />
        </div>
    );
};
