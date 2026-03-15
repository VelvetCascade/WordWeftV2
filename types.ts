
import type { Page } from './App';

export interface Author {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface ReviewReply {
  id: string;
  content: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
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
  replies: ReviewReply[];
}

export interface Comment {
  id: string;
  bookId: string;
  chapterId: string;
  paragraphIndex: number | null;
  parentId: string | null;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  content: string;
  status: 'draft' | 'published';
  // Stats
  viewCount: number;
  likesCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: Author;
  coverUrl: string;
  rating: number;
  reviewsCount: number;
  // Stats
  viewCount: number;
  likesCount: number;
  commentCount: number;
  isLiked: boolean;

  genres: string[];
  category?: string;
  tags: string[];
  summary: string;
  chapters: Chapter[];
  readingStatus: 'Completed' | 'Ongoing';
  publicationStatus: 'draft' | 'published';
  publishedDate?: string;
  isMature: boolean;
  description: string;
}

export interface UserStats {
  booksRead: number;
  chaptersRead: number;
  totalWordsRead: number;
  readingTimeMinutes: number; // Calculated on backend or frontend
  readerLevel: string; // e.g. "Novice", "Scholar"
}

export interface UserSocials {
  twitter?: string;
  instagram?: string;
  threads?: string;
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

  stats: UserStats;
  socials: UserSocials;
  favoriteGenres: string[];

  following: string[]; // List of IDs the user follows
  followersCount?: number;
  followingCount?: number;
  library: Shelf[];
  writtenBooks?: Book[];
}

export interface Shelf {
  id: string;
  name: string;
  books: LibraryBook[];
  type?: string;
}

export interface LibraryBook extends Book {
  progress: number; // Percentage from 0 to 100
  addedDate: string;
}


export interface Character {
  id: string;
  bookId: string;
  name: string;
  role: string;
  description: string;
  goal: string;
  imageUrl: string;
}

export interface Scene {
  id: string;
  bookId: string;
  title: string;
  description: string;
  setting: string;
  time: string;
  chapterId?: string; // Optional link to a chapter
  characterIds: string[];
}

export interface Note {
  id: string;
  bookId: string;
  chapterId?: string;
  title: string;
  content: string;
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

// --- Notification Types ---

export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'NEW_COMMENT'
  | 'COMMENT_REPLY'
  | 'AUTHOR_NEW_CHAPTER'
  | 'AUTHOR_NEW_STORY'
  | 'BOOK_UPDATE'
  | 'SYSTEM_UPDATE';

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: 'USER' | 'BOOK' | 'CHAPTER' | 'SYSTEM';
  entityId: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface NotificationPreferences {
  follows: boolean;
  comments: boolean;
  storyUpdates: boolean;
  systemAnnouncements: boolean;
}

// --- Search Types ---

export interface SearchBookResult {
  id: string;
  title: string;
  coverUrl: string;
  genres: string[];
  tags?: string[];
  summary?: string;
  description?: string;
  rating: number;
  reviewsCount?: number;
  readingStatus?: string;
  publishedDate?: string;
  score: number;
  author?: {
    id: string;
    name: string;
    avatarUrl: string;
    bio?: string;
  };
}

export interface SearchAuthorResult {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount?: number;
  favoriteGenres?: string[];
}

export interface SearchAutocompleteResponse {
  books: SearchBookResult[];
  authors: SearchAuthorResult[];
}

export interface SearchPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchFullResponse {
  books?: SearchPaginatedResult<SearchBookResult>;
  authors?: SearchPaginatedResult<SearchAuthorResult>;
}
