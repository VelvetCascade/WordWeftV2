
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ToastConfig } from '../components/FeedbackToast';
import type { ModalConfig } from '../components/FeedbackModal';
import * as cooldown from '../utils/feedbackCooldown';
import * as api from '../api/client';

const TOAST_CONFIGS: Record<string, { message: string; buttons: { label: string; value: number }[] }> = {
    FIRST_EXPERIENCE: {
        message: 'How was your first experience?',
        buttons: [
            { label: 'Smooth', value: 3 },
            { label: 'Okay', value: 2 },
            { label: 'Confusing', value: 1 },
        ],
    },
    PUBLISH_FLOW: {
        message: 'Did publishing feel clear?',
        buttons: [
            { label: 'Yes', value: 3 },
            { label: 'Mostly', value: 2 },
            { label: 'No', value: 1 },
        ],
    },
    READING_EXPERIENCE: {
        message: 'Was reading comfortable?',
        buttons: [
            { label: 'Yes', value: 3 },
            { label: 'Okay', value: 2 },
            { label: 'No', value: 1 },
        ],
    },
    COMMENT_SYSTEM: {
        message: 'Was discussion easy to use?',
        buttons: [
            { label: 'Yes', value: 3 },
            { label: 'Okay', value: 2 },
            { label: 'No', value: 1 },
        ],
    },
};

export type FeedbackTriggerType =
    | 'FIRST_EXPERIENCE'
    | 'PUBLISH_FLOW'
    | 'READING_EXPERIENCE'
    | 'COMMENT_SYSTEM'
    | 'EXIT_FEEDBACK'
    | 'POWER_USER';

export function useFeedbackTriggers() {
    const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
    const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const readingStartRef = useRef<number>(0);
    const exitListenerRef = useRef(false);

    // On mount: record session day, mark session start, check banner
    useEffect(() => {
        cooldown.recordSessionDay();
        cooldown.markSessionStart();

        // Banner check (delayed to not compete with page load)
        const bannerTimer = setTimeout(() => {
            if (cooldown.canShowBanner() && cooldown.canShowFeedback()) {
                setShowBanner(true);
                cooldown.recordBannerShown();
            }
        }, 10000); // Show banner after 10s

        return () => clearTimeout(bannerTimer);
    }, []);

    // Exit intent listener
    useEffect(() => {
        if (exitListenerRef.current) return;
        exitListenerRef.current = true;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const sessionMinutes = cooldown.getSessionDurationMinutes();
            if (sessionMinutes >= 5 && cooldown.canShowFeedback() && !cooldown.wasDismissed('EXIT_FEEDBACK')) {
                // We can't show our custom modal on beforeunload reliably,
                // but we can use the browser's native prompt as a fallback.
                // The real exit feedback is triggered by visibilitychange instead.
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const sessionMinutes = cooldown.getSessionDurationMinutes();
                if (sessionMinutes >= 5 && !cooldown.wasDismissed('EXIT_FEEDBACK')) {
                    // Store pending exit feedback flag for next visit
                    sessionStorage.setItem('ww_pending_exit_feedback', 'true');
                }
            } else if (document.visibilityState === 'visible') {
                // User came back — check if we should show exit feedback
                const pending = sessionStorage.getItem('ww_pending_exit_feedback');
                if (pending === 'true' && cooldown.canShowFeedback()) {
                    sessionStorage.removeItem('ww_pending_exit_feedback');
                    setModalConfig({
                        mode: 'exit',
                        feedbackType: 'EXIT_FEEDBACK',
                        title: 'Before you go',
                        subtitle: 'Anything frustrating today?',
                    });
                    cooldown.recordShown();
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Power user check (after enough session days)
    useEffect(() => {
        const timer = setTimeout(() => {
            const dayCount = cooldown.getSessionDayCount();
            if (dayCount >= 3 && !cooldown.wasDismissed('POWER_USER') && cooldown.canShowFeedback()) {
                setModalConfig({
                    mode: 'power_user',
                    feedbackType: 'POWER_USER',
                    title: 'Can we ask a few deeper questions?',
                    subtitle: "You've been using WordWeft for a while — your perspective matters.",
                });
                cooldown.recordShown();
            }
        }, 30000); // Check after 30s to not interrupt early actions

        return () => clearTimeout(timer);
    }, []);

    /** Trigger a contextual feedback popup from any page component */
    const triggerFeedback = useCallback((type: FeedbackTriggerType, delayMs = 2000) => {
        setTimeout(() => {
            if (!cooldown.canShowFeedback()) return;
            if (cooldown.wasDismissed(type)) return;

            const config = TOAST_CONFIGS[type];
            if (config) {
                setToastConfig({ ...config, feedbackType: type });
                cooldown.recordShown();
            }
        }, delayMs);
    }, []);

    /** Start tracking reading time (call when entering reader) */
    const startReadingTimer = useCallback(() => {
        readingStartRef.current = Date.now();
    }, []);

    /** Check reading duration and maybe trigger (call on reader unmount or chapter change) */
    const checkReadingDuration = useCallback(() => {
        if (readingStartRef.current) {
            const elapsed = (Date.now() - readingStartRef.current) / 60000;
            if (elapsed >= 10) {
                triggerFeedback('READING_EXPERIENCE', 1000);
            }
            readingStartRef.current = 0;
        }
    }, [triggerFeedback]);

    /** Handle toast quick response */
    const handleToastRespond = useCallback(async (feedbackType: string, rating: number) => {
        try {
            await api.submitQuickFeedback({
                feedbackType,
                rating,
                page: window.location.hash,
                sessionId: cooldown.getSessionId(),
            });
        } catch { /* silent fail */ }

        // If low rating, open detail modal for follow-up
        if (rating <= 1) {
            setTimeout(() => {
                setModalConfig({
                    mode: 'detail',
                    feedbackType,
                    title: 'Sorry to hear that',
                    subtitle: 'Can you tell us a bit more?',
                });
            }, 500);
        }

        setToastConfig(null);
    }, []);

    /** Handle toast dismiss */
    const handleToastDismiss = useCallback(() => {
        if (toastConfig) {
            cooldown.recordDismissed(toastConfig.feedbackType);
        }
        setToastConfig(null);
    }, [toastConfig]);

    /** Handle modal submit */
    const handleModalSubmit = useCallback(async (feedbackType: string, data: { shortResponse?: string; longResponse?: string }) => {
        try {
            await api.submitQuickFeedback({
                feedbackType,
                ...data,
                page: window.location.hash,
                sessionId: cooldown.getSessionId(),
            });
        } catch { /* silent fail */ }
    }, []);

    /** Handle modal dismiss */
    const handleModalDismiss = useCallback(() => {
        if (modalConfig) {
            cooldown.recordDismissed(modalConfig.feedbackType);
        }
        setModalConfig(null);
    }, [modalConfig]);

    /** Handle banner dismiss */
    const handleBannerDismiss = useCallback(() => {
        setShowBanner(false);
        cooldown.recordDismissed('GENERAL_BANNER');
    }, []);

    /** Open full feedback form */
    const openFullFeedback = useCallback(() => {
        window.location.hash = '/feedback';
    }, []);

    return {
        // State for rendering
        toastConfig,
        modalConfig,
        showBanner,
        // Trigger function for page components
        triggerFeedback,
        startReadingTimer,
        checkReadingDuration,
        // Handlers
        handleToastRespond,
        handleToastDismiss,
        handleModalSubmit,
        handleModalDismiss,
        handleBannerDismiss,
        openFullFeedback,
    };
}
