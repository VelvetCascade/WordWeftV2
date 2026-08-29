import type { AttachmentChoice, AuthorSummary, Badge, Circle, CommunityComment, CommunityMe, CommunityPost, CreatePostInput, CursorPage, FeedQuery, Interest, ModerationReport, PostModerationAction } from '../types/community';

const BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/community`;
async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = localStorage.getItem('wordweft_jwt');
  const response = await fetch(`${BASE}${path}`, { method, signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) {
    const fallback = response.status === 429 ? 'You’re posting a little quickly. Please wait and try again.' : response.status === 401 ? 'Please sign in to continue.' : 'Could not complete that action. Please try again.';
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.message === 'string' ? error.message : fallback);
  }
  return response.status === 204 ? undefined as T : response.json();
}
const id = encodeURIComponent;
const queryString = (query: object) => new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)])).toString();
export const getCircles = (signal?: AbortSignal) => request<Circle[]>('/circles', 'GET', undefined, signal);
export const getFeed = (query: FeedQuery, signal?: AbortSignal) => request<CursorPage<CommunityPost>>(`/feed?${queryString({ limit: 15, ...query })}`, 'GET', undefined, signal);
export const getPost = (postId: string, signal?: AbortSignal) => request<CommunityPost>(`/posts/${id(postId)}`, 'GET', undefined, signal);
export const createPost = (input: CreatePostInput) => request<CommunityPost>('/posts', 'POST', input);
export const editPost = (postId: string, input: { title?: string; body: string; contentWarnings?: string[] }) => request<CommunityPost>(`/posts/${id(postId)}`, 'PATCH', input);
export const deletePost = (postId: string) => request<void>(`/posts/${id(postId)}`, 'DELETE');
export const setMembership = (circleId: string, joined: boolean) => request<Circle>(`/circles/${id(circleId)}/membership`, 'PUT', { joined });
export const setReaction = (postId: string, kind: 'like' | 'save', active: boolean) => request<CommunityPost>(`/posts/${id(postId)}/${kind}`, 'PUT', { active });
export const vote = (postId: string, optionId: string) => request<CommunityPost>(`/posts/${id(postId)}/vote`, 'POST', { optionId });
export const getComments = (postId: string, cursor?: string, signal?: AbortSignal) => request<CursorPage<CommunityComment>>(`/posts/${id(postId)}/comments?${queryString({ limit: 30, cursor })}`, 'GET', undefined, signal);
export const addComment = (postId: string, body: string, parentCommentId?: string) => request<CommunityComment>(`/posts/${id(postId)}/comments`, 'POST', { body, parentCommentId });
export const deleteComment = (commentId: string) => request<void>(`/comments/${id(commentId)}`, 'DELETE');
export const setCommentLike = (commentId: string, active: boolean) => request<CommunityComment>(`/comments/${id(commentId)}/like`, 'PUT', { active });
export const moderatePost = (postId: string, action: PostModerationAction, reason?: string) => request<CommunityPost>(`/posts/${id(postId)}/moderate`, 'POST', { action, reason });
export const moderateComment = (commentId: string, action: 'REMOVE' | 'RESTORE', reason?: string) => request<CommunityComment>(`/comments/${id(commentId)}/moderate`, 'POST', { action, reason });
export const getMe = (signal?: AbortSignal) => request<CommunityMe>('/me', 'GET', undefined, signal);
export const setInterests = (interests: Interest[]) => request<CommunityMe>('/me/interests', 'PUT', { interests });
export const getAttachments = (query: { q?: string; owned?: boolean; bookId?: string }, signal?: AbortSignal) => request<AttachmentChoice[]>(`/attachments?${queryString(query)}`, 'GET', undefined, signal);
export const getReports = (signal?: AbortSignal) => request<ModerationReport[]>('/moderation/reports', 'GET', undefined, signal);
export const resolveReport = (reportId: string, resolution: 'DISMISS' | 'REMOVE', reason: string) => request<void>(`/moderation/reports/${id(reportId)}`, 'POST', { resolution, reason });
export const setBadges = (memberId: string, badges: Badge[]) => request<AuthorSummary>(`/members/${id(memberId)}/badges`, 'PUT', { badges });
