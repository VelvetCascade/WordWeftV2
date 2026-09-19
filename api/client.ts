

import type { User, Book, Review, Shelf, LibraryBook, Chapter, ChapterRevision, ChapterContentResult, BookProgress, Author, Comment, Character, Scene, Note, AppNotification, NotificationPreferences, SearchAutocompleteResponse, SearchFullResponse, ContentReport, ReportTargetType, ReportCategory, WriterAnalytics, HookFeedResponse, ReadingChallenge, GenreEvent, FoundingWriterApplication, FoundingWriterApplicationStatus, FoundingWriterApplicationSubmission } from '../types';
import { invalidateAuthSession, JWT_STORAGE_KEY } from '../utils/authSession';

export { AUTH_SESSION_INVALID_EVENT } from '../utils/authSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';


const JWT_KEY = JWT_STORAGE_KEY;

// --- Helper Functions ---

const getHeaders = () => {
    const token = localStorage.getItem(JWT_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        // Any authenticated request rejected as unauthorized makes the locally
        // cached account stale. Keep the app shell and token in sync.
        if (response.status === 401) invalidateAuthSession();
        const errorText = await response.text();
        let message = errorText || response.statusText;
        let errorCode: string | undefined;
        try {
            const parsed = JSON.parse(errorText);
            if (parsed && typeof parsed === 'object') {
                if (typeof parsed.message === 'string' && parsed.message.trim()) {
                    message = parsed.message;
                } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
                    message = parsed.error;
                }
                if (typeof parsed.errorCode === 'string') {
                    errorCode = parsed.errorCode;
                }
            }
        } catch {
            // Non-JSON response, keep errorText
        }
        const err = new Error(message);
        if (errorCode) {
            (err as any).code = errorCode;
        }
        throw err;
    }
    try {        return await response.json();
    } catch (e) {
        // Some endpoints might return empty body on success
        return null;
    }
};

// --- Auth & User API ---

async function establishSession(token: string): Promise<User> {
    localStorage.setItem(JWT_KEY, token);
    const user = await getMe();
    if (!user) {
        throw new Error('Sign-in completed, but the session could not be verified. Please sign in again.');
    }
    return user;
}

export async function login(email: string, password_used: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password_used })
    });

    const data = await handleResponse(response);

    if (data && data.token) {
        return establishSession(data.token);
    }
    throw new Error('Sign in failed. Please try again.');
}

export async function signup(username: string, email: string, password: string, dateOfBirth: string): Promise<{ requiresOtp: boolean; message: string; user?: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, dateOfBirth })
    });

    const data = await handleResponse(response);

    // If it requires OTP, return that info
    if (data && data.requiresOtp) {
        return { requiresOtp: true, message: data.message };
    }

    // Fallback for immediate login (e.g. if OTP is disabled later)
    if (data && data.token) {
        return { requiresOtp: false, message: "Signup successful", user: await establishSession(data.token) };
    }
    throw new Error("Signup failed");
}

export async function verifyOtp(email: string, otp: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });

    const data = await handleResponse(response);

    if (data && data.token) {
        return establishSession(data.token);
    }
    throw new Error("OTP Verification failed");
}

export async function resendOtp(email: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    return await handleResponse(response);
}

export async function forgotPassword(email: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    return await handleResponse(response);
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });
    return await handleResponse(response);
}

export async function googleLogin(idToken: string): Promise<{ user: User; needsProfileCompletion: boolean } | null> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });

    const data = await handleResponse(response);

    if (data && data.token) {
        const user = await establishSession(data.token);
        return { user, needsProfileCompletion: !!data.needsProfileCompletion };
    }
    return null;
}

export async function logout(): Promise<void> {
    localStorage.removeItem(JWT_KEY);
}

