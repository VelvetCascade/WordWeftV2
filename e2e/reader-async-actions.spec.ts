import { test, expect, type Page } from './fixtures';

const bookId = 'reader-async-story';
const chapters = ['Before the crossing', 'Beyond the crossing'].map((title, index) => ({
    id: `reader-async-chapter-${index + 1}`, title, status: 'published', wordCount: 30,
    viewCount: 0, likesCount: 0, commentCount: 1, isLiked: false, contentWarnings: [],
}));
const passages = ['The first chapter follows the river.', 'The second chapter reaches the far shore.'];
const commentTexts = ['A thought about the river.', 'A thought about the far shore.'];
const book = {
    id: bookId, title: 'An asynchronous crossing', summary: 'A story for reader response ordering.',
    author: { id: 'reader-async-writer', name: 'Async Writer', avatarUrl: '/favicon.svg', bio: '' },
    coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published',
    readingStatus: 'Ongoing', ageRating: 'ALL_AGES', rating: 0, reviewsCount: 0,
    viewCount: 0, likesCount: 0, commentCount: 2, chapters,
};

function deferredResponse() {
    let release!: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; });
    return { promise, release };
}

async function interceptReaderApi(page: Page, delayed: {
    comments?: { promise: Promise<void>; pending: () => void };
    like?: { promise: Promise<void>; pending: () => void };
    commentsFail?: () => boolean;
} = {}) {
    const user = {
        id: 'reader-async-account', username: 'Async Reader', email: 'async@example.test',
        avatarUrl: '/favicon.svg', library: [], writtenBooks: [], hasSeenWritingDemo: true,
    };
    await page.addInitScript(() => {
        localStorage.setItem('wordweft_jwt', 'reader-async-token');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    // Keep the metadata/content split real; no chapter body exists in the book response.
    // Every account, analytics, view and progress request stays inside this browser fixture.
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: user });
        if (path === `/api/books/${bookId}`) return route.fulfill({ json: book });
        const selectedIndex = chapters.findIndex(chapter => path.startsWith(`/api/books/${bookId}/chapters/${chapter.id}/`));
        if (selectedIndex >= 0) {
            const chapter = chapters[selectedIndex];
            if (path.endsWith('/content')) return route.fulfill({ json: {
                bookId, bookTitle: book.title, chapterId: chapter.id, chapterTitle: chapter.title,
                chapterIndex: selectedIndex, access: 'FULL', content: `<p>${passages[selectedIndex]}</p>`,
                previewWordCount: 30, fullWordCount: 30,
            } });
            if (path.endsWith('/comments')) {
                if (route.request().method() === 'POST') {
                    const { content, paragraphIndex, parentId } = route.request().postDataJSON();
                    return route.fulfill({ json: {
                        id: 'reader-async-posted-comment', bookId, chapterId: chapter.id,
                        paragraphIndex, parentId, content, createdAt: '2026-01-02T00:00:00Z',
                        userId: user.id, user: { id: user.id, name: user.username, avatarUrl: user.avatarUrl },
                    } });
                }
                if (delayed.commentsFail?.()) return route.fulfill({
                    status: 503, json: { message: 'Chapter comments are temporarily unavailable.' },
                });
                if (selectedIndex === 0 && delayed.comments) {
                    delayed.comments.pending();
                    await delayed.comments.promise;
                }
                return route.fulfill({ json: [{
                    id: `reader-async-comment-${selectedIndex}`, bookId, chapterId: chapter.id,
                    paragraphIndex: null, parentId: null, content: commentTexts[selectedIndex],
                    createdAt: '2026-01-01T00:00:00Z', userId: user.id,
                    user: { id: user.id, name: user.username, avatarUrl: user.avatarUrl },
                }] });
            }
            if (path.endsWith('/like') && selectedIndex === 0 && delayed.like) {
                delayed.like.pending();
                await delayed.like.promise;
                return route.fulfill({ status: 503, json: { message: 'The earlier chapter like could not be saved.' } });
            }
        }
        if (path.startsWith('/api/reading/progress')) return route.fulfill({ json: null });
        if (path === '/api/notifications/unread-count') return route.fulfill({ json: 0 });
        if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], hasNext: false } });
        if (path === '/api/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: '' });
        return route.fulfill({ json: [] });
    });
}

async function openFirstChapter(page: Page) {
    await page.goto(`/book/${bookId}/chapter/${chapters[0].id}`);
    await expect(page.locator('.reader-copy')).toHaveText(passages[0]);
}

