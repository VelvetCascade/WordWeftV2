
import React from 'react';
import type { NavigateTo } from '../types';
import type { Page } from '../App';

interface FooterProps {
  navigateTo: NavigateTo;
}

export const Footer: React.FC<FooterProps> = ({ navigateTo }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, pageName: string) => {
    e.preventDefault();
    if (pageName === 'home') {
      window.location.hash = '/';
      navigateTo({ name: 'home' });
    } else {
      window.location.hash = `/${pageName}`;
      let page: Page | null = null;
      
      switch (pageName) {
        case 'our-story':
          page = { name: 'our-story' };
          break;
        case 'mission':
          page = { name: 'mission' };
          break;
        case 'terms':
          page = { name: 'terms' };
          break;
        case 'privacy':
          page = { name: 'privacy' };
          break;
        case 'write-with-us':
          page = { name: 'write-with-us' };
          break;
        case 'contact':
          page = { name: 'contact' };
          break;
        case 'content-policy':
          page = { name: 'content-policy' };
          break;
        case 'community-guidelines':
          page = { name: 'community-guidelines' };
          break;
        case 'faqs':
          page = { name: 'faqs' };
          break;
      }
      
      if (page) {
        navigateTo(page);
      }
    }
  };

  return (
    <footer className="bg-[#F5F1EB] dark:bg-[#2C2419] border-t border-[#D7CCC8] dark:border-[#5D4037] mt-24">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="col-span-1">
            <h3 className="font-serif font-bold text-2xl text-[#5D4037] dark:text-[#D7CCC8] tracking-tight mb-3">WordWeft</h3>
            <p className="text-sm text-[#795548] dark:text-[#A1887F] leading-relaxed max-w-xs">
              A next-generation platform for readers and storytellers. Discover your next favorite book or share your own story with the world.
            </p>
          </div>

          {/* About Section */}
          <div className="col-span-1">
            <h4 className="font-serif font-semibold text-base text-[#4E342E] dark:text-[#EFEBE9] mb-4 tracking-tight">About</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="/" 
                  onClick={(e) => handleLinkClick(e, 'home')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="/our-story" 
                  onClick={(e) => handleLinkClick(e, 'our-story')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Our Story
                </a>
              </li>
              <li>
                <a 
                  href="/mission" 
                  onClick={(e) => handleLinkClick(e, 'mission')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Mission
                </a>
              </li>
              <li>
                <a 
                  href="/write-with-us" 
                  onClick={(e) => handleLinkClick(e, 'write-with-us')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Write With Us
                </a>
              </li>
              <li>
                <a 
                  href="/contact" 
                  onClick={(e) => handleLinkClick(e, 'contact')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className="col-span-1">
            <h4 className="font-serif font-semibold text-base text-[#4E342E] dark:text-[#EFEBE9] mb-4 tracking-tight">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="/terms" 
                  onClick={(e) => handleLinkClick(e, 'terms')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Terms and Conditions
                </a>
              </li>
              <li>
                <a 
                  href="/privacy" 
                  onClick={(e) => handleLinkClick(e, 'privacy')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="/content-policy" 
                  onClick={(e) => handleLinkClick(e, 'content-policy')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Content Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div className="col-span-1">
            <h4 className="font-serif font-semibold text-base text-[#4E342E] dark:text-[#EFEBE9] mb-4 tracking-tight">Community</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="/community-guidelines" 
                  onClick={(e) => handleLinkClick(e, 'community-guidelines')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  Community Guidelines
                </a>
              </li>
              <li>
                <a 
                  href="/faqs" 
                  onClick={(e) => handleLinkClick(e, 'faqs')}
                  className="text-[#795548] dark:text-[#BCAAA4] hover:text-[#5D4037] dark:hover:text-[#D7CCC8] transition-colors duration-200 font-serif"
                >
                  FAQs
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-[#D7CCC8] dark:border-[#5D4037] text-center">
          <p className="text-xs text-[#8D6E63] dark:text-[#8D6E63] font-serif">
            &copy; {new Date().getFullYear()} WordWeft. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
