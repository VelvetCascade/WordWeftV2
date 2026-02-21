import React, { useState, useEffect } from 'react';

export const WhatsNewPopup: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);

    useEffect(() => {
        // We only trigger when auth is valid, as the parent controls mounting this.
        // Ensure we run on client safely
        const hasSeenPopup = localStorage.getItem('hasSeenWhatsNewPopup_v1');

        if (!hasSeenPopup) {
            // Delay before popping up to allow the user entry context
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        } else {
            setHasDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        setTimeout(() => setHasDismissed(true), 500);
    };

    const handleDiscover = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenWhatsNewPopup_v1', 'true');
        setTimeout(() => {
            setHasDismissed(true);
            window.location.hash = '/features';
        }, 300); // Give it a brief moment to animate away before navigating
    };

    if (hasDismissed) return null;

    return (
        <div className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] transition-all duration-500 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
            <div className="bg-surface dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border shadow-xl rounded-2xl p-5 w-[calc(100vw-2rem)] sm:w-88 md:w-96 relative overflow-hidden group">
                {/* Decorative corner element */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-accent/15 rounded-full blur-2xl"></div>

                {/* Dismiss trigger */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-gray-400 hover:text-text-body dark:hover:text-dark-text-body transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Dismiss whats new popup"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-start space-x-4 relative z-10">
                    <div className="bg-gradient-to-br from-accent/20 to-accent/5 text-accent p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm border border-accent/10">
                        {/* Sparkle Icon */}
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </div>
                    <div className="flex-1 pr-3">
                        <h4 className="font-sans font-bold text-text-rich dark:text-dark-text-rich text-lg mb-1.5 align-middle">
                            Discover What's New!
                        </h4>
                        <p className="text-sm text-text-body dark:text-dark-text-body mb-5 leading-relaxed">
                            We've added powerful new tools to elevate your storytelling experience on WordWeft. See what we've been building!
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleDiscover}
                                className="flex-1 bg-accent/90 text-white font-sans font-medium text-sm py-2 px-4 rounded-lg hover:bg-accent transition-all active:scale-[0.98] shadow-sm hover:shadow"
                            >
                                See Features
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
