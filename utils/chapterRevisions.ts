export function revisionReasonLabel(reason: string): string {
    switch (reason?.toUpperCase()) {
        case 'AUTOSAVE': return 'Automatic backup';
        case 'MANUAL_SAVE': return 'Manual save';
        case 'PUBLISH': return 'Before publishing';
        case 'STATUS_CHANGE': return 'Before status change';
        case 'PRE_RESTORE': return 'Before a restore';
        default: return 'Saved version';
    }
}