export async function getMe(): Promise<User | null> {
    const token = localStorage.getItem(JWT_KEY);
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, { headers: getHeaders() });

        // Only 401 Unauthorized means the token/session itself is definitely expired or invalid.
        // 403 Forbidden is a permissions/content issue and must NOT blow away the user's session.
        if (response.status === 401) {
            console.error("Session invalid: 401 Unauthorized");
            invalidateAuthSession();
            return null;
        }

        const backendUser = await handleResponse(response);
        return mapBackendUserToFrontend(backendUser);
    } catch (e) {
        // Network and server failures are not proof that the session is invalid.
        // Preserve the token and let callers display/retry the actual failure.
        console.error("Error fetching user profile (kept session):", e);
        throw e;
    }
}

export async function updateUserProfile(userId: string, updatedData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedData)
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function changePassword(userId: string, oldPassword_unused: string, newPassword_unused: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ oldPassword: oldPassword_unused, newPassword: newPassword_unused })
    });
    await handleResponse(response);
    return (await getMe())!;
}

export async function markWritingDemoSeen(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me/writing-demo`, {
        method: 'PUT',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

// --- Support API ---

export interface GrievanceData {
    name: string;
    email: string;
    category: string;
    subject: string;
    message: string;
}

export async function submitGrievance(data: GrievanceData): Promise<{ success: boolean; message: string; grievanceId: string }> {
    const response = await fetch(`${API_BASE_URL}/support/grievances`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return await handleResponse(response);
}

// --- Follow API ---

export async function followUser(userId: string): Promise<Author> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

export async function unfollowUser(userId: string): Promise<Author> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/unfollow`, {
        method: 'POST',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

export async function getUserFollowers(userId: string): Promise<Author[]> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/followers`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function getUserFollowing(userId: string): Promise<Author[]> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/following`, { headers: getHeaders() });
    return await handleResponse(response);
}

// --- Content API ---

export async function getGenres(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/books/genres`);
    return await handleResponse(response);
}

export async function getGenresRanked(): Promise<{ name: string; bookCount: number; readCount: number }[]> {
    const response = await fetch(`${API_BASE_URL}/books/genres/ranked`);
    return await handleResponse(response);
}

export async function getBooks(filters: {
    sort?: 'most_read' | 'most_viewed' | 'recent_update' | 'new';
    genre?: string;
    page?: number;
    size?: number;
}): Promise<{ content: Book[]; hasMore: boolean; totalElements: number; page: number }> {
    const params = new URLSearchParams();
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.genre) params.append('genre', filters.genre);
    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 12));
    const response = await fetch(`${API_BASE_URL}/books?${params.toString()}`, { headers: getHeaders() });
    const data = await handleResponse(response);
    if (data && data.content) data.content = data.content.map(mapBackendBookToFrontend);
    return data;
}

export async function getHomeGenres(): Promise<Record<string, Book[]>> {
    const response = await fetch(`${API_BASE_URL}/books/home-genres`, { headers: getHeaders() });
    const data = await handleResponse(response);
    if (data) {
        Object.keys(data).forEach(key => {
            data[key] = data[key].map(mapBackendBookToFrontend);
        });
    }
    return data;
}

export async function getBooksByGenre(genre: string, filters: {
    sort?: 'most_read' | 'most_viewed' | 'recent_update' | 'new';
    page?: number;
    size?: number;
}): Promise<{ content: Book[]; hasMore: boolean; totalElements: number; page: number }> {
    const params = new URLSearchParams();
    if (filters.sort) params.append('sort', filters.sort);
    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 12));
    const response = await fetch(`${API_BASE_URL}/books/genre/${encodeURIComponent(genre)}?${params.toString()}`, { headers: getHeaders() });
    const data = await handleResponse(response);
    if (data && data.content) data.content = data.content.map(mapBackendBookToFrontend);
    return data;
}

export async function getBookById(id: string): Promise<Book | null> {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
        headers: getHeaders(),
        cache: 'no-store',
    });
    if (!response.ok) return null;
    return mapBackendBookToFrontend(await handleResponse(response));
}

export async function getAuthorById(id: string): Promise<Author | null> {
    const response = await fetch(`${API_BASE_URL}/users/${id}/profile`, { headers: getHeaders() });
    if (!response.ok) return null;
    const data = await handleResponse(response);
    if (!data) return null;

    // Map backend fields to the Author type (backend sends `username`, not `name`)
    let safeJoinDate = data.joinDate;
    if (Array.isArray(safeJoinDate)) {
        safeJoinDate = new Date(safeJoinDate[0], safeJoinDate[1] - 1, safeJoinDate[2]).toISOString();
    }

    return {
        id: data.id,
        name: data.username || data.name || 'Unknown',
        avatarUrl: data.avatarUrl,
        bio: data.bio || '',
        location: data.location,
        website: data.website,
        joinDate: safeJoinDate,
        stats: data.stats || undefined,
        socials: data.socials || {},
        favoriteGenres: data.favoriteGenres || [],
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
        isFollowing: data.isFollowing ?? false,
        communityInterests: data.communityInterests || [],
        communityBadges: data.communityBadges || [],
    };
}

export async function getBooksByAuthor(authorId: string, excludeBookId?: string): Promise<Book[]> {
    const response = await fetch(`${API_BASE_URL}/books/author/${authorId}`, { headers: getHeaders() });
    let books: Book[] = (await handleResponse(response) || []).map(mapBackendBookToFrontend);
    if (excludeBookId) {
        books = books.filter(b => b.id !== excludeBookId);
    }
    return books;
}

export async function toggleBookLike(bookId: string): Promise<Book> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/like`, {
        method: 'POST',
        headers: getHeaders()
    });
    return mapBackendBookToFrontend(await handleResponse(response));
}