async function selectChapter(page: Page, index: number) {
    await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
    await page.getByRole('dialog', { name: 'Chapters', exact: true })
        .getByRole('button', { name: new RegExp(chapters[index].title) }).click();
    await expect(page).toHaveURL(new RegExp(`/book/${bookId}/chapter/${chapters[index].id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapters[index].title);
    await expect(page.locator('.reader-copy')).toHaveText(passages[index]);
}

test('an earlier chapter comments response cannot replace the selected chapter discussion', async ({ page }) => {
    const earlierComments = deferredResponse();
    let commentsPending = false;
    await interceptReaderApi(page, { comments: {
        promise: earlierComments.promise, pending: () => { commentsPending = true; },
    } });
    try {
        await openFirstChapter(page);
        await expect.poll(() => commentsPending).toBe(true);
        await selectChapter(page, 1);
        const discussion = page.locator('.reader-discussion');
        await expect(discussion).toContainText(commentTexts[1]);

        const earlierResponse = page.waitForResponse(response => response.url().endsWith(`/chapters/${chapters[0].id}/comments`));
        earlierComments.release();
        await (await earlierResponse).finished();
        // Give the delivered response's promise continuation and React commit a browser frame.
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        await expect(discussion).toContainText(commentTexts[1]);
        await expect(discussion).not.toContainText(commentTexts[0]);
    } finally {
        earlierComments.release();
    }
});

test('a failed earlier chapter like preserves the selected chapter manuscript', async ({ page }) => {
    const earlierLike = deferredResponse();
    let likePending = false;
    await interceptReaderApi(page, { like: {
        promise: earlierLike.promise, pending: () => { likePending = true; },
    } });
    try {
        await openFirstChapter(page);
        await page.locator('.reader-end-secondary-actions').getByRole('button', { name: /Like chapter/ }).click();
        await expect.poll(() => likePending).toBe(true);
        await selectChapter(page, 1);

        const earlierResponse = page.waitForResponse(response => response.url().endsWith(`/chapters/${chapters[0].id}/like`));
        earlierLike.release();
        await (await earlierResponse).finished();
        await expect(page.locator('.reader-end-secondary-actions').getByRole('button', { name: /Like chapter/ })).toBeEnabled();
        await expect(page.locator('.reader-copy')).toHaveText(passages[1]);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapters[1].title);
        await expect(page).toHaveURL(new RegExp(`/book/${bookId}/chapter/${chapters[1].id}$`));
        await selectChapter(page, 0);
        const originalLike = page.locator('.reader-end-secondary-actions').getByRole('button', { name: /^Like chapter/ });
        await expect(originalLike).toBeEnabled();
        await expect(originalLike.locator('small')).toHaveText('0');
    } finally {
        earlierLike.release();
    }
});

test('a comments loading failure keeps the manuscript readable and can retry inside chapter discussion', async ({ page }) => {
    let commentsFail = true;
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await interceptReaderApi(page, { commentsFail: () => commentsFail });
    const failedResponse = page.waitForResponse(response =>
        response.url().endsWith(`/chapters/${chapters[0].id}/comments`) && response.status() === 503);
    await openFirstChapter(page);
    await (await failedResponse).finished();
    await expect(page.locator('.reader-copy')).toHaveText(passages[0]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapters[0].title);

    await page.locator('.reader-end-secondary-actions').getByRole('button', { name: /^Discuss/ }).click();
    const discussion = page.getByRole('dialog', { name: 'Chapter Comments', exact: true });
    await expect(discussion).toBeVisible();
    await expect(discussion.getByRole('alert')).toContainText('Chapter comments are temporarily unavailable.');
    const retry = discussion.getByRole('button', { name: 'Retry comments', exact: true });
    await expect(retry).toBeEnabled();

    commentsFail = false;
    await retry.click();
    await expect(discussion.getByText(commentTexts[0], { exact: true })).toBeVisible();
    await expect(discussion.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.reader-copy')).toHaveText(passages[0]);
    expect(pageErrors).toEqual([]);
});

test('an older comments snapshot retains a comment successfully posted while the load was pending', async ({ page }) => {
    const earlierComments = deferredResponse();
    let commentsPending = false;
    await interceptReaderApi(page, { comments: {
        promise: earlierComments.promise, pending: () => { commentsPending = true; },
    } });
    try {
        await openFirstChapter(page);
        await expect.poll(() => commentsPending).toBe(true);
        await page.locator('.reader-end-secondary-actions').getByRole('button', { name: /^Discuss/ }).click();
        const discussion = page.getByRole('dialog', { name: 'Chapter Comments', exact: true });
        await expect(discussion.getByRole('status')).toHaveText('Loading comments…');

        const newComment = 'A new thought posted before the old snapshot arrives.';
        const draft = discussion.getByLabel('Your comment', { exact: true });
        await draft.fill(newComment);
        const post = discussion.getByRole('button', { name: 'Post Comment', exact: true });
        await expect(post).toBeEnabled();
        const postedResponse = page.waitForResponse(response => response.request().method() === 'POST'
            && response.url().endsWith(`/chapters/${chapters[0].id}/comments`));
        await post.click();
        expect((await postedResponse).ok()).toBe(true);
        await expect(draft).toHaveValue('');
        // Successful writing must remain available even while the initial read is pending.
        await expect(discussion.getByRole('status')).toHaveText('Loading comments…');
        await expect(discussion.getByText(newComment, { exact: true })).toBeVisible();

        const earlierResponse = page.waitForResponse(response => response.request().method() === 'GET'
            && response.url().endsWith(`/chapters/${chapters[0].id}/comments`));
        earlierComments.release();
        await (await earlierResponse).finished();
        await expect(discussion.getByRole('status')).toHaveCount(0);
        await expect(discussion.getByText(commentTexts[0], { exact: true })).toBeVisible();
        await expect(discussion.getByText(newComment, { exact: true })).toBeVisible();
        await expect(discussion.getByText(newComment, { exact: true })).toHaveCount(1);
    } finally {
        earlierComments.release();
    }
});
