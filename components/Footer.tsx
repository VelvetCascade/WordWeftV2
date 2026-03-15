
import React from 'react';
import { WordWeftLogo } from './icons/WordWeftLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-dark-surface border-t border-gray-200/80 dark:border-dark-border mt-24">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <WordWeftLogo className="w-11 h-11 md:w-12 md:h-12" />
            </div>
            <p className="text-sm max-w-sm">A next-gen platform for readers and storytellers. Discover your next favorite book or share your own story with the world.</p>
          </div>
          <div className="col-span-1">
            <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#/" className="hover:text-accent transition-colors">Discover</a></li>
              <li><a href="#/write" className="hover:text-accent transition-colors">Write</a></li>
              <li><a href="#/category" className="hover:text-accent transition-colors">Genres</a></li>
              <li><a href="#/features" className="hover:text-accent transition-colors">Features</a></li>
              <li><a href="#/feedback" className="hover:text-accent transition-colors">Feedback</a></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#/terms" className="hover:text-accent transition-colors">Terms & Conditions</a></li>
              <li><a href="#/privacy" className="hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#/safety" className="hover:text-accent transition-colors">Safety & Content Rules</a></li>
              <li><a href="#/contact" className="hover:text-accent transition-colors">Contact Us</a></li>
            </ul>
          </div>
          {/* <div className="col-span-1">
            <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich mb-4">Subscribe</h4>
            <p className="text-sm mb-3">Get the latest news and featured stories.</p>
            <form className="flex">
              <input type="email" placeholder="Your email" className="w-full text-sm rounded-l-lg border-gray-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-body focus:ring-accent focus:border-accent" />
              <button type="submit" className="bg-accent text-white px-4 rounded-r-lg font-sans text-sm font-semibold hover:bg-primary transition-colors">
                Go
              </button>
            </form>
          </div> */}
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200/80 dark:border-dark-border text-center text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} WordWeft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
