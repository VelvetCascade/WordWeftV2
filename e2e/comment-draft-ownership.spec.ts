import { test, expect } from './fixtures';

for (const reply of [false, true]) test(`community pending ${reply ? 'reply' : 'comment'} keeps the submitted draft recoverable`, async ({ page, request }) => {
    const login = await request.post('/api/auth/login', { data: { email: 'reader@example.test', password: 'WordWeftLocal123!' } });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();
    await page.addInitScript(token => {
        localStorage.setItem('wordweft_jwt', token);
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    }, token);
    await page.route(/\/api\/community\/posts\/[^/]+\/comments(?:\?|$)/, async route => {
        if (route.request().method() !== 'GET') return route.fallback();
        const postId = new URL(route.request().url()).pathname.split('/')[4];
        return route.fulfill({ json: { items: [{ id: 'draft-comment', postId,
            author: { id: 'synthetic-author', name: 'Synthetic Author', avatarUrl: null, badges: [], following: false },
            parentCommentId: null, body: 'A synthetic comment for reply composition', likeCount: 0, liked: false,
            canEdit: false, canModerate: false, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }], nextCursor: null } });
    });
    await page.goto('/community');
    await page.locator('a[href*="/community/post/"]').first().click();
    if (reply) await page.locator('.community-comment-actions').getByRole('button', { name: 'Reply', exact: true }).first().click();
    const form = reply ? page.locator('.community-comment .community-comment-form').first() : page.locator('.community-comment-form').last();
    const textarea = form.locator('textarea');
    const original = 'A synthetic recoverable community thought';
    await textarea.fill(original);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let requests = 0;
    let fail = true;
    await page.route(/\/api\/community\/posts\/[^/]+\/comments(?:\?|$)/, async route => {
        if (route.request().method() !== 'POST') return route.fallback();
        requests++;
        await gate;
        if (fail) return route.fulfill({ status: 503, json: { message: 'Synthetic unavailable comment service' } });
        const { body, parentCommentId } = route.request().postDataJSON();
        return route.fulfill({ json: { id: 'retry-community-comment', postId: new URL(route.request().url()).pathname.split('/')[4],
            author: { id: 'synthetic-reader', name: 'Synthetic Reader', avatarUrl: null, badges: [], following: false },
            parentCommentId: parentCommentId || null, body, likeCount: 0, liked: false, canEdit: true, canModerate: false, status: 'ACTIVE',
            createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' } });
    });
    try {
        await form.getByRole('button', { name: reply ? 'Post reply' : 'Post comment', exact: true }).click();
        await expect(textarea).toHaveAttribute('readonly', '');
        await expect(form.getByRole('button', { name: 'Posting…', exact: true })).toBeDisabled();
        await textarea.focus();
        await page.keyboard.type(' a later unsent thought');
        await expect(textarea).toHaveValue(original);
        if (reply) {
            await expect(form.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
            await expect(page.locator('#comment-draft-comment > .community-comment-actions').getByRole('button', { name: 'Reply', exact: true })).toBeDisabled();
        }
        release();
        await expect(form.getByRole('alert')).toBeVisible();
        await expect(textarea).toHaveValue(original);
        await expect(textarea).not.toHaveAttribute('readonly', '');
        expect(requests).toBe(1);
        fail = false;
        await form.getByRole('button', { name: reply ? 'Post reply' : 'Post comment', exact: true }).click();
        await expect(page.locator('#comment-retry-community-comment')).toContainText(original);
        expect(requests).toBe(2);
        if (!reply) await expect(textarea).toHaveValue('');
    } finally { release(); }
});
