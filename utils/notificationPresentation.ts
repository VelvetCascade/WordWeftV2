import type { AppNotification } from '../types';

/** Older notifications include the actor in the message; newer ones send it as metadata. */
export function notificationCopy(notification: Pick<AppNotification, 'message' | 'metadata'>) {
    const actor = notification.metadata?.actorName?.trim() || '';
    const message = notification.message?.trim() || '';
    const alreadyNamed = actor && message.toLocaleLowerCase().startsWith(`${actor.toLocaleLowerCase()} `);
    return { actor, message: alreadyNamed ? message.slice(actor.length).trimStart() : message };
}
