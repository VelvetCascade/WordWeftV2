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
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-background transition-colors duration-300 pb-20 md:pb-0">
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 md:py-8">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
                    <div>
                        <h1 className="font-sans text-2xl md:text-3xl font-bold text-text-rich dark:text-dark-text-rich m-0">
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <p className="font-sans mt-1 text-[13px] font-medium text-gray-500 dark:text-gray-400">
                                {unreadCount} unread
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllRead}
                                className="px-3.5 py-2 text-[13px] font-sans font-semibold bg-accent text-white rounded-lg hover:bg-primary transition-colors hover:shadow-md"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="px-3.5 py-2 text-[13px] font-sans font-semibold bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-text-body dark:text-dark-text-body rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors shadow-sm"
                        >
                            ⚙ Settings
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-5 mb-5 animate-fade-in">
                        <h3 className="font-sans m-0 mb-4 text-[15px] font-bold text-text-rich dark:text-dark-text-rich">
                            Notification Preferences
                        </h3>
                        {[
                            { key: 'follows' as const, label: 'Follows', desc: 'When someone follows you' },
                            { key: 'comments' as const, label: 'Comments', desc: 'Comments on your chapters and replies' },
                            { key: 'storyUpdates' as const, label: 'Story Updates', desc: 'New chapters and stories from authors you follow' },
                            { key: 'systemAnnouncements' as const, label: 'System Announcements', desc: 'Updates from the developers' },
                        ].map(({ key, label, desc }, i, arr) => (
                            <div key={key} className={`flex items-center justify-between py-3 ${i !== arr.length - 1 ? 'border-b border-gray-100 dark:border-dark-border' : ''}`}>
                                <div>
                                    <p className="font-sans m-0 text-sm font-semibold text-text-body dark:text-dark-text-body">
                                        {label}
                                    </p>
                                    <p className="font-sans m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                        {desc}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePreferenceChange(key)}
                                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${preferences[key] ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-200 transform ${preferences[key] ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-1 mb-4 bg-white dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-dark-border shadow-sm overflow-x-auto scrollbar-hide">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`flex-[1_0_auto] px-3 md:px-0 md:flex-1 py-2 border-none rounded-lg font-sans text-[13px] font-semibold transition-colors ${activeFilter === tab.key ? 'bg-accent text-white shadow' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface-alt'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notifications..."
                        className="w-full px-4 py-2.5 font-sans text-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-text-body dark:text-dark-text-body outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
                    />
                </div>

                {/* Notification List */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden shadow-sm">
                    {filtered.length === 0 ? (
                        <div className="py-16 px-5 text-center">
                            <span className="text-4xl block mb-3 opacity-80">🔔</span>
                            <p className="font-sans m-0 text-[15px] font-semibold text-text-rich dark:text-dark-text-rich">
                                {searchQuery ? 'No matching notifications' : 'No notifications yet'}
                            </p>
                            <p className="font-sans mt-1 text-[13px] text-gray-500 dark:text-gray-400">
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
                                className={`flex items-start gap-4 w-full p-4 border-b border-gray-100 dark:border-dark-border last:border-0 text-left transition-colors ${!n.read ? 'bg-accent/5 dark:bg-accent/10 hover:bg-accent/10 dark:hover:bg-accent/20' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-dark-surface-alt'}`}
                            >
                                {/* Icon / Avatar */}
                                {n.metadata?.actorAvatar ? (
                                    <img src={n.metadata.actorAvatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-surface-alt flex items-center justify-center flex-shrink-0 text-xl shadow-inner text-gray-700 dark:text-gray-300">
                                        {getNotificationIcon(n.type)}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 font-sans">
                                    <p className={`m-0 text-sm leading-relaxed ${!n.read ? 'font-semibold text-text-rich dark:text-dark-text-rich' : 'font-medium text-text-body dark:text-dark-text-body'}`}>
                                        {n.metadata?.actorName && (
                                            <span className="font-bold text-accent dark:text-accent mr-1 hover:underline">{n.metadata.actorName}</span>
                                        )}
                                        {n.message}
                                    </p>
                                    {n.metadata?.bookTitle && (
                                        <p className="font-sans m-0 mt-1 text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                                            📖 {n.metadata.bookTitle}
                                        </p>
                                    )}
                                    <span className="font-sans text-xs font-medium text-gray-400 dark:text-gray-500 mt-1.5 block">
                                        {getTimeAgo(n.createdAt)}
                                    </span>
                                </div>

                                {/* Unread dot */}
                                {!n.read && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0 mt-3 shadow" />
                                )}
                            </button>
                        ))
                    )}

                    {/* Load More */}
                    {hasMore && filtered.length > 0 && (
                        <button
                            onClick={onLoadMore}
                            disabled={isLoading}
                            className="w-full p-3.5 font-sans text-sm font-semibold text-accent disabled:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors focus:outline-none"
                        >
                            {isLoading ? 'Loading...' : 'Load more'}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};
