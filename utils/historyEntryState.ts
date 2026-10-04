/** Non-navigation state shares WebKit's history-write budget with real routing. */
type EntryState = Record<string, any>;
const pendingEntries = new Map<string, EntryState>();
let timer: ReturnType<typeof setTimeout> | undefined;
const WRITE_INTERVAL_MS = 500;
const entryKey = () => `${window.history.state?.wordWeftEntryId || ''}:${window.location.href}`;
const same = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) return true;
  try { return JSON.stringify(left) === JSON.stringify(right); } catch { return false; }
};
const merge = (state: EntryState, patch: EntryState) => {
  const result = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return result;
};

/** Read unpersisted choices too, including when browser Back returns before a flush. */
export const readHistoryState = (): EntryState => {
  if (typeof window === 'undefined') return {};
  return merge(window.history.state || {}, pendingEntries.get(entryKey()) || {});
};
const schedule = (delay = WRITE_INTERVAL_MS) => {
  if (timer === undefined) timer = setTimeout(flushHistoryState, delay);
};

/** Merge only changed keys; never postpone the native URL change itself. */
export const updateHistoryState = (patch: EntryState) => {
  if (typeof window === 'undefined') return;
  const state = readHistoryState();
  const changes = Object.fromEntries(Object.entries(patch).filter(([key, value]) =>
    value === undefined ? Object.hasOwn(state, key) : !same(state[key], value)));
  if (!Object.keys(changes).length) return;
  const key = entryKey();
  pendingEntries.set(key, { ...pendingEntries.get(key), ...changes });
  // Retain recent entries for native Back without allowing an unbounded tab cache.
  if (pendingEntries.size > 80) pendingEntries.delete(pendingEntries.keys().next().value!);
  schedule();
};

/** Routing calls this before leaving, so the outgoing entry has the latest place. */
export function flushHistoryState(): boolean {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (typeof window === 'undefined') return true;
  const key = entryKey();
  const patch = pendingEntries.get(key);
  if (!patch) return true;
  const nativeState = window.history.state || {};
  const next = merge(nativeState, patch);
  if (same(nativeState, next)) { pendingEntries.delete(key); return true; }
  try {
    window.history.replaceState(next, '');
    pendingEntries.delete(key);
    return true;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'name' in error && error.name === 'SecurityError')) throw error;
    // Retain optional state if WebKit's budget is already exhausted. This must
    // not unmount the user's page; retry slowly and only on the current entry.
    schedule(1500);
    return false;
  }
}
