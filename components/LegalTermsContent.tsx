import React from 'react';

export const TERMS_EFFECTIVE_DATE = 'September 22, 2026';

export const TERMS_SECTIONS = [
    ['agreement', 'Agreement and related policies'],
    ['eligibility', 'Eligibility and accounts'],
    ['service-use', 'Using the service'],
    ['ownership', 'Your content and ownership'],
    ['public-content', 'Public content and backups'],
    ['mature-content', 'Age ratings and mature content'],
    ['prohibited-content', 'Prohibited content and conduct'],
    ['ai-content', 'AI-assisted and synthetic content'],
    ['community', 'Community features'],
    ['moderation', 'Moderation, reports and appeals'],
    ['copyright', 'Intellectual-property complaints'],
    ['monetization', 'Monetization and payments'],
    ['privacy', 'Privacy and data'],
    ['third-parties', 'Third-party services'],
    ['availability', 'Availability and changes'],
    ['termination', 'Suspension and termination'],
    ['disclaimers', 'Disclaimers'],
    ['liability', 'Limitation of liability'],
    ['indemnity', 'Indemnity'],
    ['law', 'Governing law and disputes'],
    ['changes', 'Changes to these Terms'],
    ['general', 'General terms'],
    ['contact', 'Contact'],
] as const;

const Section: React.FC<{
    id: string;
    number: number;
    title: string;
    children: React.ReactNode;
}> = ({ id, number, title, children }) => (
    <section id={`terms-${id}`} className="scroll-mt-28 border-t border-gray-200 pt-7 first:border-t-0 first:pt-0 dark:border-dark-border">
        <h2 className="mb-3 font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">
            {number}. {title}
        </h2>
        <div className="space-y-3 text-[0.95rem] leading-7 text-text-body dark:text-dark-text-body">
            {children}
        </div>
    </section>
);
const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ul className="list-disc space-y-2 pl-6 marker:text-accent">{children}</ul>
);

const PolicyLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a className="font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent" href={href}>
        {children}
    </a>
);

