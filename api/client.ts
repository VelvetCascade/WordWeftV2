
import { sampleUsers, sampleBooks, sampleReviews, mainAuthor, otherAuthors } from '../constants';
import type { User, Book, Review, Shelf, LibraryBook, Chapter, BookProgress, Author } from '../types';

const JWT_KEY = 'wordweft_jwt';

// Simple deep clone to avoid external dependencies and mutation of original constants
const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  const clonedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj as T;
};

// In-memory "database"
let db = {
  users: deepClone(sampleUsers),
  books: deepClone(sampleBooks),
  reviews: deepClone(sampleReviews),
  authors: deepClone([mainAuthor, ...otherAuthors, ...sampleUsers.map(u => ({id: u.id, name: u.name, avatarUrl: u.avatarUrl, bio: ''}))]),
  // Reading progress, keyed by userId, then bookId
  progress: {
    '101': {
        '1': { overallProgress: 35, lastReadChapterIndex: 1, lastReadScrollPosition: 1200, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 40, scrollPosition: 1200 } } },
        '2': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
        '7': { overallProgress: 0, lastReadChapterIndex: 0, lastReadScrollPosition: 0, chapters: {} },
    },
    '102': {
        '3': { overallProgress: 80, lastReadChapterIndex: 2, lastReadScrollPosition: 2000, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 70, scrollPosition: 2000 } } },
        '7': { overallProgress: 10, lastReadChapterIndex: 1, lastReadScrollPosition: 500, chapters: { '101': { progress: 100, scrollPosition: 9999 }, '102': { progress: 5, scrollPosition: 500 } } },
    },
    '103': {
        '1': { overallProgress: 100, lastReadChapterIndex: 3, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 100, scrollPosition: 9999 }, '4': { progress: 100, scrollPosition: 9999 } } },
        '2': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
        '3': { overallProgress: 100, lastReadChapterIndex: 2, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 }, '3': { progress: 100, scrollPosition: 9999 } } },
        '4': { overallProgress: 100, lastReadChapterIndex: 0, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 } } },
        '6': { overallProgress: 100, lastReadChapterIndex: 1, lastReadScrollPosition: 9999, chapters: { '1': { progress: 100, scrollPosition: 9999 }, '2': { progress: 100, scrollPosition: 9999 } } },
        '7': { overallProgress: 5, lastReadChapterIndex: 0, lastReadScrollPosition: 800, chapters: { '101': { progress: 10, scrollPosition: 800 } } }
    }
  } as Record<string, Record<string, BookProgress>>,
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms + Math.random() * 100));


// --- JWT Simulation ---
const generateToken = (user: User) => btoa(JSON.stringify({ id: user.id, email: user.email }));
const decodeToken = (token: string): { id: number, email: string } | null => {
    try {
        return JSON.parse(atob(token));
    } catch (e) {
        return null;
    }
};

const getAuthenticatedUser = (): User => {
    const token = localStorage.getItem(JWT_KEY);
    if (!token) throw new Error("Unauthorized: No token provided.");
    
    const decoded = decodeToken(token);
    if (!decoded) {
        localStorage.removeItem(JWT_KEY);
        throw new Error("Unauthorized: Invalid token.");
    }

    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
        localStorage.removeItem(JWT_KEY);
        throw new Error("Unauthorized: User not found.");
    }
    
    return user;
};


// --- Auth API ---
/**
 * Logs a user in.
 * @example
 * // Real API Request:
 * // POST /api/v1/auth/login
 * // Body: { "email": "user@example.com", "password": "userpassword" }
 * // Response (200 OK): { "token": "...", "user": { ... } }
 * // Response (401 Unauthorized): { "error": "Invalid credentials" }
 */
export async function login(email: string, password_used: string): Promise<User | null> {
    await delay(300);
    const user = db.users.find(u => u.email === email);
    
    if (user && password_used === 'password') {
        const token = generateToken(user);
        localStorage.setItem(JWT_KEY, token);
        return deepClone(user);
    }
    throw new Error('Invalid email or password.');
}

