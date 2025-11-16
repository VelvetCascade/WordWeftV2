
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-dark-surface border-t border-gray-200/80 dark:border-dark-border mt-24">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-sans font-bold text-xl text-primary dark:text-gray-100 tracking-tighter mb-2">WordWeft</h3>
            <p className="text-sm max-w-sm">A next-gen platform for readers and storytellers. Discover your next favorite book or share your own story with the world.</p>
          </div>
          <div className="col-span-1">
            <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">Discover</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Write</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Genres</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Authors</a></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="font-sans font-semibold text-text-rich dark:text-dark-text-rich mb-4">Subscribe</h4>
            <p className="text-sm mb-3">Get the latest news and featured stories.</p>
            <form className="flex">
              <input type="email" placeholder="Your email" className="w-full text-sm rounded-l-lg border-gray-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-body focus:ring-accent focus:border-accent" />
              <button type="submit" className="bg-accent text-white px-4 rounded-r-lg font-sans text-sm font-semibold hover:bg-primary transition-colors">
                Go
              </button>
            </form>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200/80 dark:border-dark-border text-center text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} WordWeft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
