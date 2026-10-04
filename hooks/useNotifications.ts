
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppNotification } from '../types';
import * as api from '../api/client';
import { createReconnectController } from '../utils/runtimeLifecycle';

interface UseNotificationsReturn {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: string;
    hasMore: boolean;
    toastNotification: AppNotification | null;
    loadMore: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismissToast: () => void;
    refresh: () => void;
}

export function useNotifications(isLoggedIn: boolean, ownerId = 'current-account'): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notificationsRequestRef = useRef(false);
    const notificationsRef = useRef(notifications);
    notificationsRef.current = notifications;
    const pendingRead = useRef(new Set<string>());
    const pendingAllRead = useRef(false);

    const identity = `${isLoggedIn}:${ownerId}`;
    const identityRef = useRef(identity);
    const stateOwnerRef = useRef(identity);
    const generationRef = useRef(0);
    if (identityRef.current !== identity) { identityRef.current = identity; generationRef.current += 1; }

    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        if (!isLoggedIn) return;
        const generation = generationRef.current;
        try {
            const count = await api.getUnreadNotificationCount();
            if (generation !== generationRef.current) return;
            setUnreadCount(count);
        } catch (e) {
            if (generation === generationRef.current) setError('Notifications could not be refreshed.');
        }
    }, [isLoggedIn, ownerId]);

    // Fetch notifications
    const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
        if (!isLoggedIn || notificationsRequestRef.current) return;
        const generation = generationRef.current;
        notificationsRequestRef.current = true;
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getNotifications(pageNum, 20);
            if (generation !== generationRef.current) return;
            if (append) {
                setNotifications(prev => [...prev, ...data.notifications]);
            } else {
                setNotifications(data.notifications);
            }
            setHasMore(data.hasNext);
        } catch (e) {
            if (generation === generationRef.current) setError('Notifications could not be loaded. Please try again.');
        } finally {
            if (generation === generationRef.current) { notificationsRequestRef.current = false; setIsLoading(false); }
        }
    }, [isLoggedIn, ownerId]);

    // Initial load
    useEffect(() => {
        stateOwnerRef.current = identity;
        notificationsRequestRef.current = false; pendingRead.current.clear(); pendingAllRead.current = false;
        setNotifications([]); notificationsRef.current = []; setUnreadCount(0); setPage(0); setHasMore(true); setToastNotification(null); setError('');
        if (isLoggedIn) {
            fetchUnreadCount();
            fetchNotifications(0);
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setError('');
        }
    }, [isLoggedIn, ownerId, fetchUnreadCount, fetchNotifications]);

    // SSE connection
    useEffect(() => {
        if (!isLoggedIn) return;

        const generation = generationRef.current;
        let connectSSE: () => void;
        const reconnectController = createReconnectController(() => connectSSE(), 5000);

        connectSSE = () => {
            const url = api.getNotificationStreamUrl();
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.addEventListener('notification', (event) => {
                if (generation !== generationRef.current) return;
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
                if (generation !== generationRef.current) return;
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
    }, [isLoggedIn, ownerId]);

    // Periodic unread count poll as fallback (every 60s)
    useEffect(() => {
        if (!isLoggedIn) return;
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [isLoggedIn, ownerId, fetchUnreadCount]);

    const loadMore = useCallback(() => {
        if (!notificationsRequestRef.current && !isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchNotifications(nextPage, true);
        }
    }, [isLoading, hasMore, page, fetchNotifications]);

    const markAsRead = useCallback(async (id: string) => {
        if (pendingAllRead.current || pendingRead.current.has(id) || !notificationsRef.current.some(n => n.id === id && !n.read)) return;
        const generation = generationRef.current;
        pendingRead.current.add(id);
        notificationsRef.current = notificationsRef.current.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(notificationsRef.current);
        setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            await api.markNotificationRead(id);
        } catch (e) {
            if (generation !== generationRef.current) return;
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
            setUnreadCount(prev => prev + 1);
            setError('That notification could not be marked as read. Try again.');
        } finally { if (generation === generationRef.current) pendingRead.current.delete(id); }
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (pendingAllRead.current || pendingRead.current.size) return;
        const generation = generationRef.current;
        pendingAllRead.current = true;
        const changed = new Set(notificationsRef.current.filter(n => !n.read).map(n => n.id));
        notificationsRef.current = notificationsRef.current.map(n => ({ ...n, read: true }));
        setNotifications(notificationsRef.current);
        setUnreadCount(0);
        try {
            await api.markAllNotificationsRead();
        } catch (e) {
            if (generation !== generationRef.current) return;
            setNotifications(prev => prev.map(n => changed.has(n.id) ? { ...n, read: false } : n));
            await fetchUnreadCount();
            setError('Notifications could not be marked as read. Try again.');
        } finally { if (generation === generationRef.current) pendingAllRead.current = false; }
    }, [fetchUnreadCount]);

    const dismissToast = useCallback(() => {
        setToastNotification(null);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    }, []);

    const refresh = useCallback(() => {
        if (notificationsRequestRef.current) return;
        setError('');
        setPage(0);
        fetchNotifications(0);
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    const belongsToAccount = stateOwnerRef.current === identity;
    return {
        notifications: belongsToAccount ? notifications : [],
        unreadCount: belongsToAccount ? unreadCount : 0,
        isLoading,
        error,
        hasMore,
        toastNotification: belongsToAccount ? toastNotification : null,
        loadMore,
        markAsRead,
        markAllAsRead,
        dismissToast,
        refresh,
    };
}
