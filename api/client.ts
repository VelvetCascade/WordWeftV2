
import type { User, Book, Review, Shelf, LibraryBook, Chapter, BookProgress, Author } from '../types';

// const API_BASE_URL = 'https://wordweftv2.onrender.com/api';
const API_BASE_URL = 'http://localhost:8080/api';
const JWT_KEY = 'wordweft_jwt';

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
        const errorData = await response.text();
        throw new Error(errorData || response.statusText);
    }
    try {
        return await response.json();
    } catch (e) {
        // Some endpoints might return empty body on success
        return null;
    }
};

// --- Auth & User API ---

export async function login(email: string, password_used: string): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password_used })
    });

    const data = await handleResponse(response);

    if (data && data.token) {
        localStorage.setItem(JWT_KEY, data.token);
        return await getMe();
    }
    return null;
}

export const updateReadingTime = async (userId: string, minutes: number): Promise<number> => {
    // In a real app we'd use the userId, but the endpoint currently assumes current user from context/header
    const response = await fetch(`${API_BASE_URL}/users/me/reading-time`, {
        method: 'POST',
        headers: getHeaders(), // Use getHeaders for consistency
        body: JSON.stringify({ minutes })
    });
    if (!response.ok) throw new Error('Failed to update reading time');
    return response.json();
};

export async function signup(username: string, email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });

    const data = await handleResponse(response);

    if (data && data.token) {
        localStorage.setItem(JWT_KEY, data.token);
        return mapBackendUserToFrontend(data);
    }
    throw new Error("Signup failed");
}

export async function forgotPassword(email: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    return await response.text();
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });
    return await response.text();
}

export async function logout(): Promise<void> {
    localStorage.removeItem(JWT_KEY);
}

export async function getMe(): Promise<User | null> {
    const token = localStorage.getItem(JWT_KEY);
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, { headers: getHeaders() });
        const backendUser = await handleResponse(response);
        return mapBackendUserToFrontend(backendUser);
    } catch (e) {
        console.error("Session invalid", e);
        localStorage.removeItem(JWT_KEY);
        return null;
    }
}

export async function updateUserProfile(userId: string, updatedData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
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

export async function followUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to follow user');
}

export async function unfollowUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to unfollow user');
}

// --- Content API ---

export async function getGenres(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/books/genres`);
    return await handleResponse(response);
}

export async function getBooks(filters: { genres?: string[], sortBy?: 'Recent' | 'Rating' | 'Popular', limit?: number }): Promise<Book[]> {
    let url = `${API_BASE_URL}/books?sortBy=${filters.sortBy || 'Recent'}`;
    if (filters.genres && filters.genres.length > 0) {
        url += `&genres=${filters.genres.join(',')}`;
    }
    const response = await fetch(url);
    const books = await handleResponse(response);
    if (filters.limit) return books.slice(0, filters.limit);
    return books;
}

export async function getBookById(id: string): Promise<Book | null> {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, { headers: getHeaders() });
    if (!response.ok) return null;
    return await handleResponse(response);
}

export async function getAuthorById(id: string): Promise<Author | null> {
    const response = await fetch(`${API_BASE_URL}/users/${id}/profile`);
    if (!response.ok) return null;
    return await handleResponse(response);
}

export async function getBooksByAuthor(authorId: string, excludeBookId?: string): Promise<Book[]> {
    const response = await fetch(`${API_BASE_URL}/books/author/${authorId}`);
    let books = await handleResponse(response);
    if (excludeBookId) {
        books = books.filter((b: Book) => b.id !== excludeBookId);
    }
    return books;
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

export async function saveReadingProgress(userId: string, book: Book, chapterIndex: number, scrollPosition: number, contentHeight: number): Promise<void> {
    const chapterId = book.chapters[chapterIndex].id;

    // Calculate progress with a minimum floor if scrolled significantly
    let calculatedProgress = 0;
    if (contentHeight > 0) {
        calculatedProgress = (scrollPosition / contentHeight) * 100;

        // If user has scrolled at least a bit (e.g., > 100px) but progress is < 1%, round up to 1% to show they started.
        if (scrollPosition > 100 && calculatedProgress < 1) {
            calculatedProgress = 1;
        }
    } else {
        // Fallback or full progress if content height is invalid (unlikely but possible)
        calculatedProgress = 100;
    }

    // Ensure bounds
    let finalProgress = Math.min(100, Math.max(0, calculatedProgress));

    await fetch(`${API_BASE_URL}/reading/progress`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            bookId: book.id,
            chapterIndex,
            scrollPosition,
            chapterData: {
                id: chapterId,
                progress: Math.round(finalProgress),
                scroll: Math.round(scrollPosition)
            }
        })
    });
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
        body: JSON.stringify({ data, status })
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

export async function deleteReview(userId: string, bookId: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

// --- Comment API ---

export async function getComments(chapterId: string): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/comments/chapter/${chapterId}`, { headers: getHeaders() });
    return await handleResponse(response);
}

export async function addComment(bookId: string, chapterId: string, content: string, paragraphIndex?: number): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bookId, chapterId, content, paragraphIndex })
    });
    return await handleResponse(response);
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
        stats: backendData.stats || { booksRead: 0, chaptersRead: 0, favoriteGenres: [] },
        following: backendData.following || [],
        followers: backendData.followers || [],
        library: backendData.library || [],
        writtenBooks: backendData.writtenBooks || [],
        socialLinks: backendData.socialLinks || {}
    };
}
