export type PostType = 'UPDATE' | 'RELEASE' | 'POLL' | 'WORKSHOP' | 'RECOMMENDATION';
export type Interest = 'READING' | 'WEBNOVEL_WRITING' | 'EBOOK_PUBLISHING' | 'WRITING_CRAFT' | 'CRITIQUE';
export type Badge = 'VERIFIED_CREATOR' | 'EDITORIAL_STAFF' | 'COMMUNITY_MODERATOR';
export type FeedMode = 'discover' | 'following' | 'circles' | 'saved';
export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface AuthorSummary { id: string; name: string; avatarUrl: string | null; badges: Badge[]; following: boolean }
export interface Circle {
  id: string; slug: string; name: string; description: string; rules: string[]; accent: string;
  allowedPostTypes: PostType[]; memberCount: number; official: boolean; joined: boolean;
}
export interface Attachment {
  bookId: string; title: string; coverUrl: string | null; authorName: string;
  chapterId: string | null; chapterTitle: string | null; chapterIndex: number | null; ageRating: string;
}
export interface PollOption { id: string; text: string; voteCount: number }
export interface CommunityPost {
  id: string; author: AuthorSummary; circle: Circle; type: PostType; title: string | null; body: string;
  attachment: Attachment | null; contentWarnings: string[]; pollOptions: PollOption[];
  likeCount: number; commentCount: number; voteCount: number;
  pinned: boolean; locked: boolean; liked: boolean; saved: boolean; votedOptionId: string | null;
  canEdit: boolean; canModerate: boolean; status: 'ACTIVE' | 'DELETED' | 'REMOVED'; createdAt: string; updatedAt: string;
}
export interface CommunityComment {
  id: string; postId: string; author: AuthorSummary; parentCommentId: string | null; body: string;
  likeCount: number; liked: boolean; canEdit: boolean; canModerate: boolean;
  status: 'ACTIVE' | 'DELETED' | 'REMOVED'; createdAt: string; updatedAt: string;
}
export interface CommunityMe { interests: Interest[]; badges: Badge[]; canModerate: boolean; canAdmin: boolean; joinedCircleIds: string[] }
export interface AttachmentChoice {
  bookId: string; title: string; coverUrl: string | null; authorName: string; owned: boolean; ageRating: string;
  chapters: { id: string; title: string; index: number }[];
}
export interface ModerationReport {
  id: string; ticketNumber: string; targetType: 'COMMUNITY_POST' | 'COMMUNITY_COMMENT'; targetId: string;
  postId: string; targetTitle: string; category: string; description: string; createdAt: string; status: string;
}
export interface CreatePostInput {
  circleId: string; type: PostType; title?: string; body: string; attachedBookId?: string;
  attachedChapterId?: string; contentWarnings?: string[]; pollOptions?: string[];
}
export interface PostDraft {
  circleId: string; type: PostType; title?: string; body: string; attachment?: AttachmentChoice | null;
  chapterId?: string; contentWarnings?: string[]; pollOptions?: string[];
}
export interface FeedQuery { mode?: FeedMode; circle?: string; authorId?: string; type?: PostType; cursor?: string; limit?: number }
export type PostModerationAction = 'PIN' | 'UNPIN' | 'LOCK' | 'UNLOCK' | 'REMOVE' | 'RESTORE';
