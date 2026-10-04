import { test, expect } from './fixtures';
const fixture = `<!doctype html><html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
const [{default:React},{default:ReactDOM},{useRecoverableForm}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/hooks/useRecoverableForm.ts')]);
function Form(){const [owner,setOwner]=React.useState('owner-a');const recovery=useRecoverableForm(owner,'isolation',{title:''},value=>value&&typeof value.title==='string');window.review={owner,setOwner,...recovery};return React.createElement('output',null,owner+':'+recovery.value.title)}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Form));</script></body></html>`;
test.beforeEach(async ({ context }) => { await context.route('**/__quality-isolation', route => route.fulfill({ contentType: 'text/html', body: fixture })); });
test('stale update and discard callbacks cannot affect another account', async ({ page }) => {
    await page.goto('/__quality-isolation');
    await expect(page.locator('output')).toHaveText('owner-a:');
    await page.evaluate(() => { const w = window as any; w.staleUpdate = w.review.setValue; w.staleDiscard = w.review.discard; w.review.setValue({ title: 'A private draft' }); });
    await expect(page.locator('output')).toHaveText('owner-a:A private draft');
    await page.evaluate(() => (window as any).review.setOwner('owner-b'));
    await expect(page.locator('output')).toHaveText('owner-b:');
    await page.evaluate(() => (window as any).staleUpdate({ title: 'A callback leaked' }));
    await expect(page.locator('output')).toHaveText('owner-b:');
    await page.evaluate(() => (window as any).review.setValue({ title: 'B private draft' }));
    await expect(page.locator('output')).toHaveText('owner-b:B private draft');
    await page.evaluate(() => (window as any).staleDiscard());
    await expect(page.locator('output')).toHaveText('owner-b:B private draft');
});
test('closing a stale tab does not overwrite a newer draft or recreate a discarded draft', async ({ page, context }) => {
    await page.goto('/__quality-isolation');
    await expect(page.locator('output')).toHaveText('owner-a:');
    await page.evaluate(() => (window as any).review.setValue({ title: 'Original draft' }));
    await expect(page.locator('output')).toHaveText('owner-a:Original draft');
    const other = await context.newPage();
    await other.goto('/__quality-isolation');
    await expect(other.locator('output')).toHaveText('owner-a:Original draft');
    await other.evaluate(() => (window as any).review.setValue({ title: 'A newer draft' }));
    await expect.poll(() => other.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('A newer draft');
    await page.goto('/category');
    expect(await other.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('A newer draft');
    await other.evaluate(() => (window as any).review.discard());
    await page.goto('/__quality-isolation');
    await expect(page.locator('output')).toHaveText('owner-a:');
});

test('conflicting forms retain both versions and can explicitly resume the stored one', async ({ page, context }) => {
    await page.goto('/__quality-isolation'); await expect(page.locator('output')).toHaveText('owner-a:');
    await page.evaluate(() => (window as any).review.setValue({ title: 'Original' }));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('Original');
    const other = await context.newPage(); await other.goto('/__quality-isolation'); await expect(other.locator('output')).toHaveText('owner-a:Original');
    await other.evaluate(() => (window as any).review.setValue({ title: 'Other version' }));
    await expect.poll(() => other.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('Other version');
    await page.evaluate(() => (window as any).review.setValue({ title: 'My alternate' }));
    await expect.poll(() => page.evaluate(() => (window as any).review.conflict)).toBe(true);
    expect(await other.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('Other version');
    await page.evaluate(() => (window as any).review.useStored());
    await expect(page.locator('output')).toHaveText('owner-a:Other version');
    await page.evaluate(() => (window as any).review.setValue({ title: 'An intentional next edit' }));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('An intentional next edit');
    expect(await page.evaluate(() => (window as any).review.conflict)).toBe(false);
});

test('an opened tab has a distinct copy identity and both alternates survive reloads', async ({ page, context }) => {
    await page.goto('/__quality-isolation'); await expect(page.locator('output')).toHaveText('owner-a:');
    await page.evaluate(() => (window as any).review.setValue({ title: 'Original' }));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('Original');
    const popup = page.waitForEvent('popup'); await page.evaluate(() => { window.open('/__quality-isolation'); }); const child = await popup;
    await expect(child.locator('output')).toHaveText('owner-a:Original');
    expect(await child.evaluate(() => sessionStorage.getItem('wordweft:form-tab'))).not.toBe(await page.evaluate(() => sessionStorage.getItem('wordweft:form-tab')));
    const other = await context.newPage(); await other.goto('/__quality-isolation'); await expect(other.locator('output')).toHaveText('owner-a:Original');
    await other.evaluate(() => (window as any).review.setValue({ title: 'Newest canonical' }));
    await expect.poll(() => other.evaluate(() => JSON.parse(localStorage.getItem('wordweft:form-draft:v1:owner-a:isolation') || 'null')?.value?.title)).toBe('Newest canonical');
    await page.evaluate(() => (window as any).review.setValue({ title: 'Parent alternate' })); await expect.poll(() => page.evaluate(() => (window as any).review.conflict)).toBe(true);
    await child.evaluate(() => (window as any).review.setValue({ title: 'Child alternate' })); await expect.poll(() => child.evaluate(() => (window as any).review.conflict)).toBe(true);
    await page.reload(); await expect(page.locator('output')).toHaveText('owner-a:Parent alternate');
    await child.reload(); await expect(child.locator('output')).toHaveText('owner-a:Child alternate');
    await child.reload(); await expect(child.locator('output')).toHaveText('owner-a:Child alternate');
});