/**
 * Signs up a new user.
 * @example
 * // Real API Request:
 * // POST /api/v1/auth/signup
 * // Body: { "username": "JaneDoe", "email": "jane@example.com", "password": "..." }
 * // Response (201 Created): { "token": "...", "user": { ... } }
 * // Response (409 Conflict): { "error": "Email already in use" }
 */
export async function signup(username: string, email: string): Promise<User> {
    await delay(500);
    if (db.users.some(u => u.email === email)) {
        throw new Error("An account with this email already exists.");
    }

    const newUser: User = {
        id: Date.now(),
        name: username,
        email: email,
        password: 'password', // Default password for new mock users
        avatarUrl: `https://picsum.photos/seed/user${Date.now()}/200/200`,
        joinDate: new Date().toISOString().split('T')[0],
        stats: { booksRead: 0, chaptersRead: 0, favoriteGenres: [] },
        following: [],
        library: [],
        writtenBooks: [],
    };
    db.users.push(newUser);
    
    const token = generateToken(newUser);
    localStorage.setItem(JWT_KEY, token);

    return deepClone(newUser);
}

/**
 * Logs out the current user by clearing their session.
 * @example
 * // Real API Request:
 * // POST /api/v1/auth/logout
 * // Body: {}
 * // Response (204 No Content)
 */
export async function logout(): Promise<void> {
    await delay(100);
    localStorage.removeItem(JWT_KEY);
}

/**
 * Fetches the currently authenticated user's profile.
 * @example
 * // Real API Request:
 * // GET /api/v1/users/me
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "user": { ... } }
 * // Response (401 Unauthorized): { "error": "Not authenticated" }
 */
export async function getMe(): Promise<User | null> {
    await delay(50);
    try {
        const user = getAuthenticatedUser();
        return deepClone(user);
    } catch (error) {
        return null;
    }
}

/**
 * Changes the authenticated user's password.
 * @example
 * // Real API Request:
 * // PUT /api/v1/users/me/password
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "oldPassword": "...", "newPassword": "..." }
 * // Response (200 OK): { "user": { ... } }
 * // Response (403 Forbidden): { "error": "Incorrect password" }
 */
export async function changePassword(userId: number, oldPassword_unused: string, newPassword_unused: string): Promise<User> {
    await delay(400);
    const user = getAuthenticatedUser(); // Authorization check
    if (user.id !== userId) throw new Error("Forbidden");

    user.password = 'password'; 
    
    return deepClone(user);
}

// --- User API ---
/**
 * Updates the authenticated user's profile information.
 * @example
 * // Real API Request:
 * // PATCH /api/v1/users/me
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "name": "New Name", "avatarUrl": "..." }
 * // Response (200 OK): { "user": { ... } }
 */
export async function updateUserProfile(userId: number, updatedData: Partial<User>): Promise<User> {
    await delay(400);
    const user = getAuthenticatedUser();
     if (user.id !== userId) throw new Error("Forbidden");
    
    Object.assign(user, { ...updatedData, password: user.password });
    return deepClone(user);
}

// --- Book & Author Data API ---

/**
 * Fetches all available genres.
 * @example
 * // Real API Request:
 * // GET /api/v1/genres
 * // Response (200 OK): { "genres": ["High Fantasy", "Cyberpunk", ...] }
 */
