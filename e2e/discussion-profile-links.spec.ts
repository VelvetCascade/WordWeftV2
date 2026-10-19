import { test, expect, type Page } from './fixtures';
import { writeFile } from 'node:fs/promises';

if (process.env.AUDIT_MOBILE) test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const bookId = 'reader-profile-story';
const chapterId = 'reader-profile-chapter';
const author = {id:'discussion-reader',name:'Synthetic Reader',avatarUrl:null};
const nestedAuthor = {id:'nested-author',name:'Nested Author',avatarUrl:null};
const comment = {id:'root-comment',bookId,chapterId,paragraphIndex:null,parentId:null,content:'A thought about the river.',createdAt:'2026-01-01',userId:author.id,user:author};

async function reader(page: Page, drawer = true) {
    await page.context().addInitScript(() => {
        localStorage.setItem('wordweft_jwt','synthetic-local-token');
        localStorage.setItem('ww_welcomeJourneyCompleted','true');
        localStorage.setItem('hasSeenWhatsNewPopup_v1','true');
    });
    await page.context().route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (/\.[cm]?[jt]sx?$/.test(path)) return route.continue();
        if (path === '/api/users/me') return route.fulfill({json:{...author,username:author.name,email:'reader@example.test',library:[],writtenBooks:[]}});
        if (path.endsWith('/profile')) { const profile = path.includes(nestedAuthor.id) ? nestedAuthor : author; return route.fulfill({json:{...profile,username:profile.name,bio:'A synthetic reader.'}}); }
        if (path === `/api/books/${bookId}`) return route.fulfill({json:{id:bookId,title:'A profile crossing',summary:'A synthetic story.',author:{id:'writer',name:'Synthetic Writer',avatarUrl:null,bio:''},coverUrl:null,genres:['Fantasy'],tags:[],publicationStatus:'published',readingStatus:'Ongoing',ageRating:'ALL_AGES',rating:0,reviewsCount:0,viewCount:0,likesCount:0,commentCount:2,chapters:[{id:chapterId,title:'Before the crossing',status:'published',wordCount:30,viewCount:0,likesCount:0,commentCount:2,isLiked:false,contentWarnings:[]}]}});
        if (path.endsWith(`/${chapterId}/content`)) return route.fulfill({json:{bookId,bookTitle:'A profile crossing',chapterId,chapterTitle:'Before the crossing',chapterIndex:0,access:'FULL',content:'<p>The chapter follows the river.</p>',previewWordCount:30,fullWordCount:30}});
        if (path.endsWith(`/${chapterId}/comments`)) return route.fulfill({json:[comment,{...comment,id:'nested-comment',parentId:comment.id,content:'A nested synthetic reply.',userId:nestedAuthor.id,user:nestedAuthor}]});
        if (path.startsWith('/api/reading/progress')) return route.fulfill({json:null});
        if (path.endsWith('/unread-count')) return route.fulfill({json:0});
        if (path.endsWith('/notifications/stream')) return route.fulfill({contentType:'text/event-stream',body:''});
        return route.fulfill({json:[]});
    });
    await page.goto(`/book/${bookId}/chapter/${chapterId}${drawer?'?discussion=all':''}`);
}

test('discussion authors are keyboard links for missing avatars and nested replies', async ({page}) => {
    await reader(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(comment.content,{exact:true})).toBeVisible();
    if (process.env.AUDIT_PROOF_DIR) await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/discussion-${process.env.AUDIT_MOBILE?'390':'1440'}.png`});
    const name = dialog.getByRole('link',{name:author.name,exact:true});
    await expect(name).toHaveAttribute('href',`/author/${author.id}`);
    await expect(dialog.getByRole('link',{name:nestedAuthor.name,exact:true})).toHaveAttribute('href',`/author/${nestedAuthor.id}`);
    const avatar = dialog.getByRole('link',{name:`${author.name}'s profile`,exact:true});
    await expect(avatar).toHaveAttribute('href',`/author/${author.id}`);
    await expect(avatar.getByRole('img')).toBeVisible();
    let reached = false;
    for (let i=0; i<30; i++) { await page.keyboard.press('Tab'); if (await name.evaluate(element=>element===document.activeElement)) {reached=true;break;} }
    expect(reached).toBe(true);
    if (process.env.AUDIT_PROOF_DIR) {
        await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/keyboard-${process.env.AUDIT_MOBILE?'390':'1440'}.png`});
        await writeFile(`${process.env.AUDIT_PROOF_DIR}/keyboard-${process.env.AUDIT_MOBILE?'390':'1440'}.json`, JSON.stringify(await name.evaluate(element => ({tag:element.tagName,href:element.getAttribute('href'),tabReached:element===document.activeElement,accessibleText:element.textContent})),null,2));
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/author/${author.id}$`));
    await expect(page.getByRole('heading',{level:1})).toHaveText(author.name);
    await page.goBack();
    await expect(page.getByRole('dialog')).toBeVisible();
    const nested = page.getByRole('dialog').getByRole('link',{name:nestedAuthor.name,exact:true});
    if (process.env.AUDIT_MOBILE) await nested.tap(); else await nested.click();
    await expect(page).toHaveURL(new RegExp(`/author/${nestedAuthor.id}$`));
});

test('chapter discussion links preserve client routing and native open-in-new-tab', async ({page,context}) => {
    await reader(page,false);
    const card = page.locator('.reader-discussion-card').first();
    const link = card.getByRole('link',{name:author.name,exact:true});
    await expect(link).toBeVisible();
    const newPage = context.waitForEvent('page');
    await link.click({modifiers:['ControlOrMeta']});
    const popup = await newPage;
    await expect(popup).toHaveURL(new RegExp(`/author/${author.id}$`));
    await expect(popup.getByRole('heading',{level:1})).toHaveText(author.name);
    await popup.close();
    await expect(page).toHaveURL(new RegExp(`/chapter/${chapterId}$`));
    const documentStart = await page.evaluate(()=>performance.timeOrigin);
    const avatar = card.getByRole('link',{name:`${author.name}'s profile`,exact:true});
    if (process.env.AUDIT_MOBILE) await avatar.tap(); else await avatar.click();
    await expect(page).toHaveURL(new RegExp(`/author/${author.id}$`));
    expect(await page.evaluate(()=>performance.timeOrigin)).toBe(documentStart);
    await page.goBack();
    await expect(page.locator('.reader-discussion-card').first()).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
