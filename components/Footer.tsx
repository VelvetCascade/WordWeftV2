import React from 'react';
import { WordWeftLogo } from './icons/WordWeftLogo';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      ['Discover', '#/'],
      ['Browse genres', '#/category'],
      ['Platform features', '#/features'],
    ],
  },
  {
    title: 'Create',
    links: [
      ['Writer studio', '#/write'],
      ['Start a story', '#/write/book/create'],
      ['Share feedback', '#/feedback'],
    ],
  },
  {
    title: 'WordWeft',
    links: [
      ['About', '#/about'],
      ['Contact', '#/contact'],
      ['Safety', '#/safety'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Terms', '#/terms'],
      ['Privacy', '#/privacy'],
    ],
  },
] as const;

export const Footer: React.FC = () => {
  return (
    <footer className="ww-footer">
      <div className="ww-footer-inner container mx-auto px-6">
        <div className="ww-footer-intro">
          <a href="#/" className="ww-footer-brand" aria-label="WordWeft home">
            <span className="ww-footer-mark"><WordWeftLogo className="w-9 h-9" /></span>
            <span>WordWeft</span>
          </a>
          <p>A quiet corner of the internet for bold stories, thoughtful readers, and writers building worlds one line at a time.</p>
          <a className="ww-footer-cta" href="#/auth">Begin your story <span aria-hidden="true">→</span></a>
        </div>

        <div className="ww-footer-links">
          {footerGroups.map(group => (
            <div key={group.title}>
              <h4>{group.title}</h4>
              <ul>
                {group.links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="ww-footer-bottom container mx-auto px-6">
        <p>© {new Date().getFullYear()} WordWeft Studio</p>
        <span className="ww-footer-status"><i /> Crafted for the long read</span>
      </div>
    </footer>
  );
};
