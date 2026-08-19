import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '../types';
import {
    BookOpenIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    CloudArrowUpIcon,
    PencilSquareIcon,
    SparklesIcon,
    Squares2X2Icon,
    UserGroupIcon,
} from './icons/Icons';

interface QuickStartStep {
    id: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
    ctaLabel: string;
    ctaAction: string;
    checkComplete: (user: User) => boolean;
}

const STEPS: QuickStartStep[] = [
    {
        id: 'create-book',
        icon: BookOpenIcon,
        title: 'Create Your First Book',
        description: 'Set up a book with a cover, genres, and a compelling summary.',
        ctaLabel: 'Create Book →',
        ctaAction: '/write/book/create',
        checkComplete: (user) => (user.writtenBooks?.length || 0) > 0,
    },
    {
        id: 'add-characters',
        icon: UserGroupIcon,
        title: 'Add Characters',
        description: 'Build your cast with names, roles, and portraits for your story.',
        ctaLabel: 'Add Characters →',
        ctaAction: 'MANAGE_FIRST_BOOK',
        checkComplete: () => !!localStorage.getItem('ww_qs_add-characters'),
    },
    {
        id: 'use-mentions',
        icon: PencilSquareIcon,
        title: 'Use @Mentions',
        description: 'Type @ in the editor to mention characters. They become interactive!',
        ctaLabel: 'Try It →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_use-mentions'),
    },
    {
        id: 'set-mood',
        icon: SparklesIcon,
        title: 'Set the Mood',
        description: 'Use the Atmosphere Engine to add emotional color shifts to your scenes.',
        ctaLabel: 'See How →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_set-mood'),
    },
    {
        id: 'world-building',
        icon: Squares2X2Icon,
        title: 'Use World Building',
        description: 'Open the sidebar to organize your characters, scenes, and lore notes.',
        ctaLabel: 'Open Sidebar →',
        ctaAction: 'SHOW_DEMO',
        checkComplete: () => !!localStorage.getItem('ww_qs_world-building'),
    },
    {
        id: 'publish-chapter',
        icon: CloudArrowUpIcon,
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
    const nextStep = STEPS.find(step => !step.checkComplete(currentUser));

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
            <div className="writer-qs-header">
                <div className="writer-qs-header-left">
                    <span className="writer-qs-eyebrow">Studio guide</span>
                    <h3 className="writer-qs-title">Build your story in six moves.</h3>
                    <p className="writer-qs-subtitle">
                        {allComplete
                            ? 'The essentials are in place. Keep shaping the work in your own way.'
                            : `${completedCount} of ${totalSteps} complete · your next useful step is ready.`
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

            <div className="writer-qs-body">
                <div className="writer-qs-progress-area">
                    <div className="writer-qs-progress-meta"><span>Setup progress</span><strong>{completedCount}/{totalSteps}</strong></div>
                    <div className="writer-qs-progress-bar">
                        <motion.div
                            className="writer-qs-progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="writer-qs-rail" aria-label="Writer setup milestones">
                        {STEPS.map((step, index) => {
                            const isComplete = step.checkComplete(currentUser);
                            const isNext = nextStep?.id === step.id;
                            const StepIcon = step.icon;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    className={`writer-qs-milestone ${isComplete ? 'is-complete' : ''} ${isNext ? 'is-next' : ''}`}
                                    onClick={() => !isComplete && handleCTA(step)}
                                    disabled={isComplete}
                                    title={isComplete ? `${step.title} completed` : step.title}
                                >
                                    <span>{isComplete ? <CheckCircleIcon /> : <StepIcon />}</span>
                                    <small>{String(index + 1).padStart(2, '0')}</small>
                                    <strong>{step.title}</strong>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {nextStep && (() => {
                    const NextIcon = nextStep.icon;
                    return (
                        <motion.article
                            key={nextStep.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="writer-qs-next"
                        >
                            <span className="writer-qs-next-icon"><NextIcon /></span>
                            <div>
                                <span>Up next</span>
                                <h4>{nextStep.title}</h4>
                                <p>{nextStep.description}</p>
                            </div>
                            <button onClick={() => handleCTA(nextStep)}>
                                {nextStep.ctaLabel.replace(' →', '')}<ChevronRightIcon />
                            </button>
                        </motion.article>
                    );
                })()}
            </div>

            <AnimatePresence>
                {showCelebration && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="writer-qs-celebration"
                    >
                        <CheckCircleIcon className="writer-qs-celebration-icon" />
                        <h3>Your studio is ready.</h3>
                        <p>You have explored the core tools. The next page is yours.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
