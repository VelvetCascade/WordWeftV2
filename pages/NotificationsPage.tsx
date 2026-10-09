import { Bell, BookOpen, MessageCircle, CornerDownRight, UserPlus, Settings2, CheckCheck } from 'lucide-react';
import '../styles/account-v2.css';
import React, { useState, useEffect, useCallback } from 'react';
import type { AppNotification, User, NavigateTo, NotificationPreferences } from '../types';
import type { Page } from '../App';
import { communityNotificationPostId } from '../utils/community';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { ResilientImage } from '../components/ResilientImage';
import { notificationCopy, groupNotificationDays, notificationAction } from '../utils/notificationPresentation';
import { ReturnNavigation } from '../components/ReturnNavigation';

interface NotificationsPageProps {
    currentUser: User | null;
    onPreferencesChange?: (preferences: NotificationPreferences) => void;
    navigateTo: NavigateTo;
    onLogout: () => void;
    notifications: AppNotification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    unreadCount: number;
    hasMore: boolean;
    onLoadMore: () => void;
    isLoading: boolean;
    error: string;
    onRetry: () => void;
}

const FILTER_TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'UNREAD', label: 'Unread' },
    { key: 'SOCIAL', label: 'Social' },
    { key: 'COMMUNITY', label: 'Community' },
    { key: 'STORIES', label: 'Stories' },
    { key: 'SYSTEM', label: 'System' },
];

const getNotificationIcon = (type: string): React.ReactNode => {
    const Icon = type.includes('REPLY') ? CornerDownRight : type.includes('COMMENT') ? MessageCircle : type === 'NEW_FOLLOWER' ? UserPlus : type.includes('CHAPTER') || type.includes('STORY') || type.includes('RELEASE') ? BookOpen : type === 'SYSTEM_UPDATE' ? Settings2 : Bell;
    return <Icon size={19} strokeWidth={1.6} aria-hidden="true" />;
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
    if (type.startsWith('COMMUNITY_')) return 'COMMUNITY';
    if (['NEW_FOLLOWER', 'NEW_COMMENT', 'COMMENT_REPLY'].includes(type)) return 'SOCIAL';
    if (['AUTHOR_NEW_CHAPTER', 'AUTHOR_NEW_STORY', 'BOOK_UPDATE'].includes(type)) return 'STORIES';
    return 'SYSTEM';
};