export const LegalTermsContent: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
    <div className={compact ? 'space-y-8' : 'space-y-9'}>
        <Section id="agreement" number={1} title="Agreement and related policies">
            <p>WordWeft Studio operates the WordWeft website, applications and related services (together, the “Service”). “WordWeft,” “we,” “us” and “our” refer to WordWeft Studio. These Terms apply to readers, writers and everyone else who accesses or uses the Service.</p>
            <p>By using the Service, creating an account or publishing content, you agree to these Terms. If you do not agree, do not use the Service. Our <PolicyLink href="/privacy">Privacy Policy</PolicyLink> and <PolicyLink href="/safety">Safety &amp; Content Rules</PolicyLink> form part of these Terms.</p>
        </Section>

        <Section id="eligibility" number={2} title="Eligibility and accounts">
            <List>
                <li>You must be at least 13 years old to create an account. If the law where you live requires parental or guardian consent, you must have that consent.</li>
                <li>You must provide accurate account information and keep it reasonably current.</li>
                <li>You are responsible for activity under your account and for keeping your login details secure. Tell us promptly if you believe your account has been compromised.</li>
                <li>You may not impersonate another person, create an account for a banned user or use automated account creation.</li>
            </List>
            <p>We may refuse registration, require reasonable verification or restrict an account when necessary for safety, security or legal compliance.</p>
        </Section>

        <Section id="service-use" number={3} title="Using the service">
            <p>Subject to these Terms, WordWeft gives you a limited, personal, non-exclusive, non-transferable and revocable right to use the Service through the interfaces we provide.</p>
            <p>You may not interfere with the Service, bypass access controls, probe its security, introduce malicious code, reverse engineer protected parts of the Service except where applicable law permits it, or use automated systems to burden, copy or manipulate the Service.</p>
        </Section>

        <Section id="ownership" number={4} title="Your content and ownership">
            <p><strong className="text-text-rich dark:text-dark-text-rich">You retain ownership of the stories, chapters, artwork, comments and other content you submit (“User Content”). Publishing on WordWeft is non-exclusive.</strong> These Terms do not prevent you from publishing your work elsewhere.</p>
            <p>You give WordWeft a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, format, adapt for technical display, distribute, display and promote your User Content only as needed to operate, improve and promote the Service and your work on it. This licence lets us make backups, generate previews, display your work to readers and feature a story, excerpt, description or cover in WordWeft marketing.</p>
            <p>The licence for deleted User Content ends within a commercially reasonable period, except for copies retained in backups, caches, legal records or material that must be preserved to investigate abuse. You represent that you own or have all rights and permissions needed for the content you submit and for this licence.</p>
        </Section>

        <Section id="public-content" number={5} title="Public content and backups">
            <p>Published stories, profile information, comments and other public submissions can be viewed and shared by others. Do not publish personal, confidential or private information that you do not want made public.</p>
            <p>WordWeft is not a permanent archive. Keep your own current copy of every manuscript and important file. We may compress media, reformat text, cache pages and create snippets or previews to operate the Service.</p>
        </Section>

        <Section id="mature-content" number={6} title="Age ratings and mature content">
            <p><strong className="text-text-rich dark:text-dark-text-rich">WordWeft permits legal mature and adult fiction when it is accurately classified and warned.</strong> Mature content is not banned merely because it includes adult themes or explicit material.</p>
            <List>
                <li>Available ratings are Everyone, Teen 13+, Mature 18+ and Adult 21+.</li>
                <li>Writers must be at least 18 and provide a date of birth before creating or publishing a Mature 18+ or Adult 21+ story.</li>
                <li>Mature 18+ stories are available only to signed-in readers who are at least 18 and have chosen to include mature stories. Adult 21+ stories require the same opt-in and a reader age of at least 21.</li>
                <li>Writers must select the rating required by the strongest material in the story and use accurate warnings for violence, gore, strong language, sexual content, abuse, self-harm, substance use, grief, discrimination and other sensitive material.</li>
                <li>WordWeft may raise a rating, add or require warnings, limit discovery, restrict access or remove content when the selected rating does not match the material.</li>
            </List>
            <p>Age ratings and warnings do not make illegal or prohibited content acceptable. The detailed boundaries in our <PolicyLink href="/safety">Safety &amp; Content Rules</PolicyLink> still apply.</p>
        </Section>

        <Section id="prohibited-content" number={7} title="Prohibited content and conduct">
            <p>You may not submit, promote or use the Service for content or conduct that:</p>
            <List>
                <li>sexually depicts, exploits or endangers a person under 18, including fictional, “aged-up” or child-like characters in a sexual context;</li>
                <li>contains non-consensual real-person intimate material, sexual exploitation, doxxing or private information shared without authority;</li>
                <li>instructs or encourages terrorism, real-world violence, suicide, self-harm, fraud or other illegal activity;</li>
                <li>infringes copyright, trademark, privacy, publicity or other rights, including pirated, scraped or unauthorised translated works and stolen artwork;</li>
                <li>threatens, harasses, stalks or targets people or protected groups with hateful abuse;</li>
                <li>contains malware, scams, deceptive links or attempts to compromise another person’s account or device; or</li>
                <li>uses spam, bots, engagement exchanges, multiple accounts or other manipulation to inflate reads, follows, reviews, rankings or earnings.</li>
            </List>
        </Section>

        <Section id="ai-content" number={8} title="AI-assisted and synthetic content">
            <p>AI assistance is allowed on the general WordWeft platform when it complies with these Terms and is disclosed wherever WordWeft provides a disclosure control. You remain responsible for accuracy, originality, permissions, labelling and every other aspect of content produced with automated tools.</p>
            <p>Mass-generated spam, deceptive synthetic media, impersonation of real people or authors, and AI rewrites of copyrighted work without permission are prohibited. WordWeft may label, limit or remove synthetic content. Individual programmes, including the Founding Writers Programme, may apply stricter eligibility rules.</p>
        </Section>

        <Section id="community" number={9} title="Community features">
            <p>Comments, reviews, profiles, messages and community posts must be relevant, lawful and respectful. Harassment, threats, hate speech, spoilers used to disrupt discussion, promotional spam and malicious links are prohibited. Authors may control some discussion settings, and WordWeft may restrict community features when they are abused.</p>
        </Section>

        <Section id="moderation" number={10} title="Moderation, reports and appeals">
            <p>WordWeft may review reports and take proportionate action, including changing a rating, adding a warning, reducing visibility, removing content, limiting features, suspending an account or permanently terminating access. We may act without advance notice when immediate action is reasonably necessary for user safety, legal compliance, security or platform stability.</p>
            <p>You may report content or request review of a moderation decision by emailing <PolicyLink href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</PolicyLink> with the relevant account, content link, decision and supporting information. We may decline repetitive, abusive or knowingly false reports.</p>
        </Section>

        <Section id="copyright" number={11} title="Intellectual-property complaints">
            <p>If you believe content on WordWeft infringes your rights, email <PolicyLink href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</PolicyLink> with:</p>
            <List>
                <li>your name and contact information;</li>
                <li>identification of the protected work and your authority to act;</li>
                <li>the exact WordWeft URL or other location of the material;</li>
                <li>an explanation of why the use is unauthorised; and</li>
                <li>a good-faith statement that the information in your notice is accurate.</li>
            </List>
            <p>We may ask for additional verification, disable material while reviewing a claim, notify the affected user and terminate repeat infringers. Knowingly false notices may lead to account action and legal responsibility.</p>
        </Section>

        <Section id="monetization" number={12} title="Monetization and payments">
            <p>Paid publishing is not currently live. If WordWeft introduces payments, subscriptions, paid chapters or writer payouts, additional terms may apply before you use those features.</p>
            <p>Future earnings may be adjusted for refunds, chargebacks, payment-processing fees, taxes, fraud or legal deductions. We may hold or reverse amounts reasonably connected to an investigation. WordWeft does not guarantee readers, rankings, publication offers or earnings.</p>
        </Section>

        <Section id="privacy" number={13} title="Privacy and data">
            <p>Our <PolicyLink href="/privacy">Privacy Policy</PolicyLink> explains the personal data we collect, why we use it, how it may be shared and the choices available to you. You must not use information obtained through WordWeft to profile, contact, scrape or exploit other users outside the purposes of the Service.</p>
        </Section>

        <Section id="third-parties" number={14} title="Third-party services">
            <p>The Service may use or link to third-party services such as hosting, analytics, identity, email, advertising, storage and future payment providers. Their services may be governed by separate terms and privacy policies. WordWeft is not responsible for third-party products, content or decisions outside our reasonable control.</p>
        </Section>

        <Section id="availability" number={15} title="Availability and changes">
            <p>We may maintain, update, add, modify or discontinue features. The Service may occasionally be unavailable, delayed or affected by events outside our control. We do not promise uninterrupted operation, permanent availability of any feature or error-free storage.</p>
        </Section>

        <Section id="termination" number={16} title="Suspension and termination">
            <p>You may stop using the Service at any time and may use available account controls to delete content or request account closure. We may suspend or terminate access when you materially or repeatedly breach these Terms, create legal or security risk, harm other users or misuse the Service.</p>
            <p>Provisions that by their nature should survive termination—including ownership, accrued payment obligations, disclaimers, liability limits, indemnity and dispute terms—will continue to apply.</p>
        </Section>

        <Section id="disclaimers" number={17} title="Disclaimers">
            <p>To the fullest extent permitted by law, the Service is provided “as is” and “as available.” WordWeft disclaims implied warranties of merchantability, fitness for a particular purpose, non-infringement and uninterrupted or error-free operation. User Content represents its author’s views, not WordWeft’s endorsement.</p>
            <p>Nothing in these Terms excludes a warranty or consumer right that cannot lawfully be excluded.</p>
        </Section>

        <Section id="liability" number={18} title="Limitation of liability">
            <p>To the fullest extent permitted by law, WordWeft and its team will not be liable for indirect, incidental, special, consequential, exemplary or punitive damages, or for lost profits, revenue, data, goodwill or opportunities arising from the Service.</p>
            <p>Where liability cannot be excluded, WordWeft’s total liability arising from the Service will not exceed the amount you paid directly to WordWeft during the 12 months before the event giving rise to the claim. These limits do not apply where applicable law prohibits them.</p>
        </Section>

        <Section id="indemnity" number={19} title="Indemnity">
            <p>To the extent permitted by law, you agree to defend and indemnify WordWeft Studio and its team against third-party claims, losses and reasonable costs arising from your User Content, your unlawful use of the Service, your infringement of another person’s rights or your material breach of these Terms.</p>
        </Section>

        <Section id="law" number={20} title="Governing law and disputes">
            <p>These Terms are governed by the laws of India, without regard to conflict-of-law principles. Disputes are subject to the courts of competent jurisdiction in India, except where mandatory consumer law gives you the right to bring a claim elsewhere.</p>
            <p>Before starting formal proceedings, please contact us and give both sides a reasonable opportunity to resolve the issue informally.</p>
        </Section>

        <Section id="changes" number={21} title="Changes to these Terms">
            <p>We may update these Terms to reflect changes to the Service, our practices or applicable law. We will post the revised effective date and provide additional notice when a change is material and notice is reasonably practicable. Your continued use after revised Terms take effect means you accept them.</p>
        </Section>

        <Section id="general" number={22} title="General terms">
            <p>These Terms and the policies they incorporate are the agreement between you and WordWeft concerning the Service. If one provision is unenforceable, the remaining provisions continue in effect. A delay in enforcing a provision is not a waiver. You may not transfer your account or these Terms without our consent; WordWeft may transfer them as part of a reorganisation, financing, merger, acquisition or sale of the Service.</p>
        </Section>

        <Section id="contact" number={23} title="Contact">
            <p>For support, safety reports, moderation appeals, intellectual-property notices and legal questions, email <PolicyLink href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</PolicyLink>. Include enough information for us to identify the account, content or decision involved.</p>
        </Section>
    </div>
);
