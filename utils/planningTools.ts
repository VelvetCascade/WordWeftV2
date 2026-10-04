/** Saved planning records must never be used as mutable edit buffers. */
export function copyPlanningDraft<T extends object>(record: T): T {
    return structuredClone(record);
}

export function notifyPlanningUpdated(bookId: string) {
    window.dispatchEvent(new CustomEvent('wordweft:planning-updated', { detail: { bookId } }));
}
