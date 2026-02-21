

import type { User, Book, Review, Shelf, LibraryBook, Chapter, BookProgress, Author, Comment, Character, Scene, Note } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

export async function getBooks(filters: { genres?: string[], sortBy?: 'Recent' | 'Rating' | 'Popular', limit?: number }): Promise<Book[]> {
    let url = `${API_BASE_URL}/books?sortBy=${filters.sortBy || 'Recent'}`;
    if (filters.genres && filters.genres.length > 0) {
        url += `&genres=${filters.genres.join(',')}`;
    }
    const response = await fetch(url, { headers: getHeaders() });
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
    const response = await fetch(`${API_BASE_URL}/users/${id}/profile`, { headers: getHeaders() });
    if (!response.ok) return null;
    return await handleResponse(response);
}

export async function getBooksByAuthor(authorId: string, excludeBookId?: string): Promise<Book[]> {
    const response = await fetch(`${API_BASE_URL}/books/author/${authorId}`, { headers: getHeaders() });
    let books = await handleResponse(response);
    if (excludeBookId) {
        books = books.filter((b: Book) => b.id !== excludeBookId);
    }
    return books;
}

export async function toggleBookLike(bookId: string): Promise<Book> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/like`, {
        method: 'POST',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

export async function toggleChapterLike(bookId: string, chapterId: string): Promise<Book> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/like`, {
        method: 'POST',
        headers: getHeaders()
    });
    return await handleResponse(response);
}

export async function recordChapterView(bookId: string, chapterId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/books/${bookId}/chapters/${chapterId}/view`, {
        method: 'POST',
        headers: getHeaders()
    });
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

    await fetch(`${API_BASE_URL}/reading/progress`, {
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

export async function createShelf(userId: string, name: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/library/shelves`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
    });
    return mapBackendUserToFrontend(await handleResponse(response));
}

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
        stats: backendData.stats || {
            booksRead: 0,
            chaptersRead: 0,
            totalWordsRead: 0,
            readingTimeMinutes: 0,
            readerLevel: 'Novice'
        },
        socials: backendData.socials || {},
        favoriteGenres: backendData.favoriteGenres || [],
        following: backendData.following || [], // Should be list of IDs
        followersCount: backendData.followersCount || 0,
        followingCount: backendData.followingCount || 0,
        library: backendData.library || [],
        writtenBooks: backendData.writtenBooks || []
    };
}

