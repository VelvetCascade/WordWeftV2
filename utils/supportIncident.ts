/** Only the bounded incident reference crosses into a support form, by explicit choice. */
export function supportIncidentReference(raw: string | null): string | null {
    try {
        if (!raw || raw.length > 40_000) return null;
        const items: unknown = JSON.parse(raw);
        if (!Array.isArray(items)) return null;
        const last = items.slice(-3).reverse().find(item => typeof item?.incidentId === 'string' && /^WW-[a-z0-9]{1,16}-[a-z0-9]{1,12}$/i.test(item.incidentId));
        return last?.incidentId || null;
    } catch { return null; }
}
export function latestSupportIncident(): string | null {
    try { return supportIncidentReference(window.sessionStorage.getItem('wordweft:recent-page-errors')); }
    catch { return null; }
}
