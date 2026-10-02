import { test, expect } from './fixtures';
import { build } from 'esbuild';

test.describe('delayed route restoration', () => {
    let script = '';
    test.beforeAll(async () => {
        // Bundle the real route surface and navigation helper; only the destination's loading time is controlled.
        const result = await build({ stdin: { resolveDir: process.cwd(), sourcefile: 'route-restoration-fixture.tsx', loader: 'tsx', contents: `
            import React, { lazy, Suspense } from 'react';
            import { createRoot } from 'react-dom/client';
            import { RouteSurface } from './components/RouteSurface';
            import { installNavigation } from './utils/navigation';
            installNavigation();
            dispatchEvent(new PopStateEvent('popstate', { state: { wordWeftEntryId: 'restoration-fixture', wordWeftScroll: { x: 0, y: 650 } } }));
            const Destination = lazy(() => new Promise(resolve => {
                window.releaseRoute = () => resolve({ default: () => <section style={{ height: 2400 }}><h1>The restored shelf</h1><p>Your previous place.</p></section> });
            }));
            createRoot(document.getElementById('fixture')).render(<RouteSurface><Suspense fallback={<p>Loading the destination…</p>}><Destination /></Suspense></RouteSurface>);
        ` }, bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"test"' } });
        script = result.outputFiles[0].text;
    });

    for (const interacting of [false, true]) test(`a destination loading beyond three seconds ${interacting ? 'keeps the user’s chosen control and scroll' : 'restores the saved Back position'}`, async ({ page, context }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await context.route('**/__route-surface-regression', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Route restoration regression</title></head><body><button type="button">Search while loading</button><div id="fixture"></div></body></html>' }));
        await page.goto('/__route-surface-regression');
        await page.addScriptTag({ content: script });
        await expect(page.getByText('Loading the destination…', { exact: true })).toBeVisible();
        const control = page.getByRole('button', { name: 'Search while loading', exact: true });
        if (interacting) await control.focus();
        // Deliberately exceed the old 3s restoration deadline while the short fallback is still displayed.
        await page.waitForTimeout(3200);
        await page.evaluate(() => (window as any).releaseRoute());
        await expect(page.getByRole('heading', { name: 'The restored shelf', exact: true })).toBeAttached();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(interacting ? 0 : 650);
        if (interacting) await expect(control).toBeFocused();
    });
});
