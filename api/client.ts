
import { sampleBooks, sampleReviews, mainAuthor, otherAuthors } from '../constants';
import type { User, Book, Review, Shelf, LibraryBook, Chapter, BookProgress, Author } from '../types';

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

// Handle backend responses
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || response.statusText);
    }
    // Some endpoints might return empty body
    try {
        return await response.json();
    } catch (e) {
        return null;
    }
};

// --- Mock Data Helpers (For Content Service until Microservice is ready) ---
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
let db = {
  books: deepClone(sampleBooks),
  reviews: deepClone(sampleReviews),
  authors: deepClone([mainAuthor, ...otherAuthors]),
  progress: {} as Record<string, Record<string, BookProgress>>, // Keeping progress local for now as backend storage wasn't requested for Book data yet
};
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- Auth & User API (Connected to Spring Boot Backend) ---

export async function login(email: string, password_used: string): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password_used })
    });
    
    const data = await handleResponse(response);
    
    if (data && data.token) {
        localStorage.setItem(JWT_KEY, data.token);
        // Hybrid hydration: Backend gives identity, frontend mocks Library/Stats for now
        const user = mapBackendUserToFrontend(data); 
        return user;
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
    if (!response.ok) throw new Error("Failed to send reset link.");
    return await response.text();
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to reset password.");
    }
    return await response.text();
}

export async function logout(): Promise<void> {
    localStorage.removeItem(JWT_KEY);
}

export async function getMe(): Promise<User | null> {
    const token = localStorage.getItem(JWT_KEY);
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: getHeaders()
        });
        const backendUser = await handleResponse(response);
        return mapBackendUserToFrontend(backendUser);
    } catch (e) {
        console.error("Failed to fetch user profile", e);
        localStorage.removeItem(JWT_KEY);
        return null;
    }
}

export async function updateUserProfile(userId: number, updatedData: Partial<User>): Promise<User> {
    const payload = {
        name: updatedData.name,
        avatarUrl: updatedData.avatarUrl,
        bio: updatedData.bio,
        location: updatedData.location,
        website: updatedData.website
    };

    const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    
    const backendUser = await handleResponse(response);
    return mapBackendUserToFrontend(backendUser);
}

export async function changePassword(userId: number, oldPassword_unused: string, newPassword_unused: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ oldPassword: oldPassword_unused, newPassword: newPassword_unused })
    });
    
    await handleResponse(response);
    // Return fresh user data
    const user = await getMe();
    if (!user) throw new Error("Session expired after password change");
    return user;
}


/**
 * Helper to merge Backend User Entity with Frontend Mock Data requirements (Library, etc)
 * This acts as an adapter layer until the Book Service is built.
 */
function mapBackendUserToFrontend(backendData: any): User {
    // Determine ID. If backend sends string (Mongo ObjectId), we hash it to number or keep string if types allow.
    // Frontend types currently expect `id: number`.
    // Temporary Hack: Hash the string ID to a number or parse if numeric.
    const numericId = parseInt(backendData.id) || 12345; 

    // Handle Join Date robustness
    let safeJoinDate = backendData.joinDate;
    if (Array.isArray(safeJoinDate)) {
        // Handle [YYYY, MM, DD] array from default Jackson serialization
        safeJoinDate = new Date(safeJoinDate[0], safeJoinDate[1] - 1, safeJoinDate[2]).toISOString();
    } else if (!safeJoinDate) {
        safeJoinDate = new Date().toISOString();
    }

    // Mock Library hydration
    // In production, backend would return this.
    const mockLibrary: Shelf[] = []; 
    
    return {
        id: numericId, // Using numeric ID for frontend compatibility
        name: backendData.username || backendData.name,
        email: backendData.email,
        avatarUrl: backendData.avatarUrl,
        bio: backendData.bio,
        location: backendData.location,
        website: backendData.website,
        joinDate: safeJoinDate,
        stats: backendData.stats || { booksRead: 0, chaptersRead: 0, favoriteGenres: [] },
        following: [], // Mocked empty
        library: mockLibrary, // Mocked empty
        writtenBooks: [] // Mocked empty
    };
}


// --- Content API (Mocked for now, simulating heavy read traffic service) ---

