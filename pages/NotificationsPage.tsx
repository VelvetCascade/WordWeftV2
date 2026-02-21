import React, { useState, useEffect, useCallback } from 'react';
import type { AppNotification, User, NavigateTo, NotificationPreferences } from '../types';
import type { Page } from '../App';
import * as api from '../api/client';

interface NotificationsPageProps {
    currentUser: User | null;
    navigateTo: NavigateTo;
    onLogout: () => void;
    notifications: AppNotification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    unreadCount: number;
    hasMore: boolean;
    onLoadMore: () => void;
    isLoading: boolean;
}

const FILTER_TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'SOCIAL', label: 'Social' },
    { key: 'STORIES', label: 'Stories' },
    { key: 'SYSTEM', label: 'System' },
];

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

const getTypeCategory = (type: string): string => {
    if (['NEW_FOLLOWER', 'NEW_COMMENT', 'COMMENT_REPLY'].includes(type)) return 'SOCIAL';
    if (['AUTHOR_NEW_CHAPTER', 'AUTHOR_NEW_STORY', 'BOOK_UPDATE'].includes(type)) return 'STORIES';
    return 'SYSTEM';
};

const getNotificationTarget = (n: AppNotification): Page | null => {
    switch (n.type) {
        case 'NEW_FOLLOWER':
            return { name: 'author', authorId: n.entityId };
        case 'NEW_COMMENT':
        case 'COMMENT_REPLY':
        case 'AUTHOR_NEW_CHAPTER':
            return n.metadata?.bookId ? { name: 'book-details', bookId: n.metadata.bookId } : null;
        case 'AUTHOR_NEW_STORY':
        case 'BOOK_UPDATE':
            return { name: 'book-details', bookId: n.entityId };
        default:
            return null;
    }
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
    currentUser, navigateTo, onLogout, notifications, onMarkRead,
    onMarkAllRead, unreadCount, hasMore, onLoadMore, isLoading,
}) => {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        follows: true, comments: true, storyUpdates: true, systemAnnouncements: true,
    });

    // Load preferences from user
    useEffect(() => {
        if (currentUser) {
            const userPrefs = (currentUser as any).notificationPreferences;
            if (userPrefs) {
                setPreferences(userPrefs);
            }
        }
    }, [currentUser]);

    const handlePreferenceChange = async (key: keyof NotificationPreferences) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPrefs);
        try {
            await api.updateNotificationPreferences(newPrefs);
        } catch (e) {
            // Revert on error
            setPreferences(preferences);
        }
    };

    // Filter notifications
    const filtered = notifications.filter(n => {
        const matchesFilter = activeFilter === 'ALL' || getTypeCategory(n.type) === activeFilter;
        const matchesSearch = !searchQuery ||
            n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.metadata?.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.metadata?.bookTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary, #f8fafc)' }}>
            <main style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
                }}>
                    <div>
                        <h1 style={{
                            margin: 0, fontSize: '24px', fontWeight: 700,
                            color: 'var(--text-primary, #1a1a2e)',
                        }}>
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary, #94a3b8)' }}>
                                {unreadCount} unread
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllRead}
                                style={{
                                    padding: '8px 14px', fontSize: '13px', fontWeight: 500,
                                    background: 'var(--accent-color, #6366f1)', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            style={{
                                padding: '8px 14px', fontSize: '13px', fontWeight: 500,
                                background: 'var(--bg-primary, #ffffff)', color: 'var(--text-secondary, #64748b)',
                                border: '1px solid rgba(128,128,128,0.15)', borderRadius: '8px', cursor: 'pointer',
                            }}
                        >
                            ⚙ Settings
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div style={{
                        background: 'var(--bg-primary, #ffffff)', borderRadius: '12px',
                        border: '1px solid rgba(128,128,128,0.12)', padding: '20px',
                        marginBottom: '20px',
                    }}>
                        <h3 style={{
                            margin: '0 0 16px', fontSize: '15px', fontWeight: 600,
                            color: 'var(--text-primary, #1a1a2e)',
                        }}>
                            Notification Preferences
                        </h3>
                        {[
                            { key: 'follows' as const, label: 'Follows', desc: 'When someone follows you' },
                            { key: 'comments' as const, label: 'Comments', desc: 'Comments on your chapters and replies' },
                            { key: 'storyUpdates' as const, label: 'Story Updates', desc: 'New chapters and stories from authors you follow' },
                            { key: 'systemAnnouncements' as const, label: 'System', desc: 'Platform updates and announcements' },
                        ].map(({ key, label, desc }) => (
                            <div key={key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 0',
                                borderBottom: key !== 'systemAnnouncements' ? '1px solid rgba(128,128,128,0.08)' : 'none',
                            }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary, #1a1a2e)' }}>
                                        {label}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)' }}>
                                        {desc}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePreferenceChange(key)}
                                    style={{
                                        width: '44px', height: '24px', borderRadius: '12px',
                                        border: 'none', cursor: 'pointer',
                                        background: preferences[key] ? 'var(--accent-color, #6366f1)' : 'rgba(128,128,128,0.2)',
                                        position: 'relative', transition: 'background 0.2s',
                                        flexShrink: 0,
                                    }}
                                >
                                    <span style={{
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        background: 'white', position: 'absolute', top: '3px',
                                        left: preferences[key] ? '23px' : '3px',
                                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                    }} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter Tabs */}
                <div style={{
                    display: 'flex', gap: '4px', marginBottom: '16px',
                    background: 'var(--bg-primary, #ffffff)', borderRadius: '10px',
                    padding: '4px', border: '1px solid rgba(128,128,128,0.1)',
                }}>
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            style={{
                                flex: 1, padding: '8px 12px', border: 'none',
                                borderRadius: '8px', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 500,
                                background: activeFilter === tab.key ? 'var(--accent-color, #6366f1)' : 'transparent',
                                color: activeFilter === tab.key ? 'white' : 'var(--text-secondary, #64748b)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notifications..."
                        style={{
                            width: '100%', padding: '10px 14px',
                            border: '1px solid rgba(128,128,128,0.15)',
                            borderRadius: '10px', fontSize: '13.5px',
                            background: 'var(--bg-primary, #ffffff)',
                            color: 'var(--text-primary, #1a1a2e)',
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Notification List */}
                <div style={{
                    background: 'var(--bg-primary, #ffffff)', borderRadius: '12px',
                    border: '1px solid rgba(128,128,128,0.12)', overflow: 'hidden',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{
                            padding: '60px 20px', textAlign: 'center',
                            color: 'var(--text-tertiary, #94a3b8)',
                        }}>
                            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔔</span>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>
                                {searchQuery ? 'No matching notifications' : 'No notifications yet'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                                {searchQuery ? 'Try a different search term' : "You're all caught up!"}
                            </p>
                        </div>
                    ) : (
                        filtered.map(n => (
                            <button
                                key={n.id}
                                onClick={() => {
                                    if (!n.read) onMarkRead(n.id);
                                    const target = getNotificationTarget(n);
                                    if (target) navigateTo(target);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                    width: '100%', padding: '14px 16px', border: 'none',
                                    background: n.read ? 'transparent' : 'rgba(var(--accent-rgb, 99,102,241), 0.05)',
                                    cursor: 'pointer', textAlign: 'left',
                                    borderBottom: '1px solid rgba(128,128,128,0.08)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,0.06)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(var(--accent-rgb, 99,102,241), 0.05)')}
                            >
                                {/* Icon / Avatar */}
                                {n.metadata?.actorAvatar ? (
                                    <img src={n.metadata.actorAvatar} alt=""
                                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                    <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>
                                        {getNotificationIcon(n.type)}
                                    </span>
                                )}

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        margin: 0, fontSize: '14px', lineHeight: 1.5,
                                        color: 'var(--text-primary, #1a1a2e)',
                                        fontWeight: n.read ? 400 : 500,
                                    }}>
                                        {n.metadata?.actorName && (
                                            <strong style={{ fontWeight: 600 }}>{n.metadata.actorName} </strong>
                                        )}
                                        {n.message}
                                    </p>
                                    {n.metadata?.bookTitle && (
                                        <p style={{
                                            margin: '2px 0 0', fontSize: '12px',
                                            color: 'var(--accent-color, #6366f1)',
                                        }}>
                                            📖 {n.metadata.bookTitle}
                                        </p>
                                    )}
                                    <span style={{
                                        fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)',
                                        marginTop: '4px', display: 'block',
                                    }}>
                                        {getTimeAgo(n.createdAt)}
                                    </span>
                                </div>

                                {/* Unread dot */}
                                {!n.read && (
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: 'var(--accent-color, #6366f1)',
                                        flexShrink: 0, marginTop: '10px',
                                    }} />
                                )}
                            </button>
                        ))
                    )}

                    {/* Load More */}
                    {hasMore && filtered.length > 0 && (
                        <button
                            onClick={onLoadMore}
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '14px', border: 'none',
                                background: 'none', cursor: isLoading ? 'default' : 'pointer',
                                fontSize: '13px', fontWeight: 500,
                                color: 'var(--accent-color, #6366f1)',
                            }}
                        >
                            {isLoading ? 'Loading...' : 'Load more'}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};
