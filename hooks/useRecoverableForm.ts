import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formDraftKey, formDraftStore } from '../utils/formDrafts';

/** User/context-scoped recovery. Never pass passwords or File objects. */
export function useRecoverableForm<T extends object>(owner: string, journey: string, initial: T, validate: (value: unknown) => value is T) {
    const store = formDraftStore(owner);
    const scope = JSON.stringify([owner, journey]);
    const activeScope = useRef(scope); activeScope.current = scope;
    const initialize = () => {
        const recovery = store.load(owner, journey, validate);
        return { scope, value: recovery?.value ?? initial, restored: !!recovery, conflict: !!recovery?.conflict, revision: store.revision(owner, journey), notice: '', location: (recovery?.location ?? 'none') as 'browser' | 'tab' | 'none' };
    };
    const [state, setState] = useState(initialize);
    const current = state.scope === scope ? state : initialize();
    if (state.scope !== scope) setState(current);
    const scoped = useMemo(() => ({ initial, live: current.value, suspended: false, revision: current.revision, saved: JSON.stringify(current.value), location: current.location, conflict: current.conflict }), [scope]);
    scoped.live = current.value;
    const signature = JSON.stringify(current.value);
    const dirty = signature !== JSON.stringify(scoped.initial);
    const persistNow = useCallback(() => {
        if (scoped.suspended || JSON.stringify(scoped.live) === scoped.saved) return;
        const result = store.saveIfCurrent(owner, journey, scoped.live, scoped.conflict ? 'unresolved-conflict' : scoped.revision);
        scoped.revision = result.revision; scoped.saved = JSON.stringify(scoped.live); scoped.location = result.location; scoped.conflict = result.conflict;
        setState(previous => previous.scope === scope ? { ...previous, location: result.location, conflict: result.conflict } : previous);
    }, [owner, journey, scope, store, scoped]);
    useEffect(() => {
        // Web Locks serializes read/compare/write across participating browser tabs.
        // The synchronous store also detects revisions in browsers without it.
        if (navigator.locks?.request) void navigator.locks.request(formDraftKey(owner, journey), persistNow).catch(persistNow);
        else persistNow();
    }, [signature, persistNow, owner, journey]);
    useEffect(() => {
        const unload = (event: BeforeUnloadEvent) => {
            if (scoped.suspended || JSON.stringify(scoped.live) === JSON.stringify(scoped.initial)) return;
            persistNow();
            if (scoped.location === 'tab') { event.preventDefault(); event.returnValue = ''; }
        };
        window.addEventListener('beforeunload', unload);
        // Already-persisted snapshots must never be rewritten by stale cleanup.
        return () => window.removeEventListener('beforeunload', unload);
    }, [scoped, persistNow]);
    const clear = useCallback(() => {
        if (activeScope.current !== scope) return;
        scoped.suspended = true;
        const newer = store.revision(owner, journey) !== scoped.revision;
        const removed = store.removeIfCurrent(owner, journey, scoped.revision);
        const notice = removed ? '' : newer ? 'A newer unsent draft from another tab has been kept.' : 'Browser storage could not remove its older saved copy. It may reappear after restarting; clear this site’s stored data to remove it.';
        setState(previous => previous.scope === scope ? { ...previous, restored: false, conflict: false, location: 'none', notice } : previous);
    }, [owner, journey, scope, store, scoped]);
    const discard = useCallback(() => {
        if (activeScope.current !== scope) return;
        clear(); scoped.live = scoped.initial; scoped.saved = JSON.stringify(scoped.initial);
        scoped.revision = store.revision(owner, journey);
        setState(previous => previous.scope === scope ? { ...previous, value: scoped.initial, restored: false, conflict: false, location: 'none' } : previous);
    }, [clear, scope, scoped, store, owner, journey]);
    const update = useCallback((next: T | ((value: T) => T)) => {
        if (activeScope.current !== scope) return;
        scoped.suspended = false;
        setState(previous => previous.scope === scope ? { ...previous, value: typeof next === 'function' ? next(previous.value) : next } : previous);
    }, [scope, scoped]);
    const useStored = useCallback(() => {
        if (activeScope.current !== scope) return;
        const stored = store.loadStored(owner, journey, validate);
        const value = stored?.value ?? scoped.initial;
        store.removeCopy(owner, journey); scoped.revision = store.revision(owner, journey); scoped.live = value; scoped.saved = JSON.stringify(value); scoped.suspended = false; scoped.conflict = false;
        setState(previous => previous.scope === scope ? { ...previous, value, restored: !!stored, conflict: false, location: stored ? 'browser' : 'none' } : previous);
    }, [owner, journey, scope, store, scoped, validate]);
    const keepCurrent = useCallback(() => {
        if (activeScope.current !== scope) return;
        scoped.revision = store.revision(owner, journey); scoped.saved = ''; scoped.suspended = false; scoped.conflict = false;
        if (navigator.locks?.request) void navigator.locks.request(formDraftKey(owner, journey), persistNow).catch(persistNow);
        else persistNow();
    }, [scope, scoped, store, owner, journey, persistNow]);
    return { notice: current.notice, value: current.value, setValue: update, restored: current.restored, dirty, location: current.location, conflict: current.conflict, clear, discard, useStored, keepCurrent };
}
