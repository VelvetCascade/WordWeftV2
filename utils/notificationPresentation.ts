import type { AppNotification } from '../types';

/** Older notifications include the actor in the message; newer ones send it as metadata. */
export function notificationCopy(notification: Pick<AppNotification, 'message' | 'metadata'>) {
    const actor = notification.metadata?.actorName?.trim() || '';
    const message = notification.message?.trim() || '';
    const alreadyNamed = actor && message.toLocaleLowerCase().startsWith(`${actor.toLocaleLowerCase()} `);
    return { actor, message: alreadyNamed ? message.slice(actor.length).trimStart() : message };
}

export function groupNotificationDays<T extends {createdAt: string}>(notifications: T[]): Array<{day: string; items: T[]}> {
    const groups = new Map<string, T[]>();
    for (const notification of [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
        const date = new Date(notification.createdAt);
        const day = Number.isNaN(date.getTime()) ? 'Earlier activity' : date.toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'});
        groups.set(day, [...(groups.get(day) || []), notification]);
    }
    return [...groups].map(([day, items]) => ({day, items}));
}
export function notificationAction(type: string): string {
    if (type.startsWith('COMMUNITY_')) return 'View thread';
    if (type.includes('COMMENT') || type.includes('REPLY')) return 'View discussion';
    if (type === 'AUTHOR_NEW_CHAPTER') return 'Read chapter';
    if (type === 'NEW_FOLLOWER') return 'View profile';
    return 'View story';
}