export async function toggleChapterLike(bookId: string, chapterId: string): Promise<Book> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/like`, {
        method: 'POST',
        headers: getHeaders()
    });
    return mapBackendBookToFrontend(await handleResponse(response));
}

export async function recordChapterView(bookId: string, chapterId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/view`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            sessionId: getOrCreateReaderSession(),
            referrer: document.referrer || ''
        })
    });
    await handleResponse(response);
}

export async function submitFoundingWriterApplication(
    data: FoundingWriterApplicationSubmission,
    file: File,
    onProgress?: (percent: number) => void
): Promise<{ success: true; message: string }> {
    return new Promise((resolve, reject) => {
        const body = new FormData();
        body.append('application', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        body.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/public/founding-writer-applications`);

        if (xhr.upload && onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && event.total > 0) {
                    const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                    onProgress(percent);
                }
            });
        }

        xhr.onload = () => {
            let result: any = null;
            try {
                result = JSON.parse(xhr.responseText);
            } catch {}

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(result || { success: true, message: 'Your application has been received.' });
            } else {
                let errMsg = result?.message || result?.error;
                if (!errMsg && result && typeof result === 'object') {
                    const entries = Object.entries(result);
                    if (entries.length > 0 && typeof entries[0][1] === 'string') {
                        errMsg = `${entries[0][1]}`;
                    }
                }
                if (!errMsg && xhr.status === 429) {
                    errMsg = 'You have submitted too many requests recently. Please wait a bit before trying again.';
                }
                reject(new Error(errMsg || "We couldn't submit your application right now. Please try again shortly."));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network connection error. Please check your internet connection and try again."));
        };

        xhr.send(body);
    });
}

export async function getFoundingWriterApplications(status?: FoundingWriterApplicationStatus): Promise<FoundingWriterApplication[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/founding-writer-applications${query}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function downloadFoundingWriterChapters(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/founding-writer-applications/${encodeURIComponent(id)}/chapter-file`, {
        headers: getHeaders(), cache: 'no-store'
    });
    if (!response.ok) throw new Error('The chapter file could not be downloaded. Check your admin access and try again.');
    const result = await response.json();
    const downloadUrl = result.downloadUrl;
    if (!downloadUrl) throw new Error('Download URL not available.');
    window.open(downloadUrl, '_blank');
}

export async function updateFoundingWriterApplication(
    id: string,
    status: FoundingWriterApplicationStatus,
    adminNotes: string
): Promise<FoundingWriterApplication> {
    const response = await fetch(`${API_BASE_URL}/admin/founding-writer-applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, adminNotes })
    });
    return await handleResponse(response);
}

export async function getChapterContent(bookId: string, chapterId: string): Promise<ChapterContentResult> {
    const response = await fetch(
        `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}/content`,
        {
            headers: getHeaders(),
            // The same URL returns PREVIEW for a guest and FULL after sign-in.
            // Never reuse the anonymous response for an authenticated request.
            cache: 'no-store',
        },
    );
    if (response.status === 401) {
        // An anonymous visitor is expected to receive AUTH_REQUIRED. If a token
        // was sent, however, this response also means the visible account state
        // must be invalidated before rendering the gate.
        invalidateAuthSession();
        let errorCode = '';
        try {
            errorCode = (await response.json())?.errorCode || '';
        } catch {
            // A malformed error body still remains an authentication failure.
        }
        if (errorCode === 'AUTH_REQUIRED' || !errorCode) {
            return {
                bookId,
                bookTitle: '',
                chapterId,
                chapterTitle: '',
                chapterIndex: -1,
                access: 'AUTH_REQUIRED',
                content: '',
                previewWordCount: 0,
                fullWordCount: 0,
            };
        }
        throw new Error('Sign in is required to read this chapter.');
    }
    return await handleResponse(response) as ChapterContentResult;
}

export async function getHookFeed(excludedBookIds: string[] = [], genres: string[] = [], limit = 10): Promise<HookFeedResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (excludedBookIds.length) params.set('exclude', excludedBookIds.join(','));
    if (genres.length) params.set('genres', genres.join(','));
    const response = await fetch(`${API_BASE_URL}/discovery/hooks?${params}`, { headers: getHeaders() });
    return handleResponse(response);
}

export async function saveReaderTaste(favoriteGenres: string[]): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/discovery/taste`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ favoriteGenres }),
    });
    const result = await handleResponse(response);
    return result.favoriteGenres || [];
}

