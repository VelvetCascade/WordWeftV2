import { test, expect, type Page } from './fixtures';

// Serve only a local browser fixture; the components and styles are the real Vite modules.
const fixturePath = '/__optional-tips-fixture';
const fixture = `<!doctype html><html><head><link rel="stylesheet" href="/index.css"></head><body>
<div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
const [{ default: React }, { default: ReactDOM }, { FeatureSparkle }, { ReaderDiscoveryCoach }] = await Promise.all([
  import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
  import('/components/FeatureSparkle.tsx'), import('/components/ReaderDiscoveryCoach.tsx')
]);
const h = React.createElement;
const options = new URL(location.href).searchParams;
function Harness() {
  const [count, setCount] = React.useState(0);
  const [coachMounted, setCoachMounted] = React.useState(options.has('coach'));
  return h('main', { style: { padding: '100px' } },
    h('label', null, h('input', { type: 'checkbox', checked: coachMounted,
      onChange: event => setCoachMounted(event.target.checked) }), 'Reader tips'),
    coachMounted && h(ReaderDiscoveryCoach, { hasMentions: options.has('mentions'), hasSpoilers: options.has('spoilers') }),
    h(FeatureSparkle, { featureId: 'fixture-control', tooltip: 'Discover this control', delay: 3000, position: 'bottom' },
      h('button', { type: 'button', onClick: () => setCount(value => value + 1),
        style: { width: '180px', height: '48px' } }, 'Open characters')),
    h('button', { type: 'button', id: 'under-tip', onClick: () => setCount(value => value + 1) }, 'Underlying control'),
    h('output', { 'aria-label': 'Activation count' }, String(count)));
}
const content = h(Harness);
ReactDOM.createRoot(document.getElementById('root')).render(options.has('no-strict') ? content : h(React.StrictMode, null, content));
</script></body></html>`;

