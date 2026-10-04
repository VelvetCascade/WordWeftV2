import { test, expect } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const bookId = 'touch-journey-story';
const chapterId = 'touch-journey-chapter';
const chapter = { id: chapterId, title: 'A place to pause', status: 'published', wordCount: 900, viewCount: 0, likesCount: 0, commentCount: 1, isLiked: false, contentWarnings: [] };
const book = {
    id: bookId, title: 'The riverside', summary: 'A touch journey fixture.',
    author: { id: 'touch-writer', name: 'Touch Writer', avatarUrl: '/favicon.svg', bio: '' },
    coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published', readingStatus: 'Ongoing',
    ageRating: 'ALL_AGES', rating: 0, reviewsCount: 0, viewCount: 0, likesCount: 0, commentCount: 1, chapters: [chapter],
};
const user = { id: 'touch-writer', username: 'Touch Writer', email: 'touch@example.test', avatarUrl: '/favicon.svg', library: [], writtenBooks: [book], hasSeenWritingDemo: true };
const comment = { id: 'touch-comment', content: 'The river detail stayed with me.', createdAt: '2026-09-01T12:00:00Z', paragraphIndex: null, parentId: null, user: { id: 'touch-reader', name: 'Touch Reader', avatarUrl: '/favicon.svg' } };

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('wordweft_jwt', 'touch-journey-token');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        localStorage.setItem('ww_reader_coach_session', '10');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: user });
        if (path === `/api/books/${bookId}`) return route.fulfill({ json: book });
        if (path.endsWith('/content')) return route.fulfill({ json: {
            bookId, chapterId, chapterIndex: 0, access: 'FULL', fullWordCount: 900,
            content: Array.from({ length: 30 }, (_, index) => `<p>Passage ${index + 1}. The river carries the morning light through a quiet valley, beyond the bridge and into the open fields.</p>`).join(''),
        } });
        if (path.endsWith('/comments')) return route.fulfill({ json: [comment] });
        if (path.startsWith('/api/reading/progress')) return route.fulfill({ json: null });
        if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
        if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
        if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
        return route.fulfill({ json: [] });
    });
});

test('touch reading controls remain reachable after scrolling and open discussion on one tap', async ({ page }) => {
    await page.goto(`/book/${bookId}/chapter/${chapterId}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Let saved-position restoration complete before testing the user's scroll.
    await page.waitForTimeout(200);
    await page.locator('#paragraph-12').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    const controls = page.getByRole('navigation', { name: 'Reader controls', exact: true });
    await expect(controls).toBeInViewport();
    await page.getByRole('button', { name: 'Open chapter discussion', exact: true }).tap();
    const discussion = page.getByRole('dialog', { name: 'Story discussions', exact: true });
    await expect(discussion).toBeVisible();
    await expect(discussion).toContainText(comment.content);
    await discussion.getByRole('button', { name: 'Close discussion', exact: true }).tap();
    await expect(discussion).toBeHidden();

    const paragraph = page.locator('#paragraph-12');
    await paragraph.locator('p').tap();
    const paragraphComments = paragraph.getByRole('button', { name: 'Comment on this paragraph', exact: true });
    await expect(paragraphComments).toHaveCSS('pointer-events', 'auto');
    await paragraphComments.tap();
    const paragraphDiscussion = page.getByRole('dialog', { name: 'Passage 13', exact: true });
    await expect(paragraphDiscussion).toBeVisible();
    await paragraphDiscussion.getByRole('button', { name: 'Close discussion', exact: true }).tap();
    await page.getByRole('button', { name: 'More reader actions', exact: true }).tap();
    await page.getByRole('dialog', { name: 'Reader actions', exact: true }).getByRole('button', { name: 'Focus mode', exact: true }).tap();
    await expect(controls).toHaveCSS('opacity', '0');
    await expect(controls).toHaveCSS('pointer-events', 'none');
    await page.getByRole('button', { name: /^Exit focus/ }).tap();
    await expect(controls).toHaveCSS('opacity', '1');
    await expect(controls).toBeInViewport();
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
});

test('writer comments navigate on one tap and stay usable while conversations load', async ({ page }) => {
    let loading = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/books/*/chapters/*/comments', async route => {
        loading = true;
        await gate;
        await route.fulfill({ json: [comment] });
    });
    let documents = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    try {
        await page.goto('/write');
        const navigation = page.getByRole('navigation', { name: 'Writer studio', exact: true });
        await expect(page.getByRole('heading', { name: 'Writer studio', exact: true })).toBeVisible();
        await navigation.getByRole('link', { name: 'Comments', exact: true }).tap();
        await expect(page).toHaveURL(/\/write\?view=comments$/);
        await expect(page.getByRole('heading', { name: 'Reader comments', exact: true })).toBeVisible();
        await expect(page.getByRole('status')).toContainText('Loading reader conversations');
        await expect.poll(() => loading).toBe(true);
        release();
        await expect(page.locator('.ww-studio-comment-content')).toHaveText(comment.content);
        await page.getByRole('button', { name: 'Reply', exact: true }).tap();
        await expect(page.getByLabel('Your reply', { exact: true })).toBeVisible();
        await navigation.getByRole('link', { name: 'Overview', exact: true }).tap();
        await expect(page.getByRole('heading', { name: 'Writer studio', exact: true })).toBeVisible();
        expect(documents).toBe(1);
    } finally { release(); }
});
