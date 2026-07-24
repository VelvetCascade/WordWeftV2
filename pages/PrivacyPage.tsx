
import React, { useEffect } from 'react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';
import AdUnit from '../components/AdUnit';

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

export const PrivacyPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('content', 'policy_view', 'privacy'); }, []);
    return (
        <div>
            {/* Hero Header */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 -translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/5 rounded-full translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-16 relative z-10 text-center">
                    <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body text-lg max-w-2xl mx-auto leading-relaxed">
                        This Privacy Policy explains how WordWeft ("we", "us", "platform") collects, uses, stores,
                        shares, and protects your personal information when you use our website or services.
                    </p>
                    <p className="text-text-body dark:text-dark-text-body mt-3 font-medium">
                        By using WordWeft, you agree to this Privacy Policy.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="bg-gray-100 dark:bg-dark-surface-alt px-4 py-2 rounded-full">
                            <span>Last Updated: </span>
                            <span className="font-semibold text-text-rich dark:text-dark-text-rich">February 15, 2026</span>
                        </div>
                        <div className="bg-gray-100 dark:bg-dark-surface-alt px-4 py-2 rounded-full">
                            Contact: <a href="mailto:wordweftstudio@gmail.com" className="text-accent font-semibold hover:underline">wordweftstudio@gmail.com</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-16 max-w-3xl">

                <Section number="1" title="What Data We Collect">
                    <SubSection title="A. Account Information">
                        <p>When you create an account, we collect:</p>
                        <BulletList items={[
                            "Username",
                            "Email address",
                            "Password (encrypted — we never store plain text passwords)",
                            "Display name",
                            "Profile bio",
                            "Profile image",
                            "Social links (optional)",
                            "Country (optional)"
                        ]} />
                    </SubSection>

                    <SubSection title="B. Usage & Reading Activity">
                        <p>To operate platform features, we collect:</p>
                        <BulletList items={[
                            "Stories you read and chapters opened",
                            "Reading time and scroll depth",
                            "Bookmarks, likes, follows, and comments",
                            "Search queries and tags interacted with",
                            "Library shelves",
                            "Writing drafts & published content"
                        ]} />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                            This is required for features like progress tracking, recommendations, and analytics.
                        </p>
                    </SubSection>

                    <SubSection title="C. Device & Technical Data">
                        <p>Automatically collected:</p>
                        <BulletList items={[
                            "IP address",
                            "Browser type and device type",
                            "Operating system",
                            "Session timestamps",
                            "Cookies",
                            "Crash logs and performance logs"
                        ]} />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                            Used only for security, debugging, and abuse prevention.
                        </p>
                    </SubSection>

                    <SubSection title="D. Payments & Monetization (Future)">
                        <p>Payment processing is handled by third-party processors.</p>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-4 mt-2">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">We do NOT store:</p>
                            <BulletList items={["Card numbers", "CVV", "Bank credentials"]} />
                        </div>
                        <p className="mt-3">We may store:</p>
                        <BulletList items={[
                            "Transaction ID",
                            "Payout amount",
                            "Tax information (if required by law)"
                        ]} />
                    </SubSection>

                    <SubSection title="E. Communications">
                        <p>If you contact us or other users, we may collect:</p>
                        <BulletList items={[
                            "Support messages",
                            "Moderation reports",
                            "Appeal requests",
                            "Notifications"
                        ]} />
                    </SubSection>
                </Section>

                <Section number="2" title="How We Use Your Data">
                    <SubSection title="Platform Operation">
                        <BulletList items={[
                            "Login authentication",
                            "Saving drafts",
                            "Syncing reading progress",
                            "Showing libraries & shelves",
                            "Displaying comments"
                        ]} />
                    </SubSection>
                    <SubSection title="Safety & Abuse Prevention">
                        <BulletList items={[
                            "Detect spam accounts and bots",
                            "Prevent fraud",
                            "Enforce content rules"
                        ]} />
                    </SubSection>
                    <SubSection title="Improvements">
                        <BulletList items={[
                            "Performance optimization",
                            "Bug fixing",
                            "Feature usage analytics"
                        ]} />
                    </SubSection>
                    <SubSection title="Communication">
                        <BulletList items={[
                            "Security alerts",
                            "Account notices",
                            "Optional newsletters"
                        ]} />
                    </SubSection>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mt-4">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            🔒 We do NOT sell personal data to advertisers.
                        </p>
                    </div>
                </Section>

                <Section number="3" title="Cookies & Tracking">
                    <p>We use cookies to:</p>
                    <BulletList items={[
                        "Keep you logged in",
                        "Remember preferences",
                        "Prevent spam",
                        "Improve loading speed"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        You can disable cookies, but some features may not work. We do not use cross-site ad tracking cookies.
                    </p>
                </Section>

                <Section number="4" title="Content Visibility & Public Data">
                    <p>Information visible to other users:</p>
                    <BulletList items={[
                        "Username",
                        "Profile picture",
                        "Bio",
                        "Published stories",
                        "Comments",
                        "Follower counts"
                    ]} />
                    <p className="mt-3 font-medium text-text-rich dark:text-dark-text-rich">Private data is never publicly displayed.</p>
                </Section>

                <Section number="5" title="Data Sharing">
                    <p>We only share data with:</p>
                    <SubSection title="Service Providers">
                        <BulletList items={[
                            "Hosting servers",
                            "Database providers",
                            "Email services",
                            "Payment processors"
                        ]} />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">Only the minimum required data is shared.</p>
                    </SubSection>
                    <SubSection title="Legal Requirements">
                        <p>We may disclose data if required by:</p>
                        <BulletList items={[
                            "Court order",
                            "Law enforcement",
                            "Legal compliance"
                        ]} />
                    </SubSection>
                </Section>

                <Section number="6" title="User Content Responsibility">
                    <p>Content you publish is public. You are responsible for not sharing:</p>
                    <BulletList items={[
                        "Personal addresses",
                        "Private contacts",
                        "Confidential documents"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        We are not responsible for data you voluntarily publish.
                    </p>
                </Section>

                <Section number="7" title="Data Retention">
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-dark-border mt-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-dark-surface-alt">
                                    <th className="text-left px-4 py-3 font-semibold text-text-rich dark:text-dark-text-rich">Data Type</th>
                                    <th className="text-left px-4 py-3 font-semibold text-text-rich dark:text-dark-text-rich">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                <tr><td className="px-4 py-3">Account</td><td className="px-4 py-3">Until deletion</td></tr>
                                <tr><td className="px-4 py-3">Drafts</td><td className="px-4 py-3">Until deleted</td></tr>
                                <tr><td className="px-4 py-3">Logs</td><td className="px-4 py-3">Up to 12 months</td></tr>
                                <tr><td className="px-4 py-3">Payments</td><td className="px-4 py-3">As required by law</td></tr>
                                <tr><td className="px-4 py-3">Backups</td><td className="px-4 py-3">Up to 90 days</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Deleted content may remain temporarily in backups.
                    </p>
                </Section>

                <AdUnit format="article" />

                <Section number="8" title="Account Deletion">
                    <p>You may request deletion anytime. After deletion:</p>
                    <BulletList items={[
                        "Profile removed",
                        "Private data erased",
                        "Content anonymized or deleted"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Some data may be retained for fraud prevention and legal compliance.
                    </p>
                </Section>

                <Section number="9" title="Security Measures">
                    <p>We use:</p>
                    <BulletList items={[
                        "Encrypted passwords",
                        "HTTPS encryption",
                        "Access control",
                        "Abuse detection",
                        "Rate limiting"
                    ]} />
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mt-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            ⚠️ However, no internet service is 100% secure.
                        </p>
                    </div>
                </Section>

                <Section number="10" title="Children's Privacy">
                    <p><strong className="text-text-rich dark:text-dark-text-rich">Users under 13 are not allowed.</strong></p>
                    <p>If detected:</p>
                    <BulletList items={[
                        "Account removed",
                        "Data deleted"
                    ]} />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Parents may contact us for removal at <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>.
                    </p>
                </Section>

                <Section number="11" title="International Users">
                    <p>Your data may be stored on servers outside your country.</p>
                    <p>By using WordWeft, you consent to cross-border data processing.</p>
                </Section>

                <Section number="12" title="Your Rights">
                    <p>You may request:</p>
                    <BulletList items={[
                        "Access to your data",
                        "Correction of inaccuracies",
                        "Deletion of your data",
                        "Restriction of processing"
                    ]} />
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-3">
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            📧 Contact: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                    </div>
                </Section>

                <Section number="13" title="Changes to Policy">
                    <p>We may update this policy at any time. Major changes will be notified.</p>
                    <p className="font-medium text-text-rich dark:text-dark-text-rich">Continued use constitutes acceptance.</p>
                </Section>

                <Section number="14" title="Contact">
                    <div className="bg-gray-50 dark:bg-dark-surface-alt border border-gray-200 dark:border-dark-border rounded-xl p-5 space-y-2">
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            🔐 Privacy inquiries: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                        <p className="font-medium text-text-rich dark:text-dark-text-rich">
                            ⚖️ Legal: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a>
                        </p>
                    </div>
                </Section>

                <AdUnit format="horizontal" />

            </div>

            <Footer />
        </div>
    );
};
