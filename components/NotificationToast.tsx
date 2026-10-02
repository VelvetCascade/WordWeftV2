
import React, { useEffect, useState } from 'react';
import type { AppNotification, NavigateTo } from '../types';
import type { Page } from '../App';
import { communityNotificationPostId } from '../utils/community';
import { notificationCopy } from '../utils/notificationPresentation';
import '../styles/notification-toast.css';

interface NotificationToastProps {
    notification: AppNotification | null;
    onDismiss: () => void;
    onNavigate: NavigateTo;
}

const getNotificationIcon = (type: string): string => {
    switch (type) {
        case 'COMMUNITY_COMMENT': return '💬';
        case 'COMMUNITY_REPLY': return '↩️';
        case 'COMMUNITY_RELEASE': return '📚';
        case 'NEW_FOLLOWER': return '👤';
        case 'NEW_COMMENT': return '💬';
        case 'COMMENT_REPLY': return '↩️';
        case 'AUTHOR_NEW_CHAPTER': return '📖';
        case 'AUTHOR_NEW_STORY': return '📚';
        case 'BOOK_UPDATE': return '🔔';
        case 'SYSTEM_UPDATE': return '⚙️';
        default: return '🔔';
    }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss, onNavigate }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            // Small delay for enter animation
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [notification]);

    if (!notification) return null;
    const { actor, message } = notificationCopy(notification);

    const handleClick = () => {
        onDismiss();
        const postId = communityNotificationPostId(notification);
        if (postId) { onNavigate({ name: 'community-post', postId }); return; }
        // Navigate based on type
        switch (notification.type) {
            case 'NEW_FOLLOWER':
                onNavigate({ name: 'author', authorId: notification.entityId });
                break;
            case 'NEW_COMMENT':
            case 'COMMENT_REPLY':
            case 'AUTHOR_NEW_CHAPTER':
                if (notification.metadata?.bookId) {
                    onNavigate({ name: 'book-details', bookId: notification.metadata.bookId });
                }
                break;
            case 'AUTHOR_NEW_STORY':
            case 'BOOK_UPDATE':
                onNavigate({ name: 'book-details', bookId: notification.entityId });
                break;
        }
    };

    return (
            <div className="ww-notification-toast" data-visible={isVisible}>
            <button type="button" className="ww-notification-toast-open" aria-label={`Open notification: ${actor ? actor + ' ' : ''}${message}`}
                onClick={handleClick}
            >
                {/* Icon / Avatar */}
                {notification.metadata?.actorAvatar ? (
                    <img
                        src={notification.metadata.actorAvatar}
                        alt=""
                        className="ww-notification-toast-avatar"
                    />
                ) : (
                    <span className="ww-notification-toast-icon" aria-hidden="true">
                        {getNotificationIcon(notification.type)}
                    </span>
                )}

                {/* Content */}
                <span className="ww-notification-toast-copy" role="status">
                    {actor && <strong>{actor} </strong>}{message}
                </span>
            </button>

                {/* Close button */}
                <button
                    type="button" className="ww-notification-toast-dismiss" aria-label="Dismiss notification"
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                >
                    ×
                </button>
            </div>
    );
};
