
import type { Page } from './App';

export interface Author {
  id: number;
  name: string;
  avatarUrl: string;
  bio: string;
}

export interface Review {
  id: number;
  user: {
    name: string;
    avatarUrl: string;
  };
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface Chapter {
  id: number;
  title: string;
  wordCount: number;
  content: string; // This would be more complex (e.g., structured JSON) in a real app
  isReleased: boolean;
}

export interface Book {
  id: number;
  title: string;
  author: Author;
  coverUrl: string;
  rating: number;
  reviewsCount: number;
  genres: string[];
  tags: string[];
  summary: string;
  chapters: Chapter[];
  status: 'Completed' | 'Ongoing';
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  joinDate: string;
  stats: {
    booksRead: number;
    chaptersRead: number;
    favoriteGenres: string[];
  };
  following: Author[];
  library: Shelf[];
}

export interface Shelf {
  id: number;
  name: string;
  books: LibraryBook[];
}

export interface LibraryBook extends Book {
  progress: number; // Percentage from 0 to 100
  addedDate: string;
}


export type NavigateTo = (page: Page) => void;

// --- Reading Progress Types ---

export interface ChapterProgress {
  progress: number; // 0-100
  scrollPosition: number;
}

export interface BookProgress {
  overallProgress: number; // 0-100
  lastReadChapterIndex: number;
  lastReadScrollPosition: number;
  chapters: { [chapterId: number]: ChapterProgress };
}
