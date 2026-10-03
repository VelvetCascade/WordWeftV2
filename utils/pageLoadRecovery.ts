const RETRY_KEY = 'wordweft:page-asset-recovery';
const RETRY_WINDOW_MS = 5 * 60_000;
const ASSET_FAILURE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .+ failed|ChunkLoadError/i;
const recoveries = new WeakMap<Window, (error: unknown, event?: Event) => boolean>();

export function isPageAssetFailure(error: unknown): boolean {
  return ASSET_FAILURE.test(error instanceof Error ? error.message : String(error));
}

/** React catches lazy rejections itself; they do not always emit a Vite event. */
export function recoverPageLoad(error: unknown, target: Window = window): boolean {
  return recoveries.get(target)?.(error) ?? false;
}

/** An older open tab may request an asset removed by a deployment. */
export function installPageLoadRecovery(isNavigationLocked: () => boolean, target: Window = window) {
  let recovering = false;
  const recover = (error: unknown, event?: Event): boolean => {
    if (!isPageAssetFailure(error) || recovering ||
        target.navigator.onLine === false || isNavigationLocked()) return false;
    // Persist before reloading. If storage is blocked, keep manual recovery;
    // a per-document flag alone would allow an endless reload loop.
    try {
      const lastRetry = Number(target.sessionStorage.getItem(RETRY_KEY));
      const now = Date.now();
      if (lastRetry && now - lastRetry < RETRY_WINDOW_MS) return false;
      target.sessionStorage.setItem(RETRY_KEY, String(now));
    } catch {
      return false;
    }
    recovering = true;
    event?.preventDefault();
    target.location.reload();
    return true;
  };
  const onPreloadError = (event: Event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    recover(payload, event);
  };
  recoveries.set(target, recover);
  target.addEventListener('vite:preloadError', onPreloadError);
  return () => {
    target.removeEventListener('vite:preloadError', onPreloadError);
    if (recoveries.get(target) === recover) recoveries.delete(target);
  };
}
