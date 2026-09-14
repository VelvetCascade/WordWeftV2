export const JWT_STORAGE_KEY = 'wordweft_jwt';
export const AUTH_SESSION_INVALID_EVENT = 'wordweft:session-invalid';

type AuthStorage = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * Remove a rejected browser session and tell the React shell immediately.
 * The event is emitted only when a token actually existed so concurrent 401s
 * cannot repeatedly reset the application.
 */
export function invalidateAuthSession(
    storage: AuthStorage = localStorage,
    notify: () => void = () => window.dispatchEvent(new Event(AUTH_SESSION_INVALID_EVENT)),
): boolean {
    if (!storage.getItem(JWT_STORAGE_KEY)) return false;

    storage.removeItem(JWT_STORAGE_KEY);
    notify();
    return true;
}
