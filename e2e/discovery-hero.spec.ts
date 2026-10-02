import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test.use({ extraHTTPHeaders: { 'X-Forwarded-For': '127.22.2.11' } });

async function catalog(request: import('@playwright/test').APIRequestContext) {
    const response = await request.get('/api/books?size=30', { headers: { 'X-Forwarded-For': '127.22.2.12' } });
    expect(response.ok()).toBeTruthy();
    const { content } = await response.json();
    return { stories: content.filter(book => book.category !== 'Poetry').slice(0, 3), novels: content.filter(book => book.category === 'Novel').slice(3, 6), poems: content.filter(book => book.category === 'Poetry') };
}

test('hero automatically cycles the highlighted word and published covers without format controls', async ({ page, request }) => {
    const groups = await catalog(request);
    await page.route('**/api/books/hero', route => route.fulfill({ json: groups }));
    await page.clock.install();
    await page.goto('/');
    const hero = page.locator('.v2-home-hero');
    await expect(hero.getByRole('heading', { level: 1, name: 'Read stories. Write your own.', exact: true })).toBeVisible();
    await expect(hero.locator('.v2-hero-book')).toHaveCount(3);
    await expect(hero.getByRole('group', { name: 'Featured book format' })).toHaveCount(0);
    await expect(hero.locator('button, [role="tab"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const highlight = await hero.locator('.v2-story-word').boundingBox();
    for (const book of groups.stories) {
        const link = hero.getByRole('link', { name: `Read ${book.title}`, exact: true });
        await expect(link).toHaveAttribute('href', `/book/${encodeURIComponent(book.id)}`);
        await expect(link.locator('img')).toHaveAttribute('src', book.coverUrl);
    }
    // Reading the left-hand copy must not stop the automatic presentation.
    await hero.locator('.v2-hero-description').hover();
    for (const format of ['novels', 'poems', 'stories'] as const) {
        await page.clock.runFor(7100);
        await expect(hero).toHaveAttribute('data-active-format', format);
        await expect(hero.locator('.v2-story-word-text')).toHaveText(format);
        await expect(hero.locator('.v2-hero-book')).toHaveCount(groups[format].length);
        for (const book of groups[format]) {
            const link = hero.getByRole('link', { name: `Read ${book.title}`, exact: true });
            await expect(link).toHaveAttribute('href', `/book/${encodeURIComponent(book.id)}`);
            await expect(link.locator('img')).toHaveAttribute('src', book.coverUrl);
        }
        expect(await hero.locator('.v2-story-word').boundingBox()).toEqual(highlight);
        await expect(hero.getByRole('heading', { level: 1, name: 'Read stories. Write your own.', exact: true })).toBeVisible();
    }
    await hero.getByRole('link', { name: `Read ${groups.stories[0].title}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/book/${groups.stories[0].id}$`));
    await expect(page.locator('.ww-story-v2 h1')).toHaveText(groups.stories[0].title);
});

test('hover and keyboard interaction keep the current cover target stable', async ({ page, request }) => {
    const groups = await catalog(request);
    await page.route('**/api/books/hero', route => route.fulfill({ json: groups }));
    await page.clock.install(); await page.goto('/');
    const hero = page.locator('.v2-home-hero');
    await expect(hero.locator('.v2-hero-book')).toHaveCount(3);
    const first = hero.locator('.v2-hero-book').first();
    await first.hover(); await page.clock.fastForward(20000);
    await expect(hero).toHaveAttribute('data-active-format', 'stories');
    await first.focus(); await page.mouse.move(0, 0); await page.clock.fastForward(20000);
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('href', `/book/${groups.stories[0].id}`);
    await expect(hero).toHaveAttribute('data-active-format', 'stories');
    await page.locator('.v2-home-search input').focus(); await page.clock.runFor(7100);
    await expect(hero).toHaveAttribute('data-active-format', 'novels');
});

test('reduced motion keeps the headline and published covers still without manual format controls', async ({ page, request }) => {
    const groups = await catalog(request);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/books/hero', route => route.fulfill({ json: { ...groups, poems: [] } }));
    await page.clock.install(); await page.goto('/');
    const hero = page.locator('.v2-home-hero');
    await expect(hero.locator('.v2-hero-book')).toHaveCount(3);
    await page.clock.fastForward(20000);
    await expect(hero).toHaveAttribute('data-active-format', 'stories');
    await expect(hero.locator('.v2-story-word-text')).toHaveText('stories');
    await expect(hero.locator('button, [role="tab"]')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: `Read ${groups.stories[0].title}`, exact: true })).toBeVisible();
    expect(await hero.locator('.v2-story-word-text').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('automatic rotation skips empty formats and leaves a single populated shelf still', async ({ page, request }) => {
    const groups = await catalog(request);
    await page.route('**/api/books/hero', route => route.fulfill({ json: { ...groups, poems: [] } }));
    await page.clock.install(); await page.goto('/');
    const hero = page.locator('.v2-home-hero');
    await expect(hero.locator('.v2-hero-book')).toHaveCount(3);
    await page.mouse.move(0, 0);
    await page.clock.runFor(7100);
    await expect(hero.locator('.v2-story-word-text')).toHaveText('novels');
    await page.clock.runFor(7100);
    await expect(hero.locator('.v2-story-word-text')).toHaveText('stories');
    await page.route('**/api/books/hero', route => route.fulfill({ json: { stories: [], novels: [], poems: groups.poems } }));
    await page.reload();
    await expect(hero.locator('.v2-story-word-text')).toHaveText('poems');
    await page.clock.runFor(20000);
    await expect(hero).toHaveAttribute('data-active-format', 'poems');
    await expect(hero).toHaveAttribute('data-transition', 'idle');
    await expect(hero.locator('.v2-hero-book')).toHaveCount(groups.poems.length);
});

test('slow, failed and empty hero data preserve the headline and reading action', async ({ page }) => {
    let release: () => void;
    let fail = true;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/books/hero', async route => {
        if (fail) { await pending; await route.fulfill({ status: 503, json: { message: 'Unavailable' } }); }
        else await route.fulfill({ json: { stories: [], novels: [], poems: [] } });
    });
    await page.goto('/');
    const hero = page.locator('.v2-home-hero');
    await expect(hero.locator('.v2-hero-books')).toHaveAttribute('aria-busy', 'true');
    await expect(hero.getByRole('link', { name: 'Read stories', exact: true })).toHaveAttribute('href', '/category');
    release!();
    await expect(hero.getByText('The books are taking a moment.')).toBeVisible();
    fail = false;
    await hero.getByRole('button', { name: 'Reload featured books', exact: true }).click();
    await expect(hero.getByText('New stories are on their way.')).toBeVisible();
    await expect(hero.locator('.v2-hero-book')).toHaveCount(0);
    await expect(hero.getByRole('heading', { level: 1, name: 'Read stories. Write your own.', exact: true })).toBeVisible();
});

test('actual live homepage genres use individual artistic imagery with meaningful public credits', async ({ page }) => {
    const genres = ['Romance', 'Young Adult', 'LGBTQ+', 'Comedy', 'Tragedy', 'Drama', 'Mystery', 'Humor'];
    await page.route('**/api/books/genres/ranked', route => route.fulfill({ json: genres.map(name => ({ name, bookCount: 1, readCount: 1 })) }));
    await page.goto('/');
    const tiles = page.locator('.v2-genre-tile');
    await expect(tiles).toHaveCount(genres.length);
    const sources = await tiles.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')));
    expect(new Set(sources).size).toBe(genres.length);
    expect(sources.every(source => source?.startsWith('/discovery-artwork/'))).toBeTruthy();
    await page.getByText('Artwork credits', { exact: true }).click();
    await expect(page.locator('.v2-artwork-credits li')).toHaveCount(genres.length);
    await expect(page.locator('.v2-artwork-credits')).toContainText('The Love Letter');
    await expect(page.locator('.v2-artwork-credits')).toContainText('Public domain images');
});

test('tablet hero keeps the headline and interactive books in separate rows', async ({ page, request }) => {
    const groups = await catalog(request);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.route('**/api/books/hero', route => route.fulfill({ json: groups }));
    await page.goto('/'); await expect(page.locator('.v2-hero-book')).toHaveCount(3);
    const copy = await page.locator('.v2-hero-copy').boundingBox();
    const books = await page.locator('.v2-hero-showcase').boundingBox();
    expect(copy!.y + copy!.height).toBeLessThanOrEqual(books!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
    await expect(page.locator('.v2-nav-primary')).toBeHidden();
    await expect(page.locator('.v2-start')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    const brand = await page.locator('.v2-nav .v2-brand').boundingBox();
    const actions = await page.locator('.v2-nav-actions').boundingBox();
    expect(brand!.x + brand!.width).toBeLessThan(actions!.x);
});

for (const { width, theme } of [
    { width: 1440, theme: 'light' }, { width: 1440, theme: 'dark' },
    { width: 768, theme: 'light' }, { width: 390, theme: 'dark' },
    { width: 320, theme: 'light' },
] as const) {
    test(`automatic word and covers remain aligned at ${width}px in ${theme} appearance`, async ({ page, request }) => {
        const groups = await catalog(request);
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(appearance => localStorage.setItem('theme', appearance), theme);
        await page.route('**/api/books/hero', route => route.fulfill({ json: groups }));
        await page.clock.install(); await page.goto('/');
        const hero = page.locator('.v2-home-hero');
        await expect(hero.locator('.v2-hero-book')).toHaveCount(3);
        await page.evaluate(() => document.fonts.ready);
        await page.mouse.move(0, 0);
        const highlight = await hero.locator('.v2-story-word').boundingBox();
        for (const format of ['stories', 'novels', 'poems'] as const) {
            await expect(hero.locator('.v2-story-word-text')).toHaveText(format);
            expect(await hero.locator('.v2-story-word').boundingBox()).toEqual(highlight);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
            expect(await hero.locator('.v2-story-word-text').evaluate(word => {
                const text = word.getBoundingClientRect();
                const background = word.parentElement!.getBoundingClientRect();
                return text.left >= background.left && text.right <= background.right;
            })).toBe(true);
            await expect(hero.locator('.v2-hero-book')).toHaveCount(groups[format].length);
            if (format !== 'poems') await page.clock.runFor(7100);
        }
        await expect(hero.locator('button, [role="tab"]')).toHaveCount(0);
        const accessibility = await new AxeBuilder({ page }).include('.v2-home-hero').analyze();
        expect(accessibility.violations).toEqual([]);
    });
}
