
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppNotification } from '../types';
import * as api from '../api/client';
import { createReconnectController } from '../utils/runtimeLifecycle';

interface UseNotificationsReturn {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    hasMore: boolean;
    toastNotification: AppNotification | null;
    loadMore: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismissToast: () => void;
    refresh: () => void;
}

export function useNotifications(isLoggedIn: boolean): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const count = await api.getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (e) {
            // Silently fail
        }
    }, [isLoggedIn]);

    // Fetch notifications
    const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
        if (!isLoggedIn) return;
        setIsLoading(true);
        try {
            const data = await api.getNotifications(pageNum, 20);
            if (append) {
                setNotifications(prev => [...prev, ...data.notifications]);
            } else {
                setNotifications(data.notifications);
            }
            setHasMore(data.hasNext);
        } catch (e) {
            // Silently fail
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn]);

    // Initial load
    useEffect(() => {
        if (isLoggedIn) {
            fetchUnreadCount();
            fetchNotifications(0);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isLoggedIn, fetchUnreadCount, fetchNotifications]);

    // SSE connection
    useEffect(() => {
        if (!isLoggedIn) return;

        let connectSSE: () => void;
        const reconnectController = createReconnectController(() => connectSSE(), 5000);

        connectSSE = () => {
            const url = api.getNotificationStreamUrl();
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.addEventListener('notification', (event) => {
                try {
                    const notification: AppNotification = JSON.parse(event.data);
                    setNotifications(prev => [notification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show toast
                    setToastNotification(notification);
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    toastTimeoutRef.current = setTimeout(() => {
                        setToastNotification(null);
                    }, 5000);
                } catch (e) {
                    // Silently fail
                }
            });

            es.addEventListener('unread-count', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setUnreadCount(data.count);
                } catch (e) {
                    // Silently fail
                }
            });

            es.onerror = () => {
                es.close();
                if (eventSourceRef.current === es) eventSourceRef.current = null;
                reconnectController.schedule();
            };
        };

        connectSSE();

        return () => {
            reconnectController.dispose();
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, [isLoggedIn]);

    // Periodic unread count poll as fallback (every 60s)
    useEffect(() => {
        if (!isLoggedIn) return;
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [isLoggedIn, fetchUnreadCount]);

    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchNotifications(nextPage, true);
        }
    }, [isLoading, hasMore, page, fetchNotifications]);

    const markAsRead = useCallback(async (id: string) => {
        try {
            await api.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            // Silently fail
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (e) {
            // Silently fail
        }
    }, []);

    const dismissToast = useCallback(() => {
        setToastNotification(null);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    }, []);

    const refresh = useCallback(() => {
        setPage(0);
        fetchNotifications(0);
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    return {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        toastNotification,
        loadMore,
        markAsRead,
        markAllAsRead,
        dismissToast,
        refresh,
    };
}
