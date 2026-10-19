import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const proofWidth = process.env.AUDIT_LANDSCAPE ? 844 : process.env.AUDIT_MOBILE ? 390 : 1440;
if (process.env.AUDIT_MOBILE || process.env.AUDIT_LANDSCAPE) test.use({ viewport: {width:proofWidth,height:process.env.AUDIT_LANDSCAPE?390:844}, isMobile:true, hasTouch:true });
if (process.env.AUDIT_DARK) test.use({colorScheme:'dark',reducedMotion:'reduce'});

const reviews = [{ id: 'review-one', userId: 'reply-reader', user: { id: 'other-reader', name: 'Synthetic Reviewer', avatarUrl: '/favicon.svg' }, rating: 4, comment: 'A memorable synthetic crossing.', date: '2026-01-01', replies: [] }];
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
        if (path.endsWith('/reviews')) return route.fulfill({ json: route.request().method() === 'POST' ? [{...reviews[0],comment:route.request().postDataJSON().comment}] : reviews });
        if (path.includes('/reading/progress')) return route.fulfill({ json: null });
        if (path.endsWith('/unread-count')) return route.fulfill({ json: 0 });
        if (path.endsWith('/notifications/stream')) return route.fulfill({ contentType: 'text/event-stream', body: '' });
        return route.fulfill({ json: [] });
    });
    await page.goto('/book/reply-story');
    await page.getByRole('button', { name: /^Reviews/ }).click();

}


test('a recently saved review does not leave its share prompt over the next dialog', async ({page})=>{
    await story(page);
    await page.getByRole('button',{name:'Edit your review',exact:true}).click();
    let dialog=page.getByRole('dialog',{name:'Edit your review',exact:true});
    await dialog.getByLabel('Your review',{exact:true}).fill('First synthetic update');
    await dialog.getByRole('button',{name:'Update review',exact:true}).click();
    await expect(page.getByText('Your review is live!',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Edit your review',exact:true}).click();
    dialog=page.getByRole('dialog',{name:'Edit your review',exact:true});
    await dialog.getByLabel('Your review',{exact:true}).fill('Second synthetic update');
    const update=dialog.getByRole('button',{name:'Update review',exact:true});
    await update.scrollIntoViewIfNeeded();
    if(process.env.AUDIT_PROOF_DIR) await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/edit-${proofWidth}.png`});
    expect(await page.getByText('Your review is live!',{exact:true}).count()).toBe(0);
    // Check both the hit target and a real pointer/touch update.
    expect(await update.evaluate(button=>{const r=button.getBoundingClientRect();return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
    if(process.env.AUDIT_MOBILE || process.env.AUDIT_LANDSCAPE)await update.tap();else await update.click();
    await expect(dialog).toHaveCount(0);await expect(page.getByText('Second synthetic update',{exact:true})).toBeVisible();
    const prompt=page.getByText('Your review is live!',{exact:true}).locator('..').locator('..');
    await expect(prompt.getByRole('button',{name:'Dismiss review sharing suggestion',exact:true})).toBeVisible();
    if(process.env.AUDIT_PROOF_DIR) await page.locator('.ww-review-share-nudge').screenshot({path:`${process.env.AUDIT_PROOF_DIR}/suggestion-${proofWidth}.png`});
    const accessibility=await new AxeBuilder({page}).include('.ww-review-share-nudge').withRules(['button-name','color-contrast']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole('button',{name:'Delete your review',exact:true}).click();
    expect(await page.getByText('Your review is live!',{exact:true}).count()).toBe(0);
    const confirmation=page.getByRole('alertdialog',{name:'Delete your review?',exact:true});
    await expect(confirmation).toBeVisible();
    for(let i=0;i<4;i++){await page.keyboard.press('Tab');expect(await confirmation.evaluate(dialog=>dialog.contains(document.activeElement))).toBe(true);}
    await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(page.getByText('Your review is live!',{exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Edit your review',exact:true}).click();
    dialog=page.getByRole('dialog',{name:'Edit your review',exact:true});
    await dialog.getByLabel('Your review',{exact:true}).fill('A review ready to share');
    for(let i=0;i<10;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(dialog=>dialog.contains(document.activeElement))).toBe(true);}
    await dialog.getByRole('button',{name:'Update review',exact:true}).click();
    await page.getByRole('button',{name:'Share this Book',exact:true}).click();
    const share=page.getByRole('dialog',{name:'Share The first crossing',exact:true});
    await expect(share).toBeVisible();
    await expect(page.getByText('Your review is live!',{exact:true})).toHaveCount(0);
    await page.keyboard.press('Tab');expect(await share.evaluate(dialog=>dialog.contains(document.activeElement))).toBe(true);
    await share.getByRole('button',{name:'Close share dialog',exact:true}).click();
    await expect(page.getByText('Your review is live!',{exact:true})).toHaveCount(0);
});
