import type { Circle, CommunityComment, CreatePostInput, FeedMode, PostDraft, PostType } from '../types/community';

export const POST_LABELS: Record<PostType, string> = { UPDATE: 'Update', RELEASE: 'Release', POLL: 'Poll', WORKSHOP: 'Workshop', RECOMMENDATION: 'Recommendation' };
export const WARNING_LABELS: Record<string, string> = { SPOILERS: 'Spoilers', VIOLENCE: 'Violence', SEXUAL_CONTENT: 'Sexual content', STRONG_LANGUAGE: 'Strong language', SENSITIVE_THEMES: 'Sensitive themes' };
export function validatePost(draft: PostDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.circleId) errors.circleId = 'Choose a circle for your conversation.';
  if (!draft.body.trim() || draft.body.trim().length > 5000) errors.body = 'Write between 1 and 5,000 characters.';
  const title = draft.title?.trim() || '';
  if ((['RELEASE', 'POLL', 'WORKSHOP'].includes(draft.type) || title) && (title.length < 3 || title.length > 140)) errors.title = 'Use a title between 3 and 140 characters.';
  if (draft.type === 'POLL') {
    const options = (draft.pollOptions || []).map(option => option.trim());
    if (options.length < 2 || options.length > 6 || options.some(option => !option || option.length > 100) || new Set(options.map(option => option.toLowerCase())).size !== options.length) errors.pollOptions = 'Add 2–6 different options, each between 1 and 100 characters.';
  }
  if (draft.type === 'RELEASE' && !draft.attachment?.owned) errors.attachment = 'Attach one of your published stories.';
  if (draft.type === 'RECOMMENDATION' && (!draft.attachment || draft.attachment.owned)) errors.attachment = 'Choose a published story by another author.';
  return errors;
}
export function postPayload(draft: PostDraft): CreatePostInput {
  return { circleId: draft.circleId, type: draft.type, title: draft.title?.trim() || undefined, body: draft.body.trim(), attachedBookId: draft.attachment?.bookId, attachedChapterId: draft.attachment && draft.chapterId || undefined, contentWarnings: draft.contentWarnings || [], pollOptions: draft.type === 'POLL' ? draft.pollOptions?.map(option => option.trim()) : undefined };
}
export function validateComment(body: string): string { return !body.trim() || body.trim().length > 2000 ? 'Write between 1 and 2,000 characters.' : ''; }
export function mergeById<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  return [...new Map([...previous, ...incoming].map(item => [item.id, item])).values()];
}
export function groupComments(comments: CommunityComment[]) {
  const chronological = (left: CommunityComment, right: CommunityComment) => {
    const time = (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0);
    return time || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  };
  const ordered = [...comments].sort(chronological);
  const roots = ordered.filter(comment => !comment.parentCommentId);
  const rootsById = new Set(roots.map(comment => comment.id));
  const groups = roots.map(root => ({ root, replies: ordered.filter(comment => comment.parentCommentId === root.id), orphan: false }));
  return [...groups, ...ordered.filter(comment => comment.parentCommentId && !rootsById.has(comment.parentCommentId)).map(root => ({ root, replies: [] as CommunityComment[], orphan: true }))].sort((left, right) => chronological(left.root, right.root));
}
export function commentVisibilityDelta(before: Pick<CommunityComment, 'status'> | undefined, after: Pick<CommunityComment, 'status'> | undefined): number {
  return Number(after?.status === 'ACTIVE') - Number(before?.status === 'ACTIVE');
}
export function withCommentCountDelta<T extends { commentCount: number }>(post: T, delta: number): T {
  return { ...post, commentCount: Math.max(0, post.commentCount + delta) };
}
export function communityReplyTargetId(comment: Pick<CommunityComment, 'id'>): string { return comment.id; }
export function canShowCommunityContent(status: CommunityComment['status'], canModerate: boolean): boolean {
  return status === 'ACTIVE' || status === 'REMOVED' && canModerate;
}
export function canShowCommunityDiscussion(contentWarnings: string[], revealed: boolean): boolean {
  return contentWarnings.length === 0 || revealed;
}
export function optimisticReaction<T extends { liked: boolean; likeCount: number; saved?: boolean }>(post: T, kind: 'like' | 'save', active: boolean): T {
  return kind === 'save' ? { ...post, saved: active } : { ...post, liked: active, likeCount: Math.max(0, post.likeCount + (active === post.liked ? 0 : active ? 1 : -1)) };
}
export function discussLink(bookId: string, chapterId?: string | null, owned = false): string {
  const params = new URLSearchParams({ compose: '1', bookId, type: owned ? 'RELEASE' : 'UPDATE' });
  if (chapterId) params.set('chapterId', chapterId);
  return `#/community?${params}`;
}
export function communityNotificationPostId(notification: { type: string; entityType?: string; entityId: string; metadata?: Record<string, string> }): string | null {
  if (notification.metadata?.postId && (notification.type.startsWith('COMMUNITY_') || notification.type === 'CONTENT_REPORT_NOTICE' || notification.entityType === 'COMMUNITY_POST')) return notification.metadata.postId;
  return notification.entityType === 'COMMUNITY_POST' || notification.type.startsWith('COMMUNITY_') ? notification.entityId : null;
}
export function communityError(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function communityFeedMode(query: string): FeedMode {
  const mode = new URLSearchParams(query).get('mode');
  return mode === 'following' || mode === 'circles' || mode === 'saved' ? mode : 'discover';
}
export function communityFeedLink(mode: FeedMode): string { return `#/community?mode=${mode}`; }
export function communityReturnLink(target: { name: string; circleSlug?: string; query?: string; postId?: string } | null): string | null {
  if (target?.name === 'community-post' && target.postId) return `#/community/post/${encodeURIComponent(target.postId)}`;
  if (target?.name !== 'community') return null;
  return `#/community${target.circleSlug ? `/circle/${encodeURIComponent(target.circleSlug)}` : ''}${target.query ? `?${target.query}` : ''}`;
}
export function communityComposeLink(circleSlug?: string, query = ''): string {
  const params = new URLSearchParams(query);
  params.set('compose', '1');
  return communityReturnLink({ name: 'community', circleSlug, query: params.toString() })!;
}
export function composerDefaults(circles: Circle[], initialCircleId: string | undefined, type: PostType): { circleId: string; type: PostType } {
  const circle = circles.find(item => item.id === initialCircleId) || circles.find(item => item.allowedPostTypes.includes(type)) || circles[0];
  return { circleId: circle?.id || '', type: !circle || circle.allowedPostTypes.includes(type) ? type : circle.allowedPostTypes[0] || 'UPDATE' };
}
