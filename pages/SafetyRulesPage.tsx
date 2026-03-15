
import React from 'react';
import { Footer } from '../components/Footer';

const Section: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <section className="mb-10">
        <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-4 flex items-baseline gap-3">
            <span className="text-accent font-extrabold text-2xl">{number}.</span>
            {title}
        </h2>
        <div className="text-text-body dark:text-dark-text-body leading-relaxed space-y-3 pl-1">
            {children}
        </div>
    </section>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
    <ul className="space-y-1.5 pl-4">
        {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
                <span className="text-accent mt-1.5 text-xs">●</span>
                <span>{item}</span>
            </li>
        ))}
    </ul>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-4">
        <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
        {children}
    </div>
);

export const SafetyRulesPage: React.FC = () => {
    return (
        <div>
            {/* Hero Header */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-16 relative z-10 text-center">
                    <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                        Safety & Content Rules
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body text-lg max-w-2xl mx-auto leading-relaxed">
                        WordWeft is a writing and reading platform. To keep it safe, legal, and stable for everyone,
                        all users must follow these rules.
                    </p>
                    <div className="mt-4 max-w-xl mx-auto">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-5 py-3 text-sm font-medium text-red-800 dark:text-red-300">
                            ⚠️ Violation may result in content removal, monetization restriction, suspension, or permanent ban.
                        </div>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-surface-alt px-4 py-2 rounded-full">
                        <span>Last Updated:</span>
                        <span className="font-semibold text-text-rich dark:text-dark-text-rich">February 15, 2026</span>
                    </div>
                    <p className="mt-3 text-sm text-text-body dark:text-dark-text-body font-medium">
                        Using WordWeft means you agree to these rules.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-16 max-w-3xl">

                <Section number="1" title="Legal Compliance">
                    <p>Users must follow applicable laws of their country and the server-hosting jurisdiction.</p>
                    <p>Content that violates laws may be removed without warning and reported if legally required.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        We reserve the right to restrict any content that threatens platform operation, payment providers,
                        hosting providers, or legal safety.
                    </p>
                </Section>

                <Section number="2" title="Age Restrictions">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-5">
                        <p className="font-bold text-red-800 dark:text-red-300 mb-3 uppercase text-sm tracking-wider">Strictly Prohibited</p>
                        <p className="text-red-800 dark:text-red-300 mb-2">Any sexual or suggestive content involving:</p>
                        <BulletList items={[
                            "Minors (real or fictional)",
                            "School-age characters in sexual context",
                            "\"Aged-up\" minors",
                            "Child-like characters intended to represent minors"
                        ]} />
                        <p className="mt-4 font-bold text-red-800 dark:text-red-300 text-sm">
                            🚨 Zero tolerance → Permanent ban
                        </p>
                    </div>
                </Section>

                <Section number="3" title="Adult / NSFW Content">
                    <p>Adult content is allowed only if properly tagged and not illegal.</p>
                    <SubSection title="Must Include">
                        <BulletList items={[
                            "Content warnings",
                            "Correct tags",
                            "Age-appropriate access controls"
                        ]} />
                    </SubSection>
                    <SubSection title="Not Allowed">
                        <BulletList items={[
                            "Illegal acts presented as instructional",
                            "Non-consensual glorification presented as real-world advocacy",
                            "Exploitation content",
                            "Real person explicit content without consent"
                        ]} />
                    </SubSection>
                </Section>

                <Section number="4" title="Violence & Harmful Content">
                    <p>Allowed in fictional storytelling within reason.</p>
                    <SubSection title="Prohibited">
                        <BulletList items={[
                            "Instructions for real-world harm",
                            "Terrorism promotion",
                            "Self-harm encouragement",
                            "Suicide encouragement",
                            "Guides to illegal activity"
                        ]} />
                    </SubSection>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        If context is unclear → we may remove first, review later.
                    </p>
                </Section>

                <Section number="5" title="Hate & Harassment">
                    <p>Not allowed:</p>
                    <BulletList items={[
                        "Hate speech toward protected groups",
                        "Harassment campaigns",
                        "Threats",
                        "Stalking behavior",
                        "Doxxing",
                        "Encouraging others to attack a user"
                    ]} />
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mt-4">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            💬 Criticism of ideas is allowed. Attacks on people are not.
                        </p>
                    </div>
                </Section>

                <Section number="6" title="Spam & Platform Abuse">
                    <p>Prohibited:</p>
                    <BulletList items={[
                        "Copy-pasted promotional comments",
                        "Fake engagement groups",
                        "Follow-for-follow farming",
                        "Bot activity",
                        "Artificial reads/likes",
                        "External traffic manipulation scripts",
                        "Mass posting identical stories"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        Accounts may be shadow-limited or banned.
                    </p>
                </Section>

                <Section number="7" title="Plagiarism & Copyright">
                    <p><strong className="text-text-rich dark:text-dark-text-rich">You may only post content you have the rights to.</strong></p>
                    <SubSection title="Not Allowed">
                        <BulletList items={[
                            "Copied books",
                            "AI-rewritten copyrighted works",
                            "Translated works without permission",
                            "Reposting paid content from elsewhere",
                            "Stolen covers or artwork"
                        ]} />
                    </SubSection>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        We operate under a takedown policy. Repeated violations → termination.
                    </p>
                </Section>

                <Section number="8" title="AI Content Rules">
                    <SubSection title="Allowed">
                        <BulletList items={["AI assistance as a writing tool"]} />
                    </SubSection>
                    <SubSection title="Not Allowed">
                        <BulletList items={[
                            "Mass-generated spam stories",
                            "AI impersonating real authors",
                            "Uploading bulk auto-generated content for engagement farming"
                        ]} />
                    </SubSection>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Platform may limit AI content visibility.
                    </p>
                </Section>

                <Section number="9" title="Covers & Media">
                    <p>You must have rights to images used.</p>
                    <SubSection title="Prohibited">
                        <BulletList items={[
                            "Stolen artwork",
                            "Watermarked paid stock images without license",
                            "Real person photos without permission",
                            "Explicit images violating app-store or payment rules"
                        ]} />
                    </SubSection>
                </Section>

                <Section number="10" title="Comment & Interaction Rules">
                    <p>Readers and authors must respect each other.</p>
                    <SubSection title="Not Allowed">
                        <BulletList items={[
                            "Harassment in comments",
                            "Spoiler attacks",
                            "Promotional spam",
                            "Baiting arguments"
                        ]} />
                    </SubSection>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Authors may moderate comments on their works.
                    </p>
                </Section>

                <Section number="11" title="Monetization Rules">
                    <p>If monetization features are enabled:</p>
                    <SubSection title="Not Allowed">
                        <BulletList items={[
                            "Misleading paid chapters",
                            "Paywalling plagiarized content",
                            "Bait-and-switch endings",
                            "Selling content you don't own",
                            "Payment circumvention scams"
                        ]} />
                    </SubSection>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mt-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            ⚠️ We may freeze payouts during investigations.
                        </p>
                    </div>
                </Section>

                <Section number="12" title="Tagging & Content Warnings">
                    <p><strong className="text-text-rich dark:text-dark-text-rich">You must tag correctly.</strong></p>
                    <p>Failure to tag may result in:</p>
                    <BulletList items={[
                        "Visibility reduction",
                        "Age restriction",
                        "Removal"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Repeated misuse → account penalty.
                    </p>
                </Section>

                <Section number="13" title="Reporting & Enforcement">
                    <p>We may take action without notice if needed to protect the platform.</p>
                    <SubSection title="Actions Include">
                        <BulletList items={[
                            "Content removal",
                            "Visibility limitation",
                            "Demonetization",
                            "Temporary suspension",
                            "Permanent ban"
                        ]} />
                    </SubSection>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        Moderation decisions are final to prevent abuse of appeals.
                    </p>
                </Section>

                <Section number="14" title="Appeals">
                    <p>You may appeal <strong className="text-text-rich dark:text-dark-text-rich">once per action</strong>.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">False or abusive appeals may be ignored.</p>
                </Section>

                <Section number="15" title="Platform Protection Clause">
                    <p>We may remove any content or account that risks:</p>
                    <BulletList items={[
                        "Legal issues",
                        "Payment provider compliance",
                        "Hosting stability",
                        "Community safety"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        Even if not explicitly listed above.
                    </p>
                </Section>

                <Section number="16" title="Changes to Rules">
                    <p>Rules may update anytime to maintain legal and operational safety.</p>
                    <p className="font-medium text-text-rich dark:text-dark-text-rich">Continued use = acceptance.</p>
                </Section>

                {/* Contact Section */}
                <section className="mt-12 pt-8 border-t border-gray-200 dark:border-dark-border">
                    <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-4">Contact</h2>
                    <div className="bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl p-5 space-y-2">
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            🛡️ Report content: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            📩 Appeals: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                    </div>
                </section>

            </div>

            <Footer />
        </div>
    );
};