export async function getReadingChallenges(): Promise<ReadingChallenge[]> {
    const response = await fetch(`${API_BASE_URL}/growth/challenges`, { headers: getHeaders() });
    return handleResponse(response);
}

export async function joinReadingChallenge(challengeId: string): Promise<ReadingChallenge> {
    const response = await fetch(`${API_BASE_URL}/growth/challenges/${encodeURIComponent(challengeId)}/join`, {
        method: 'POST', headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function getGenreEvents(): Promise<GenreEvent[]> {
    const response = await fetch(`${API_BASE_URL}/growth/events`, { headers: getHeaders() });
    return handleResponse(response);
}

export async function submitStoryToGenreEvent(eventId: string, bookId: string): Promise<GenreEvent> {
    const response = await fetch(`${API_BASE_URL}/growth/events/${encodeURIComponent(eventId)}/submissions/${encodeURIComponent(bookId)}`, {
        method: 'POST', headers: getHeaders(),
    });
    return handleResponse(response);
}

// --- Library & Progress API ---

export async function getReadingProgressForBook(userId: string, bookId: string): Promise<BookProgress | null> {
    const response = await fetch(`${API_BASE_URL}/reading/progress/${bookId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function getAllReadingProgress(userId: string): Promise<Record<string, BookProgress>> {
    const response = await fetch(`${API_BASE_URL}/reading/progress`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function saveReadingProgress(userId: string, book: Book, chapterIndex: number, scrollPosition: number, progressPercentage: number): Promise<void> {
    const chapterId = book.chapters[chapterIndex].id;

    const response = await fetch(`${API_BASE_URL}/reading/progress`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            bookId: book.id,
            chapterIndex,
            scrollPosition,
            chapterData: {
                id: chapterId,
                progress: Math.round(progressPercentage),
                scroll: Math.round(scrollPosition)
            }
        })
    });
    await handleResponse(response);
}

export async function clearReadingProgress(userId: string, bookId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/reading/progress/${bookId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
}

export async function toggleBookInLibrary(userId: string, book: Book): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/library/toggle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bookId: book.id })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function removeBookFromLibrary(userId: string, bookId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/library/${bookId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export const createShelf = async (userId: string, name: string, visibility: 'PUBLIC' | 'PRIVATE' = 'PRIVATE'): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/library/shelves`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, visibility }),
    });
    if (!response.ok) throw new Error('Failed to create shelf');
    return response.json();
};

