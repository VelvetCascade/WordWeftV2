
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const WriteWithUsPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-[#FBF9F6] dark:bg-[#261F1D]">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#4E342E] dark:text-[#EFEBE9] mb-6 tracking-tight">
          Write With Us
        </h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed mb-6 font-serif text-lg">
            WordWeft is always looking for talented writers to join our community. Whether you're 
            an established author or just beginning your writing journey, we welcome your voice and 
            your stories.
          </p>

          <h2 className="font-serif text-2xl font-semibold text-[#4E342E] dark:text-[#EFEBE9] mt-8 mb-4">
            Why Write on WordWeft?
          </h2>
          <ul className="list-none space-y-4 mb-6">
            <li className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
              <span className="font-semibold text-[#5D4037] dark:text-[#D7CCC8]">Creative Freedom:</span> Write what you want, 
              when you want, without restrictions on genre, length, or style.
            </li>
            <li className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
              <span className="font-semibold text-[#5D4037] dark:text-[#D7CCC8]">Fair Compensation:</span> We believe writers 
              deserve to be paid fairly for their work. Our revenue-sharing model ensures you benefit 
              from your success.
            </li>
            <li className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
              <span className="font-semibold text-[#5D4037] dark:text-[#D7CCC8]">Supportive Community:</span> Connect with 
              readers who appreciate your work and fellow writers who understand your journey.
            </li>
            <li className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
              <span className="font-semibold text-[#5D4037] dark:text-[#D7CCC8]">Powerful Tools:</span> Our intuitive writing 
              dashboard helps you organize, publish, and track your stories with ease.
            </li>
          </ul>

          <h2 className="font-serif text-2xl font-semibold text-[#4E342E] dark:text-[#EFEBE9] mt-8 mb-4">
            Getting Started
          </h2>
          <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed mb-6 font-serif text-lg">
            To begin writing on WordWeft, simply create an account and navigate to the Writer Dashboard. 
            From there, you can start a new story, manage your existing works, and track your readership 
            and engagement.
          </p>
          <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed mb-6 font-serif text-lg">
            We recommend starting with a compelling first chapter that hooks your readers. Remember, 
            consistency is key—regular updates help build and maintain your audience.
          </p>

          <h2 className="font-serif text-2xl font-semibold text-[#4E342E] dark:text-[#EFEBE9] mt-8 mb-4">
            Guidelines for Writers
          </h2>
          <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed mb-6 font-serif text-lg">
            Please review our 
            <a 
              href="/content-policy" 
              onClick={(e) => { e.preventDefault(); window.location.hash = '/content-policy'; navigateTo({ name: 'content-policy' }); }}
              className="text-[#8D6E63] dark:text-[#A1887F] hover:underline ml-1"
            >
              Content Policy
            </a> and 
            <a 
              href="/community-guidelines" 
              onClick={(e) => { e.preventDefault(); window.location.hash = '/community-guidelines'; navigateTo({ name: 'community-guidelines' }); }}
              className="text-[#8D6E63] dark:text-[#A1887F] hover:underline ml-1"
            >
              Community Guidelines
            </a> before publishing. We're committed to maintaining a respectful and inclusive 
            platform for all.
          </p>

          <h2 className="font-serif text-2xl font-semibold text-[#4E342E] dark:text-[#EFEBE9] mt-8 mb-4">
            Questions?
          </h2>
          <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
            If you have questions about writing on WordWeft, please don't hesitate to 
            <a 
              href="/contact" 
              onClick={(e) => { e.preventDefault(); window.location.hash = '/contact'; navigateTo({ name: 'contact' }); }}
              className="text-[#8D6E63] dark:text-[#A1887F] hover:underline ml-1"
            >
              reach out to us
            </a>. We're here to help you succeed.
          </p>
        </div>
      </div>
      <Footer navigateTo={navigateTo} />
    </div>
  );
};





