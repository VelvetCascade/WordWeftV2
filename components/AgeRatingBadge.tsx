import React from 'react';
import type { AgeRating } from '../types';

const LABELS: Record<AgeRating, string> = {
    ALL_AGES: 'Everyone',
    TEEN_13: '13+',
    MATURE_18: '18+',
    ADULT_21: '21+',
};

export const AgeRatingBadge: React.FC<{ rating?: AgeRating; compact?: boolean }> = ({ rating = 'ALL_AGES', compact = false }) => (
    <span className={`age-rating-badge age-rating-${rating.toLowerCase()}${compact ? ' compact' : ''}`} title={`Age rating: ${LABELS[rating]}`}>
        {LABELS[rating]}
    </span>
);
