
import React, { createContext, useContext } from 'react';
import type { FeedbackTriggerType } from '../hooks/useFeedbackTriggers';

interface FeedbackContextType {
    triggerFeedback: (type: FeedbackTriggerType, delayMs?: number) => void;
    startReadingTimer: () => void;
    checkReadingDuration: () => void;
}

export const FeedbackContext = createContext<FeedbackContextType>({
    triggerFeedback: () => { },
    startReadingTimer: () => { },
    checkReadingDuration: () => { },
});

export const useFeedback = () => useContext(FeedbackContext);
