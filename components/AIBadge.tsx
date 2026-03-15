import React from 'react';

export const AIBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-white shadow-sm border border-accent/20 backdrop-blur-sm ${className}`}
            title="This book contains AI-generated content or structure."
        >
            <span className="text-[10px] font-extrabold uppercase tracking-widest leading-none mt-[1px]">Contains AI Content</span>
        </div>
    );
};
