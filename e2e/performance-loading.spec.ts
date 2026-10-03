import { test, expect } from './fixtures';

const bookId = 'performance-story';
const book = {
    id: bookId, title: 'A changing shelf', summary: 'A story for loading checks.', description: 'A story for loading checks.',
    author: { id: 'performance-writer', name: 'Performance Writer', avatarUrl: '/favicon.svg', bio: '' },
    coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published', readingStatus: 'Ongoing',
    ageRating: 'ALL_AGES', rating: 0, reviewsCount: 0, viewCount: 0, likesCount: 0, commentCount: 0,
    chapters: [{ id: 'performance-chapter', title: 'An opening', status: 'published', wordCount: 50, content: '',
        viewCount: 0, likesCount: 0, commentCount: 0, isLiked: false, contentWarnings: [] }],
};

test('library mutations update book details without replacing the story or repeating its reads', async ({ page }) => {
    const user = { id: 'performance-reader', username: 'Performance Reader', email: 'performance@example.test',
        avatarUrl: '/favicon.svg', joinDate: '2025-01-01', library: [
            { id: 'all', name: 'My List', books: [] as typeof book[] },
            { id: 'custom', name: 'Favourites', books: [] as typeof book[] },
        ], writtenBooks: [], hasSeenWritingDemo: true };
    const reads: string[] = [];
    let mutations = 0;
    await page.addInitScript(() => {
        localStorage.setItem('wordweft_jwt', 'performance-token');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const method = route.request().method();
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: user });
        if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
        if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
        if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
        if (method !== 'GET' && path.startsWith('/api/library')) {
            mutations++;
            if (path.endsWith('/toggle')) user.library[0].books = [book];
            else if (path.endsWith('/shelves')) {
                const { shelfIds } = route.request().postDataJSON();
                user.library.forEach(shelf => { shelf.books = shelfIds.includes(shelf.id) ? [book] : []; });
            } else if (method === 'DELETE') user.library.forEach(shelf => { shelf.books = []; });
            return route.fulfill({ json: user });
        }
        reads.push(path);
        if (path === `/api/books/${bookId}`) return route.fulfill({ json: book });
        if (path.startsWith('/api/books/author/')) return route.fulfill({ json: [book] });
        if (path.endsWith('/reviews')) return route.fulfill({ json: [] });
        if (path.startsWith('/api/reading/progress')) return route.fulfill({ json: null });
        return route.fulfill({ json: [] });
    });
    await page.goto(`/book/${bookId}`);
    const story = page.locator('.ww-story-v2');
    await expect(story).toBeVisible();
    await expect.poll(() => reads.some(path => path.startsWith('/api/books/author/'))).toBe(true);
    await expect.poll(() => reads.some(path => path.startsWith('/api/reading/progress'))).toBe(true);
    await story.evaluate(element => { element.setAttribute('data-loading-probe', 'retained'); });
    const initialReads = [...reads];

    await page.getByRole('button', { name: 'Add to library', exact: true }).click();
    await expect(page.getByRole('button', { name: 'In your library', exact: true })).toBeVisible();
    await expect(story).toHaveAttribute('data-loading-probe', 'retained');
    expect(reads).toEqual(initialReads);

    await page.getByRole('button', { name: 'Organize shelves', exact: true }).click();
    await page.getByRole('checkbox', { name: /Favourites/ }).check();
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Manage shelves' })).toBeHidden();
    await expect(story).toHaveAttribute('data-loading-probe', 'retained');
    expect(reads).toEqual(initialReads);
    await page.getByRole('button', { name: 'Organize shelves', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: /Favourites/ })).toBeChecked();
    await page.getByRole('button', { name: 'Remove from Library', exact: true }).click();
    await page.getByRole('button', { name: 'Remove story', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add to library', exact: true })).toBeVisible();
    await expect(story).toHaveAttribute('data-loading-probe', 'retained');
    expect(reads).toEqual(initialReads);
    expect(mutations).toBe(3);
});

