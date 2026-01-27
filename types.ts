
import type { Page } from './App';

export interface Author {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followersCount?: number;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  rating: number;
  comment: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  content: string;
  status: 'draft' | 'published';
}

export interface Book {
  id: string;
  title: string;
  author: Author;
  coverUrl: string;
  rating: number;
  reviewsCount: number;
  genres: string[];
  tags: string[];
  summary: string;
  chapters: Chapter[];
  readingStatus: 'Completed' | 'Ongoing';
  publicationStatus: 'draft' | 'published';
  publishedDate?: string;
  isMature: boolean;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
  stats: {
    booksRead: number;
    chaptersRead: number;
    minutesRead: number;
    favoriteGenres: string[];
  };
  socialLinks?: Record<string, string>;
  following: Author[];
  followers: Author[];
  library: Shelf[];
  writtenBooks?: Book[];
}

export interface Shelf {
  id: string;
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
  chapters: { [chapterId: string]: ChapterProgress };
}
