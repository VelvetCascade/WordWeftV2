
import React, { useState } from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'How do I start reading on WordWeft?',
    answer: 'Simply create an account and browse our library of stories. You can search by genre, author, or keywords. Once you find something you like, click to start reading!'
  },
  {
    question: 'Is WordWeft free to use?',
    answer: 'Yes! Reading on WordWeft is free. Some premium features may be available for subscribers, but the core reading experience is accessible to everyone.'
  },
  {
    question: 'How do I publish my story?',
    answer: 'Create an account and navigate to the Writer Dashboard. From there, you can start a new story, write chapters, and publish them when ready. Make sure to review our Content Policy and Community Guidelines first.'
  },
  {
    question: 'Can I earn money from my writing?',
    answer: 'Yes! WordWeft offers a revenue-sharing model for writers. As your stories gain readership, you can earn income based on engagement and subscriptions. Check the Writer Dashboard for details on monetization options.'
  },
  {
    question: 'How do I save my reading progress?',
    answer: 'Your reading progress is automatically saved when you read on WordWeft. You can access your library and continue reading from where you left off at any time.'
  },
  {
    question: 'Can I download stories to read offline?',
    answer: 'Currently, stories are available for online reading. We\'re working on offline reading features for future updates.'
  },
  {
    question: 'How do I report inappropriate content?',
    answer: 'You can report content directly from the story page or contact us through our Contact page. We take all reports seriously and review them promptly.'
  },
  {
    question: 'What genres are available?',
    answer: 'WordWeft hosts stories across all genres, including fantasy, sci-fi, romance, mystery, thriller, and many more. Use our genre filters to discover stories that match your interests.'
  },
  {
    question: 'Can I follow my favorite authors?',
    answer: 'Absolutely! You can follow authors to get notified when they publish new chapters or stories. Visit an author\'s profile page and click the follow button.'
  },
  {
    question: 'How do I change my account settings?',
    answer: 'Go to your Profile page and click on Settings. From there, you can update your information, preferences, and privacy settings.'
  }
];

export const FAQsPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F6] dark:bg-[#261F1D]">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#4E342E] dark:text-[#EFEBE9] mb-6 tracking-tight">
          Frequently Asked Questions
        </h1>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-[#D7CCC8] dark:border-[#5D4037] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center bg-white dark:bg-[#3E2723] hover:bg-[#F5F1EB] dark:hover:bg-[#4E342E] transition-colors"
              >
                <span className="font-serif font-semibold text-[#4E342E] dark:text-[#EFEBE9]">
                  {faq.question}
                </span>
                <span className="text-[#8D6E63] dark:text-[#A1887F] text-xl">
                  {openIndex === index ? '−' : '+'}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-[#FBF9F6] dark:bg-[#261F1D] border-t border-[#D7CCC8] dark:border-[#5D4037]">
                  <p className="text-[#795548] dark:text-[#BCAAA4] leading-relaxed font-serif text-lg">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 p-6 bg-[#F5F1EB] dark:bg-[#3E2723] rounded-lg border border-[#D7CCC8] dark:border-[#5D4037]">
          <p className="text-[#795548] dark:text-[#BCAAA4] font-serif text-lg mb-4">
            Still have questions? We're here to help!
          </p>
          <a
            href="/contact"
            onClick={(e) => { e.preventDefault(); window.location.hash = '/contact'; navigateTo({ name: 'contact' }); }}
            className="inline-block bg-[#8D6E63] hover:bg-[#5D4037] text-white font-serif font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Contact Us
          </a>
        </div>
      </div>
      <Footer navigateTo={navigateTo} />
    </div>
  );
};





