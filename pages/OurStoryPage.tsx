
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const OurStoryPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-5xl md:text-6xl lg:text-7xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Our Story
            </h1>
            <p className="font-serif text-lg md:text-xl text-accent dark:text-[#A1887F] italic mt-2 tracking-wide">
              Weaving words, Connecting worlds
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-18">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto">
            {/* Opening Paragraph */}
            <div className="mb-12 md:mb-16">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 max-w-none" style={{ lineHeight: '1.8' }}>
                WordWeft was born from a simple yet profound belief: that stories have the power to connect us, 
                transform us, and shape our understanding of the world. In an age where digital noise often 
                drowns out meaningful narratives, we envisioned a sanctuary for both readers and writers—a 
                place where literature thrives.
              </p>
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                In a digital age overflowing with fleeting content, we longed for a space where narratives 
                could breathe—where writers felt empowered, and readers could lose themselves in stories that 
                linger long after the screen fades. That longing became the spark that started everything.
              </p>
            </div>

            {/* The Genesis Section */}
            <div className="mb-12 md:mb-16">
              <div className="relative pl-6 md:pl-8 border-l-2 border-accent/30 dark:border-[#8D6E63]/30 mb-8">
                <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 max-w-none" style={{ lineHeight: '1.8' }}>
                  Our journey began in a small coffee shop in 2022 — just a blank notebook, a handful of dreams, 
                  and one audacious question:
                </p>
                <blockquote className="font-serif text-xl md:text-2xl leading-relaxed text-text-rich dark:text-dark-text-rich italic font-medium my-8 pl-4 md:pl-6 border-l-4 border-accent/50 dark:border-[#8D6E63]/50 max-w-none" style={{ lineHeight: '1.7' }}>
                  What if we could recreate that feeling of discovery — that moment when you find 
                  the perfect story — in a digital space? What if we could give writers the tools 
                  they need to share their voices without compromise?
                </blockquote>
              </div>
            </div>

            {/* The Journey Section */}
            <div className="mb-12 md:mb-16">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                From napkin sketches to polished code, from rough ideas to a thriving creative sanctuary, 
                WordWeft emerged as a platform where creativity and technology meet seamlessly. 
                Built with intention, shaped with empathy, and refined with the heart of a reader, every feature of
                WordWeft is designed to make storytelling feel effortless, immersive, and inspiring.
              </p>
            </div>

            {/* The Vision Section */}
            <div className="mb-12 md:mb-16">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 max-w-none" style={{ lineHeight: '1.8' }}>
                We've built a platform that honors 
                the craft of storytelling while embracing innovation. Every feature, every design choice, 
                every interaction is crafted with the literary experience at its heart.
              </p>
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                Today, WordWeft stands as more than just a platform — 
                <span className="italic font-medium text-text-rich dark:text-dark-text-rich">
                  {' '}It is a community, a movement, 
                  and a living tapestry woven from countless voices.
                </span>
              </p>
            </div>

            {/* Closing Call to Action */}
            <div className="mt-16 md:mt-20 pt-10 md:pt-12 border-t border-[#E8E0D6] dark:border-[#3E2723]">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body text-center max-w-2xl mx-auto" style={{ lineHeight: '1.8' }}>
                We invite you to be part of this story. Whether you're here to discover your next favorite 
                book or to share your own narrative with the world, you're welcome in our community. 
                Together, we're weaving a tapestry of stories that will endure for generations to come.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer navigateTo={navigateTo} />
    </div>
  );
};