export async function getGenres(): Promise<string[]> {
    await delay(100);
    const genres = new Set<string>();
    db.books.forEach(book => book.genres.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
}

export async function getBooks(filters: { genres?: string[], sortBy?: 'Recent' | 'Rating' | 'Popular', limit?: number }): Promise<Book[]> {
    await delay(400);
    let books = deepClone(db.books.filter(b => b.publicationStatus === 'published'));

    if (filters.genres && filters.genres.length > 0) {
        books = books.filter(book => filters.genres!.some(g => book.genres.includes(g)));
    }

    books.sort((a, b) => {
        switch (filters.sortBy) {
            case 'Rating': return b.rating - a.rating;
            case 'Popular': return b.reviewsCount - a.reviewsCount;
            case 'Recent':
            default: return new Date(b.publishedDate!).getTime() - new Date(a.publishedDate!).getTime();
        }
    });

    if (filters.limit) {
        return books.slice(0, filters.limit);
    }
    return books;
}

export async function getBookById(id: number): Promise<Book | null> {
    await delay(200);
    const book = db.books.find(b => b.id === id);
    return book ? deepClone(book) : null;
}

export async function getAuthorById(id: number): Promise<Author | null> {
    await delay(150);
    const author = db.authors.find(a => a.id === id);
    return author ? deepClone(author) : null;
}

export async function getBooksByAuthor(authorId: number, excludeBookId?: number): Promise<Book[]> {
    await delay(300);
    let books = db.books.filter(b => b.author.id === authorId);
    if (excludeBookId) {
        books = books.filter(b => b.id !== excludeBookId);
    }
    return deepClone(books);
}

// --- Library & Progress API (Mocked locally until backend BookService exists) ---

export async function getReadingProgressForBook(userId: number, bookId: number): Promise<BookProgress | null> {
    await delay(50);
    // Mock: userId converted to string for key
    const uid = userId.toString();
    const bid = bookId.toString();
    return db.progress[uid]?.[bid] ? deepClone(db.progress[uid][bid]) : null;
}

export async function getAllReadingProgress(userId: number): Promise<Record<number, BookProgress>> {
    await delay(50);
    const uid = userId.toString();
    // Convert string keys back to numbers for frontend
    const raw = db.progress[uid] || {};
    const result: Record<number, BookProgress> = {};
    Object.keys(raw).forEach(k => {
        result[parseInt(k)] = raw[k];
    });
    return result;
}

export async function saveReadingProgress(userId: number, book: Book, chapterIndex: number, scrollPosition: number, contentHeight: number): Promise<void> {
    await delay(20);
    const uid = userId.toString();
    const bid = book.id.toString();
    
    if (!db.progress[uid]) db.progress[uid] = {};

    const bookProgress = db.progress[uid][bid] || {
        overallProgress: 0, lastReadChapterIndex: chapterIndex, lastReadScrollPosition: scrollPosition, chapters: {},
    };

    const chapterId = book.chapters[chapterIndex].id;
    let currentChapterProgress = contentHeight <= 0 ? 100 : Math.min(100, (scrollPosition / contentHeight) * 100);
    
    const existingChapterProgress = bookProgress.chapters[chapterId]?.progress || 0;
    bookProgress.chapters[chapterId] = {
        progress: Math.max(existingChapterProgress, currentChapterProgress),
        scrollPosition: Math.round(scrollPosition),
    };
    
    bookProgress.lastReadChapterIndex = chapterIndex;
    bookProgress.lastReadScrollPosition = Math.round(scrollPosition);
    bookProgress.overallProgress = Math.min(100, bookProgress.overallProgress + 1); // Simple mock increment
    
    db.progress[uid][bid] = bookProgress;
}

export async function clearReadingProgress(userId: number, bookId: number): Promise<void> {
    const uid = userId.toString();
    const bid = bookId.toString();
    if (db.progress[uid]?.[bid]) {
        delete db.progress[uid][bid];
    }
}

// --- Library Management (Mock) ---

export async function toggleBookInLibrary(userId: number, book: Book): Promise<User> {
    await delay(100);
    const user = await getMe();
    if (!user) throw new Error("No user");

    // This is purely a UI mock state update since backend doesn't persist library yet
    const isBookInLibrary = user.library.some(shelf => shelf.books.some(b => b.id === book.id));
    
    if (!isBookInLibrary) {
         user.library.push({ id: 1, name: 'My List', books: [{...book, progress: 0, addedDate: '2024-01-01'}]});
    }
    
    return user;
}

export async function removeBookFromLibrary(userId: number, bookId: number): Promise<User> {
    const user = await getMe();
    if (!user) throw new Error("No user");
    user.library.forEach(shelf => {
        shelf.books = shelf.books.filter(b => b.id !== bookId);
    });
    return user;
}

// --- Writer/Review API (Mock) ---

export async function createBook(userId: number, bookData: any): Promise<User> {
    await delay(300);
    const user = await getMe();
    if(!user) throw new Error("No user");
    
    // Fake creation
    const newBook = { ...bookData, id: Date.now(), chapters: [], publicationStatus: 'draft' };
    if(!user.writtenBooks) user.writtenBooks = [];
    user.writtenBooks.push(newBook);
    
    return user;
}

export async function saveChapter(userId: number, bookId: number, chapterId: any, data: any, status: any): Promise<User> {
    await delay(300);
    const user = await getMe();
    if(!user) throw new Error("No user");
    return user;
}

export async function unpublishBook(userId: number, bookId: number): Promise<User> { return (await getMe())!; }
export async function toggleChapterPublication(userId: number, bookId: number, chapterId: number): Promise<User> { return (await getMe())!; }

export async function getBookReviews(bookId: number): Promise<Review[]> {
    return db.reviews.filter(r => r.bookId === bookId);
}

export async function submitReview(userId: number, bookId: number, rating: number, comment: string): Promise<Review[]> {
    const newReview = { id: Date.now(), bookId, userId, user: { id: userId, name: 'You', avatarUrl: '' }, rating, comment, date: new Date().toISOString(), sentiment: 'positive' as const };
    db.reviews.unshift(newReview);
    return db.reviews.filter(r => r.bookId === bookId);
}

export async function deleteReview(userId: number, bookId: number): Promise<Review[]> {
    db.reviews = db.reviews.filter(r => !(r.userId === userId && r.bookId === bookId));
    return db.reviews.filter(r => r.bookId === bookId);
}