const getNotificationTarget = (n: AppNotification): Page | null => {
    const postId = communityNotificationPostId(n);
    if (postId) return { name: 'community-post', postId };
    switch (n.type) {
        case 'NEW_FOLLOWER':
            return { name: 'author', authorId: n.entityId };
        case 'NEW_COMMENT':
        case 'COMMENT_REPLY':
        case 'AUTHOR_NEW_CHAPTER':
            return n.metadata?.bookId ? { name: 'reader', bookId: n.metadata.bookId, chapterId: n.metadata.chapterId || n.entityId, chapterIndex: -1 } : null;
        case 'AUTHOR_NEW_STORY':
        case 'BOOK_UPDATE':
            return { name: 'book-details', bookId: n.entityId };
        default:
            return null;
    }
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
    currentUser, onPreferencesChange, navigateTo, onLogout, notifications, onMarkRead,
    onMarkAllRead, unreadCount, hasMore, onLoadMore, isLoading, error, onRetry,
}) => {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [verticalFilters, setVerticalFilters] = useState(() => window.matchMedia('(min-width: 1000px)').matches);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 1000px)');
        const sync = () => setVerticalFilters(query.matches);
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);
    const { trackEvent } = useAnalytics();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        follows: true, comments: true, storyUpdates: true, systemAnnouncements: true,
    });
    const [pendingPreference, setPendingPreference] = useState<keyof NotificationPreferences | null>(null);
    const [preferenceError, setPreferenceError] = useState('');

    // Load preferences from user
    useEffect(() => {
        if (currentUser) {
            const userPrefs = currentUser.notificationPreferences;
            if (userPrefs) {
                setPreferences(userPrefs);
            }
        }
    }, [currentUser]);

    const handlePreferenceChange = async (key: keyof NotificationPreferences) => {
        if (pendingPreference) return;
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPendingPreference(key);
        setPreferenceError('');
        setPreferences(newPrefs);
        try {
            const saved = await api.updateNotificationPreferences(newPrefs);
            setPreferences(saved);
            onPreferencesChange?.(saved);
        } catch (e) {
            // Revert on error
            setPreferences(preferences);
            setPreferenceError('That preference could not be saved. Please try again.');
        } finally {
            setPendingPreference(null);
        }
    };

    // Filter notifications
    const filtered = notifications.filter(n => {
        const matchesFilter = activeFilter === 'ALL' || (activeFilter === 'UNREAD' ? !n.read : getTypeCategory(n.type) === activeFilter);
        const matchesSearch = !searchQuery ||
            n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.metadata?.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.metadata?.bookTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="account-v2-notifications min-h-screen flex flex-col bg-gray-50 dark:bg-dark-background transition-colors duration-300 pb-20 xl:pb-0">
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 md:py-8">
                <ReturnNavigation fallbackPath="/edit-profile" fallbackLabel="Back to settings" />
                {/* Header */}
                <div className="ww-notifications-header flex flex-wrap items-center justify-between mb-6 gap-3">
                    <div>
                        <p className="ww-page-eyebrow">Your activity</p>
                        <h1 className="font-sans text-2xl md:text-3xl font-bold text-text-rich dark:text-dark-text-rich m-0">
                            Notifications
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">New chapters, replies, and the people around your stories.</p>
                        {unreadCount > 0 && (
                            <p className="font-sans mt-1 text-[13px] font-medium text-gray-500 dark:text-gray-400">
                                {unreadCount} unread
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                                disabled={unreadCount === 0}
                                onClick={onMarkAllRead}
                                className="px-3.5 py-2 text-[13px] font-sans font-semibold bg-accent text-white rounded-lg hover:bg-primary transition-colors hover:shadow-md"
                            >
                                <CheckCheck size={17} aria-hidden="true" /> {unreadCount ? 'Mark all read' : 'All read'}
                            </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            aria-expanded={showSettings}
                            aria-controls="notification-preferences"
                            className="px-3.5 py-2 text-[13px] font-sans font-semibold bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-text-body dark:text-dark-text-body rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors shadow-sm"
                        >
                            <Settings2 size={17} aria-hidden="true" /> Preferences
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div id="notification-preferences" className="ww-notification-preferences bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-5 mb-5 animate-fade-in">
                        <h3 className="font-sans m-0 mb-4 text-[15px] font-bold text-text-rich dark:text-dark-text-rich">
                            Notification Preferences
                        </h3>
                        {preferenceError && <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{preferenceError}</p>}
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
                                    role="switch"
                                    aria-checked={preferences[key]}
                                    aria-label={`${label} notifications`}
                                    aria-busy={pendingPreference === key}
                                    disabled={pendingPreference !== null}
                                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${preferences[key] ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-200 transform ${preferences[key] ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                        <span>{error}</span>
                        <button type="button" onClick={onRetry} className="font-bold underline">Try again</button>
                    </div>
                )}

                <div className="ww-notification-workspace"><div className="ww-notification-filters">
                {/* Filter Tabs */}
                <div role="tablist" aria-label="Notification filters" aria-orientation={verticalFilters ? 'vertical' : 'horizontal'} onKeyDown={event => {
                    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
                    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
                    const index = items.indexOf(event.target as HTMLButtonElement);
                    if (index < 0) return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                    items[next]?.click(); items[next]?.focus();
                }} className="ww-notification-tabs flex gap-1 mb-4 bg-white dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-dark-border shadow-sm overflow-x-auto scrollbar-hide">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={activeFilter === tab.key}
                            tabIndex={activeFilter === tab.key ? 0 : -1}
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
                        aria-label="Search notifications"
                        className="w-full px-4 py-2.5 font-sans text-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-text-body dark:text-dark-text-body outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
                    />
                </div>

                </div>
                {/* Notification List */}
                <div className="ww-notification-list bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden shadow-sm">
                    {filtered.length === 0 ? (
                        <div className="py-16 px-5 text-center">
                            <Bell className="w-9 h-9 mx-auto mb-4 text-teal-700" strokeWidth={1.5} aria-hidden="true" />
                            <p className="font-sans m-0 text-[15px] font-semibold text-text-rich dark:text-dark-text-rich">
                                {searchQuery ? 'No matching notifications' : 'No notifications yet'}
                            </p>
                            <p className="font-sans mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                                {searchQuery ? 'Try a different search term' : "You're all caught up!"}
                            </p>
                        </div>
                    ) : (
                        groupNotificationDays(filtered).map(group => <section key={group.day} aria-label={group.day}><h2 className="ww-notification-day">{group.day}</h2>{group.items.map(n => (
                            <button
                                key={n.id}
                                onClick={() => {
                                    if (!n.read) onMarkRead(n.id);
                                    const target = getNotificationTarget(n);
                                    if (target?.name === 'reader' && ['NEW_COMMENT', 'COMMENT_REPLY'].includes(n.type)) {
                                        window.location.hash = `/book/${encodeURIComponent(target.bookId)}/chapter/${encodeURIComponent(target.chapterId || '')}?discussion=all${n.metadata?.commentId ? `&comment=${encodeURIComponent(n.metadata.commentId)}` : ''}`;
                                    } else if (target) navigateTo(target);
                                }}
                                className={`ww-notification-row ww-arrive-quiet ${!n.read ? 'unread' : ''} flex items-start gap-4 w-full p-4 border-b border-gray-100 dark:border-dark-border last:border-0 text-left transition-colors ${!n.read ? 'bg-accent/5 dark:bg-accent/10 hover:bg-accent/10 dark:hover:bg-accent/20' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-dark-surface-alt'}`}
                            >
                                {/* Icon / Avatar */}
                                {n.metadata?.actorAvatar ? (
                                    <ResilientImage src={n.metadata.actorAvatar} alt={n.metadata.actorName || 'Notification sender'} fallbackLabel={n.metadata.actorName} className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm" />
                                ) : (
                                    <div className="ww-notification-symbol w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-surface-alt flex items-center justify-center flex-shrink-0 text-xl shadow-inner text-gray-700 dark:text-gray-300">
                                        {getNotificationIcon(n.type)}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="ww-notification-copy flex-1 min-w-0 font-sans">
                                    <p className={`m-0 text-sm leading-relaxed ${!n.read ? 'font-semibold text-text-rich dark:text-dark-text-rich' : 'font-medium text-text-body dark:text-dark-text-body'}`}>
                                        {n.metadata?.actorName && (
                                            <span className="font-bold text-accent dark:text-accent mr-1">{n.metadata.actorName}</span>
                                        )}
                                        {notificationCopy(n).message}
                                    </p>
                                    {n.metadata?.bookTitle && (
                                        <p className="ww-notification-book font-sans m-0 mt-1 text-xs font-semibold text-accent">
                                            <BookOpen size={14} aria-hidden="true" /> {n.metadata.bookTitle}
                                        </p>
                                    )}
                                    <span className="ww-notification-time font-sans text-xs font-medium text-gray-400 dark:text-gray-500 mt-1.5 block">
                                        {getTimeAgo(n.createdAt)}
                                    </span>
                                    {getNotificationTarget(n) && <span className="ww-notification-action">{notificationAction(n.type)} →</span>}
                                </div>
                                {/* Unread dot */}
                                {!n.read && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0 mt-3"><span className="sr-only">Unread</span></span>
                                )}
                            </button>
                        ))}</section>)
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
                </div>
            </main>
        </div>
    );
};
