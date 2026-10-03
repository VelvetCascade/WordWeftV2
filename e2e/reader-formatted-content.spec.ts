import { test, expect } from './fixtures';

const storyId = 'formatted-reader-story';
const chapterId = 'formatted-reader-chapter';
const content = '<h2 class="chapter-heading" style="text-align: center">A centered beginning</h2>' +
    '<p class="authored-paragraph" style="text-align: justify; margin-left: 12px">A carefully formatted paragraph with <span style="font-style: italic">an italic thought</span>.</p>' +
    '<blockquote style="border-left: 3px solid rgb(107, 67, 47)"><p style="text-align: right">A remembered line.</p></blockquote>' +
    '<ul style="list-style-type: square"><li>A first idea</li><li>A second idea</li></ul>';
const story = {
    id: storyId, title: 'A formatted story', summary: 'A reader formatting regression.', description: 'A reader formatting regression.',
    author: { id: 'formatted-writer', name: 'Format Writer', avatarUrl: '/favicon.svg', bio: '' },
    coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published', readingStatus: 'Ongoing',
    ageRating: 'ALL_AGES', rating: 0, reviewsCount: 0, viewCount: 0, likesCount: 0, commentCount: 0,
    chapters: [{ id: chapterId, title: 'A styled chapter', status: 'published', wordCount: 80, viewCount: 0, commentCount: 0, likesCount: 0, isLiked: false, contentWarnings: [] }],
};

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === `/api/books/${storyId}`) return route.fulfill({ json: story });
        if (path.endsWith('/content')) return route.fulfill({ json: {
            bookId: storyId, chapterId, chapterIndex: 0, content, access: 'PREVIEW', obfuscated: false,
            fullWordCount: 80, visibleWordCount: 80,
        } });
        return route.fulfill({ json: [] });
    });
});

test('styled manuscript blocks render without the page error and retain authored formatting', async ({ page }) => {
    await page.goto(`/book/${storyId}/chapter/${chapterId}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    await expect(page.locator('.reader-copy h2')).toHaveCSS('text-align', 'center');
    await expect(page.locator('.reader-copy h2')).toHaveClass(/chapter-heading/);
    await expect(page.locator('.reader-copy .authored-paragraph')).toHaveCSS('text-align', 'justify');
    await expect(page.locator('.reader-copy .authored-paragraph')).toHaveCSS('margin-left', '12px');
    await expect(page.locator('.reader-copy blockquote p')).toHaveCSS('text-align', 'right');
    await expect(page.locator('.reader-copy li')).toHaveCount(2);
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
});

test('a phone reader can open a styled chapter and return through story details on one tap', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === `/api/books/${storyId}`) return route.fulfill({ json: story });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: storyId, chapterId, chapterIndex: 0, content, access: 'PREVIEW', obfuscated: false, fullWordCount: 80, visibleWordCount: 80 } });
        return route.fulfill({ json: [] });
    });
    await page.goto(`/book/${storyId}`);
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByRole('button', { name: 'Read from beginning', exact: true }).tap();
        await expect(page.locator('.reader-copy')).toBeVisible();
        await page.getByRole('button', { name: `Back to ${story.title}`, exact: true }).tap();
        await expect(page.locator('.ww-story-read-action')).toBeVisible();
    }
    await page.locator('.ww-story-back').tap();
    await expect(page).toHaveURL(/\/category$/);
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
    await context.close();
});
