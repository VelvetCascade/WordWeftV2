import { test, expect } from './fixtures';

const fixture = `<!doctype html><html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
window.__vite_plugin_react_preamble_installed__=true;
const [{default:React},{default:ReactDOM},{WelcomeJourney}]=await Promise.all([
import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/components/WelcomeJourney.tsx')]);
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(WelcomeJourney,{userName:'Ari',onComplete:role=>document.body.setAttribute('data-completed-role',role)}));
</script></body></html>`;

test('reader onboarding proceeds through reader tools and finishes without a loop', async ({ page }) => {
    await page.route('**/__quality-onboarding', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto('/__quality-onboarding');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: /I'm a Reader/ }).click();
    await expect(page.getByRole('heading', { name: 'Make the story your own' })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Start exploring', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-completed-role', 'reader');
});

test('manually selected onboarding demonstrations do not automatically change', async ({ page }) => {
    await page.route('**/__quality-onboarding', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.clock.install();
    await page.goto('/__quality-onboarding');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.clock.runFor(1000);
    await page.getByRole('button', { name: /I'm a Writer/ }).click();
    await page.clock.runFor(1000);
    await page.getByRole('button', { name: 'Mood Atmospheres', exact: true }).click();
    await expect(page.locator('.wj-features-tab-active')).toHaveText('Mood Atmospheres');
    await page.clock.runFor(5000);
    await expect(page.locator('.wj-features-tab-active')).toHaveText('Mood Atmospheres');
});
