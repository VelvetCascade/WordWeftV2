const RETRY_KEY = 'wordweft:page-asset-recovery';
const RETRY_WINDOW_MS = 5 * 60_000;
const ASSET_FAILURE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .+ failed|ChunkLoadError/i;

/** An older open tab may request an asset removed by a deployment. */
export function installPageLoadRecovery(isNavigationLocked: () => boolean, target: Window = window) {
  let recovering = false;
  const recover = (event: Event) => {
    const payload = (event as Event & { payload?: { message?: string } }).payload;
    if (!ASSET_FAILURE.test(String(payload?.message || payload || '')) || recovering ||
        target.navigator.onLine === false || isNavigationLocked()) return;
    // Persist before reloading. If storage is blocked, keep manual recovery;
    // a per-document flag alone would allow an endless reload loop.
    try {
      const lastRetry = Number(target.sessionStorage.getItem(RETRY_KEY));
      const now = Date.now();
      if (lastRetry && now - lastRetry < RETRY_WINDOW_MS) return;
      target.sessionStorage.setItem(RETRY_KEY, String(now));
    } catch {
      return;
    }
    recovering = true;
    event.preventDefault();
    target.location.reload();
  };
  target.addEventListener('vite:preloadError', recover);
  return () => target.removeEventListener('vite:preloadError', recover);
}
