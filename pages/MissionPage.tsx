
import React from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const MissionPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              <span style={{ color: '#A67B5B' }}>Our</span>{' '}
              <span className="text-text-rich dark:text-dark-text-rich">Mission</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Main Mission Statement */}
      <section className="py-12 sm:py-16 md:py-18">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 md:mb-20">
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-4 sm:mb-6 max-w-none px-2 sm:px-0" style={{ lineHeight: '1.8' }}>
              At WordWeft, we are on a mission to transform the landscape of storytelling.
            </p>
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-4 sm:mb-6 max-w-none font-medium px-2 sm:px-0" style={{ lineHeight: '1.8' }}>
              To weave a world where every story matters — and every storyteller feels at home.
            </p>
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none px-2 sm:px-0" style={{ lineHeight: '1.8' }}>
              We believe that storytelling isn't reserved for the elite, the famous, or the perfectly polished — every voice deserves to be heard
            </p>
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mt-4 sm:mt-6 max-w-none px-2 sm:px-0" style={{ lineHeight: '1.8' }}>
              Our platform is designed to empower writers and readers alike, fostering a vibrant community where creativity thrives.
            </p>
          </div>

          {/* Four Main Sections */}
          <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16 md:space-y-20">
            {/* Democratizing Creative Publishing */}
            <div className="mb-10 sm:mb-12 md:mb-16 px-2 sm:px-0">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-4 sm:mb-6 tracking-tight">
                Democratizing Creative Publishing
              </h2>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                We are breaking down the barriers in writing and publishing — no gatekeeping, no waiting rooms, no chasing trends.
              </p>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mt-3 sm:mt-4 max-w-none" style={{ lineHeight: '1.8' }}>
                Our tools empower anyone to share stories freely, translate or adapt their work, publish fan fiction without fear, and build genuine communities. Your imagination sets the rules — we're just here to help you share it.
              </p>
            </div>

            {/* Empowering Every Voice */}
            <div className="mb-10 sm:mb-12 md:mb-16 px-2 sm:px-0">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-4 sm:mb-6 tracking-tight">
                Empowering Every Voice
              </h2>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                At WordWeft, every voice matters. Whether you're 14 or 74, a first-time writer or seasoned storyteller, fluent in English or navigating multiple languages — your words belong here.
              </p>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mt-3 sm:mt-4 max-w-none" style={{ lineHeight: '1.8' }}>
                We champion voices often overlooked: student writers, neurodiverse creators, bilingual authors, fanfic enthusiasts, and fringe-genre artists. WordWeft is a platform, not a spotlight — a space where all perspectives are welcome and valued.
              </p>
            </div>

            {/* Building a Safe Creative Space */}
            <div className="mb-10 sm:mb-12 md:mb-16 px-2 sm:px-0">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-4 sm:mb-6 tracking-tight">
                Building a Safe Creative Space
              </h2>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                The internet can be loud and unforgiving — WordWeft is not. We're building a platform that nurtures creativity without pressure.
              </p>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mt-3 sm:mt-4 max-w-none" style={{ lineHeight: '1.8' }}>
                With thoughtful moderation, we celebrate vulnerability and value growth over perfection. Here, it's okay not to go viral. It's enough — and beautiful — just to be real.
              </p>
            </div>

            {/* Celebrating Diversity */}
            <div className="mb-10 sm:mb-12 md:mb-16 px-2 sm:px-0">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-4 sm:mb-6 tracking-tight">
                Celebrating Diversity
              </h2>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                At WordWeft, we honor stories in every genre, language, and form — from epic fantasy to diary entries, spoken word to folklore.
              </p>
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mt-3 sm:mt-4 max-w-none" style={{ lineHeight: '1.8' }}>
                We're especially committed to uplifting underrepresented languages, marginalized communities, translations, and cross-genre experiments. Storytelling isn't one-size-fits-all — it's as diverse as the people who create it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Origin Story Section */}
      <section className="py-12 sm:py-16 md:py-18 bg-gradient-to-b from-[#FBF9F6] to-[#F5F1EB] dark:from-[#261F1D] dark:to-[#2C2419] border-t border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center px-2 sm:px-0">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">
              <span className="text-text-rich dark:text-dark-text-rich">Our</span>{' '}
              <span style={{ color: '#A67B5B' }}>Origin</span>{' '}
              <span className="text-text-rich dark:text-dark-text-rich">Story</span>
            </h2>
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 sm:mb-8 max-w-none" style={{ lineHeight: '1.8' }}>
              WordWeft was born from a simple idea: to create a space where stories connect us. It began with a passion for reading and a desire to give every writer a chance to share their unique voice.
            </p>
            <button
              onClick={() => {
                window.location.hash = '/our-story';
                navigateTo({ name: 'our-story' });
              }}
              className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-accent dark:bg-[#8D6E63] text-white dark:text-[#EFEBE9] font-serif text-base sm:text-lg rounded-md hover:bg-[#6D4C41] dark:hover:bg-[#5D4037] transition-colors duration-200"
            >
              Read the Full Story
            </button>
          </div>
        </div>
      </section>

      {/* Join us on Our Journey Section */}
      <section className="py-12 sm:py-16 md:py-18">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center px-2 sm:px-0">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">
              <span className="text-text-rich dark:text-dark-text-rich">Join us on</span>{' '}
              <span style={{ color: '#A67B5B' }}>Our Journey</span>{' '}
              {/* <span className="text-text-rich dark:text-dark-text-rich"></span> */}
            </h2>
            <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 sm:mb-8 max-w-none" style={{ lineHeight: '1.8' }}>
              We invite you to join us on our mission to transform storytelling. Whether you're a writer looking for a platform to share your work or a reader seeking new and exciting stories, WordWeft has something for you. Together, we can create a vibrant community where creativity thrives and every voice is heard.
            </p>
            <button
              onClick={() => {
                window.location.hash = '/';
                navigateTo({ name: 'home' });
              }}
              className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-accent dark:bg-[#8D6E63] text-white dark:text-[#EFEBE9] font-serif text-base sm:text-lg rounded-md hover:bg-[#6D4C41] dark:hover:bg-[#5D4037] transition-colors duration-200"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Closing Statement */}
      <section className="py-12 sm:py-16 md:py-18 bg-gradient-to-b from-[#FBF9F6] to-[#F5F1EB] dark:from-[#261F1D] dark:to-[#2C2419] border-t border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center px-2 sm:px-0">
            <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-text-body dark:text-dark-text-body mb-3 sm:mb-4 max-w-none font-medium" style={{ lineHeight: '1.8' }}>
              Our Mission is not just to publish stories —
            </p>
            <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-text-body dark:text-dark-text-body mb-3 sm:mb-4 max-w-none font-medium" style={{ lineHeight: '1.8' }}>
              It's to protect them.
            </p>
            <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-text-body dark:text-dark-text-body mb-3 sm:mb-4 max-w-none font-medium" style={{ lineHeight: '1.8' }}>
              To celebrate them.
            </p>
            <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-text-body dark:text-dark-text-body mb-6 sm:mb-8 max-w-none font-medium" style={{ lineHeight: '1.8' }}>
              To make sure they never disappear.
            </p>
            <p className="font-serif text-xl sm:text-2xl md:text-3xl leading-relaxed text-text-rich dark:text-dark-text-rich mb-3 sm:mb-4 max-w-none font-semibold" style={{ lineHeight: '1.8' }}>
              Welcome to WordWeft.
            </p>
            <p className="font-serif text-xl sm:text-2xl md:text-3xl leading-relaxed text-text-rich dark:text-dark-text-rich max-w-none font-semibold" style={{ lineHeight: '1.8' }}>
              Let's write something real.
            </p>
          </div>
        </div>
      </section>

      {/* OUR MISSION Footer Section */}
      <section className="py-6 sm:py-8 md:py-10 border-t border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center px-2 sm:px-0">
            <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-3 sm:mb-4 tracking-tight">
              OUR MISSION
            </h3>
            <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-text-body dark:text-dark-text-body max-w-none font-medium" style={{ lineHeight: '1.8' }}>
              A place for every story, and every storyteller.
            </p>
          </div>
        </div>
      </section>

      <Footer navigateTo={navigateTo} />
    </div>
  );
};