for (const change of ['account', 'mature preference', 'date of birth'] as const) {
    test(`book details hide the prior access result while the ${change} changes`, async ({ page }) => {
        const user = { id: 'performance-reader', username: 'Performance Reader', email: 'performance@example.test',
            avatarUrl: '/favicon.svg', library: [], writtenBooks: [], allowMatureContent: true, dateOfBirth: '1995-01-01' };
        const privateChapter = { ...book.chapters[0], id: 'private-chapter', title: 'An access-dependent chapter', status: 'draft' };
        let changed = false;
        let refreshed = false;
        let release!: () => void;
        const pending = new Promise<void>(resolve => { release = resolve; });
        await page.addInitScript(() => {
            localStorage.setItem('wordweft_jwt', 'performance-token');
            localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
            localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        });
        await page.route('**/api/**', async route => {
            const path = new URL(route.request().url()).pathname;
            if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
            if (path === '/api/users/me') return route.fulfill({ json: user });
            if (path === '/api/library/toggle') {
                changed = true;
                return route.fulfill({ json: { ...user, library: [{ id: 'all', name: 'My List', books: [book] }],
                    ...(change === 'mature preference' ? { allowMatureContent: false } : { dateOfBirth: '2015-01-01' }) } });
            }
            if (path === `/api/books/${bookId}`) {
                if (changed) { refreshed = true; await pending; }
                return route.fulfill({ json: { ...book, chapters: changed ? book.chapters : [...book.chapters, privateChapter] } });
            }
            if (path.startsWith('/api/reading/progress')) return route.fulfill({ json: null });
            if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
            if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
            if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
            return route.fulfill({ json: [] });
        });
        await page.goto(`/book/${bookId}`);
        await expect(page.locator('.ww-story-v2')).toBeVisible();
        await expect(page.getByText('An access-dependent chapter', { exact: true }).first()).toBeVisible();
        if (change === 'account') {
            changed = true;
            await page.evaluate(() => {
                localStorage.removeItem('wordweft_jwt');
                window.dispatchEvent(new Event('wordweft:session-invalid'));
            });
        } else await page.getByRole('button', { name: 'Add to library', exact: true }).click();
        await expect.poll(() => refreshed).toBe(true);
        await expect(page.getByText('An access-dependent chapter', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Loading story details' })).toBeVisible();
        release();
        await expect(page.locator('.ww-story-v2')).toBeVisible();
        await expect(page.getByText('An access-dependent chapter', { exact: true })).toHaveCount(0);
    });
}

test('home requests only the seven stories shown and defers genre shelves until scrolling', async ({ page }) => {
    const catalogReads: URL[] = [];
    let genreShelfReads = 0;
    const stories = Array.from({ length: 7 }, (_, index) => ({ ...book, id: `home-story-${index}`, title: `Home story ${index}` }));
    await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (/\.[cm]?[jt]sx?$/.test(url.pathname)) return route.continue();
        if (url.pathname === '/api/books') {
            catalogReads.push(url);
            return route.fulfill({ json: { content: stories, hasMore: false, totalElements: 7, page: 0 } });
        }
        if (url.pathname === '/api/books/hero') return route.fulfill({ json: { stories: [], novels: [], poems: [] } });
        if (url.pathname === '/api/books/genres/ranked') return route.fulfill({ json: [{ name: 'Fantasy', bookCount: 7, readCount: 7 }] });
        if (url.pathname === '/api/books/home-genres') {
            genreShelfReads++;
            return route.fulfill({ json: { Fantasy: stories.slice(0, 6) } });
        }
        return route.fulfill({ json: [] });
    });
    await page.goto('/');
    await expect(page.locator('.v2-feature-story')).toHaveCount(3);
    await expect(page.locator('.v2-shelf-grid .ww-book-card')).toHaveCount(4);
    expect(catalogReads.every(url => url.searchParams.get('size') === '7')).toBe(true);
    expect(genreShelfReads).toBe(0);
    await page.locator('.v2-shelf').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Choose a shelf.', exact: true })).toBeVisible();
    await expect(page.locator('.v2-scroll-shelf .ww-book-card')).toHaveCount(6);
    expect(genreShelfReads).toBe(1);
});

for (const leaveEarly of [false, true]) {
    test(`writer comments bound chapter reads and ${leaveEarly ? 'stop queued work after leaving' : 'retain every conversation'}`, async ({ page }) => {
        const chapters = Array.from({ length: 12 }, (_, index) => ({ ...book.chapters[0], id: `comment-chapter-${index}`, title: `Chapter ${index}`, commentCount: 1 }));
        const user = { id: 'performance-writer', username: 'Performance Writer', email: 'performance@example.test',
            avatarUrl: '/favicon.svg', library: [], writtenBooks: [{ ...book, chapters }], hasSeenWritingDemo: true };
        let activeReads = 0;
        let maximumActiveReads = 0;
        let totalReads = 0;
        let release!: () => void;
        const pending = new Promise<void>(resolve => { release = resolve; });
        await page.addInitScript(() => {
            localStorage.setItem('wordweft_jwt', 'performance-token');
            localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
            localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        });
        await page.route('**/api/**', async route => {
            const path = new URL(route.request().url()).pathname;
            if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
            if (path === '/api/users/me') return route.fulfill({ json: user });
            if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
            if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
            if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
            if (path.endsWith('/comments')) {
                totalReads++;
                activeReads++;
                maximumActiveReads = Math.max(maximumActiveReads, activeReads);
                await pending;
                activeReads--;
                const chapterId = path.split('/').at(-2)!;
                return route.fulfill({ json: [{ id: `comment-${chapterId}`, bookId, chapterId, content: `Thoughts on ${chapterId}`,
                    createdAt: '2026-01-01T00:00:00Z', parentId: null, paragraphIndex: null, userId: 'comment-reader',
                    user: { id: 'comment-reader', name: 'Comment Reader', avatarUrl: '/favicon.svg' } }] });
            }
            return route.fulfill({ json: [] });
        });
        await page.goto('/write?view=comments');
        await expect(page.getByRole('heading', { name: 'Reader comments', exact: true })).toBeVisible();
        await expect.poll(() => totalReads).toBeGreaterThan(0);
        // The pending responses hold the first batch at the network boundary.
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(maximumActiveReads).toBeLessThanOrEqual(4);
        if (leaveEarly) {
            await page.evaluate(() => { window.location.hash = '/write?view=stories'; });
            await expect(page.getByRole('heading', { name: 'My stories', exact: true })).toBeVisible();
            const readsBeforeLeaving = totalReads;
            release();
            await expect.poll(() => activeReads).toBe(0);
            expect(totalReads).toBe(readsBeforeLeaving);
        } else {
            release();
            await expect(page.locator('.ww-studio-comment')).toHaveCount(12);
            expect(totalReads).toBe(12);
        }
    });
}
