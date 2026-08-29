import React, { useState, useEffect } from 'react';

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
        const dismissed = localStorage.getItem(`${STORAGE_PREFIX}${featureId}`);
        if (dismissed) return;

        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [featureId, delay]);

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem(`${STORAGE_PREFIX}${featureId}`, 'true');
    };

    const handleChildClick = () => {
        handleDismiss();
    };

    if (!visible) return <>{children}</>;

    const positionClasses: Record<string, string> = {
        top: 'sparkle-pos-top',
        bottom: 'sparkle-pos-bottom',
        left: 'sparkle-pos-left',
        right: 'sparkle-pos-right',
    };

    return (
        <div className="sparkle-wrapper" onClick={handleChildClick}>
            {children}
            <div
                className={`sparkle-indicator ${positionClasses[position]}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
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
                            className="sparkle-tooltip-dismiss"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss();
                            }}
                        >
                            X
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
