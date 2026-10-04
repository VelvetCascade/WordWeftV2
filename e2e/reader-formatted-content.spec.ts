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

test('corrupted optional reading tips cannot interrupt a chapter', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ww_reader_coach_dismissed', '{broken'));
    await page.goto(`/book/${storyId}/chapter/${chapterId}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'This screen could not open' })).toHaveCount(0);
});

test('unchanged nested quotes and lists reopen their saved outer passage without comment control text', async ({ page }) => {
    const nestedContent = '<blockquote><p>First line</p><p>Second line</p></blockquote><ul><li>First item</li><li>Second item</li></ul><p>Adjacent <em>inline</em>text<br>Next line</p>';
    const bookmarks = [
        { id: 'nested-quote', bookId: storyId, chapterId, paragraphIndex: 0, quote: 'First line Second line', note: 'Keep the quotation' },
        { id: 'nested-list', bookId: storyId, chapterId, paragraphIndex: 3, quote: 'First item Second item', note: 'Keep the list' },
        { id: 'nested-inline', bookId: storyId, chapterId, paragraphIndex: 4, quote: 'Adjacent inlinetext Next line', note: 'Keep inline adjacency and a line break' },
    ];
    await page.addInitScript(() => localStorage.setItem('wordweft_jwt', 'nested-reader-token'));
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/users/me') return route.fulfill({ json: { id: 'nested-reader', username: 'Nested Reader', avatarUrl: '/favicon.svg', library: [], writtenBooks: [], following: [], hasSeenWritingDemo: true } });
        if (path === `/api/reading/passages/${storyId}`) return route.fulfill({ json: bookmarks });
        if (path.endsWith('/content')) return route.fulfill({ json: { bookId: storyId, chapterId, chapterIndex: 0, content: nestedContent, access: 'FULL', obfuscated: false, fullWordCount: 8, visibleWordCount: 8 } });
        if (path.endsWith('/comments')) return route.fulfill({ json: [{ id: 'nested-comment', chapterId, paragraphIndex: 1, parentId: null, content: 'A thought about the first line', user: { id: 'nested-reader', name: 'Nested Reader', avatarUrl: '/favicon.svg' }, createdAt: '2026-10-03T10:00:00Z' }] });
        return route.fallback();
    });
    await page.goto(`/book/${storyId}/chapter/${chapterId}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    await expect(page.locator('#paragraph-1 > .reader-comment-button')).toContainText('1');
    const trigger = page.locator('.reader-header-actions').getByRole('button', { name: 'Open saved passages and find in chapter', exact: true });
    const tools = page.getByRole('dialog', { name: 'Passages & find' });
    for (const bookmark of bookmarks) {
        await trigger.click();
        await tools.locator('.reader-saved-passage').filter({ hasText: bookmark.note }).getByRole('button').first().click();
        await expect(page.locator(`#paragraph-${bookmark.paragraphIndex}`)).toBeFocused();
    }
    await trigger.click();
    await tools.getByLabel('Find in this chapter').fill('First line Second line');
    await expect(tools.getByRole('status')).toContainText('1 passage matches');
    await expect(tools.locator('.reader-find-results button')).toContainText('First line Second line');
});

for (const readingStatus of ['Ongoing', 'Completed']) test(`the final released ${readingStatus.toLowerCase()} chapter offers relevant next actions`, async ({ page }) => {
    await page.route(`**/api/books/${storyId}`, route => route.fulfill({ json: { ...story, readingStatus } }));
    await page.route('**/api/books/*/chapters/*/content', route => route.fulfill({ json: {
        bookId: storyId, chapterId, chapterIndex: 0, content, access: 'FULL', obfuscated: false, fullWordCount: 80, visibleWordCount: 80,
    } }));
    await page.goto(`/book/${storyId}/chapter/${chapterId}`);
    await expect(page.locator('.reader-copy')).toBeVisible();
    const ending = page.locator('.reader-ending-context');
    if (readingStatus === 'Ongoing') {
        await expect(ending.getByRole('button', { name: 'Follow writer for new releases', exact: true })).toBeVisible();
        await expect(ending).toContainText('The writer has not announced the next release yet.');
        await expect(ending.getByRole('link', { name: 'Rate or review this story' })).toHaveCount(0);
    } else {
        await expect(ending.getByRole('link', { name: 'Rate or review this story', exact: true })).toHaveAttribute('href', `/book/${storyId}`);
        await expect(ending.getByRole('link', { name: 'Find your next story', exact: true })).toHaveAttribute('href', '/category');
        await expect(ending.getByRole('button', { name: 'Follow writer for new releases' })).toHaveCount(0);
    }
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
