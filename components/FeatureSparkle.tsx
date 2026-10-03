import React, { useState, useEffect } from 'react';
import { readOptionalTip, writeOptionalTip } from '../utils/optionalStorage';
import '../styles/optional-tips.css';

interface FeatureSparkleProps {
    featureId: string;
    tooltip: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: React.ReactNode;
    delay?: number;
}

const STORAGE_PREFIX = 'ww_sparkle_dismissed_';

export const FeatureSparkle: React.FC<FeatureSparkleProps> = ({
    featureId,
    tooltip,
    position = 'right',
    children,
    delay = 2000,
}) => {
    const [visible, setVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        setVisible(false);
        setShowTooltip(false);
        const dismissed = readOptionalTip(`${STORAGE_PREFIX}${featureId}`) === 'true';
        if (dismissed) return;

        const timer = setTimeout(() => {
            if (readOptionalTip(`${STORAGE_PREFIX}${featureId}`) !== 'true') setVisible(true);
        }, delay);
        return () => clearTimeout(timer);
    }, [featureId, delay]);

    const handleDismiss = () => {
        setVisible(false);
        setShowTooltip(false);
        writeOptionalTip(`${STORAGE_PREFIX}${featureId}`, 'true');
    };

    const handleChildClick = () => {
        handleDismiss();
    };

    const positionClasses: Record<string, string> = {
        top: 'sparkle-pos-top',
        bottom: 'sparkle-pos-bottom',
        left: 'sparkle-pos-left',
        right: 'sparkle-pos-right',
    };

    return (
        <div
            className="sparkle-wrapper"
            onClick={handleChildClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setShowTooltip(false);
            }}
        >
            {children}
            {visible && <div
                className={`sparkle-indicator ${positionClasses[position]}`}
            >
                {/* Pulsing rings */}
                <span className="sparkle-ring sparkle-ring-1" />
                <span className="sparkle-ring sparkle-ring-2" />
                <span className="sparkle-dot" />

                {/* Tooltip */}
                {showTooltip && (
                    <div className={`sparkle-tooltip sparkle-tooltip-${position}`}>
                        <span>{tooltip}</span>
                        <button
                            type="button"
                            className="sparkle-tooltip-dismiss"
                            aria-label="Dismiss tip"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss();
                            }}
                        >
                            X
                        </button>
                    </div>
                )}
            </div>}
        </div>
    );
};
