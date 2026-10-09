import { JWT_STORAGE_KEY } from '../utils/authSession';

export interface DailyActivity { day: string; signups: number; stories: number }
export interface AdminOverview {
  users: number; verifiedUsers: number; newUsers7d: number; authors: number;
  stories: number; publishedStories: number; draftStories: number;
  newStories7d: number; publishedChapters: number; totalReads: number;
  pendingReports: number; applications: number; pendingApplications: number;
  activity: DailyActivity[]; generatedAt: string;
}
export interface AdminPage<T> { items: T[]; total: number; page: number; size: number }
export interface AdminUser {
  id: string; username: string; email: string; avatarUrl: string | null;
  joinedAt: string | null; emailVerified: boolean; authProvider: string;
  roles: string[]; publishedStories: number; suspended: boolean;
}
export interface AdminStory {
  id: string; title: string; authorId: string; authorName: string;
  status: string; createdAt: string | null; publishedAt: string | null;
  chapters: number; publishedChapters: number; reads: number; views: number;
  category: string | null; coverUrl: string | null; removed: boolean;
}
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export interface AdminReport {
  id: string; ticketNumber: string; targetType: string; targetId: string;
  targetTitle: string; category: string; description: string; status: ReportStatus;
  reporterUsername: string; reportedUsername: string;
  createdAt: string; resolutionReason: string | null;
}

const API = (import.meta.env.VITE_API_BASE_URL || '/api') + '/admin/console';

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  if (!token) throw new Error('Sign in with an administrator account to continue.');
  const response = await fetch(API + path, {
    ...init, cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error('Administrator access is required.');
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    const payload: unknown = await response.json().catch(() => null);
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String(payload.message) : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

const params = (options: Record<string, string | number>) =>
  '?' + new URLSearchParams(Object.entries(options).map(([key, value]) => [key, String(value)])).toString();

export const getAdminOverview = () => adminRequest<AdminOverview>('/overview');
export const getAdminUsers = (page: number, q: string, role: string) =>
  adminRequest<AdminPage<AdminUser>>('/users' + params({ page, size: 20, q, role }));
export const getAdminStories = (page: number, q: string, status: string) =>
  adminRequest<AdminPage<AdminStory>>('/stories' + params({ page, size: 20, q, status }));
export const getAdminReports = (page: number, status: string) =>
  adminRequest<AdminPage<AdminReport>>('/reports' + params({ page, size: 20, status }));
export const resolveAdminReport = (id: string, status: 'RESOLVED' | 'DISMISSED', reason: string) =>
  adminRequest<AdminReport>('/reports/' + encodeURIComponent(id), {
    method: 'PATCH', body: JSON.stringify({ status, reason }),
  });

export interface AdminModerationDecision {
  action: 'SUSPEND' | 'REINSTATE' | 'REMOVE' | 'RESTORE';
  reason: string; note: string; reportId?: string;
}
export interface AdminModerationResult {
  targetType: 'USER' | 'BOOK'; targetId: string;
  action: string; state: string; auditRecorded: boolean;
}
export interface AdminAuditItem { actorId: string; targetType: string; targetId: string; action: string; reason: string; createdAt: string }
export interface AdminAuditPage { items: AdminAuditItem[]; total: number; page: number }
export const moderateAdminUser = (id: string, decision: AdminModerationDecision) =>
  adminRequest<AdminModerationResult>('/users/' + encodeURIComponent(id) + '/moderation', {
    method: 'POST', body: JSON.stringify(decision),
  });
export const moderateAdminStory = (id: string, decision: AdminModerationDecision) =>
  adminRequest<AdminModerationResult>('/stories/' + encodeURIComponent(id) + '/moderation', {
    method: 'POST', body: JSON.stringify(decision),
  });
export const getAdminAudit = (page: number) => adminRequest<AdminAuditPage>('/audit' + params({ page }));
