
import type { Page } from './App';
import type { Badge, Interest } from './types/community';

export interface Author {
  communityInterests?: Interest[];
  communityBadges?: Badge[];
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  location?: string;
  website?: string;
  joinDate?: string;
  stats?: UserStats;
  socials?: UserSocials;
  favoriteGenres?: string[];
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
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string | null;
  publishedAt?: string | null;
  // Stats
  viewCount: number;
  likesCount: number;
  commentCount: number;
  isLiked: boolean;
  contentWarnings: ContentWarning[];
  disclaimerNote?: string;
}

export interface ChapterRevision {
  id: string;
  authorId: string;
  bookId: string;
  chapterId: string;
  title: string;
  content: string;
  wordCount: number;
  reason: string;
  plainTextPreview: string;
  createdAt: string;
}

export type AgeRating = 'ALL_AGES' | 'TEEN_13' | 'MATURE_18' | 'ADULT_21';
export type ContentWarning = 'VIOLENCE' | 'GORE' | 'STRONG_LANGUAGE' | 'SEXUAL_CONTENT' | 'ABUSE' | 'SELF_HARM' | 'SUBSTANCE_USE' | 'GRIEF' | 'DISCRIMINATION' | 'FLASHING_IMAGES' | 'OTHER';

export interface Book {
  id: string;
  title: string;
  author: Author;
  coverUrl: string;
  coverFileId?: string;
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
  nextScheduledReleaseAt?: string;
  isMature: boolean;
  ageRating: AgeRating;
  contentWarnings: ContentWarning[];
  customDisclaimer?: string;
  isAIGenerated: boolean;
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
  communityInterests?: Interest[];
  communityBadges?: Badge[];
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl: string;
  avatarFileId?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
  isEmailVerified: boolean;

  stats: UserStats;
  socials: UserSocials;
  favoriteGenres: string[];

  following: string[]; // List of IDs the user follows
  followersCount?: number;
  followingCount?: number;
  library: Shelf[];
  writtenBooks?: Book[];
  hasSeenWritingDemo?: boolean;
  dateOfBirth?: string;
  allowMatureContent?: boolean;
}

export interface WriterAnalyticsSummary {
  uniqueReaders: number;
  views: number;
  completedReaders: number;
  completionRate: number;
  returningReaders: number;
  averageCompletion: number;
  likes: number;
  comments: number;
}

export interface WriterStoryAnalytics {
  bookId: string;
  title: string;
  coverUrl?: string;
  uniqueReaders: number;
  views: number;
  completedReaders: number;
  completionRate: number;
  likes: number;
  comments: number;
}

export interface ChapterFunnelRow {
  bookId: string;
  chapterId: string;
  title: string;
  chapterNumber: number;
  views: number;
  reachedReaders: number;
  completedReaders: number;
  completionRate: number;
  continuationRate: number;
  likes: number;
  comments: number;
}

export interface DailyTrendPoint {
  date: string;
  readers: number;
  views: number;
}

export interface AnalyticsReferrer {
  source: string;
  readers: number;
  views: number;
}

export interface ReleaseMarker {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  publishedAt: string;
}

export interface WriterAnalytics {
  summary: WriterAnalyticsSummary;
  stories: WriterStoryAnalytics[];
  chapterFunnel: ChapterFunnelRow[];
  dailyTrend: DailyTrendPoint[];
  referrers: AnalyticsReferrer[];
  releaseMarkers: ReleaseMarker[];
}

export type ReportTargetType = 'BOOK' | 'CHAPTER' | 'COMMENT' | 'USER' | 'COMMUNITY_POST' | 'COMMUNITY_COMMENT';
export type ReportCategory = 'SPAM' | 'HARASSMENT' | 'PLAGIARISM' | 'SEXUAL_CONTENT' | 'HATE_SPEECH' | 'VIOLENCE' | 'COPYRIGHT' | 'MISINFORMATION' | 'OTHER';
export interface ContentReport {
  id: string;
  ticketNumber: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  category: ReportCategory;
  description: string;
  status: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
  createdAt: string;
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
  imageFileId?: string;
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
  | 'SYSTEM_UPDATE'
  | 'COMMUNITY_COMMENT'
  | 'COMMUNITY_REPLY'
  | 'COMMUNITY_RELEASE'
  | 'CONTENT_REPORT_NOTICE';

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: 'USER' | 'BOOK' | 'CHAPTER' | 'SYSTEM' | 'COMMUNITY_POST';
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
