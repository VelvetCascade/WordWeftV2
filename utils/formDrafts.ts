export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface FormDraft<T> { version: 1; savedAt: number; value: T; revision?: string; deleted?: boolean; baseRevision?: string | null; conflict?: boolean }
export const formDraftKey = (owner: string, journey: string) => `wordweft:form-draft:v1:${encodeURIComponent(owner)}:${encodeURIComponent(journey)}`;
const identifier = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const revisionOf = (record: FormDraft<unknown> | null) => record?.revision || (record ? `legacy:${record.savedAt}` : null);

/** Each tab retains its conflicting copy; a newer canonical draft is never silently replaced. */
export function createFormDraftStore(storage: DraftStorage | null, variantId: string = identifier(), previousVariantId?: string) {
    const fallback = new Map<string, FormDraft<unknown>>();
    const read = (key: string): FormDraft<unknown> | null => {
        try { return fallback.get(key) || JSON.parse(storage?.getItem(key) || 'null'); } catch { return fallback.get(key) || null; }
    };
    const readCanonical = (key: string): FormDraft<unknown> | null => {
        try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return fallback.get(key) || null; }
    };
    const write = (key: string, record: FormDraft<unknown>): 'browser' | 'tab' => {
        try {
            if (!storage) throw new Error('Storage unavailable');
            storage.setItem(key, JSON.stringify(record)); fallback.delete(key); return 'browser';
        } catch { fallback.set(key, record); return 'tab'; }
    };
    const copyKey = (owner: string, journey: string) => `${formDraftKey(owner, journey)}:copy:${variantId}`;
    const removeCopy = (owner: string, journey: string) => {
        // A marker also prevents an older recovery alias from reappearing.
        write(copyKey(owner, journey), { version: 1, savedAt: Date.now(), value: null, deleted: true, revision: identifier() });
    };
    const compatible = <T>(record: FormDraft<unknown> | null, validate: (value: unknown) => value is T): record is FormDraft<T> =>
        !!record && !record.deleted && record.version === 1 && Number.isFinite(record.savedAt) && record.savedAt <= Date.now() + 60_000
        && Date.now() - record.savedAt <= 30 * 24 * 60 * 60 * 1000 && validate(record.value);
    return {
        revision: (owner: string, journey: string) => revisionOf(readCanonical(formDraftKey(owner, journey))),
        load<T>(owner: string, journey: string, validate: (value: unknown) => value is T): (FormDraft<T> & { conflict: boolean; location: 'browser' | 'tab' }) | null {
            const key = formDraftKey(owner, journey);
            const stored = readCanonical(key);
            const ownCopy = read(copyKey(owner, journey));
            const recoveryKey = ownCopy ? copyKey(owner, journey) : previousVariantId ? `${key}:copy:${previousVariantId}` : '';
            const copy = ownCopy || (recoveryKey ? read(recoveryKey) : null);
            if (compatible(copy, validate)) {
                const location = !ownCopy ? write(copyKey(owner, journey), copy) : fallback.has(recoveryKey) ? 'tab' : 'browser';
                return { ...copy,
                conflict: !!copy.conflict || (copy.baseRevision !== undefined && copy.baseRevision !== revisionOf(stored)),
                location };
            }
            if (fallback.get(key)?.deleted) return null;
            return compatible(stored, validate) ? { ...stored, conflict: false, location: fallback.has(key) ? 'tab' : 'browser' } : null;
        },
        loadStored<T>(owner: string, journey: string, validate: (value: unknown) => value is T): FormDraft<T> | null {
            const stored = readCanonical(formDraftKey(owner, journey)); return compatible(stored, validate) ? stored : null;
        },
        save<T>(owner: string, journey: string, value: T): 'browser' | 'tab' {
            const key = formDraftKey(owner, journey);
            const baseRevision = revisionOf(readCanonical(key));
            const record: FormDraft<T> = { version: 1, savedAt: Date.now(), value, revision: identifier(), baseRevision };
            const location = write(key, record);
            if (location === 'tab') { fallback.delete(key); fallback.set(copyKey(owner, journey), record); }
            else removeCopy(owner, journey);
            return location;
        },
        saveIfCurrent<T>(owner: string, journey: string, value: T, expected: string | null) {
            const key = formDraftKey(owner, journey);
            const record: FormDraft<T> = { version: 1, savedAt: Date.now(), value, revision: identifier(), baseRevision: expected };
            if (revisionOf(readCanonical(key)) !== expected) {
                return { conflict: true, location: write(copyKey(owner, journey), { ...record, conflict: true }), revision: expected };
            }
            const location = write(key, record);
            if (location === 'tab') { fallback.delete(key); fallback.set(copyKey(owner, journey), record); }
            else removeCopy(owner, journey);
            return { conflict: false, location, revision: location === 'browser' ? record.revision! : revisionOf(readCanonical(key)) };
        },
        removeIfCurrent(owner: string, journey: string, expected: string | null) {
            const key = formDraftKey(owner, journey);
            // Submission/discard removes only this tab's copy if another tab has newer work.
            removeCopy(owner, journey);
            if (revisionOf(readCanonical(key)) !== expected) return false;
            const location = write(key, { version: 1, savedAt: Date.now(), value: null, deleted: true, revision: identifier() });
            if (location === 'browser') return true;
            try { storage?.removeItem(key); return !!storage; } catch { return false; }
        },
        remove(owner: string, journey: string) {
            removeCopy(owner, journey);
            write(formDraftKey(owner, journey), { version: 1, savedAt: Date.now(), value: null, deleted: true, revision: identifier() });
        },
        removeCopy,
    };
}

let browserStore: ReturnType<typeof createFormDraftStore> | undefined;
let guestStore: ReturnType<typeof createFormDraftStore> | undefined;
// sessionStorage is cloned by a duplicated/opened tab. Every active document
// gets a fresh identity; its previous identity is only a recovery alias.
let documentIdentity: { current: string; previous?: string } | undefined;
function tabIdentifier() {
    if (documentIdentity) return documentIdentity;
    const current = identifier();
    let previous: string | undefined;
    try { previous = window.sessionStorage.getItem('wordweft:form-tab') || undefined; window.sessionStorage.setItem('wordweft:form-tab', current); } catch {}
    return documentIdentity = { current, previous };
}
export function formDraftStore(owner: string) {
    if (owner === 'guest') {
        if (!guestStore) { let storage: Storage | null = null; try { storage = window.sessionStorage; } catch {} guestStore = createFormDraftStore(storage, tabIdentifier().current, tabIdentifier().previous); }
        return guestStore;
    }
    if (!browserStore) { let storage: Storage | null = null; try { storage = window.localStorage; } catch {} browserStore = createFormDraftStore(storage, tabIdentifier().current, tabIdentifier().previous); }
    return browserStore;
}

/** Validate known fields, without interpreting browser data as executable content. */
export function isCompatibleForm<T extends object>(initial: T, candidate: unknown): candidate is T {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    return Object.entries(initial).every(([key, value]) => {
        const incoming = (candidate as Record<string, unknown>)[key];
        if (Array.isArray(value)) return Array.isArray(incoming) && incoming.every(item => typeof item === 'string');
        if (value === null) return incoming === null || typeof incoming === 'string';
        return typeof incoming === typeof value;
    });
}
