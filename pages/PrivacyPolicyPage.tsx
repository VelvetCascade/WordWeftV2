
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const PrivacyPolicyPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Privacy Policy
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
                At WordWeft, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </div>

            {/* Policy Sections */}
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {/* Introduction */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Introduction
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  At WordWeft, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                </p>
              </div>

              {/* Information We Collect */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Information We Collect
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We collect information that you provide directly to us, including account registration details, profile information, reading preferences, and content you create or upload. We also automatically collect certain information about your device and how you interact with our platform.
                </p>
              </div>

              {/* How We Use Your Information */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  How We Use Your Information
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We use the information we collect to provide, maintain, and improve our services, personalize your reading experience, process transactions, communicate with you, and ensure platform security.
                </p>
              </div>

              {/* Information Sharing */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Information Sharing
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We do not sell your personal information. We may share your information only in limited circumstances, such as with your consent, to comply with legal obligations, or to protect our rights and the safety of our users.
                </p>
              </div>

              {/* Data Security */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Data Security
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              {/* Your Rights */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Your Rights
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  You have the right to access, update, or delete your personal information at any time. You can also opt out of certain communications and data collection practices through your account settings.
                </p>
              </div>

              {/* Cookies and Tracking */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Cookies and Tracking
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  We use cookies and similar tracking technologies to enhance your experience, analyze platform usage, and assist with our marketing efforts. You can control cookie preferences through your browser settings.
                </p>
              </div>

              {/* Contact Us */}
              <div>
                <h6 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                  Contact Us
                </h6>
                <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                  If you have questions about this Privacy Policy, please contact us through our{' '}
                  <a 
                    href="/contact" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '/contact'; navigateTo({ name: 'contact' }); }}
                    className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                  >
                    contact page
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

