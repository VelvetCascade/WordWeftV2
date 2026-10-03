import test from 'node:test';
import assert from 'node:assert/strict';
import { installPageLoadRecovery, recoverPageLoad } from '../utils/pageLoadRecovery.ts';

function browser() {
  const events = new EventTarget();
  const stored = new Map<string, string>();
  let reloads = 0;
  const target = Object.assign(events, {
    navigator: { onLine: true },
    location: { reload: () => { reloads++; } },
    sessionStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
  }) as unknown as Window;
  return { target, reloads: () => reloads };
}
function failure(target: Window, message = 'Failed to fetch dynamically imported module: /assets/LibraryPage-old.js') {
  const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: new TypeError(message) });
  target.dispatchEvent(event);
  return event;
}

test('a failed page asset recovers once and prevents the obsolete page error', () => {
  const { target, reloads } = browser();
  const dispose = installPageLoadRecovery(() => false, target);
  assert.equal(failure(target).defaultPrevented, true);
  assert.equal(reloads(), 1);
  failure(target);
  assert.equal(reloads(), 1);
  dispose();
});

test('reinstalling after reload cannot create a reload loop', () => {
  const { target, reloads } = browser();
  installPageLoadRecovery(() => false, target)();
  const dispose = installPageLoadRecovery(() => false, target);
  failure(target);
  dispose();
  installPageLoadRecovery(() => false, target);
  assert.equal(failure(target).defaultPrevented, false);
  assert.equal(reloads(), 1);
});

for (const condition of ['offline', 'unsaved work', 'storage unavailable', 'runtime error']) {
  test(`${condition} preserves the page for manual recovery`, () => {
    const { target, reloads } = browser();
    if (condition === 'offline') Object.assign(target.navigator, { onLine: false });
    if (condition === 'storage unavailable') target.sessionStorage.setItem = () => { throw new Error('Storage blocked'); };
    installPageLoadRecovery(() => condition === 'unsaved work', target);
    const event = failure(target, condition === 'runtime error' ? 'Cannot read properties of undefined' : undefined);
    assert.equal(event.defaultPrevented, false);
    assert.equal(reloads(), 0);
  });
}

test('Safari module-loading errors also recover without treating ordinary exceptions as asset failures', () => {
  const { target, reloads } = browser();
  installPageLoadRecovery(() => false, target);
  failure(target, 'Importing a module script failed.');
  assert.equal(reloads(), 1);
});

test('disposing removes the page recovery listener', () => {
  const { target, reloads } = browser();
  installPageLoadRecovery(() => false, target)();
  failure(target);
  assert.equal(reloads(), 0);
});

test('an actual lazy import rejection can recover without a Vite preload event', () => {
  const { target, reloads } = browser();
  installPageLoadRecovery(() => false, target);
  assert.equal(recoverPageLoad(new TypeError('Failed to fetch dynamically imported module: /assets/page.js'), target), true);
  assert.equal(reloads(), 1);
  assert.equal(recoverPageLoad(new TypeError('Failed to fetch dynamically imported module: /assets/page.js'), target), false);
  assert.equal(reloads(), 1);
});

test('boundary recovery respects unsaved work and excludes ordinary render errors', () => {
  const { target, reloads } = browser();
  installPageLoadRecovery(() => true, target);
  assert.equal(recoverPageLoad(new TypeError('Importing a module script failed.'), target), false);
  assert.equal(reloads(), 0);
  installPageLoadRecovery(() => false, target);
  assert.equal(recoverPageLoad(new TypeError('Cannot read properties of undefined'), target), false);
  assert.equal(reloads(), 0);
});