export const toggleShelfVisibility = async (shelfId: string, visibility: 'PUBLIC' | 'PRIVATE'): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/library/shelves/${shelfId}/visibility`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ visibility }),
    });
    if (!response.ok) throw new Error('Failed to update shelf visibility');
    return response.json();
};

export const deleteShelf = async (shelfId: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/library/shelves/${shelfId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete shelf');
    return mapBackendUserToFrontend(await response.json());
};

export async function updateBookShelves(userId: string, bookId: string, shelfIds: string[]): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/library/books/${bookId}/shelves`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ shelfIds })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

// --- Writer/Review API ---

export async function createBook(userId: string, bookData: any): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(bookData)
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function updateBookDetails(userId: string, bookId: string, updates: Partial<Book>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function saveChapter(userId: string, bookId: string, chapterId: any, data: any, status: any): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ data, status, contentWarnings: data.contentWarnings || [], disclaimerNote: data.disclaimerNote || '' })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function setBookStatus(userId: string, bookId: string, status: 'draft' | 'published'): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function unpublishBook(userId: string, bookId: string): Promise<User> {
    return setBookStatus(userId, bookId, 'draft');
}

export async function toggleChapterPublication(userId: string, bookId: string, chapterId: any): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/status`, {
        method: 'PATCH',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function importManuscript(bookId: string, file: File): Promise<{ user: User; importedChapters: number; totalChapters: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/import`, {
        method: 'POST',
        headers: { 'Authorization': getHeaders().Authorization },
        body: formData,
    });
    const data = await handleResponse(response);
    return {
        user: mapBackendUserToFrontend(data.user),
        importedChapters: data.result.importedChapters,
        totalChapters: data.result.totalChapters,
    };
}

export async function scheduleChapter(bookId: string, chapterId: string, scheduledAt: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/schedule`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ scheduledAt })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function cancelChapterSchedule(bookId: string, chapterId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/schedule`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function getChapterRevisions(bookId: string, chapterId: string): Promise<ChapterRevision[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/revisions`, {
        headers: getHeaders()
    });
    return await handleResponse(response);
}

export async function restoreChapterRevision(bookId: string, chapterId: string, revisionId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/revisions/${revisionId}/restore`, {
        method: 'POST',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function getWriterAnalytics(bookId?: string): Promise<WriterAnalytics> {
    const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : '';
    const response = await fetch(`${API_BASE_URL}/writer/analytics${query}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function deleteBook(bookId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function deleteChapter(bookId: string, chapterId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

export async function getBookReviews(bookId: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`);
    return await handleResponse(response);
}

export async function submitReview(userId: string, bookId: string, rating: number, comment: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rating, comment })
    });
    return await handleResponse(response);
}

export async function replyToReview(userId: string, bookId: string, reviewId: string, content: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content })
    });
    return await handleResponse(response);
}

