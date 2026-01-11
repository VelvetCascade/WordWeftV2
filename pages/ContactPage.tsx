
import React, { useState } from 'react';
import type { NavigateTo } from '../types';
import { Footer } from '../components/Footer';

export const ContactPage: React.FC<{ navigateTo: NavigateTo }> = ({ navigateTo }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would send the form data to a backend
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-[#F5F1EB] to-[#FBF9F6] dark:from-[#2C2419] dark:to-[#261F1D] border-b border-[#E8E0D6] dark:border-[#3E2723]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-15 md:py-19">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight leading-tight">
              Contact Us
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 md:py-18">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto">
            {/* Introduction */}
            <div className="mb-10 sm:mb-12 md:mb-16 text-center">
              <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-text-body dark:text-dark-text-body mb-4 sm:mb-6 max-w-none" style={{ lineHeight: '1.8' }}>
                Got a question, a story to share, or just want to say hi?<br />
                We'd love to hear from you.
              </p>
              <p className="font-serif text-sm sm:text-base md:text-lg leading-relaxed text-text-body dark:text-dark-text-body max-w-none" style={{ lineHeight: '1.8' }}>
                At WordWeft, every message matters — whether you're a writer looking for support, a reader with feedback, a curious collaborator, or someone who simply stumbled upon our corner of the internet.
              </p>
            </div>

            {/* Two Column Layout: Contact Details and Form */}
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16">
              {/* Left Column: Contact Details */}
              <div>
                <h2 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-6 sm:mb-8 tracking-tight">
                  Get In Touch
                </h2>
                
                <div className="space-y-6 sm:space-y-8">
                  {/* General Inquiries */}
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                      General Inquiries & Feedback
                    </h3>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-2" style={{ lineHeight: '1.8' }}>
                      Have thoughts, suggestions, or kind words?
                    </p>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body">
                      Reach us at:{' '}
                      <a 
                        href="mailto:editorial@wordweft.in" 
                        className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                      >
                        editorial@wordweft.in
                      </a>
                    </p>
                  </div>

                  {/* Support & Technical Issues */}
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                      Support & Technical Issues
                    </h3>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-2" style={{ lineHeight: '1.8' }}>
                      Something not working as expected? We're here to help.
                    </p>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body">
                      Email us at:{' '}
                      <a 
                        href="mailto:support@wordweft.in" 
                        className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                      >
                        support@wordweft.in
                      </a>
                    </p>
                  </div>

                  {/* Partnerships & Collaborations */}
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-text-rich dark:text-dark-text-rich mb-3 tracking-tight">
                      Partnerships & Collaborations
                    </h3>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body mb-2" style={{ lineHeight: '1.8' }}>
                      Want to collaborate, host a writing event, or bring WordWeft to your school, college, or community?
                    </p>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body">
                      Contact:{' '}
                      <a 
                        href="mailto:editorial@wordweft.in" 
                        className="text-accent dark:text-[#A1887F] hover:underline font-medium"
                      >
                        editorial@wordweft.in
                      </a>
                    </p>
                  </div>
                </div>

                {/* Response Time Note */}
                <div className="mt-8 sm:mt-10">
                  <p className="font-serif text-sm sm:text-base leading-relaxed text-text-body dark:text-dark-text-body" style={{ lineHeight: '1.8' }}>
                    We're a small but passionate team, so give us a little time to respond — but know that we read every message with care.
                  </p>
                </div>

                {/* Closing Message */}
                <div className="mt-8 sm:mt-10">
                  <p className="font-serif text-base sm:text-lg leading-relaxed text-text-body dark:text-dark-text-body font-medium" style={{ lineHeight: '1.8' }}>
                    Thank you for being part of the WordWeft journey.<br />
                    Let's keep weaving stories that matter.
                  </p>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div>
                <h2 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-text-rich dark:text-dark-text-rich mb-6 sm:mb-8 tracking-tight">
                  Send a Message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div>
                    <label htmlFor="name" className="block font-serif font-semibold text-text-rich dark:text-dark-text-rich mb-2 text-sm sm:text-base">
                      Name<span className="text-accent dark:text-[#A1887F]">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] dark:border-[#5D4037] bg-white dark:bg-[#3E2723] text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent dark:focus:ring-[#8D6E63] focus:border-accent dark:focus:border-[#8D6E63] font-serif text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block font-serif font-semibold text-text-rich dark:text-dark-text-rich mb-2 text-sm sm:text-base">
                      Email<span className="text-accent dark:text-[#A1887F]">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] dark:border-[#5D4037] bg-white dark:bg-[#3E2723] text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent dark:focus:ring-[#8D6E63] focus:border-accent dark:focus:border-[#8D6E63] font-serif text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block font-serif font-semibold text-text-rich dark:text-dark-text-rich mb-2 text-sm sm:text-base">
                      Message<span className="text-accent dark:text-[#A1887F]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] dark:border-[#5D4037] bg-white dark:bg-[#3E2723] text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent dark:focus:ring-[#8D6E63] focus:border-accent dark:focus:border-[#8D6E63] font-serif resize-none text-sm sm:text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-accent dark:bg-[#8D6E63] hover:bg-[#6D4C41] dark:hover:bg-[#5D4037] text-white dark:text-[#EFEBE9] font-serif font-semibold px-6 py-3 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                  >
                    Submit
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer navigateTo={navigateTo} />
    </div>
  );
};