export async function getGenres(): Promise<string[]> {
    await delay(100);
    const genres = new Set<string>();
    db.books.forEach(book => book.genres.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
}

/**
 * Fetches books with filtering and sorting options.
 * @example
 * // Real API Request:
 * // GET /api/v1/books?genres=Fantasy,Adventure&sortBy=rating&order=desc&limit=10
 * // Response (200 OK): { "books": [{...}, {...}] }
 */
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

/**
 * Fetches a single book by its ID.
 * @example
 * // Real API Request:
 * // GET /api/v1/books/1
 * // Response (200 OK): { "book": { ... } }
 * // Response (404 Not Found): { "error": "Book not found" }
 */
export async function getBookById(id: number): Promise<Book | null> {
    await delay(200);
    const allBooks = [...db.books, ...db.users.flatMap(u => u.writtenBooks || [])];
    const book = allBooks.find(b => b.id === id);
    return book ? deepClone(book) : null;
}

/**
 * Fetches an author by their ID.
 * @example
 * // Real API Request:
 * // GET /api/v1/authors/1
 * // Response (200 OK): { "author": { ... } }
 * // Response (404 Not Found): { "error": "Author not found" }
 */
export async function getAuthorById(id: number): Promise<Author | null> {
    await delay(150);
    const author = db.authors.find(a => a.id === id);
    return author ? deepClone(author) : null;
}

/**
 * Fetches all books written by a specific author.
 * @example
 * // Real API Request:
 * // GET /api/v1/authors/1/books?exclude=5
 * // Response (200 OK): { "books": [{...}, {...}] }
 */
export async function getBooksByAuthor(authorId: number, excludeBookId?: number): Promise<Book[]> {
    await delay(300);
    const allBooks = [...db.books, ...db.users.flatMap(u => u.writtenBooks || [])];
    let books = allBooks.filter(b => b.author.id === authorId);
    if (excludeBookId) {
        books = books.filter(b => b.id !== excludeBookId);
    }
    return deepClone(books);
}


// --- Library & Progress API ---
/**
 * Gets reading progress for a specific book for the current user.
 * @example
 * // Real API Request:
 * // GET /api/v1/users/me/progress/1
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "progress": { ... } }
 */
export async function getReadingProgressForBook(userId: number, bookId: number): Promise<BookProgress | null> {
    getAuthenticatedUser();
    await delay(50);
    return db.progress[userId]?.[bookId] ? deepClone(db.progress[userId][bookId]) : null;
}

/**
 * Gets all reading progress for the current user.
 * @example
 * // Real API Request:
 * // GET /api/v1/users/me/progress
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "progress": { "1": {...}, "7": {...} } }
 */
export async function getAllReadingProgress(userId: number): Promise<Record<number, BookProgress>> {
    getAuthenticatedUser();
    await delay(50);
    return db.progress[userId] ? deepClone(db.progress[userId]) : {};
}

/**
 * Saves reading progress for the current user.
 * @example
 * // Real API Request:
 * // PUT /api/v1/users/me/progress
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "bookId": 1, "chapterIndex": 2, "scrollPosition": 1500, "contentHeight": 5000 }
 * // Response (204 No Content)
 */
export async function saveReadingProgress(userId: number, book: Book, chapterIndex: number, scrollPosition: number, contentHeight: number): Promise<void> {
    getAuthenticatedUser();
    await delay(20); // Make saving fast
    if (!db.progress[userId]) {
        db.progress[userId] = {};
    }

    const bookProgress: BookProgress = db.progress[userId][book.id] || {
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

    const publishedChapters = book.chapters.filter(c => c.status === 'published');
    const totalProgress = publishedChapters.reduce((sum, chap) => sum + (bookProgress.chapters[chap.id]?.progress || 0), 0);
    bookProgress.overallProgress = publishedChapters.length > 0 ? Math.round(totalProgress / publishedChapters.length) : 0;
    
    db.progress[userId][book.id] = bookProgress;
}

/**
 * Clears reading progress for a specific book.
 * @example
 * // Real API Request:
 * // DELETE /api/v1/users/me/progress/1
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (204 No Content)
 */
export async function clearReadingProgress(userId: number, bookId: number): Promise<void> {
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");
    await delay(200);
    if (db.progress[userId]?.[bookId]) {
        delete db.progress[userId][bookId];
    }
}

/**
 * Adds or removes a book from the user's library.
 * @example
 * // Real API Request (Add):
 * // POST /api/v1/users/me/library
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "bookId": 1 }
 * // Response (200 OK): { "user": { ... } }
 *
 * // Real API Request (Remove):
 * // DELETE /api/v1/users/me/library/1
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "user": { ... } }
 */
export async function toggleBookInLibrary(userId: number, book: Book): Promise<User> {
    await delay(300);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");
    
    const isBookInLibrary = user.library.some(shelf => shelf.books.some(b => b.id === book.id));

    if (isBookInLibrary) {
        user.library.forEach(shelf => {
            shelf.books = shelf.books.filter(b => b.id !== book.id);
        });
    } else {
        const newLibraryBook: LibraryBook = { ...book, progress: 0, addedDate: new Date().toISOString().split('T')[0] };
        if (user.library.length === 0) {
            user.library.push({ id: 1, name: 'My Library', books: [newLibraryBook] });
        } else {
            user.library[0].books.unshift(newLibraryBook);
        }
    }
    return deepClone(user);
}
export async function removeBookFromLibrary(userId: number, bookId: number): Promise<User> {
    await delay(300);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");
    
    user.library.forEach(shelf => {
        shelf.books = shelf.books.filter(b => b.id !== bookId);
    });
    
    if (db.progress[userId]?.[bookId]) {
        delete db.progress[userId][bookId];
    }

    return deepClone(user);
}

// --- Reviews API ---
/**
 * Fetches all reviews for a specific book.
 * @example
 * // Real API Request:
 * // GET /api/v1/books/1/reviews
 * // Response (200 OK): { "reviews": [{...}, {...}] }
 */
export async function getBookReviews(bookId: number): Promise<Review[]> {
    await delay(250);
    return deepClone(db.reviews.filter(r => r.bookId === bookId));
}

/**
 * Submits a new review or updates an existing one for a book.
 * @example
 * // Real API Request:
 * // POST /api/v1/books/1/reviews
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "rating": 5, "comment": "Amazing!" }
 * // Response (201 Created or 200 OK): { "reviews": [...] }
 */
export async function submitReview(userId: number, bookId: number, rating: number, comment: string): Promise<Review[]> {
    await delay(400);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");

    const existingReviewIndex = db.reviews.findIndex(r => r.userId === userId && r.bookId === bookId);
    
    if (existingReviewIndex !== -1) { // Update existing
        db.reviews[existingReviewIndex] = { ...db.reviews[existingReviewIndex], rating, comment, date: new Date().toISOString().split('T')[0] };
    } else { // Create new
        const newReview: Review = {
            id: Date.now(),
            bookId,
            userId,
            user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
            rating,
            comment,
            date: new Date().toISOString().split('T')[0],
            sentiment: 'neutral',
        };
        db.reviews.unshift(newReview);
    }
    return deepClone(db.reviews.filter(r => r.bookId === bookId));
}

/**
 * Deletes a user's review for a book.
 * @example
 * // Real API Request:
 * // DELETE /api/v1/reviews/123
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "reviews": [...] } (updated list for the book)
 */
export async function deleteReview(userId: number, bookId: number): Promise<Review[]> {
    await delay(400);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");
    
    db.reviews = db.reviews.filter(r => !(r.userId === userId && r.bookId === bookId));
    return deepClone(db.reviews.filter(r => r.bookId === bookId));
}


// --- Writer API ---
/**
 * Creates a new book for the authenticated user.
 * @example
 * // Real API Request:
 * // POST /api/v1/books
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "title": "New Book", "description": "...", "genres": [...] }
 * // Response (201 Created): { "user": { ... } } (with updated writtenBooks)
 */
export async function createBook(userId: number, bookData: Omit<Book, 'id'|'author'|'publicationStatus'|'readingStatus'|'chapters'|'rating'|'reviewsCount'>): Promise<User> {
    await delay(600);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");

    const newBook: Book = {
        id: Date.now(),
        author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: '' },
        publicationStatus: 'draft',
        readingStatus: 'Ongoing',
        chapters: [],
        rating: 0,
        reviewsCount: 0,
        ...bookData,
    };
    
    if (!user.writtenBooks) user.writtenBooks = [];
    user.writtenBooks.push(newBook);

    db.books.push(newBook); // Also add to global books list
    
    return deepClone(user);
}

/**
 * Unpublishes a book, moving it back to drafts.
 * @example
 * // Real API Request:
 * // POST /api/v1/books/1/unpublish
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "user": { ... } }
 */
export async function unpublishBook(userId: number, bookId: number): Promise<User> {
    await delay(300);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");

    const book = user.writtenBooks?.find(b => b.id === bookId);
    if (book) {
        book.publicationStatus = 'draft';
        delete book.publishedDate;
        book.chapters.forEach(c => c.status = 'draft');
    }
    return deepClone(user);
}

/**
 * Toggles the publication status of a single chapter.
 * @example
 * // Real API Request:
 * // POST /api/v1/chapters/101/toggle-publish
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Response (200 OK): { "user": { ... } }
 */
export async function toggleChapterPublication(userId: number, bookId: number, chapterId: number): Promise<User> {
    await delay(200);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");
    
    const book = user.writtenBooks?.find(b => b.id === bookId);
    if (!book) throw new Error("Book not found");
    
    const chapter = book.chapters.find(c => c.id === chapterId);
    if (!chapter) throw new Error("Chapter not found");

    chapter.status = chapter.status === 'published' ? 'draft' : 'published';
    
    const hasPublishedChapters = book.chapters.some(c => c.status === 'published');
    if (book.publicationStatus === 'draft' && hasPublishedChapters) {
        book.publicationStatus = 'published';
        book.publishedDate = new Date().toISOString().split('T')[0];
    } else if (book.publicationStatus === 'published' && !hasPublishedChapters) {
        book.publicationStatus = 'draft';
        delete book.publishedDate;
    }
    
    return deepClone(user);
}

/**
 * Saves a chapter's content (creates or updates).
 * @example
 * // Real API Request (Update):
 * // PUT /api/v1/chapters/101
 * // Headers: { "Authorization": "Bearer <token>" }
 * // Body: { "title": "...", "content": "...", "status": "draft" }
 * // Response (200 OK): { "user": { ... } }
 *
 * // Real API Request (Create):
 * // POST /api/v1/books/1/chapters
 * // Body: { "title": "...", "content": "...", "status": "published" }
 * // Response (201 Created): { "user": { ... } }
 */
export async function saveChapter(userId: number, bookId: number, chapterId: number | 'new', data: { title: string, content: string }, status: 'draft' | 'published'): Promise<User> {
    await delay(500);
    const user = getAuthenticatedUser();
    if (user.id !== userId) throw new Error("Forbidden");

    const book = user.writtenBooks?.find(b => b.id === bookId);
    if (!book) throw new Error("Book not found");

    const wordCount = data.content.split(/\s+/).filter(Boolean).length;

    if (chapterId === 'new') {
        const newChapter: Chapter = {
            id: Date.now(),
            title: data.title || 'Untitled Chapter',
            content: data.content,
            wordCount,
            status,
        };
        book.chapters.push(newChapter);
    } else {
        const chapterIndex = book.chapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) throw new Error("Chapter not found");
        book.chapters[chapterIndex] = {
            ...book.chapters[chapterIndex],
            title: data.title,
            content: data.content,
            wordCount,
            status,
        };
    }

    if (status === 'published' && book.publicationStatus === 'draft') {
        book.publicationStatus = 'published';
        book.publishedDate = new Date().toISOString().split('T')[0];
    }
    
    return deepClone(user);
}
