import { test, expect } from './fixtures';
const fixture = `<!doctype html><html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
const [{default:React},{default:ReactDOM},{useFeedbackTriggers}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/hooks/useFeedbackTriggers.ts')]);
function Form(){const feedback=useFeedbackTriggers(true);return React.createElement(React.Fragment,null,React.createElement('div',{role:'dialog','aria-modal':'true'},React.createElement('textarea',{'aria-label':'Active draft'})),React.createElement('output',null,feedback.modalConfig?.mode||'none'))}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Form));</script></body></html>`;
test('tab return defers exit feedback while a dialog or input is active', async ({ page }) => {
    await page.route('**/__quality-feedback', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto('/__quality-feedback');
    await page.getByRole('textbox', { name: 'Active draft' }).fill('Keep my focus here');
    await page.evaluate(() => { sessionStorage.setItem('ww_pending_exit_feedback', 'true'); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.locator('output')).toHaveText('none');
    expect(await page.evaluate(() => sessionStorage.getItem('ww_pending_exit_feedback'))).toBe('true');
    await page.evaluate(() => { document.querySelector('[role="dialog"]')?.remove(); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.locator('output')).toHaveText('exit');
});
