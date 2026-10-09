import React, { useState, useEffect } from 'react';
import { navigatePath } from '../utils/navigation';
import { readOptionalValue, writeOptionalValue } from '../utils/optionalStorage';
import '../styles/writer-experience.css';
import { writerMilestones, type WriterGuideProgress } from '../utils/writerExperience';
import * as api from '../api/client';
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
}

const STEPS: QuickStartStep[] = [
    {
        id: 'create-book',
        icon: BookOpenIcon,
        title: 'Create Your First Book',
        description: 'Give your private draft a title. Artwork and story details can come later.',
        ctaLabel: 'Create Book →',
    },
    {
        id: 'add-characters', icon: UserGroupIcon, title: 'Add Characters',
        description: 'Build your cast with names, roles, and portraits for your story.', ctaLabel: 'Add Characters →',
    },
    {
        id: 'use-mentions', icon: PencilSquareIcon, title: 'Use @Mentions',
        description: 'Type @ in the editor to link a saved character. Save the chapter to keep the mention.', ctaLabel: 'Try It →',
    },
    {
        id: 'set-mood', icon: SparklesIcon, title: 'Set the Mood',
        description: 'Add an atmosphere to a passage and save it with your chapter.', ctaLabel: 'See How →',
    },
    {
        id: 'world-building', icon: Squares2X2Icon, title: 'Use World Building',
        description: 'Save a scene or a private note to keep the world around your manuscript organized.', ctaLabel: 'Open Story Guide →',
    },
    {
        id: 'publish-chapter',
        icon: CloudArrowUpIcon,
        title: 'Publish a Chapter',
        description: 'Share your writing with the world. Hit Publish and let readers discover you!',
        ctaLabel: 'Review publication →',
    },
];

const hiddenKey = (userId: string) => `ww:writer-quickstart:${userId}:hidden`;

interface WriterQuickStartProps {
    currentUser: User;
}

export const WriterQuickStart: React.FC<WriterQuickStartProps> = ({ currentUser }) => {
    const [isHidden, setIsHidden] = useState(() => !!readOptionalValue(hiddenKey(currentUser.id)));

    const [guideProgress, setGuideProgress] = useState<{ ownerId: string; value: WriterGuideProgress } | null>(null);
    const [guideLoading, setGuideLoading] = useState(false);
    const [guideError, setGuideError] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => { setIsHidden(!!readOptionalValue(hiddenKey(currentUser.id))); setGuideProgress(null); }, [currentUser.id]);
    useEffect(() => {
        if (isHidden || !currentUser.writtenBooks?.length) return;
        let active = true; setGuideLoading(true); setGuideError(false);
        api.getWriterQuickStart().then(result => { if (active) setGuideProgress({ ownerId: currentUser.id, value: result }); }).catch(() => { if (active) setGuideError(true); }).finally(() => { if (active) setGuideLoading(false); });
        return () => { active = false; };
    }, [currentUser.id, isHidden, refreshKey]);

    const milestones = writerMilestones(currentUser.writtenBooks || [], guideProgress?.ownerId === currentUser.id ? guideProgress.value : undefined);
    const complete = (step: QuickStartStep) => milestones[step.id as keyof typeof milestones];
    const completedSteps = STEPS.filter(complete);
    const completedCount = completedSteps.length;
    const totalSteps = STEPS.length;
    const allComplete = completedCount === totalSteps;
    const progressPercent = (completedCount / totalSteps) * 100;
    const nextStep = STEPS.find(step => !complete(step));

    if (isHidden) return null;

    const handleCTA = (step: QuickStartStep) => {
        const book = currentUser.writtenBooks?.find(candidate => candidate.chapters.some(chapter => chapter.status !== 'published')) || currentUser.writtenBooks?.[0];
        if (!book || step.id === 'create-book') { navigatePath('/write/book/create'); return; }
        if (step.id === 'add-characters') { navigatePath(`/write/book/${book.id}/manage?tab=characters`); return; }
        if (step.id === 'world-building') { navigatePath(`/write/book/${book.id}/manage?tab=scenes`); return; }
        if (step.id === 'publish-chapter') { navigatePath(`/write/book/${book.id}/manage`); return; }
        const chapter = book.chapters.find(candidate => candidate.status === 'draft');
        navigatePath(`/write/book/${book.id}/chapter/${chapter?.id || 'new'}/edit`);
    };

    return (
        <div className="writer-qs">
            <div className="writer-qs-header">
                <div className="writer-qs-header-left">
                    <span className="writer-qs-eyebrow">Studio guide</span>
                    <h3 className="writer-qs-title">Your first story, one step at a time.</h3>
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
                        writeOptionalValue(hiddenKey(currentUser.id), 'true');
                        setIsHidden(true);
                    }}
                >
                    Dismiss
                </button>
            </div>

            {guideLoading && <p className="writer-qs-subtitle" role="status">Checking your saved story guide progress…</p>}
            {guideError && <p className="writer-qs-subtitle" role="status">Saved tool progress could not be checked. <button className="ww-studio-text-link" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></p>}
            <div className="writer-qs-body">
                <div className="writer-qs-progress-area">
                    <div className="writer-qs-progress-meta"><span>Setup progress</span><strong>{completedCount}/{totalSteps}</strong></div>
                    <div className="writer-qs-progress-bar" role="progressbar" aria-label="Saved writing milestones" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={completedCount}>
                        <div className="writer-qs-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="writer-qs-rail" aria-label="Writer setup milestones">
                        {STEPS.map((step, index) => {
                            const isComplete = complete(step);
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
                        <article key={nextStep.id} className="writer-qs-next">
                            <span className="writer-qs-next-icon"><NextIcon /></span>
                            <div>
                                <span>Up next</span>
                                <h4>{nextStep.title}</h4>
                                <p>{nextStep.description}</p>
                            </div>
                            <button onClick={() => handleCTA(nextStep)}>
                                {nextStep.ctaLabel.replace(' →', '')}<ChevronRightIcon />
                            </button>
                        </article>
                    );
                })()}
            </div>

            {allComplete && <p className="writer-qs-subtitle" role="status">Your first chapter is published. Keep shaping your story at your own pace.</p>}
        </div>
    );
};
