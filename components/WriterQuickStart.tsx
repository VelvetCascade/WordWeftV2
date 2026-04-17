import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '../types';

interface QuickStartStep {
    id: string;
    icon: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaAction: string;
    checkComplete: (user: User) => boolean;
}

const STEPS: QuickStartStep[] = [
    {
        id: 'create-book',
        icon: '📚',
        title: 'Create Your First Book',
        description: 'Set up a book with a cover, genres, and a compelling summary.',
        ctaLabel: 'Create Book →',
        ctaAction: '/write/book/create',
        checkComplete: (user) => (user.writtenBooks?.length || 0) > 0,
    },
    {
        id: 'add-characters',
        icon: '🧑‍🎨',
        title: 'Add Characters',
        description: 'Build your cast with names, roles, and portraits for your story.',
        ctaLabel: 'Add Characters →',
        ctaAction: 'MANAGE_FIRST_BOOK',
        checkComplete: () => !!localStorage.getItem('ww_qs_add-characters'),
    },
    {
        id: 'use-mentions',
        icon: '📝',
        title: 'Use @Mentions',
        description: 'Type @ in the editor to mention characters. They become interactive!',
        ctaLabel: 'Try It →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_use-mentions'),
    },
    {
        id: 'set-mood',
        icon: '🎭',
        title: 'Set the Mood',
        description: 'Use the Atmosphere Engine to add emotional color shifts to your scenes.',
        ctaLabel: 'See How →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_set-mood'),
    },
    {
        id: 'world-building',
        icon: '🗺️',
        title: 'Use World Building',
        description: 'Open the sidebar to organize your characters, scenes, and lore notes.',
        ctaLabel: 'Open Sidebar →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_world-building'),
    },
    {
        id: 'publish-chapter',
        icon: '🚀',
        title: 'Publish a Chapter',
        description: 'Share your writing with the world. Hit Publish and let readers discover you!',
        ctaLabel: 'Write →',
        ctaAction: 'WRITE_FIRST_CHAPTER',
        checkComplete: (user) => {
            const books = user.writtenBooks || [];
            return books.some(b => b.chapters.some(c => c.status === 'published'));
        },
    },
];

const STORAGE_HIDDEN = 'ww_quickstart_hidden';

interface WriterQuickStartProps {
    currentUser: User;
}

export const WriterQuickStart: React.FC<WriterQuickStartProps> = ({ currentUser }) => {
    const [isHidden, setIsHidden] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(STORAGE_HIDDEN)) {
            setIsHidden(true);
        }
    }, []);

    const completedSteps = STEPS.filter(s => s.checkComplete(currentUser));
    const completedCount = completedSteps.length;
    const totalSteps = STEPS.length;
    const allComplete = completedCount === totalSteps;
    const progressPercent = (completedCount / totalSteps) * 100;

    useEffect(() => {
        if (allComplete && !localStorage.getItem(STORAGE_HIDDEN)) {
            setShowCelebration(true);
            const timer = setTimeout(() => {
                localStorage.setItem(STORAGE_HIDDEN, 'true');
                setIsHidden(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [allComplete]);

    if (isHidden) return null;

    const handleCTA = (step: QuickStartStep) => {
        if (step.ctaAction === 'SHOW_DEMO') {
            // Mark as completed by showing demo
            localStorage.setItem(`ww_qs_${step.id}`, 'true');
            // Navigate to writing with demo shown
            const firstBook = currentUser.writtenBooks?.[0];
            if (firstBook) {
                const firstChapter = firstBook.chapters[0];
                if (firstChapter) {
                    window.location.hash = `/write/book/${firstBook.id}/chapter/${firstChapter.id}/edit`;
                } else {
                    window.location.hash = `/write/book/${firstBook.id}/chapter/new/edit`;
                }
            } else {
                window.location.hash = '/write/book/create';
            }
        } else if (step.ctaAction === 'MANAGE_FIRST_BOOK') {
            const firstBook = currentUser.writtenBooks?.[0];
            if (firstBook) {
                localStorage.setItem(`ww_qs_${step.id}`, 'true');
                window.location.hash = `/write/book/${firstBook.id}/manage`;
            } else {
                window.location.hash = '/write/book/create';
            }
        } else if (step.ctaAction === 'WRITE_FIRST_CHAPTER') {
            const firstBook = currentUser.writtenBooks?.[0];
            if (firstBook) {
                window.location.hash = `/write/book/${firstBook.id}/chapter/new/edit`;
            } else {
                window.location.hash = '/write/book/create';
            }
        } else {
            window.location.hash = step.ctaAction;
        }
    };

    return (
        <div className="writer-qs">
            {/* Header */}
            <div className="writer-qs-header">
                <div className="writer-qs-header-left">
                    <h3 className="writer-qs-title">
                        <span className="writer-qs-title-icon">🧭</span>
                        Quick Start Guide
                    </h3>
                    <p className="writer-qs-subtitle">
                        {allComplete
                            ? '🎉 You\'ve mastered the basics!'
                            : `${completedCount}/${totalSteps} completed — discover your writing superpowers`
                        }
                    </p>
                </div>
                <button
                    className="writer-qs-dismiss"
                    onClick={() => {
                        localStorage.setItem(STORAGE_HIDDEN, 'true');
                        setIsHidden(true);
                    }}
                >
                    Dismiss
                </button>
            </div>

            {/* Progress Bar */}
            <div className="writer-qs-progress-bar">
                <motion.div
                    className="writer-qs-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>

            {/* Cards */}
            <div className="writer-qs-cards">
                {STEPS.map((step, index) => {
                    const isComplete = step.checkComplete(currentUser);
                    return (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08, duration: 0.4 }}
                            className={`writer-qs-card ${isComplete ? 'writer-qs-card-done' : ''}`}
                        >
                            <div className="writer-qs-card-icon">
                                {isComplete ? '✅' : step.icon}
                            </div>
                            <h4 className="writer-qs-card-title">{step.title}</h4>
                            <p className="writer-qs-card-desc">{step.description}</p>
                            {!isComplete && (
                                <button
                                    className="writer-qs-card-cta"
                                    onClick={() => handleCTA(step)}
                                >
                                    {step.ctaLabel}
                                </button>
                            )}
                            {isComplete && (
                                <span className="writer-qs-card-complete-label">Completed</span>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Celebration Overlay */}
            <AnimatePresence>
                {showCelebration && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="writer-qs-celebration"
                    >
                        <span className="writer-qs-celebration-emoji">🎉</span>
                        <h3>You're a Pro!</h3>
                        <p>You've explored all the core writing tools. Happy writing!</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
