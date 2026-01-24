
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const TermsPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Terms & Conditions
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
                Welcome to WordWeft, a platform where writers, readers, and creators come together to share and experience stories, articles, and creative works. By registering, accessing, or using WordWeft (the "Platform"), you agree to comply with and be legally bound by the following Terms and Conditions. Please read them carefully.
              </p>
            </div>

            {/* Terms Sections */}
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {/* Section 1 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
            1. Acceptance of Terms
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  By creating an account or using WordWeft, you acknowledge that you have read, understood, and agree to these Terms. If you do not agree, please do not use the Platform.
                </p>
              </div>

              {/* Section 2 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  2. Eligibility
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>You must be at least 13 years old to register.</li>
                  <li>If you are under 18, you may use the Platform only under parental/guardian consent.</li>
                  <li>Certain content on WordWeft may be age-restricted (e.g., R-rated works). Users under 18 will not have access to such content.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  3. Account Creation & Security
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>You must provide accurate, current, and complete information during registration and profile setup.</li>
                  <li>You are responsible for all activities under your account, whether authorized or not.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  4. Content Ownership & License
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>All content uploaded (stories, poems, articles, artwork, etc.) remains the intellectual property of the original creator.</li>
                  <li>By posting content, you grant WordWeft a worldwide, non-exclusive, royalty-free license to host, display, and distribute your content within the Platform for the purpose of operating and promoting the service.</li>
                  <li>WordWeft does not claim ownership over user-generated content.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  5. Content Guidelines
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  Users agree not to post or share content that is:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Illegal, defamatory, or fraudulent.</li>
                  <li>Pornographic, sexually explicit, or promoting exploitation of minors.</li>
                  <li>Violent, hateful, or inciting discrimination.</li>
                  <li>Spam, misleading, or violating intellectual property rights.</li>
                </ul>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mt-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  WordWeft reserves the right to remove, block, or restrict any content that violates these guidelines without prior notice.
                </p>
              </div>

              {/* Section 6 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  6. Age-Restricted Content
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Content may be marked "R-rated."</li>
                  <li>Users under 18 will not have access to such content.</li>
                  <li>Authors are responsible for correctly labeling their works.</li>
                  <li>Mislabeling may result in content removal or account suspension.</li>
                </ul>
              </div>

              {/* Section 7 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  7. Reader & Writer Conduct
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  You agree:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Not to attempt to hack, manipulate, or exploit the Platform.</li>
                  <li>Not to harass, stalk, or abuse other users.</li>
                  <li>To respect other people's intellectual property rights.</li>
                  <li>Not to attempt screen recording, screen sharing, or distribution of content outside the platform without the author's consent.</li>
                </ul>
              </div>

              {/* Section 8 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  8. Payments & Monetization (if applicable)
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Certain premium features, subscription models, or monetization opportunities may be introduced.</li>
                  <li>Payments, if applicable, will be processed securely via third-party payment gateways.</li>
                  <li>WordWeft is not responsible for external transaction issues caused by banks, wallets, or third-party providers.</li>
                </ul>
              </div>

              {/* Section 9 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  9. Privacy & Data Protection
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>WordWeft values your privacy and will not sell or misuse your personal data.</li>
                  <li>Certain data (like username, preferences, DOB) may be collected to personalize your experience.</li>
                  <li>Please refer to our Privacy Policy for details on data handling.</li>
                </ul>
              </div>

              {/* Section 10 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  10. Suspension & Termination
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  WordWeft may suspend, restrict, or terminate accounts without notice if:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>A user violates these Terms.</li>
                  <li>A user engages in suspicious or fraudulent activity.</li>
                  <li>A user posts harmful, illegal, or misleading content.</li>
                </ul>
              </div>

              {/* Section 11 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  11. Limitation of Liability
                </h6>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>WordWeft is not responsible for the accuracy, completeness, or quality of user-generated content.</li>
                  <li>The Platform is provided "as is" without warranties of any kind.</li>
                  <li>WordWeft is not liable for damages resulting from use or inability to use the Platform.</li>
                </ul>
              </div>

              {/* Section 12 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  12. Changes to Terms
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  WordWeft may update these Terms from time to time. Users will be notified via in-app alerts, email, or updates on the website. Continued use after changes means you accept the revised Terms.
                </p>
              </div>

              {/* Section 13 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  13. Governing Law
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  These Terms shall be governed by and construed under the laws of India, without regard to conflict of law principles.
                </p>
              </div>

              {/* Section 14 */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  14. Contact Us
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  For questions, feedback, or reporting violations, contact us at:{' '}
                  <a 
                    href="mailto:support@wordweft.com" 
                    className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                  >
                    support@wordweft.com
                  </a>
                </p>
              </div>
            </div>

            {/* Closing Message */}
            <div className="mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-[#E8E0D6] dark:border-[#3E2723] text-center">
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none font-medium" style={{ lineHeight: '1.8' }}>
                Together, let's weave a space that feels like home.<br />
                — The WordWeft Team
          </p>
        </div>
      </div>
        </div>
      </section>

      <Footer navigateTo={navigateTo} />
    </div>
  );
};

