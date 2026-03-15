
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

export const TermsPage: React.FC = () => {
    return (
        <div>
            {/* Hero Header */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-16 relative z-10 text-center">
                    <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                        Terms & Conditions
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body text-lg max-w-2xl mx-auto leading-relaxed">
                        By accessing or using WordWeft ("Platform", "Service"), you agree to these Terms.
                        If you do not agree, you must not use the Platform.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-surface-alt px-4 py-2 rounded-full">
                        <span>Last Updated:</span>
                        <span className="font-semibold text-text-rich dark:text-dark-text-rich">February 15, 2026</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-16 max-w-3xl">

                <Section number="1" title="Eligibility">
                    <p>You must:</p>
                    <BulletList items={[
                        "Be at least 13 years old",
                        "Be 18+ to publish mature content",
                        "Provide accurate account information",
                        "Not create accounts on behalf of banned users"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        We may suspend accounts that impersonate, automate, or misrepresent identity.
                    </p>
                </Section>

                <Section number="2" title="Account Responsibility">
                    <p>You are responsible for:</p>
                    <BulletList items={[
                        "All activity under your account",
                        "Maintaining password security",
                        "Any content posted through your account"
                    ]} />
                    <p className="mt-3">WordWeft is not liable for loss caused by unauthorized access.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">We may terminate accounts without prior notice if a security risk is suspected.</p>
                </Section>

                <Section number="3" title="Ownership of Content">
                    <p><strong className="text-text-rich dark:text-dark-text-rich">You retain ownership of your writing.</strong></p>
                    <p>However, by uploading content you grant WordWeft a:</p>
                    <div className="bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl p-4 mt-2">
                        <p className="text-sm italic">
                            Worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, distribute,
                            and promote your content for platform operation.
                        </p>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        This license ends when content is deleted — except for backups, legal compliance, and cached data.
                    </p>
                </Section>

                <Section number="4" title="Content Storage & Removal">
                    <p>We may:</p>
                    <BulletList items={[
                        "Compress media",
                        "Reformat text",
                        "Cache chapters",
                        "Create previews and snippets"
                    ]} />
                    <p className="mt-3">We may remove content without notice if it violates rules, law, or platform stability.</p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mt-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            ⚠️ We are not a permanent storage service. Always keep backups of your work.
                        </p>
                    </div>
                </Section>

                <Section number="5" title="Prohibited Content">
                    <SubSection title="Illegal Content">
                        <BulletList items={[
                            "Copyrighted content you do not own rights to",
                            "Pirated books, translations, or scraped works",
                            "Real private documents",
                            "Deepfake impersonations"
                        ]} />
                    </SubSection>
                    <SubSection title="Harmful Content">
                        <BulletList items={[
                            "Terrorism promotion",
                            "Real-world violence instructions",
                            "Self-harm encouragement",
                            "Exploitative sexual content involving minors (zero tolerance)"
                        ]} />
                    </SubSection>
                    <SubSection title="Abuse of Platform">
                        <BulletList items={[
                            "Spam chapters",
                            "SEO stuffing",
                            "Fake engagement farming",
                            "Bot-generated bulk posting",
                            "Manipulated ranking attempts"
                        ]} />
                    </SubSection>
                </Section>

                <Section number="6" title="Mature / NSFW Content">
                    <p className="font-medium text-text-rich dark:text-dark-text-rich">
                        Currently, we do not allow mature or NSFW content on WordWeft.
                    </p>
                    <p className="mt-2">
                        While this is our current policy to maintain a general audience platform, we understand the need for mature storytelling spaces. Support for properly tagged mature content may be introduced in a future release.
                    </p>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Until then, any mature content will be subject to removal.
                    </p>
                </Section>

                <Section number="7" title="Anti-Spam & Manipulation Policy">
                    <p>You may not:</p>
                    <BulletList items={[
                        "Artificially inflate reads",
                        "Use scripts, refresh bots, or engagement exchanges",
                        "Create multiple accounts to boost rankings",
                        "Offer rewards for fake engagement"
                    ]} />
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 mt-4">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Violation may result in:</p>
                        <BulletList items={[
                            "Ranking removal",
                            "Monetization ban",
                            "Permanent account deletion",
                            "Payment forfeiture"
                        ]} />
                    </div>
                </Section>

                <Section number="8" title="Comments & Community Conduct">
                    <p>You may not:</p>
                    <BulletList items={[
                        "Harass or threaten users",
                        "Post promotional spam",
                        "Post links to malware or scams",
                        "Post hate speech"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        We may remove comments or restrict features at our discretion. Inline commenting may be disabled per author settings.
                    </p>
                </Section>

                <Section number="9" title="Monetization Rules (Future Feature)">
                    <p>When enabled:</p>
                    <BulletList items={[
                        "Earnings may be withheld for fraud investigation",
                        "Chargebacks may deduct balance",
                        "Abuse of paywalls leads to permanent ban",
                        "We may impose minimum payout thresholds",
                        "Taxes are user responsibility"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        We are not liable for third-party payment processor decisions.
                    </p>
                </Section>

                <Section number="10" title="Algorithm & Discovery">
                    <p>WordWeft uses discovery systems (search, tags, trending). You may not attempt to manipulate visibility through:</p>
                    <BulletList items={[
                        "Keyword flooding",
                        "Misleading tagging",
                        "Mass coordinated traffic"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">We may manually adjust discoverability.</p>
                </Section>

                <Section number="11" title="AI Usage Policy">
                    <p>Unless explicitly permitted:</p>
                    <BulletList items={[
                        "Fully AI-generated books must be labeled",
                        "AI spam publishing is prohibited",
                        "AI impersonation of real authors is prohibited",
                        "AI-generated covers may be restricted"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">We may request proof of authorship.</p>
                </Section>

                <Section number="12" title="Intellectual Property Complaints (DMCA-style)">
                    <p>To report infringement, send:</p>
                    <BulletList items={[
                        "Proof of ownership",
                        "Link to content",
                        "Identity verification"
                    ]} />
                    <p className="mt-3">We may remove content immediately during investigation.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">False claims may result in account suspension.</p>
                </Section>

                <Section number="13" title="Privacy & Data">
                    <p>We collect:</p>
                    <BulletList items={[
                        "Usage analytics",
                        "Reading behavior",
                        "Device data"
                    ]} />
                    <p className="mt-3 font-medium text-text-rich dark:text-dark-text-rich">We do NOT sell personal data.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">We may share data when required by law.</p>
                </Section>

                <Section number="14" title="Service Availability">
                    <p>We may:</p>
                    <BulletList items={[
                        "Modify features",
                        "Remove features",
                        "Suspend service",
                        "Perform maintenance"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">We are not liable for lost drafts or interruptions.</p>
                </Section>

                <Section number="15" title="Termination">
                    <p>We may suspend or terminate accounts for:</p>
                    <BulletList items={[
                        "Rule violations",
                        "Legal risk",
                        "Abuse of systems",
                        "Harm to community"
                    ]} />
                    <p className="mt-3 font-medium text-text-rich dark:text-dark-text-rich">No refunds for banned accounts.</p>
                </Section>

                <Section number="16" title="Limitation of Liability">
                    <p><strong className="text-text-rich dark:text-dark-text-rich">WordWeft is provided "as is".</strong></p>
                    <p>We are not liable for:</p>
                    <BulletList items={[
                        "Lost income",
                        "Deleted content",
                        "Reader reactions",
                        "Third-party payment failures"
                    ]} />
                    <div className="bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl p-4 mt-3">
                        <p className="text-sm italic">
                            Maximum liability is limited to the amount paid to WordWeft in the last 3 months (if any).
                        </p>
                    </div>
                </Section>

                <Section number="17" title="Indemnification">
                    <p>You agree to indemnify WordWeft against claims arising from:</p>
                    <BulletList items={[
                        "Your content",
                        "Copyright violations",
                        "Unlawful usage"
                    ]} />
                </Section>

                <Section number="18" title="Jurisdiction">
                    <p>These terms are governed under the <strong className="text-text-rich dark:text-dark-text-rich">laws of India</strong>.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Disputes are subject to the courts of the applicable jurisdiction.</p>
                </Section>

                <Section number="19" title="Changes to Terms">
                    <p>We may update these Terms at any time.</p>
                    <p className="font-medium text-text-rich dark:text-dark-text-rich">Continued use constitutes acceptance of updated Terms.</p>
                </Section>

                <Section number="20" title="Contact">
                    <p>For legal issues:</p>
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-2">
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            📧 <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                    </div>
                </Section>

            </div>

            <Footer />
        </div>
    );
};
