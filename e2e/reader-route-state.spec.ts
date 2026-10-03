import { test, expect } from './fixtures';

test('a delayed account refresh preserves the selected chapter and open reading preferences', async ({ page }) => {
    const bookId = 'reader-route-story';
    const chapters = ['Before the crossing', 'Beyond the crossing'].map((title, index) => ({
        id: `reader-route-chapter-${index + 1}`, title, status: 'published', wordCount: 600,
        viewCount: 0, likesCount: 0, commentCount: 0, isLiked: false, contentWarnings: [],
    }));
    const book = {
        id: bookId, title: 'The crossing', summary: 'A story for reader navigation.',
        author: { id: 'reader-route-writer', name: 'Route Writer', avatarUrl: '/favicon.svg', bio: '' },
        coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published',
        readingStatus: 'Ongoing', ageRating: 'ALL_AGES', rating: 0, reviewsCount: 0,
        viewCount: 0, likesCount: 0, commentCount: 0, chapters,
    };
    const user = {
        id: 'reader-route-account', username: 'Route Reader', email: 'route@example.test',
        avatarUrl: '/favicon.svg', library: [], writtenBooks: [], hasSeenWritingDemo: true,
    };
    let holdAccountRefresh = false;
    let accountRefreshPending = false;
    let releaseAccountRefresh!: () => void;
    const accountRefreshGate = new Promise<void>(resolve => { releaseAccountRefresh = resolve; });

    await page.addInitScript(() => {
        localStorage.setItem('wordweft_jwt', 'reader-route-token');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    // All account and progress writes stay inside this disposable browser fixture.
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') {
            if (!holdAccountRefresh) return route.fulfill({ json: user });
            accountRefreshPending = true;
            await accountRefreshGate;
            return route.fulfill({ json: {
                ...user, library: [{ id: 'all', name: 'My List', books: [book] }],
            } });
        }
        if (path === `/api/books/${bookId}`) return route.fulfill({ json: book });
        const selectedIndex = chapters.findIndex(chapter => path === `/api/books/${bookId}/chapters/${chapter.id}/content`);
        if (selectedIndex >= 0) {
            const chapter = chapters[selectedIndex];
            const content = Array.from({ length: 30 }, (_, index) =>
                `<p>${chapter.title}, passage ${index + 1}. The path follows the river until the stones give way to the open sky.</p>`).join('');
            return route.fulfill({ json: {
                bookId, bookTitle: book.title, chapterId: chapter.id, chapterTitle: chapter.title,
                chapterIndex: selectedIndex, access: 'FULL', content, previewWordCount: 600, fullWordCount: 600,
            } });
        }
        if (path.startsWith('/api/reading/progress')) return route.fulfill({ json: null });
        if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
        if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
        if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
        return route.fulfill({ json: [] });
    });

    try {
        await page.goto(`/book/${bookId}/chapter/${chapters[0].id}`);
        await expect(page.locator('.reader-copy')).toContainText('Before the crossing, passage 1.');
        holdAccountRefresh = true;
        await page.locator('#paragraph-20').scrollIntoViewIfNeeded();
        // A real progress save starts the account refresh; hold only its response.
        await expect.poll(() => accountRefreshPending).toBe(true);

        await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
        await page.getByRole('dialog', { name: 'Chapters', exact: true })
            .getByRole('button', { name: /Beyond the crossing/ }).click();
        const nextPath = `/book/${bookId}/chapter/${chapters[1].id}`;
        await expect(page).toHaveURL(new RegExp(`${nextPath}$`));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapters[1].title);
        await page.getByRole('button', { name: 'Reading appearance and themes', exact: true }).click();
        const preferences = page.getByRole('dialog', { name: 'Reading preferences', exact: true });
        await expect(preferences).toBeVisible();

        releaseAccountRefresh();
        // This changed library control proves React consumed the delayed account response.
        await expect(page.getByRole('button', { name: 'Remove story from library', exact: true })).toBeVisible();
        await expect.soft(page).toHaveURL(new RegExp(`${nextPath}$`));
        await expect.soft(page.getByRole('heading', { level: 1 })).toHaveText(chapters[1].title);
        await expect.soft(preferences).toBeVisible();
    } finally {
        releaseAccountRefresh();
    }
});
