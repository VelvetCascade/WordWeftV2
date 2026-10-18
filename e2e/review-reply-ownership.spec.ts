import { test, expect, type Page } from './fixtures';

if (process.env.AUDIT_MOBILE) test.use({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });

const reviews = [{ id: 'review-one', userId: 'other-reader', user: { id: 'other-reader', name: 'Synthetic Reviewer', avatarUrl: '/favicon.svg' }, rating: 4, comment: 'A memorable synthetic crossing.', date: '2026-01-01', replies: [] }];
async function story(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('wordweft_jwt', 'synthetic-local-token');
        localStorage.setItem('ww_welcomeJourneyCompleted', 'true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({ json: { id: 'reply-reader', username: 'Synthetic Reader', email: 'reply@example.test', avatarUrl: '/favicon.svg', library: [], writtenBooks: [] } });
        if (/^\/api\/books\/reply-story(?:-two)?$/.test(path)) return route.fulfill({ json: {
            id: path.split('/').pop(), title: path.endsWith('two') ? 'The second crossing' : 'The first crossing', summary: 'A synthetic story.',
            author: { id: 'reply-writer', name: 'Synthetic Writer', avatarUrl: '/favicon.svg', bio: '' }, coverUrl: '/favicon.svg', genres: ['Fantasy'], tags: [], publicationStatus: 'published', readingStatus: 'Ongoing', ageRating: 'ALL_AGES', rating: 4, reviewsCount: 1, viewCount: 0, likesCount: 0, commentCount: 0, chapters: [],
        } });
        if (path.endsWith('/reviews')) return route.fulfill({ json: path.includes('story-two') ? [{...reviews[0], id:'review-two', comment:'A separate second story review.'}] : reviews });
        if (path.includes('/reading/progress')) return route.fulfill({ json: null });
        if (path.endsWith('/unread-count')) return route.fulfill({ json: 0 });
        if (path.endsWith('/notifications/stream')) return route.fulfill({ contentType: 'text/event-stream', body: '' });
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/reply-story');
    await page.getByRole('button', { name: /^Reviews/ }).click();
    await page.locator('.ww-story-review-item').getByRole('button', { name: 'Reply', exact: true }).click();
}

for (const failure of ['http', 'offline', 'malformed'] as const) test(`review reply owns one request and recovers from ${failure}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await story(page);
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let requests = 0; let fail = true;
    await page.route('**/api/books/reply-story/reviews/review-one/reply', async route => {
        requests++; await gate;
        if (fail) {
            if (failure === 'offline') return route.abort('internetdisconnected');
            return route.fulfill(failure === 'http' ? { status: 503, json: { message: 'Synthetic unavailable reply service' } } : { json: { unexpected: 'malformed response' } });
        }
        return route.fulfill({ json: [{...reviews[0], replies:[{id:'reply-saved',user:{id:'reply-reader',name:'Synthetic Reader',avatarUrl:'/favicon.svg'},content:route.request().postDataJSON().content,timestamp:'2026-01-02'}]}] });
    });
    const item=page.locator('.ww-story-review-item'); const form=item.locator('form'); const text=form.locator('textarea');
    await text.fill('A recoverable synthetic reply');
    try {
        // Two synchronous submissions verify re-entry is guarded before React renders.
        await form.evaluate(element => { (element as HTMLFormElement).requestSubmit(); (element as HTMLFormElement).requestSubmit(); });
        await text.focus(); await page.keyboard.type(' later unsent draft');
        if (process.env.AUDIT_PROOF_DIR && failure === 'http') await item.evaluate(element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
        if (process.env.AUDIT_PROOF_DIR && failure === 'http') await item.screenshot({path: `${process.env.AUDIT_PROOF_DIR}/pending-${process.env.AUDIT_MOBILE ? '390' : '1440'}.png`});
        await expect.poll(() => requests).toBe(1);
        await expect(form.getByRole('button', { name: /Posting|Post Reply/ })).toBeDisabled();
        await expect(text).toHaveAttribute('readonly','');
        await expect(text).toHaveValue('A recoverable synthetic reply');
        await expect(item.getByRole('button', {name:'Reply',exact:true})).toBeDisabled();
        await expect(form.getByRole('button', {name:'Cancel',exact:true})).toBeDisabled();
        release();
        await expect(form.getByRole('alert')).toBeVisible();
        if (process.env.AUDIT_PROOF_DIR && failure === 'http') await item.evaluate(element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
        if (process.env.AUDIT_PROOF_DIR && failure === 'http') await item.screenshot({path: `${process.env.AUDIT_PROOF_DIR}/failure-${process.env.AUDIT_MOBILE ? '390' : '1440'}.png`});
        await expect(text).toHaveValue('A recoverable synthetic reply');
        await expect(text).not.toHaveAttribute('readonly','');
        fail=false; await form.getByRole('button',{name:'Post Reply',exact:true}).click();
        await expect(item.locator('form')).toHaveCount(0);
        await expect(item.getByText('A recoverable synthetic reply',{exact:true})).toBeVisible();
        expect(requests).toBe(2); expect(errors).toEqual([]);
    } finally { release(); }
});

test('an older review reply cannot populate the newly selected story', async ({page})=>{
    await story(page); let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve});
    let pending=false;
    await page.route('**/api/books/reply-story/reviews/review-one/reply',async route=>{pending=true;await gate;return route.fulfill({json:[{...reviews[0],comment:'STALE first story response'}]})});
    await page.getByPlaceholder('Write a reply...').fill('First story reply');
    try {
        await page.getByRole('button',{name:'Post Reply',exact:true}).click();await expect.poll(()=>pending).toBe(true);
        await page.evaluate(()=>{window.location.hash='/book/reply-story-two'});
        await expect(page.getByRole('heading',{level:1})).toHaveText('The second crossing');
        await page.getByRole('button',{name:/^Reviews/}).click();await expect(page.getByText('A separate second story review.',{exact:true})).toBeVisible();
        const response=page.waitForResponse(r=>r.url().endsWith('/reviews/review-one/reply'));release();await (await response).finished();
        await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
        await expect(page.getByText('A separate second story review.',{exact:true})).toBeVisible();await expect(page.getByText('STALE first story response')).toHaveCount(0);
    } finally {release()}
});
