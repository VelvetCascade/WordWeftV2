export const JWT_STORAGE_KEY = 'wordweft_jwt';
export const AUTH_SESSION_INVALID_EVENT = 'wordweft:session-invalid';

type AuthStorage = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * A 401 can be an intentional sign-in gate for a public visitor. Only the
 * backend's explicit credential failure code proves that a cached session is
 * stale and may be removed.
 */
export function shouldInvalidateAuthSession(status: number, errorCode?: string): boolean {
    return status === 401 && errorCode === 'SESSION_INVALID';
}

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
