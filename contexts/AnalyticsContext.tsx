
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { analytics } from '../utils/analyticsService';

// --- Context Type ---

interface AnalyticsContextType {
    trackEvent: (
        category: string,
        action: string,
        label?: string,
        value?: number,
        metadata?: Record<string, any>
    ) => void;
    trackPageView: (pagePath: string, previousPage?: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
    trackEvent: () => {},
    trackPageView: () => {},
});

// --- Provider ---

interface AnalyticsProviderProps {
    children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            analytics.init();

            // Track session start
            analytics.trackEvent('session', 'session_start');
        }

        return () => {
            analytics.destroy();
        };
    }, []);

    const contextValue: AnalyticsContextType = {
        trackEvent: (category, action, label?, value?, metadata?) => {
            analytics.trackEvent(category, action, label, value, metadata);
        },
        trackPageView: (pagePath, previousPage?) => {
            analytics.trackPageView(pagePath, previousPage);
        },
    };

    return (
        <AnalyticsContext.Provider value={contextValue}>
            {children}
        </AnalyticsContext.Provider>
    );
};

// --- Hook ---

export const useAnalytics = (): AnalyticsContextType => {
    return useContext(AnalyticsContext);
};

export default AnalyticsContext;
