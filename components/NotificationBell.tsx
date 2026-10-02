import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Bell, BookOpen, CheckCheck, MessageCircle, Reply, Settings, UserRound, X } from 'lucide-react';
import type { AppNotification, NavigateTo } from '../types';
import type { Page } from '../App';
import { communityNotificationPostId } from '../utils/community';
import { useDialog } from '../hooks/useDialog';
import { ResilientImage } from './ResilientImage';
import { notificationCopy } from '../utils/notificationPresentation';
import '../styles/notifications-v2.css';

const getNotificationIcon = (type: string) => {
    if (type === 'NEW_FOLLOWER') return UserRound;
    if (type.includes('REPLY')) return Reply;
    if (type.includes('COMMENT')) return MessageCircle;
    if (type === 'SYSTEM_UPDATE') return Settings;
    if (type.includes('CHAPTER') || type.includes('STORY') || type === 'COMMUNITY_RELEASE') return BookOpen;
    return Bell;
};

const getTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (!Number.isFinite(date.getTime())) return 'Recently';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : date.toLocaleDateString();
};

const getNotificationTarget = (notification: AppNotification): Page | null => {
    const postId = communityNotificationPostId(notification);
    if (postId) return { name: 'community-post', postId };
    switch (notification.type) {
        case 'NEW_FOLLOWER': return { name: 'author', authorId: notification.entityId };
        case 'NEW_COMMENT':
        case 'COMMENT_REPLY':
        case 'AUTHOR_NEW_CHAPTER':
            return notification.metadata?.bookId ? { name: 'book-details', bookId: notification.metadata.bookId } : null;
        case 'AUTHOR_NEW_STORY':
        case 'BOOK_UPDATE': return { name: 'book-details', bookId: notification.entityId };
        default: return null;
    }
};

interface NotificationBellProps {
    unreadCount: number;
    notifications: AppNotification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onNavigate: NavigateTo;
    hasMore: boolean;
    onLoadMore: () => void;
    isLoading: boolean;
    error?: string;
    onRetry?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    unreadCount, notifications, onMarkRead, onMarkAllRead, onNavigate,
    hasMore, onLoadMore, isLoading, error, onRetry,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dialogRef = useDialog(isOpen, () => setIsOpen(false));
    useEffect(() => {
        const close = () => setIsOpen(false);
        window.addEventListener('wordweft:navigate', close);
        window.addEventListener('popstate', close);
        return () => {
            window.removeEventListener('wordweft:navigate', close);
            window.removeEventListener('popstate', close);
        };
    }, []);

    return <>
        <button className="v2-icon-button v2-notifications-trigger" onClick={() => setIsOpen(true)}
            aria-label="Notifications" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="notification-preview">
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && <span className="v2-notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {isOpen && createPortal(
            <div className="v2-notifications-scrim" onMouseDown={event => { if (event.target === event.currentTarget) setIsOpen(false); }}>
                <div id="notification-preview" ref={dialogRef} className="v2-notifications-panel" role="dialog" aria-modal="true" aria-label="Notification preview" tabIndex={-1}>
                    <header className="v2-notifications-heading">
                        <div><small>YOUR READING & WRITING</small><h2>Notifications</h2></div>
                        <button className="v2-icon-button" aria-label="Close notifications" onClick={() => setIsOpen(false)}><X size={20} /></button>
                    </header>
                    {unreadCount > 0 && <div className="v2-notifications-tools"><span>{unreadCount} unread</span><button disabled={isLoading} onClick={onMarkAllRead}><CheckCheck size={17} />Mark all read</button></div>}
                    {error && <div className="v2-notifications-error" role="alert"><p>{error}</p>{onRetry && <button onClick={onRetry} disabled={isLoading}>Try again</button>}</div>}
                    <div className="v2-notifications-list" aria-busy={isLoading}>
                        {notifications.map(notification => {
                            const Icon = getNotificationIcon(notification.type);
                            const copy = notificationCopy(notification);
                            return <button className={`v2-notification-item ${notification.read ? '' : 'is-unread'}`} key={notification.id} onClick={() => {
                                if (!notification.read) onMarkRead(notification.id);
                                const target = getNotificationTarget(notification);
                                if (target) { setIsOpen(false); onNavigate(target); }
                            }}>
                                {notification.metadata?.actorAvatar ? <ResilientImage src={notification.metadata.actorAvatar} alt="" fallbackLabel={notification.metadata.actorName || 'Reader'} className="v2-notification-avatar" /> : <span className="v2-notification-icon"><Icon size={19} /></span>}
                                <span className="v2-notification-copy"><span>{copy.actor && <strong>{copy.actor} </strong>}{copy.message}</span><time dateTime={notification.createdAt}>{getTimeAgo(notification.createdAt)}</time></span>
                                {!notification.read && <span className="v2-notification-unread" aria-label="Unread" />}
                            </button>;
                        })}
                        {notifications.length === 0 && !error && <div className="v2-notifications-empty"><Bell size={28} /><h3>{isLoading ? 'Loading your updates…' : 'You’re all caught up.'}</h3><p>{isLoading ? 'Your notifications will appear here.' : 'New chapters, conversations, and followers will appear here.'}</p></div>}
                        {hasMore && notifications.length > 0 && !error && <button className="v2-notifications-load" onClick={onLoadMore} disabled={isLoading}>{isLoading ? 'Loading…' : 'Load earlier notifications'}</button>}
                    </div>
                    <button className="v2-notifications-footer" onClick={() => { setIsOpen(false); onNavigate({ name: 'notifications' }); }}>View all notifications <ArrowRight size={17} /></button>
                </div>
            </div>, document.querySelector('.ww-app') || document.body
        )}
    </>;
};
