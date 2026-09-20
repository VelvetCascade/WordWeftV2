import React from 'react';
import type { Book } from '../types';
import { StarIcon, EyeIcon } from './icons/Icons';
import { AIBadge } from './AIBadge';
import { AgeRatingBadge } from './AgeRatingBadge';
import { ResilientImage } from './ResilientImage';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const primaryGenre = book.genres?.[0];

  return (
    <div
      className="ww-book-card group"
      onClick={event => { if (!(event.target instanceof Element && event.target.closest('a,button'))) onClick(); }}
      aria-label={`Open ${book.title} by ${book.author.name}`}
    >
      <div className="ww-book-cover-wrap">
        <a href={`/book/${encodeURIComponent(book.id)}`} aria-label={`Read about ${book.title}`}><ResilientImage
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          fallbackLabel={book.title}
          variant="cover"
          className="ww-book-cover"
          loading="lazy"
          width={200}
          height={300}
        /></a>
        <div className="ww-book-cover-shade pointer-events-none" />
        {primaryGenre && <button type="button" className="ww-book-genre" onClick={(event) => { event.stopPropagation(); window.location.hash = `/genre/${encodeURIComponent(primaryGenre)}`; }} aria-label={`Browse ${primaryGenre} stories`}>{primaryGenre}</button>}
        <div className="ww-book-age"><AgeRatingBadge rating={book.ageRating} compact /></div>
        {book.isAIGenerated && <div className="ww-book-ai"><AIBadge /></div>}
        <span className="ww-book-open pointer-events-none">View story <span aria-hidden="true">→</span></span>
      </div>

      <div className="ww-book-info">
        <h3><a href={`/book/${encodeURIComponent(book.id)}`}>{book.title}</a></h3>
        <p><a href={`/author/${encodeURIComponent(book.author.id)}`}>{book.author.name}</a></p>
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
