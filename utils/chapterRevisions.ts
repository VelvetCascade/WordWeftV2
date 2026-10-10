export function revisionReasonLabel(reason: string): string {
    switch (reason?.toUpperCase()) {
        case 'AUTOSAVE': return 'Automatic backup';
        case 'MANUAL_SAVE': return 'Manual save';
        case 'PUBLISH': return 'Before publishing';
        case 'PUBLISHED_RELEASE': return 'Published version';
        case 'STATUS_CHANGE': return 'Before status change';
        case 'PRE_RESTORE': return 'Before a restore';
        case 'CHECKPOINT': return 'Named checkpoint';
        default: return 'Saved version';
    }
}