async function openFixture(page: Page, query = '') {
    await page.route(`**${fixturePath}*`, route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto(`${fixturePath}${query}`);
    await expect(page.getByRole('button', { name: 'Open characters', exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.clock.install();
});

test('a sparkle appearing during a press preserves the button and its activation', async ({ page }) => {
    await openFixture(page);
    const button = page.getByRole('button', { name: 'Open characters', exact: true });
    const original = await button.elementHandle();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(3100);
    await expect(page.locator('.sparkle-indicator')).toBeVisible();
    await page.mouse.up();
    await expect(page.getByLabel('Activation count')).toHaveText('1');
    expect(await original!.evaluate(node => node.isConnected)).toBe(true);
    await expect(page.locator('.sparkle-indicator')).toHaveCount(0);
    await button.click();
    await expect(page.getByLabel('Activation count')).toHaveText('2');
});

test('a sparkle decoration cannot intercept a tap on the edge of its button', async ({ page }) => {
    await openFixture(page);
    await page.clock.runFor(3100);
    const box = (await page.locator('.sparkle-indicator').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 2);
    await expect(page.getByLabel('Activation count')).toHaveText('1');
});

test('StrictMode preserves the first reading session and a remount advances it once', async ({ page }) => {
    await openFixture(page, '?coach');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('1');
    await page.clock.runFor(3100);
    await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Choose light, sepia, or dark in reading settings.');
    await page.getByRole('button', { name: 'Dismiss tip', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ww_reader_coach_dismissed')!))).toEqual(['theme-switcher']);
    await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).check();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('2');
    await page.clock.runFor(5100);
    await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Select a paragraph to leave a comment.');
});

for (const dismissed of ['{broken', '{}', 'null', '"theme-switcher"', '[null, 5, {}, "unknown-tip"]']) {
    test(`optional reading tips recover from dismissed data ${dismissed}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(value => localStorage.setItem('ww_reader_coach_dismissed', value), dismissed);
        await openFixture(page, '?coach');
        await page.clock.runFor(3100);
        await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Choose light, sepia, or dark in reading settings.');
        await page.getByRole('button', { name: 'Dismiss tip', exact: true }).click();
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ww_reader_coach_dismissed')!))).toEqual(['theme-switcher']);
        expect(errors).toEqual([]);
    });
}

for (const session of ['NaN', '-1', '1.5', '1x']) {
    test(`optional reading tips recover from invalid session ${session}`, async ({ page }) => {
        await page.addInitScript(value => localStorage.setItem('ww_reader_coach_session', value), session);
        await openFixture(page, '?coach&no-strict');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('1');
        await page.clock.runFor(3100);
        await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Choose light, sepia, or dark in reading settings.');
    });
}

test('optional reading sessions stop growing after the last discovery session', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ww_reader_coach_session', '999999'));
    await openFixture(page, '?coach');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('4');
    await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).check();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ww_reader_coach_session'))).toBe('4');
    await page.clock.runFor(21000);
    await expect(page.locator('.reader-coach-nudge')).toHaveCount(0);
});

test('only known string dismissals are retained', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ww_reader_coach_dismissed', '["font-size", "font-size", null, "unknown-tip"]'));
    await openFixture(page, '?coach');
    await page.clock.runFor(3100);
    await page.getByRole('button', { name: 'Dismiss tip', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ww_reader_coach_dismissed')!))).toEqual(['font-size', 'theme-switcher']);
    await page.clock.runFor(10000);
    await expect(page.locator('.reader-coach-nudge')).toHaveCount(0);
});

for (const unavailable of ['disabled', 'quota'] as const) {
    test(`optional tips stay usable when storage is ${unavailable}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(mode => {
            if (mode === 'disabled') Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Storage disabled', 'SecurityError'); } });
            else Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
        }, unavailable);
        await openFixture(page, '?coach');
        await page.clock.runFor(3100);
        await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Choose light, sepia, or dark in reading settings.');
        await page.getByRole('button', { name: 'Dismiss tip', exact: true }).click();
        await page.getByRole('button', { name: 'Open characters', exact: true }).click();
        await expect(page.getByLabel('Activation count')).toHaveText('1');
        await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).uncheck();
        await page.getByRole('checkbox', { name: 'Reader tips', exact: true }).check();
        await page.clock.runFor(5100);
        await expect(page.locator('.reader-coach-nudge-text')).toHaveText('Select a paragraph to leave a comment.');
        expect(errors).toEqual([]);
    });
}

test('an invalid sparkle dismissal does not suppress discovery', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ww_sparkle_dismissed_fixture-control', 'false'));
    await openFixture(page);
    await page.clock.runFor(3100);
    await expect(page.locator('.sparkle-indicator')).toBeVisible();
});

test('a reader tip body passes pointer input to a control beneath it', async ({ page }) => {
    await openFixture(page, '?coach&no-strict');
    await page.clock.runFor(3100);
    await expect(page.locator('.reader-coach-nudge-text')).toBeVisible();
    const point = await page.locator('.reader-coach-nudge-text').evaluate(node => {
        const rect = node.getBoundingClientRect();
        const control = document.getElementById('under-tip')!;
        Object.assign(control.style, { position: 'fixed', zIndex: '44', left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' });
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(point.x, point.y);
    await expect(page.getByLabel('Activation count')).toHaveText('1');
    await page.getByRole('button', { name: 'Dismiss tip', exact: true }).click();
    await expect(page.getByLabel('Activation count')).toHaveText('1');
});

test('optional tip motion respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page, '?coach&no-strict');
    await page.clock.runFor(3016);
    await expect(page.locator('.sparkle-ring-1')).toHaveCSS('animation-name', 'none');
    // CSS may position the card; reduced motion must omit animated transforms.
    expect(await page.locator('.reader-coach-nudge').evaluate(node => (node as HTMLElement).style.transform)).toBe('');
});

test('a hidden focus-mode tip cannot capture input through its dismiss control', async ({ page }) => {
    await openFixture(page, '?coach&no-strict');
    await page.clock.runFor(3100);
    const point = await page.getByRole('button', { name: 'Dismiss tip', exact: true }).evaluate(node => {
        const rect = node.getBoundingClientRect();
        document.querySelector('main')!.classList.add('reader-focus-mode');
        const control = document.getElementById('under-tip')!;
        Object.assign(control.style, { position: 'fixed', zIndex: '44', left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' });
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(point.x, point.y);
    await expect(page.getByLabel('Activation count')).toHaveText('1');
});