export async function deleteReview(userId: string, bookId: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

// --- Comments API ---

export async function getChapterComments(bookId: string, chapterId: string): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/comments`);
    return await handleResponse(response);
}

export async function addChapterComment(bookId: string, chapterId: string, paragraphIndex: number | null, content: string, parentId: string | null = null): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ paragraphIndex, content, parentId })
    });
    return await handleResponse(response);
}


// --- Character API ---

export async function getCharactersByBookId(bookId: string): Promise<Character[]> {
    const response = await fetch(`${API_BASE_URL}/characters/book/${bookId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function createCharacter(character: any): Promise<Character> {
    const response = await fetch(`${API_BASE_URL}/characters`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(character)
    });
    return await handleResponse(response);
}

export async function updateCharacter(id: string, character: any): Promise<Character> {
    const response = await fetch(`${API_BASE_URL}/characters/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(character)
    });
    return await handleResponse(response);
}

export async function deleteCharacter(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/characters/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
}

// --- Scene API ---

export async function getScenesByBookId(bookId: string): Promise<Scene[]> {
    const response = await fetch(`${API_BASE_URL}/scenes/book/${bookId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function getScenesByChapterId(chapterId: string): Promise<Scene[]> {
    const response = await fetch(`${API_BASE_URL}/scenes/chapter/${chapterId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function createScene(scene: any): Promise<Scene> {
    const response = await fetch(`${API_BASE_URL}/scenes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(scene)
    });
    return await handleResponse(response);
}

export async function updateScene(id: string, scene: any): Promise<Scene> {
    const response = await fetch(`${API_BASE_URL}/scenes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(scene)
    });
    return await handleResponse(response);
}

export async function deleteScene(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/scenes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
}

// --- Note API ---

export async function getNotesByBookId(bookId: string): Promise<Note[]> {
    const response = await fetch(`${API_BASE_URL}/notes/book/${bookId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function getNotesByChapterId(chapterId: string): Promise<Note[]> {
    const response = await fetch(`${API_BASE_URL}/notes/chapter/${chapterId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function createNote(note: any): Promise<Note> {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(note)
    });
    return await handleResponse(response);
}

export async function updateNote(id: string, note: any): Promise<Note> {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(note)
    });
    return await handleResponse(response);
}

export async function deleteNote(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
}



// --- File API ---

export async function uploadFile(formData: FormData): Promise<{ filename: string, url: string }> {
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
            'Authorization': getHeaders()['Authorization']
            // Content-Type is set automatically by fetch when using FormData
        },
        body: formData
    });
    return await handleResponse(response);
}

export async function uploadChapterImage(bookId: string, file: File): Promise<{ filename: string, url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/images`, {
        method: 'POST',
        headers: {
            'Authorization': getHeaders()['Authorization']
        },
        body: formData
    });
    return await handleResponse(response);
}

// --- ImageKit API ---

export async function getImageKitAuth(uploadId?: string): Promise<{ token: string, expire: number, signature: string, publicKey: string }> {
    const suffix = uploadId ? `?uploadId=${encodeURIComponent(uploadId)}` : '';
    const response = await fetch(`${API_BASE_URL}/imagekit/auth${suffix}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export interface ImageUploadDiagnostic {
    uploadId: string;
    event: 'selected' | 'auth_ready' | 'uploaded' | 'failed';
    contentType?: string;
    sizeBytes?: number;
    httpStatus?: number;
    message?: string;
}

export async function reportImageUploadDiagnostic(event: ImageUploadDiagnostic): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/imagekit/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(event),
    });
    await handleResponse(response);
}

function mapBackendUserToFrontend(backendData: any): User {
    let safeJoinDate = backendData.joinDate;
    if (Array.isArray(safeJoinDate)) {
        safeJoinDate = new Date(safeJoinDate[0], safeJoinDate[1] - 1, safeJoinDate[2]).toISOString();
    } else if (!safeJoinDate) {
        safeJoinDate = new Date().toISOString();
    }

    return {
        id: backendData.id,
        name: backendData.username || backendData.name,
        email: backendData.email,
        avatarUrl: backendData.avatarUrl,
        bio: backendData.bio,
        location: backendData.location,
        website: backendData.website,
        joinDate: safeJoinDate,
        isEmailVerified: backendData.isEmailVerified ?? true,
        stats: backendData.stats || {
            booksRead: 0,
            chaptersRead: 0,
            totalWordsRead: 0,
            readingTimeMinutes: 0,
            readerLevel: 'Novice'
        },
        socials: backendData.socials || {},
        favoriteGenres: backendData.favoriteGenres || [],
        communityInterests: backendData.communityInterests || [],
        communityBadges: backendData.communityBadges || [],
        following: backendData.following || [], // Should be list of IDs
        followersCount: backendData.followersCount || 0,
        followingCount: backendData.followingCount || 0,
        library: (backendData.library || []).map((shelf: any) => ({
            ...shelf,
            books: (shelf.books || []).map((book: any) => {
                const mappedBook = mapBackendBookToFrontend(book);
                return {
                    ...mappedBook,
                    progress: book.progress ?? 0,
                    addedDate: book.addedDate
                };
            })
        })),
        writtenBooks: (backendData.writtenBooks || []).map(mapBackendBookToFrontend),
        hasSeenWritingDemo: backendData.hasSeenWritingDemo ?? false,
        dateOfBirth: backendData.dateOfBirth,
        allowMatureContent: backendData.allowMatureContent ?? false,
        roles: backendData.roles || []
    };
}

function mapBackendBookToFrontend(backendBook: any): Book {
    if (!backendBook) return backendBook;
    return {
        ...backendBook,
        isAIGenerated: backendBook.isAIGenerated ?? backendBook.aIGenerated ?? backendBook.aigenerated ?? backendBook.aiGenerated ?? false,
        isMature: backendBook.isMature ?? backendBook.mature ?? false,
        ageRating: backendBook.ageRating ?? ((backendBook.isMature ?? backendBook.mature) ? 'MATURE_18' : 'ALL_AGES'),
        readingStatus: backendBook.readingStatus || 'Ongoing',
        contentWarnings: backendBook.contentWarnings || [],
        chapters: (backendBook.chapters || []).map((chapter: any) => ({
            ...chapter,
            content: chapter.content || '',
            contentWarnings: chapter.contentWarnings || [],
        })),
    };
}

function getOrCreateReaderSession(): string {
    const key = 'wordweft_reader_session';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
    return sessionId;
}

export async function submitReport(data: { targetType: ReportTargetType; targetId: string; category: ReportCategory; description: string }): Promise<ContentReport> {
    const response = await fetch(`${API_BASE_URL}/reports`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return await handleResponse(response);
}

export async function getMyReports(): Promise<ContentReport[]> {
    const response = await fetch(`${API_BASE_URL}/reports/mine`, { headers: getHeaders() });
    return await handleResponse(response);
}


// --- Feedback ---

export const submitFeedback = async (feedbackData: Record<string, unknown>): Promise<{ message: string; id: string }> => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(feedbackData),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(err.error || 'Failed to submit feedback');
    }
    return response.json();
};

export const submitQuickFeedback = async (data: {
    feedbackType: string;
    rating?: number;
    shortResponse?: string;
    longResponse?: string;
    page?: string;
    feature?: string;
    sessionId?: string;
    contextData?: Record<string, unknown>;
}): Promise<{ message: string; id: string }> => {
    const response = await fetch(`${API_BASE_URL}/feedback/quick`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(err.error || 'Failed to submit feedback');
    }
    return response.json();
};

// --- Notifications API ---

export const getNotifications = async (page = 0, size = 20, type?: string): Promise<{
    notifications: AppNotification[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
    hasNext: boolean;
}> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (type) params.append('type', type);
    const response = await fetch(`${API_BASE_URL}/notifications?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: getHeaders(),
    });
    const data = await handleResponse(response);
    return data?.count ?? 0;
};

export const markNotificationRead = async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: getHeaders(),
    });
};

export const markAllNotificationsRead = async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getHeaders(),
    });
};

export const updateNotificationPreferences = async (prefs: NotificationPreferences): Promise<NotificationPreferences> => {
    const response = await fetch(`${API_BASE_URL}/users/me/notification-preferences`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(prefs),
    });
    return handleResponse(response);
};

export const getNotificationStreamUrl = (): string => {
    const token = localStorage.getItem(JWT_KEY);
    return `${API_BASE_URL}/notifications/stream?token=${token}`;
};

// --- Search API ---

export const searchAutocomplete = async (query: string): Promise<SearchAutocompleteResponse> => {
    const response = await fetch(`${API_BASE_URL}/search/autocomplete?q=${encodeURIComponent(query)}`);
    return handleResponse(response);
};

export const searchFull = async (
    query: string,
    type: 'all' | 'books' | 'authors' = 'all',
    page = 0,
    size = 12
): Promise<SearchFullResponse> => {
    const params = new URLSearchParams({
        q: query,
        type,
        page: String(page),
        size: String(size),
    });
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    return handleResponse(response);
};
