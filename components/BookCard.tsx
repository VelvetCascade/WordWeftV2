import React from 'react';
import type { Book } from '../types';
import { StarIcon, EyeIcon } from './icons/Icons';
import { AIBadge } from './AIBadge';
import { AgeRatingBadge } from './AgeRatingBadge';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const primaryGenre = book.genres?.[0];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="ww-book-card group"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${book.title} by ${book.author.name}`}
    >
      <div className="ww-book-cover-wrap">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          className="ww-book-cover"
          loading="lazy"
        />
        <div className="ww-book-cover-shade" />
        {primaryGenre && <span className="ww-book-genre">{primaryGenre}</span>}
        <div className="ww-book-age"><AgeRatingBadge rating={book.ageRating} compact /></div>
        {book.isAIGenerated && <div className="ww-book-ai"><AIBadge /></div>}
        <span className="ww-book-open">View story <span aria-hidden="true">→</span></span>
      </div>

      <div className="ww-book-info">
        <h3>{book.title}</h3>
        <p>{book.author.name}</p>
        <div className="ww-book-meta">
          <span className="ww-book-rating" title="Rating"><StarIcon className="w-3.5 h-3.5" /> {book.rating || 'New'}</span>
          <span className="ww-book-meta-dot" aria-hidden="true" />
          <span title="Views"><EyeIcon className="w-3.5 h-3.5" /> {(book.viewCount || 0).toLocaleString()}</span>
          <span className="ww-book-status">{book.readingStatus}</span>
        </div>
      </div>
    </div>
  );
};
