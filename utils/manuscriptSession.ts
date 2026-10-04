export interface DeviceManuscriptDraft {
    title: string;
    content: string;
    contentWarnings: string[];
    disclaimerNote: string;
    baseRevision?: number;
    savedAt?: string;
}

/** A successful write alone is insufficient: read back the exact draft before allowing an exit. */
export function verifyDeviceDraft(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, draft: DeviceManuscriptDraft): boolean {
    try {
        const serialized = JSON.stringify(draft);
        storage.setItem(key, serialized);
        return storage.getItem(key) === serialized;
    } catch { return false; }
}

export function manuscriptSessionId(storage?: Pick<Storage, 'getItem' | 'setItem'>, key = 'ww:manuscript-session'): string {
    try {
        const existing = storage?.getItem(key);
        if (existing) return existing;
    } catch { /* Keep an in-memory session when browser storage is blocked. */ }
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    try { storage?.setItem(key, id); } catch { /* Recovery still works in the current tab. */ }
    return id;
}
