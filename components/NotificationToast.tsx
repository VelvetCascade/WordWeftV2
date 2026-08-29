
import React, { useEffect, useState } from 'react';
import type { AppNotification, NavigateTo } from '../types';
import type { Page } from '../App';
import { communityNotificationPostId } from '../utils/community';

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
        <>
            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
            `}</style>
            <div
                onClick={handleClick}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    maxWidth: '360px', width: '100%',
                    background: 'var(--bg-primary, #ffffff)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(128,128,128,0.12)',
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    cursor: 'pointer', zIndex: 10000,
                    animation: isVisible ? 'toastSlideIn 0.3s ease-out' : 'toastSlideOut 0.3s ease-in',
                    transition: 'transform 0.3s, opacity 0.3s',
                }}
            >
                {/* Icon / Avatar */}
                {notification.metadata?.actorAvatar ? (
                    <img
                        src={notification.metadata.actorAvatar}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                ) : (
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>
                        {getNotificationIcon(notification.type)}
                    </span>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontSize: '13px', lineHeight: 1.4,
                        color: 'var(--text-primary, #1a1a2e)',
                    }}>
                        {notification.metadata?.actorName && (
                            <strong>{notification.metadata.actorName} </strong>
                        )}
                        {notification.message}
                    </p>
                </div>

                {/* Close button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-tertiary, #94a3b8)', fontSize: '18px',
                        padding: '0 2px', lineHeight: 1, flexShrink: 0,
                    }}
                >
                    ×
                </button>
            </div>
        </>
    );
};
