
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const ContentPolicyPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Content Policy
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
                WordWeft is committed to fostering a creative and respectful environment for all users. This Content Policy outlines what content is acceptable on our platform and what is not.
              </p>
            </div>

            {/* Policy Sections */}
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {/* Overview */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Overview
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  WordWeft is committed to fostering a creative and respectful environment for all users. This Content Policy outlines what content is acceptable on our platform and what is not.
                </p>
              </div>

              {/* Acceptable Content */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Acceptable Content
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We welcome original creative works across all genres and styles. Content should be original to the author or properly attributed if using public domain materials. We encourage diverse perspectives, creative expression, and literary experimentation.
                </p>
              </div>

              {/* Prohibited Content */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Prohibited Content
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-3 max-w-none" style={{ lineHeight: '1.8' }}>
                  The following types of content are not permitted on WordWeft:
                </p>
                <ul className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none space-y-2 list-disc list-inside" style={{ lineHeight: '1.8' }}>
                  <li>Content that violates copyright or intellectual property rights</li>
                  <li>Hate speech, harassment, or content that promotes discrimination</li>
                  <li>Explicit sexual content without appropriate warnings and age restrictions</li>
                  <li>Content that promotes illegal activities</li>
                  <li>Spam, scams, or misleading information</li>
                  <li>Content that endangers the safety of others</li>
                </ul>
              </div>

              {/* Content Warnings */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Content Warnings
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Authors are encouraged to provide appropriate content warnings for material that may be sensitive or triggering, including but not limited to: violence, sexual content, mental health themes, and other potentially distressing topics.
                </p>
              </div>

              {/* Enforcement */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Enforcement
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  Violations of this policy may result in content removal, account warnings, or account suspension. We review reported content and take appropriate action in accordance with our policies and applicable laws.
                </p>
              </div>

              {/* Reporting */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Reporting
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  If you encounter content that violates this policy, please report it through our reporting system or{' '}
                  <a 
                    href="/contact" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '/contact'; navigateTo({ name: 'contact' }); }}
                    className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                  >
                    contact us
                  </a> directly.
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

