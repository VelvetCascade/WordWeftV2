import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { getReturnNavigation } from '../utils/navigation';
import '../styles/support-v2.css';

interface ReturnNavigationProps {
    fallbackPath?: string;
    fallbackLabel?: string;
}

export const ReturnNavigation: React.FC<ReturnNavigationProps> = ({
    fallbackPath = '/', fallbackLabel = 'Back to discover',
}) => {
    const { label, onClick } = getReturnNavigation(fallbackPath, fallbackLabel);
    return (
        <button type="button" className="ww-return-navigation" onClick={onClick}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{label}</span>
        </button>
    );
};
