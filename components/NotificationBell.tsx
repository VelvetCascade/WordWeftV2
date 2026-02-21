
import React, { useState, useRef, useEffect } from 'react';
import type { AppNotification, NavigateTo } from '../types';
import type { Page } from '../App';

// --- Icons ---
const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// --- Notification Item ---
const getNotificationIcon = (type: string): string => {
    switch (type) {
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

const getTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const getNotificationTarget = (n: AppNotification): Page | null => {
    switch (n.type) {
        case 'NEW_FOLLOWER':
            return { name: 'author', authorId: n.entityId };
        case 'NEW_COMMENT':
        case 'COMMENT_REPLY':
        case 'AUTHOR_NEW_CHAPTER': {
            const bookId = n.metadata?.bookId;
            if (bookId) return { name: 'book-details', bookId };
            return null;
        }
        case 'AUTHOR_NEW_STORY':
        case 'BOOK_UPDATE': {
            return { name: 'book-details', bookId: n.entityId };
        }
        default:
            return null;
    }
};

interface NotificationItemProps {
    notification: AppNotification;
    onRead: (id: string) => void;
    onNavigate: NavigateTo;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onNavigate }) => {
    const handleClick = () => {
        if (!notification.read) onRead(notification.id);
        const target = getNotificationTarget(notification);
        if (target) onNavigate(target);
    };

    return (
        <button
            onClick={handleClick}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                width: '100%', padding: '12px 16px', border: 'none',
                background: notification.read ? 'transparent' : 'rgba(var(--accent-rgb, 99,102,241), 0.06)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                borderBottom: '1px solid rgba(128,128,128,0.1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = notification.read ? 'transparent' : 'rgba(var(--accent-rgb, 99,102,241), 0.06)')}
        >
            {/* Avatar or Icon */}
            <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
                {notification.metadata?.actorAvatar ? (
                    <img
                        src={notification.metadata.actorAvatar}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    />
                ) : (
                    <span>{getNotificationIcon(notification.type)}</span>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0, fontSize: '13.5px', lineHeight: 1.4,
                    color: 'var(--text-primary, #1a1a2e)',
                    fontWeight: notification.read ? 400 : 500,
                }}>
                    {notification.metadata?.actorName && (
                        <strong style={{ fontWeight: 600 }}>{notification.metadata.actorName} </strong>
                    )}
                    {notification.message}
                </p>
                <span style={{
                    fontSize: '11.5px', color: 'var(--text-tertiary, #94a3b8)',
                    marginTop: '3px', display: 'block',
                }}>
                    {getTimeAgo(notification.createdAt)}
                </span>
            </div>

            {/* Unread dot */}
            {!notification.read && (
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--accent-color, #6366f1)',
                    flexShrink: 0, marginTop: '8px',
                }} />
            )}
        </button>
    );
};

// --- Bell Component ---
interface NotificationBellProps {
    unreadCount: number;
    notifications: AppNotification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onNavigate: NavigateTo;
    hasMore: boolean;
    onLoadMore: () => void;
    isLoading: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    unreadCount, notifications, onMarkRead, onMarkAllRead,
    onNavigate, hasMore, onLoadMore, isLoading,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [isOpen]);

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors relative"
            >
                <BellIcon className="w-6 h-6 text-text-body dark:text-dark-text-body" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '2px', right: '2px',
                        background: '#ef4444', color: 'white',
                        fontSize: '10px', fontWeight: 700,
                        minWidth: '16px', height: '16px',
                        borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', lineHeight: 1,
                        animation: 'notifBadgePulse 2s ease-in-out infinite',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: '380px', maxHeight: '480px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    overflow: 'hidden', zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Header */}
                    <div className="border-b border-gray-200 dark:border-dark-border" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                    }}>
                        <h3 className="text-text-body dark:text-dark-text-body" style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllRead}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '12px', color: 'var(--accent-color, #6366f1)',
                                    fontWeight: 500,
                                }}
                            >
                                <CheckIcon /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div className="text-text-body dark:text-dark-text-body" style={{
                                padding: '40px 20px', textAlign: 'center',
                                fontSize: '13px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.5 }}>
                                    <BellIcon className="w-8 h-8 text-text-body dark:text-dark-text-body" />
                                </div>
                                No notifications yet
                            </div>
                        ) : (
                            <>
                                {notifications.slice(0, 10).map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        onRead={onMarkRead}
                                        onNavigate={(page: Page) => { setIsOpen(false); onNavigate(page); }}
                                    />
                                ))}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <button
                            onClick={() => { setIsOpen(false); onNavigate({ name: 'notifications' }); }}
                            className="text-accent border-t border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface-alt"
                            style={{
                                width: '100%', padding: '12px', border: 'none',
                                borderTop: '1px solid',
                                background: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 500,
                            }}
                        >
                            View all notifications
                        </button>
                    )}
                </div>
            )}

            {/* CSS Animation */}
            <style>{`
                @keyframes notifBadgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
};
