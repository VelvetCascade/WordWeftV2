
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const CommunityGuidelinesPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Community Guidelines
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 md:py-18">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            {/* Date Information */}
            <div className="mb-6 sm:mb-8">
              <p className="font-serif text-xs sm:text-sm text-text-body dark:text-dark-text-body mb-1">
                Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="font-serif text-xs sm:text-sm text-text-body dark:text-dark-text-body">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Introduction */}
            <div className="mb-8 sm:mb-10 md:mb-12">
              <p className="font-serif text-sm sm:text-base md:text-lg leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                WordWeft is built on the foundation of respect, creativity, and mutual support. These guidelines help ensure our community remains a welcoming space for everyone while protecting the platform from exploitation and abuse.
              </p>
            </div>

            {/* Guidelines Sections */}
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {/* Be Respectful */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Be Respectful
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Treat all members of our community with kindness and respect. Constructive criticism is welcome, but personal attacks, harassment, or bullying will not be tolerated. Remember that behind every story is a person who has invested time and creativity.
                </p>
              </div>

              {/* Celebrate Diversity */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Celebrate Diversity
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Our community is made richer by diverse voices, perspectives, and experiences. We welcome and celebrate stories from all backgrounds, cultures, and identities. Discrimination of any kind has no place on WordWeft.
                </p>
              </div>

              {/* Support Creators */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Support Creators
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  If you enjoy a story, let the author know! Positive feedback, thoughtful reviews, and sharing works you love helps build a supportive creative community. Your engagement makes a real difference to writers.
                </p>
              </div>

              {/* Respect Intellectual Property */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Respect Intellectual Property
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Only share original work or content you have permission to use. Plagiarism and copyright infringement harm the entire community and will result in immediate action, including content removal and account suspension.
                </p>
              </div>

              {/* Keep It Safe */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Keep It Safe
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Do not share personal information, engage in unsafe practices, or create content that could harm others. If you see something that concerns you, please report it immediately.
                </p>
              </div>

              {/* Authentic Engagement */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Authentic Engagement
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  Authentic engagement makes our community stronger. The following practices are strictly prohibited:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Creating fake accounts, bot accounts, or automated accounts to manipulate engagement</li>
                  <li>Using multiple accounts to artificially inflate views, likes, comments, or ratings</li>
                  <li>Coordinated manipulation schemes, vote brigading, or review manipulation</li>
                  <li>Purchasing or selling fake engagement, followers, or reviews</li>
                  <li>Using scripts, bots, or automated tools to interact with the platform</li>
                  <li>Creating spam content or repetitive, low-quality posts</li>
                </ul>
              </div>

              {/* Account Security & Fair Use */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Account Security & Fair Use
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  To maintain platform integrity and prevent exploitation:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Each user is limited to one account per person. Multiple accounts for the same individual are not permitted</li>
                  <li>Do not share your account credentials with others or allow others to use your account</li>
                  <li>Do not attempt to circumvent platform features, rate limits, or security measures</li>
                  <li>Do not exploit bugs, glitches, or vulnerabilities in the platform</li>
                  <li>Respect rate limits and fair use policies. Excessive automated actions may result in temporary or permanent restrictions</li>
                  <li>Do not use the platform for commercial spam, phishing, or fraudulent activities</li>
                </ul>
              </div>

              {/* Content Authenticity */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Content Authenticity
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  All content must be authentic and original:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Do not post AI-generated content without proper disclosure or attribution</li>
                  <li>Do not republish content from other platforms without permission or proper attribution</li>
                  <li>Do not create misleading or deceptive content, including false claims about authorship or origin</li>
                  <li>Do not use the platform to distribute pirated content, unauthorized copies, or stolen material</li>
                </ul>
              </div>

              {/* Prohibited Activities */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Prohibited Activities
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  The following activities are strictly prohibited and will result in immediate account termination:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Attempting to hack, breach, or compromise platform security</li>
                  <li>Distributing malware, viruses, or harmful code</li>
                  <li>Scraping, data mining, or unauthorized collection of user data or content</li>
                  <li>Reverse engineering or attempting to access platform APIs without authorization</li>
                  <li>Using the platform for illegal activities, fraud, or financial scams</li>
                  <li>Impersonating other users, authors, or WordWeft staff</li>
                  <li>Creating accounts to evade previous bans or restrictions</li>
                </ul>
              </div>

              {/* Reporting & Enforcement */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Reporting & Enforcement
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  WordWeft actively monitors the platform for violations and takes enforcement seriously:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>All reported violations are investigated promptly</li>
                  <li>Violations may result in warnings, content removal, temporary suspension, or permanent account termination</li>
                  <li>Severe violations, including platform exploitation, may result in immediate and permanent bans</li>
                  <li>We reserve the right to take legal action against users who engage in illegal activities or cause significant harm</li>
                  <li>If you witness exploitation or abuse, report it immediately through our reporting system</li>
                </ul>
              </div>

              {/* Consequences */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Consequences
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Violations of these guidelines may result in warnings, content removal, account suspension, or permanent account termination. We take these guidelines seriously to maintain a positive, safe, and fair environment for all users. Repeated violations or severe infractions will result in stricter penalties.
                </p>
              </div>

              {/* Questions or Concerns */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Questions or Concerns?
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  If you have questions about these guidelines or need to report a violation, please{' '}
                  <a 
                    href="/contact" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '/contact'; navigateTo({ name: 'contact' }); }}
                    className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                  >
                    contact us
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer navigateTo={navigateTo} />
    </div>
  );
};

