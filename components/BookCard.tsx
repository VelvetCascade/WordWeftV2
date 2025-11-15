
import React from 'react';
import type { Book } from '../types';
import { StarIcon } from './icons/Icons';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer transform hover:-translate-y-1.5 transition-transform duration-300"
    >
      <div className="relative">
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="w-full h-auto object-cover rounded-xl shadow-soft group-hover:shadow-lifted transition-shadow duration-300"
        />
        <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white font-sans font-semibold bg-black/50 px-4 py-2 rounded-full text-sm">Read Preview</span>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="font-sans font-bold text-md text-text-rich dark:text-dark-text-rich truncate">{book.title}</h3>
        <p className="text-sm text-text-body dark:text-dark-text-body truncate">{book.author.name}</p>
        <div className="flex items-center mt-1">
          <StarIcon className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">{book.rating}</span>
        </div>
      </div>
    </div>
  );
};
