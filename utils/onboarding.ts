export type ExperienceRole = 'reader' | 'writer' | 'both';
export const MAX_FAVORITE_GENRES = 8;
export function onboardingSteps(role: ExperienceRole): number[] {
    return role === 'reader' ? [0, 1, 3, 4] : role === 'writer' ? [0, 1, 2, 4] : [0, 1, 2, 3, 4];
}
export const firstRoleStep = (role: ExperienceRole) => onboardingSteps(role)[2];
export const isQuietJourney = (page: string) => ['reader', 'writer-edit-chapter', 'writer-create-book', 'writer-manage-book', 'edit-profile', 'writer-settings', 'founding-writers', 'auth', 'reset-password', 'hook-feed'].includes(page);
export function canOfferOptionalPrompt() {
    const active = document.activeElement;
    return !document.hidden && !document.querySelector('[role="dialog"][aria-modal="true"]')
        && !(active instanceof HTMLElement && (active.isContentEditable || active.matches('input,textarea,select')));
}
